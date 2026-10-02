// lib.mjs — pure functions for the swe-network-targets prototype.
// No network, no filesystem writes. Everything here is unit-testable from fixtures.
//
// Labels used on every emitted value (SNICKERDOODLE P3, DOMAIN five-component model):
//   record          — read from a repo data file or a captured ATS API response
//   model-judgment  — produced by an LLM (this prototype emits NONE)
//   your-input      — a number, rule, or threshold a human chose (persona file, board map)

export const SRC = { record: 'record', model: 'model-judgment', input: 'your-input' };

// ── CSV (RFC 4180: quoted fields, doubled quotes, commas inside quotes) ─────────
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.length > 1 || r[0] !== '');
  return body.map((r) => Object.fromEntries(header.map((h, j) => [h, r[j] ?? ''])));
}

// "['Senior Software Engineer', 'Engineering Manager ']" → ['Senior Software Engineer', 'Engineering Manager']
export function parseTitleList(s) {
  return [...String(s || '').matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)]
    .map((m) => (m[1] ?? m[2]).trim()).filter(Boolean);
}

export const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// A blank cell is "no record", never zero (DATA_CONTRACT: absence ≠ 0).
export function numOrNull(s) {
  if (s == null || String(s).trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ── Sponsorship tier (rule = your-input; counts = record) ───────────────────────
// Thresholds live in the persona file so a human owns them. The p values for
// Proven/Likely match data/examples/ch11-roles.json; Possible is this recipe's choice.
export function sponsorshipTier(approvals, ratePct, rules) {
  if (approvals == null) return { tier: 'NoRecord', p: null };
  const r = rules;
  if (approvals >= r.proven.min_approvals && (ratePct ?? 0) >= r.proven.min_rate_pct)
    return { tier: 'Proven', p: r.proven.p };
  if (approvals >= r.likely.min_approvals) return { tier: 'Likely', p: r.likely.p };
  if (approvals >= r.possible.min_approvals) return { tier: 'Possible', p: r.possible.p };
  return { tier: 'None', p: 0 };
}

// ── Dates ───────────────────────────────────────────────────────────────────────
const DAY = 86_400_000;
export function parseIsoDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
export const daysBetween = (a, b) => Math.round((b - a) / DAY);

// ── Timeline gate (persona-level; every input is your-input) ────────────────────
// slack = days left on OPT − assumed hiring lag. Bands are the persona's.
// Returns { error } when the OPT end date is already past — a named failure case:
// the prototype refuses to score rather than emit a factor for a window that is closed.
export function timelineGate(persona) {
  const asOf = parseIsoDate(persona.as_of);
  const end = parseIsoDate(persona.visa?.opt_end_date);
  if (!asOf || !end) return { error: 'persona.as_of and persona.visa.opt_end_date must be YYYY-MM-DD' };
  const daysLeft = daysBetween(asOf, end);
  if (daysLeft <= 0) return { error: `OPT end date ${persona.visa.opt_end_date} is not after as_of ${persona.as_of} (${daysLeft} days) — window closed; nothing to score` };
  const lag = persona.timeline.hiring_lag_days;
  const slack = daysLeft - lag;
  const band = [...persona.timeline.bands].sort((a, b) => b.min_slack_days - a.min_slack_days)
    .find((b) => slack >= b.min_slack_days);
  return { days_left: daysLeft, hiring_lag_days: lag, slack_days: slack, factor: band ? band.factor : 0 };
}

// ── Funding recency (outside the scorer — the scorer has no funding vote) ───────
export function fundingRecency(latestDate, asOfStr, windows) {
  const d = parseIsoDate(latestDate);
  if (!d) return { months_since: null, bucket: 'no-record' };
  const months = Math.floor(daysBetween(d, parseIsoDate(asOfStr)) / 30.44);
  const bucket = months <= windows.recent_months ? 'recent' : months <= windows.aging_months ? 'aging' : 'stale';
  return { months_since: months, bucket };
}

// ── Board evidence → liveness for the APPLY question ────────────────────────────
// status ok + ≥1 posting whose title AND location match → factor 1 (record)
// status ok + 0 matching postings                        → factor 0 (record) — network candidate
// anything else (not_found / ambiguous / error / absent)  → null: NOT scored, because
//   role-scorer.mjs defaults a missing liveness factor to 1.0 (`?? 1`) and would
//   treat an unchecked board as live.
export function boardEvidence(board, titleRe, locationRe, adjacentRe, excludeRe = /$^/) {
  if (!board) return { status: 'unmapped', factor: null };
  if (board.status !== 'ok') return { status: board.status, factor: null, note: board.note || null };
  const jobs = board.jobs || [];
  const titleHits = jobs.filter((j) => titleRe.test(j.title) && !excludeRe.test(j.title));
  const matching = titleHits.filter((j) => locationRe.test(j.location || ''));
  const offshore = titleHits.filter((j) => !locationRe.test(j.location || ''));
  const adjacent = jobs.filter((j) => !titleHits.includes(j) && !excludeRe.test(j.title) && adjacentRe.test(j.title) && locationRe.test(j.location || ''));
  return {
    status: 'ok',
    factor: matching.length > 0 ? 1.0 : 0.0,
    job_count: jobs.length,
    matching,
    title_match_wrong_location: offshore.map((j) => `${j.title.trim()} — ${j.location}`),
    adjacent_titles: adjacent.map((j) => `${j.title.trim()} — ${j.location}`),
  };
}

// ── Final next-action per company (the 3-3-2 hand-off) ──────────────────────────
// Reads the SCORER's output for scored companies; never recomputes the composite.
export function nextAction({ scored, sponsorship, timeline, board, funding, networkRule }) {
  if (timeline.factor <= 0.05) return { action: 'SKIP', why: 'timeline gate closed — hiring cannot finish before OPT ends' };
  if (!scored) return { action: 'UNVERIFIED', why: `board ${board.status} — liveness unknown, not sent to the scorer` };
  if (scored.recommendation === 'Apply') return { action: 'APPLY', why: 'scorer Apply — tailor an application (2 research-and-apply hours)' };
  if (scored.recommendation === 'Consider') return { action: 'CONSIDER', why: `scorer Consider — ${scored.reason}` };
  const gatedByLiveness = /gated: liveness/.test(scored.reason);
  const strong = networkRule.tiers.includes(sponsorship.tier);
  const funded = networkRule.funding_buckets.includes(funding.bucket);
  // An empty board is weak evidence: it can mean "not hiring" or "abandoned ATS account".
  if (gatedByLiveness && strong && board.job_count === 0)
    return { action: 'WATCH', why: `${sponsorship.tier} sponsor, but the board lists 0 jobs of any kind — may be an abandoned ATS account; find the real careers page` };
  if (gatedByLiveness && strong && funded)
    return { action: 'NETWORK', why: `no live matching posting, ${sponsorship.tier} sponsor, funding ${funding.bucket} — informational interview before a role opens (3 networking hours)` };
  if (gatedByLiveness && strong)
    return { action: 'WATCH', why: `no live matching posting, ${sponsorship.tier} sponsor, but funding ${funding.bucket} — re-check board later; low networking priority` };
  return { action: 'SKIP', why: `scorer Skip — ${scored.reason}` };
}
