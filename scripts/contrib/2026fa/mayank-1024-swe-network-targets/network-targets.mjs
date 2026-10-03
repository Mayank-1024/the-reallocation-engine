#!/usr/bin/env node
// network-targets.mjs — swe-network-targets prototype (recipe:
// recipes/cases/2026fa/mayank-1024-swe-network-targets.md).
//
// For a backend-SWE master's student on F-1 OPT in Massachusetts: take the
// 80 Days sponsor CSV, keep companies that have sponsored SWE titles in-state,
// attach each company's ATS board evidence, send ONLY board-checked companies
// through the existing scorer (scripts/score/role-scorer.mjs), then turn the
// scorer's liveness-gated Skips with strong sponsorship into a
// "network, don't apply" list.
//
//   node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs
//       [--persona p.json] [--csv f.csv] [--formd-dir dir] [--boards snapshot.json]
//       [--live --map board-map.json] [--out-dir dir]
//
// Default mode is offline: it reads the committed board snapshot. --live
// re-fetches boards through scripts/ats/providers/{greenhouse,lever,ashby}.mjs
// (hosts: boards-api.greenhouse.io, api.lever.co, api.ashbyhq.com — nothing else).
//
// Exit: 0 ok · 2 missing/invalid input · 3 timeline window closed · 4 scorer failed.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  SRC, parseCsv, parseTitleList, normName, numOrNull, sponsorshipTier,
  timelineGate, fundingRecency, boardEvidence, nextAction,
} from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');
const RECIPE = 'recipes/cases/2026fa/mayank-1024-swe-network-targets.md';
const RECIPE_VERSION = '0.1.0';
const rel = (p) => path.relative(ROOT, path.resolve(p)) || '.';

function die(code, msg) { console.error(`✗ ${msg}`); process.exit(code); }

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}
const flag = (name) => process.argv.includes(`--${name}`);

function readJson(p, what) {
  if (!fs.existsSync(p)) die(2, `${what} not found: ${rel(p)}`);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { die(2, `${what} is not valid JSON: ${rel(p)} (${e.message})`); }
}

// Outputs may only land in this student's namespaces, the gitignored private/
// folder (for runs on real personal dates), or the OS temp dir — never over a
// tracked repo file such as data/examples/role-scores.json.
function assertOutDir(dir) {
  const abs = path.resolve(dir);
  const ok = [
    path.join(ROOT, 'course/2026fa/submissions/mayank-1024'),
    path.join(ROOT, 'private'),
    HERE,
    fs.realpathSync(os.tmpdir()),
    os.tmpdir(),
  ].some((base) => abs === base || abs.startsWith(base + path.sep));
  if (!ok) die(2, `--out-dir ${rel(abs)} is outside course/2026fa/submissions/mayank-1024/, private/, this prototype's folder, or the OS temp dir — refusing to write`);
  return abs;
}

// ── live mode: reuse the maintained ATS providers ──────────────────────────────
async function fetchBoards(mapPath) {
  const map = readJson(mapPath, 'board map');
  const { makeHttpCtx } = await import(pathToFileURL(path.join(ROOT, 'scripts/ats/providers/_http.mjs')).href);
  const providers = [];
  for (const id of ['greenhouse', 'lever', 'ashby'])
    providers.push((await import(pathToFileURL(path.join(ROOT, `scripts/ats/providers/${id}.mjs`)).href)).default);
  const ctx = makeHttpCtx();
  const boards = {};
  for (const e of map.companies) {
    if (!e.careers_url) { boards[e.company] = { status: e.status || 'unmapped', note: e.note || null }; continue; }
    const entry = { name: e.company, careers_url: e.careers_url };
    const prov = providers.find((p) => p.detect(entry));
    if (!prov) { boards[e.company] = { status: 'error', note: `no provider recognises ${e.careers_url}` }; continue; }
    try {
      const jobs = await prov.fetch(entry, ctx);
      boards[e.company] = {
        status: 'ok', provider: prov.id, careers_url: e.careers_url,
        identity_confirmed: e.identity_confirmed === true, note: e.note || null,
        jobs: jobs.map((j) => ({ title: j.title, url: j.url, location: j.location || '' })),
      };
    } catch (err) {
      boards[e.company] = { status: err.status === 404 ? 'not_found' : 'error', provider: prov.id, careers_url: e.careers_url, note: err.message.slice(0, 160) };
    }
    console.log(`  board ${e.company.padEnd(28)} ${boards[e.company].status}${boards[e.company].jobs ? ` (${boards[e.company].jobs.length} jobs)` : ''}`);
  }
  return {
    _source: SRC.record,
    _how: `fetched live by network-targets.mjs --live via scripts/ats/providers from ${rel(mapPath)}; slugs in the map are your-input`,
    captured_at: new Date().toISOString(),
    boards,
  };
}

function loadFormD(dir) {
  if (!fs.existsSync(dir)) die(2, `Form D sample dir not found: ${rel(dir)}`);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  const index = new Map();
  let total = 0, quarterTotals = [];
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    quarterTotals.push({ file: f, in_sample: d.companies.length, in_quarter: d.metadata?.total_companies ?? null });
    for (const c of d.companies) {
      total++;
      const k = c.company?.company_name_normalized || normName(c.company?.name);
      if (!index.has(k)) index.set(k, []);
      index.get(k).push({ file: f, date_filed: c.filing?.date_filed ?? null, total_amount_sold: c.funding?.total_amount_sold ?? null });
    }
  }
  return { index, files, total, quarterTotals };
}

const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '—');
const money = (n) => (n == null ? '—' : `$${Math.round(n).toLocaleString('en-US')}`);

async function main() {
  const personaPath = path.resolve(arg('persona', path.join(HERE, 'persona.example.json')));
  const csvPath = path.resolve(arg('csv', path.join(ROOT, 'data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv')));
  const formdDir = path.resolve(arg('formd-dir', path.join(ROOT, 'data/sec/form-d/processed/sample')));
  const live = flag('live');

  // ── G1 persona + timeline gate (fails before anything is written) ───────────
  const persona = readJson(personaPath, 'persona');
  const tl = timelineGate(persona);
  if (tl.error) die(3, `timeline gate: ${tl.error}`);
  const outDir = assertOutDir(arg('out-dir', path.join(ROOT, 'course/2026fa/submissions/mayank-1024/runs', persona.as_of)));

  // ── G2 sponsor data present ────────────────────────────────────────────────
  if (!fs.existsSync(csvPath)) die(2, `80 Days CSV not found: ${rel(csvPath)}`);
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const csvSha = crypto.createHash('sha256').update(csvText).digest('hex');
  const rows = parseCsv(csvText);
  const need = ['company_name', 'state', 'Total Approvals', 'Approval_Rate', 'top_job_titles_sponsored', 'latest_funding_date'];
  const missingCols = need.filter((c) => !(c in (rows[0] || {})));
  if (missingCols.length) die(2, `80 Days CSV is missing columns: ${missingCols.join(', ')} — schema drift; refusing to guess`);

  const titleRe = new RegExp(persona.target.title_pattern, 'i');
  const locationRe = new RegExp(persona.target.location_pattern, 'i');
  const adjacentRe = new RegExp(persona.target.adjacent_title_pattern, 'i');
  const excludeRe = persona.target.exclude_title_pattern ? new RegExp(persona.target.exclude_title_pattern, 'i') : /$^/;
  const states = new Set(persona.geography.states);
  const rules = persona.sponsorship_rules;

  // ── candidate funnel (every step counted — an audit, not a verdict) ────────
  const inState = rows.filter((r) => states.has(r.state));
  const withRecord = inState.filter((r) => numOrNull(r['Total Approvals']) != null);
  const titleMatch = withRecord.filter((r) => parseTitleList(r.top_job_titles_sponsored).some((t) => titleRe.test(t)));
  const candidates = titleMatch.filter((r) => numOrNull(r['Total Approvals']) >= rules.possible.min_approvals);

  // anomaly audit: H-1B counts in this CSV — how many are odd?
  const allCounts = rows.map((r) => numOrNull(r['Total Approvals'])).filter((n) => n != null);
  const oddCounts = allCounts.filter((n) => n % 2 === 1).length;

  // ── board evidence ─────────────────────────────────────────────────────────
  let snapshot, snapshotPath;
  if (live) {
    const mapPath = path.resolve(arg('map', path.join(HERE, 'board-map.json')));
    console.log(`live: fetching ATS boards listed in ${rel(mapPath)}`);
    snapshot = await fetchBoards(mapPath);
    fs.mkdirSync(outDir, { recursive: true });
    snapshotPath = path.join(outDir, 'boards-snapshot.json');
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n');
  } else {
    snapshotPath = path.resolve(arg('boards', path.join(HERE, 'snapshots/boards-2026-10-02.json')));
    snapshot = readJson(snapshotPath, 'board snapshot');
  }
  const candidateNames = new Set(candidates.map((r) => r.company_name));
  const errors = [];
  for (const name of Object.keys(snapshot.boards || {}))
    if (!candidateNames.has(name))
      errors.push({ company: name, error: rows.some((r) => r.company_name === name) ? 'in-csv-but-not-a-candidate (state/title/approval filter)' : 'not-in-80-days-csv — no sponsorship record; not scored, nothing inferred' });

  const formd = loadFormD(formdDir);

  // ── per-company evidence, every value labeled ──────────────────────────────
  const companies = candidates.map((r) => {
    const approvals = numOrNull(r['Total Approvals']);
    const denials = numOrNull(r['Total Denials']);
    const rate = numOrNull(r.Approval_Rate);
    const sp = sponsorshipTier(approvals, rate, rules);
    const fund = fundingRecency(r.latest_funding_date, persona.as_of, persona.funding_windows);
    const fdHits = formd.index.get(normName(r.company_name)) || [];
    const board = boardEvidence(snapshot.boards?.[r.company_name], titleRe, locationRe, adjacentRe, excludeRe);
    return {
      company: r.company_name,
      role_id: normName(r.company_name),
      evidence: {
        city: { value: r.city || null, source: SRC.record, from: '80-days CSV city' },
        h1b_approvals: { value: approvals, source: SRC.record, from: '80-days CSV Total Approvals', caveat: 'every count in this CSV is even — possible 2× join; see data_anomalies' },
        h1b_denials: { value: denials, source: SRC.record, from: '80-days CSV Total Denials' },
        approval_rate_pct: { value: rate, source: SRC.record, from: '80-days CSV Approval_Rate' },
        sponsored_titles: { value: parseTitleList(r.top_job_titles_sponsored), source: SRC.record, from: '80-days CSV top_job_titles_sponsored' },
        sponsorship_tier: { value: sp.tier, p: sp.p, source: SRC.input, from: 'persona.sponsorship_rules applied to the record counts' },
        latest_funding_date: { value: r.latest_funding_date || null, stage: r.latest_funding_stage || null, amount: numOrNull(r.latest_funding_amount), source: SRC.record, from: '80-days CSV latest_funding_* (derived upstream from SEC Form D)' },
        funding_recency: { ...fund, source: SRC.input, from: 'persona.funding_windows applied to latest_funding_date' },
        form_d_sample: { value: fdHits.length ? fdHits : 'not-in-sample', source: SRC.record, from: `${formd.files.length} Form D sample files (${formd.total} filings); absence in a 50-row sample is not absence of a filing` },
        // A checked board is a record. An unchecked one is labeled by where its status came from:
        // a live fetch error (provider set) is a record; not_found/ambiguous/unmapped come from the board map (your-input).
        board: { ...board, source: board.factor != null || snapshot.boards?.[r.company_name]?.provider ? SRC.record : SRC.input, from: board.factor != null ? snapshot._how : 'board-map.json status (no board checked)', captured_at: snapshot.captured_at ?? null },
        timeline_factor: { value: tl.factor, source: SRC.input, from: 'persona OPT end date + hiring-lag assumption' },
      },
      _sp: sp, _fund: fund, _board: board,
    };
  });

  // ── hand board-checked companies to the EXISTING scorer ────────────────────
  const toScore = companies.filter((c) => c._board.factor != null);
  const roles = toScore.map((c) => ({
    role_id: c.role_id,
    company: c.company,
    // no regex in the title: its '|' characters broke the scorer's Markdown table (run 2026-10-02)
    title: c._board.matching.length ? c._board.matching[0].title.trim() : '(no matching live posting on board)',
    sponsorship: { p: c._sp.p, tier: c._sp.tier, source: SRC.record },
    liveness: { factor: c._board.factor, source: SRC.record },
    timeline: { factor: tl.factor, source: SRC.input },
    // fit deliberately omitted: this prototype measures no fit signal and will not invent one.
  }));
  fs.mkdirSync(outDir, { recursive: true });
  const rolesPath = path.join(outDir, 'roles.json');
  fs.writeFileSync(rolesPath, JSON.stringify(roles, null, 2) + '\n');
  const profilePath = path.join(outDir, 'scorer-profile.json');
  fs.writeFileSync(profilePath, JSON.stringify({ authorization: persona.visa.authorization_for_scorer }, null, 2) + '\n');

  let scoredById = new Map(), scorerOut = '(no board-checked companies — scorer not run)';
  if (roles.length) {
    const res = spawnSync(process.execPath, [path.join(ROOT, 'scripts/score/role-scorer.mjs'), rolesPath, '--profile', profilePath, '--out-dir', outDir], { encoding: 'utf8', cwd: ROOT });
    scorerOut = (res.stdout + res.stderr).trim();
    if (res.status !== 0) die(4, `role-scorer.mjs exited ${res.status}: ${scorerOut}`);
    const scored = JSON.parse(fs.readFileSync(path.join(outDir, 'role-scores.json'), 'utf8'));
    if (scored.profile_needs_sponsorship !== true)
      die(4, `scorer read the profile as NOT needing sponsorship (authorization "${persona.visa.authorization_for_scorer}") — sponsorship weight would be 0; fix the persona string`);
    scoredById = new Map(scored.roles.map((s) => [s.role_id, s]));
  }

  for (const c of companies) {
    c.scorer = scoredById.get(c.role_id) ? (({ composite, recommendation, reason, trace }) => ({ composite, recommendation, reason, arithmetic: trace.arithmetic }))(scoredById.get(c.role_id)) : null;
    c.next = nextAction({ scored: scoredById.get(c.role_id), sponsorship: c._sp, timeline: tl, board: c._board, funding: c._fund, networkRule: persona.network_rule });
  }

  // ── outputs: JSON log (agent) + Markdown report (human) ───────────────────
  const count = (a) => companies.filter((c) => c.next.action === a);
  const order = ['NETWORK', 'APPLY', 'CONSIDER', 'WATCH', 'UNVERIFIED', 'SKIP'];
  const gatesPending = [
    { gate: 'G3 board identity', test: 'a human confirms each careers_url belongs to the CSV company (identity_confirmed=true in the board map)', pending: companies.filter((c) => c._board.status === 'ok' && !snapshot.boards[c.company]?.identity_confirmed).map((c) => c.company) },
    { gate: 'G4 posting liveness', test: 'before applying, npm run ats:liveness -- <url> returns active for the specific posting', pending: count('APPLY').concat(count('CONSIDER')).map((c) => c.company) },
    { gate: 'G5 adjacent titles', test: 'a human reads adjacent engineering titles on NETWORK/WATCH boards and decides whether any is really a target role', pending: companies.filter((c) => ['NETWORK', 'WATCH'].includes(c.next.action) && c._board.adjacent_titles?.length).map((c) => c.company) },
  ];
  const strip = ({ _sp, _fund, _board, ...rest }) => rest;
  const log = {
    recipe: RECIPE, recipe_version: RECIPE_VERSION,
    run_at: new Date().toISOString(), mode: live ? 'live-boards' : 'offline-snapshot',
    model_judgment_values: 0,
    inputs: {
      persona: { path: rel(personaPath), source: SRC.input, as_of: persona.as_of },
      csv: { path: rel(csvPath), sha256: csvSha, rows: rows.length, source: SRC.record },
      form_d_sample: { dir: rel(formdDir), files: formd.quarterTotals, filings_in_sample: formd.total, source: SRC.record },
      boards: { path: rel(snapshotPath), captured_at: snapshot.captured_at ?? null, entries: Object.keys(snapshot.boards || {}).length, source: SRC.record },
    },
    timeline: { ...tl, opt_end_date: persona.visa.opt_end_date, source: SRC.input },
    funnel: { csv_rows: rows.length, in_states: inState.length, with_h1b_record: withRecord.length, sponsored_target_title: titleMatch.length, candidates: candidates.length, board_checked_and_scored: roles.length, form_d_sample_matches: companies.filter((c) => c.evidence.form_d_sample.value !== 'not-in-sample').length },
    data_anomalies: [
      { check: 'H-1B approval counts odd vs even across the whole CSV', found: `${oddCounts} odd of ${allCounts.length}`, meaning: oddCounts === 0 ? 'every count is even — consistent with each petition being counted twice upstream; tiers use raw counts; confirm against USCIS before quoting a count' : 'mixed parity — no doubling signal' },
    ],
    actions: Object.fromEntries(order.map((a) => [a, count(a).length])),
    scorer: { command: `node scripts/score/role-scorer.mjs ${rel(rolesPath)} --profile ${rel(profilePath)} --out-dir ${rel(outDir)}`, output: scorerOut },
    gates_pending_human: gatesPending,
    errors,
    companies: companies.map(strip),
  };
  const logPath = path.join(outDir, 'network-targets.log.json');
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2) + '\n');

  const L = [];
  const n = companies.length;
  L.push(`# SWE network targets — ${persona.as_of}`);
  L.push('');
  L.push('## Executive summary');
  L.push('');
  L.push(`This report is for a backend software engineer on F-1 OPT in ${[...states].join(', ')} deciding where to spend the week's job-search hours. It started from every company in the sponsor dataset that has sponsored a software-engineering title in-state (${n} companies), checked each one's public job board where one was known, and sorted them into: **network** (strong sponsor, no matching opening right now — ask for an informational interview), **apply**, **consider**, **watch**, **unverified** (no board checked — do not assume anything), and **skip**.`);
  L.push('');
  L.push(`**Result:** ${order.map((a) => `${a.toLowerCase()} ${count(a).length}`).join(' · ')}. ${count('UNVERIFIED').length} of ${n} companies (${pct(count('UNVERIFIED').length, n)}) could not be checked, so this is a partial picture, not a ranking of the whole market. No value in this report came from an AI model; numbers come from the repo's data files, the job boards, or settings you chose.`);
  L.push('');
  L.push(`**Before acting:** the job-board links were matched to companies by name and have not been confirmed by a person; every sponsorship count in the source file is an even number, which suggests counts may be doubled; and funding dates in the source stop in ${rows.map((r) => r.latest_funding_date).filter(Boolean).sort().at(-1)?.slice(0, 7)}, so "recent funding" here is at least a year old.`);
  L.push('');
  L.push(`## Your timeline`);
  L.push('');
  L.push(`OPT ends ${persona.visa.opt_end_date} → ${tl.days_left} days left as of ${persona.as_of}. Assumed hiring lag ${tl.hiring_lag_days} days *(your-input)* → slack ${tl.slack_days} days → timeline factor **${tl.factor}** *(your-input bands)*.`);
  L.push('');
  const row = (c) => {
    const e = c.evidence;
    return `| ${c.company} | ${e.sponsorship_tier.value} | ${e.h1b_approvals.value} / ${e.approval_rate_pct.value ?? '—'}% | ${e.latest_funding_date.value ?? '—'} (${e.funding_recency.bucket}) | ${c._board.status === 'ok' ? `${c._board.job_count} jobs, ${c._board.matching.length} match` : c._board.status} |`;
  };
  const hdr = '| Company | Sponsor tier *(your-input rule)* | Approvals / rate *(record)* | Latest funding *(record)* | Board *(record)* |\n|---|---|---|---|---|';
  L.push(`## Network, don't apply (${count('NETWORK').length})`);
  L.push('');
  L.push('Strong sponsor, funded within your window, board reachable, but no matching US opening today. Use the networking hours here: an informational interview before a role opens.');
  L.push('');
  if (count('NETWORK').length) {
    L.push(hdr);
    for (const c of count('NETWORK')) L.push(row(c));
    L.push('');
    for (const c of count('NETWORK')) {
      const extra = [];
      if (c._board.adjacent_titles.length) extra.push(`adjacent engineering titles a human should read: ${c._board.adjacent_titles.slice(0, 4).join('; ')}`);
      if (c._board.title_match_wrong_location.length) extra.push(`matching titles outside your locations: ${c._board.title_match_wrong_location.slice(0, 3).join('; ')}`);
      if (extra.length) L.push(`- **${c.company}** — ${extra.join(' · ')}`);
    }
  } else L.push('*None this run.*');
  L.push('');
  L.push(`## Apply (${count('APPLY').length}) and consider (${count('CONSIDER').length})`);
  L.push('');
  L.push('A matching posting is listed on the board. Run the posting-level liveness check on the exact link before tailoring an application.');
  L.push('');
  if (count('APPLY').length + count('CONSIDER').length) {
    L.push('| Company | Action | Composite *(scorer)* | Matching postings *(record)* |\n|---|---|---|---|');
    for (const c of [...count('APPLY'), ...count('CONSIDER')])
      L.push(`| ${c.company} | ${c.next.action} | ${c.scorer.composite} | ${c._board.matching.slice(0, 3).map((j) => `[${j.title.trim()}](${j.url}) (${j.location})`).join('<br>')}${c._board.matching.length > 3 ? `<br>+${c._board.matching.length - 3} more` : ''} |`);
  } else L.push('*None this run.*');
  L.push('');
  L.push(`## Watch (${count('WATCH').length})`);
  L.push('');
  L.push(count('WATCH').length ? `Strong sponsor, no matching opening, funding outside your window: ${count('WATCH').map((c) => `${c.company} (${c.evidence.latest_funding_date.value ?? 'no date'})`).join('; ')}.` : '*None.*');
  L.push('');
  L.push(`## Unverified (${count('UNVERIFIED').length}) — not scored`);
  L.push('');
  L.push(`No job board was checked for these, so liveness is unknown. They were **not** sent to the scorer, because the scorer treats a missing liveness value as "live". Find each careers page by hand before deciding anything: ${count('UNVERIFIED').map((c) => `${c.company} (${c._board.status})`).join('; ') || 'none'}.`);
  L.push('');
  L.push(`## Skip (${count('SKIP').length})`);
  L.push('');
  L.push(count('SKIP').length ? count('SKIP').map((c) => `- ${c.company} — ${c.next.why}`).join('\n') : '*None.*');
  L.push('');
  L.push('## What a person still has to judge');
  L.push('');
  for (const g of gatesPending) L.push(`- **${g.gate}** — ${g.test}. Pending: ${g.pending.length ? g.pending.join(', ') : 'none'}.`);
  L.push('');
  L.push('## Verified vs. inferred');
  L.push('');
  L.push('- **record:** H-1B approvals/denials/rate, sponsored titles, city, latest funding date/stage/amount (80 Days CSV); Form D sample presence; job titles, URLs, and locations on each board (ATS API response at capture time).');
  L.push('- **your-input:** OPT end date, as-of date, hiring lag, timeline bands, sponsorship tier thresholds and p values, funding windows, title/exclude/location/adjacent patterns, the board slug for each company, and the network rule.');
  L.push('- **model-judgment:** none. No fit score is emitted; the scorer ran on sponsorship + gates only.');
  L.push('- **not checked at all:** whether a specific posting is still open (board listing ≠ posting check), whether the company sponsors *new* OPT hires today, salary, E-Verify enrollment, cap-exempt status.');
  L.push('');
  L.push('---');
  L.push('');
  L.push('## Run record');
  L.push('');
  L.push(`- Recipe: \`${RECIPE}\` v${RECIPE_VERSION} · mode \`${log.mode}\``);
  L.push(`- 80 Days CSV: \`${rel(csvPath)}\` (${rows.length} rows, sha256 \`${csvSha.slice(0, 16)}…\`)`);
  L.push(`- Board snapshot: \`${rel(snapshotPath)}\` captured ${snapshot.captured_at}`);
  L.push(`- Form D sample: ${formd.files.length} files, ${formd.total} filings; matches among candidates: ${log.funnel.form_d_sample_matches}`);
  L.push(`- Funnel: ${rows.length} rows → ${inState.length} in-state → ${withRecord.length} with H-1B record → ${titleMatch.length} sponsored a target title → ${candidates.length} candidates → ${roles.length} board-checked and scored`);
  L.push(`- Anomaly: ${log.data_anomalies[0].found} H-1B approval counts — ${log.data_anomalies[0].meaning}`);
  L.push(`- Scorer: \`${log.scorer.command}\``);
  L.push(`- Errors: ${errors.length ? errors.map((e) => `${e.company}: ${e.error}`).join('; ') : 'none'}`);
  const mdPath = path.join(outDir, 'network-targets.report.md');
  fs.writeFileSync(mdPath, L.join('\n') + '\n');

  console.log(`✓ ${n} candidates → ${order.map((a) => `${a} ${count(a).length}`).join(' · ')}`);
  console.log(`  scorer: ${scorerOut.split('\n')[0]}`);
  console.log(`  ${rel(logPath)}  +  ${rel(mdPath)}`);
  for (const e of errors) console.warn(`  ! ${e.company}: ${e.error}`);
}

main().catch((e) => die(2, e.stack || e.message));
