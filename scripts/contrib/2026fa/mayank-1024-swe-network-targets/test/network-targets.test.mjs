// Offline tests for the swe-network-targets prototype.
//   node --test scripts/contrib/2026fa/mayank-1024-swe-network-targets/test/
//
// No network: every spawned process preloads fixtures/no-network.mjs, which makes
// fetch() throw. The end-to-end cases run the REAL scripts/score/role-scorer.mjs —
// nothing here re-implements the composite.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  parseCsv, parseTitleList, sponsorshipTier, timelineGate, boardEvidence, fundingRecency,
} from '../lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, '..');
const ROOT = path.resolve(DIR, '../../../..');
const FX = path.join(DIR, 'fixtures');
const CLI = path.join(DIR, 'network-targets.mjs');
const persona = JSON.parse(fs.readFileSync(path.join(FX, 'persona.fixture.json'), 'utf8'));

function run(extra, { personaFile = 'persona.fixture.json', csv = path.join(FX, 'mini-80days.csv') } = {}) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'nt-'));
  fs.rmSync(out, { recursive: true });
  const args = [CLI, '--persona', path.join(FX, personaFile), '--csv', csv,
    '--formd-dir', path.join(FX, 'formd'), '--boards', path.join(FX, 'boards.fixture.json'), '--out-dir', out, ...extra];
  const res = spawnSync(process.execPath, args, {
    cwd: ROOT, encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: `--import ${pathToUrl(path.join(FX, 'no-network.mjs'))}` },
  });
  return { ...res, out };
}
const pathToUrl = (p) => new URL(`file://${p}`).href;
const readOut = (out, f) => JSON.parse(fs.readFileSync(path.join(out, f), 'utf8'));
const action = (log, name) => log.companies.find((c) => c.company === name)?.next.action;

// ── unit ────────────────────────────────────────────────────────────────────
test('CSV parser keeps quoted commas and blank cells', () => {
  const rows = parseCsv('a,b,c\n"x, y",,"[\'t1\', \'t2\']"\n');
  assert.equal(rows[0].a, 'x, y');
  assert.equal(rows[0].b, '');
  assert.deepEqual(parseTitleList(rows[0].c), ['t1', 't2']);
});

test('sponsorship tier: blank approvals is NoRecord, never zero', () => {
  const r = persona.sponsorship_rules;
  assert.deepEqual(sponsorshipTier(null, null, r), { tier: 'NoRecord', p: null });
  assert.equal(sponsorshipTier(22, 100, r).tier, 'Proven');
  assert.equal(sponsorshipTier(22, 80, r).tier, 'Likely'); // high count but low rate is not Proven
  assert.equal(sponsorshipTier(2, 100, r).tier, 'Possible');
});

test('timeline gate refuses a past OPT end date instead of emitting a factor', () => {
  assert.match(timelineGate({ ...persona, visa: { opt_end_date: '2026-09-01' } }).error, /not after as_of/);
  assert.equal(timelineGate(persona).factor, 1.0);
  assert.equal(timelineGate({ ...persona, visa: { opt_end_date: '2026-11-11' } }).factor, 0.0);
});

test('board evidence: excluded titles, wrong location, and empty boards do not count as live', () => {
  const t = new RegExp(persona.target.title_pattern, 'i');
  const l = new RegExp(persona.target.location_pattern, 'i');
  const a = new RegExp(persona.target.adjacent_title_pattern, 'i');
  const x = new RegExp(persona.target.exclude_title_pattern, 'i');
  const b = boardEvidence({ status: 'ok', jobs: [
    { title: 'Senior Manager, Engineering (DevOps)', location: 'Boston, MA' },
    { title: 'Backend Software Engineer', location: 'Budapest, Hungary' },
  ] }, t, l, a, x);
  assert.equal(b.factor, 0);
  assert.equal(b.title_match_wrong_location.length, 1);
  assert.equal(boardEvidence({ status: 'not_found' }, t, l, a, x).factor, null);
  assert.equal(boardEvidence(undefined, t, l, a, x).factor, null);
});

test('funding recency with no date is no-record, not stale', () => {
  assert.equal(fundingRecency('', '2026-10-02', persona.funding_windows).bucket, 'no-record');
  assert.equal(fundingRecency('2025-06-01', '2026-10-02', persona.funding_windows).bucket, 'recent');
});

// ── end to end, offline, through the real scorer ────────────────────────────
test('fixture run: every bucket appears and the real scorer produced the decisions', () => {
  const r = run([]);
  assert.equal(r.status, 0, r.stderr);
  const log = readOut(r.out, 'network-targets.log.json');
  assert.equal(action(log, 'ALPHA APPLY INC'), 'APPLY');
  assert.equal(action(log, 'BRAVO NETWORK, INC'), 'NETWORK');
  assert.equal(action(log, 'CHARLIE STALE INC'), 'WATCH');   // Likely sponsor, funding stale
  assert.equal(action(log, 'DELTA EMPTY INC'), 'WATCH');     // board lists 0 jobs
  assert.equal(action(log, 'ECHO NOBOARD INC'), 'UNVERIFIED');
  assert.equal(action(log, 'HOTEL POSSIBLE INC'), 'SKIP');   // Possible tier alone is below the floor
  assert.equal(log.funnel.candidates, 6);                    // FOXTROT (no record) and GOLF (NY) filtered out

  const scored = readOut(r.out, 'role-scores.json');
  assert.equal(scored._scorer, 'bayesian-role-scorer');      // output of scripts/score/role-scorer.mjs
  assert.equal(scored.profile_needs_sponsorship, true);
  const roles = readOut(r.out, 'roles.json');
  assert.ok(!roles.some((x) => x.company === 'ECHO NOBOARD INC'), 'unchecked board must not reach the scorer (it defaults liveness to 1)');
  assert.ok(roles.every((x) => typeof x.liveness.factor === 'number' && x.fit === undefined));
});

test('fixture run: every evidence value carries an allowed source label; no model judgments', () => {
  const r = run([]);
  const log = readOut(r.out, 'network-targets.log.json');
  const allowed = new Set(['record', 'model-judgment', 'your-input']);
  for (const c of log.companies)
    for (const [k, e] of Object.entries(c.evidence)) {
      if (k === 'board' && e.factor == null) { assert.equal(e.source, null); continue; } // unknown stays unlabeled-unknown
      assert.ok(allowed.has(e.source), `${c.company}.${k} has source ${e.source}`);
    }
  assert.equal(log.model_judgment_values, 0);
  const bravo = log.companies.find((c) => c.company === 'BRAVO NETWORK, INC');
  assert.notEqual(bravo.evidence.form_d_sample.value, 'not-in-sample');
  assert.equal(bravo.evidence.board.adjacent_titles.length, 1);
});

test('fixture run: report opens with an executive summary; names-not-in-CSV are reported, not scored', () => {
  const r = run([]);
  const md = fs.readFileSync(path.join(r.out, 'network-targets.report.md'), 'utf8');
  assert.match(md.split('\n').slice(0, 4).join('\n'), /## Executive summary/);
  const log = readOut(r.out, 'network-targets.log.json');
  assert.ok(log.errors.some((e) => e.company === 'GHOST CO INC' && /not-in-80-days-csv/.test(e.error)));
  assert.ok(log.errors.some((e) => e.company === 'FOXTROT NORECORD INC'));
});

// ── named failure cases ─────────────────────────────────────────────────────
test('failure: OPT end date already past → exit 3, nothing written', () => {
  const r = run([], { personaFile: 'persona.opt-past.json' });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /window closed/);
  assert.equal(fs.existsSync(r.out), false);
});

test('failure: timeline gate closed → every company SKIP, including high-scoring ones', () => {
  const r = run([], { personaFile: 'persona.tight-timeline.json' });
  assert.equal(r.status, 0, r.stderr);
  const log = readOut(r.out, 'network-targets.log.json');
  assert.ok(log.companies.every((c) => c.next.action === 'SKIP' && /timeline/.test(c.next.why)));
});

test('failure: an authorization string the scorer reads as "no sponsorship needed" aborts (exit 4)', () => {
  const r = run([], { personaFile: 'persona.authorized-trap.json' });
  assert.equal(r.status, 4);
  assert.match(r.stderr, /NOT needing sponsorship/);
});

test('failure: missing CSV and schema drift → exit 2 with a reason', () => {
  assert.equal(run([], { csv: path.join(FX, 'does-not-exist.csv') }).status, 2);
  const drift = path.join(os.tmpdir(), 'nt-drift.csv');
  fs.writeFileSync(drift, 'company_name,state\nX,MA\n');
  const r = run([], { csv: drift });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /missing columns/);
});

test('guard: refuses to write over tracked repo output', () => {
  const tracked = path.join(ROOT, 'data/examples/role-scores.json');
  const before = fs.readFileSync(tracked, 'utf8');
  const res = spawnSync(process.execPath, [CLI, '--persona', path.join(FX, 'persona.fixture.json'), '--csv', path.join(FX, 'mini-80days.csv'),
    '--formd-dir', path.join(FX, 'formd'), '--boards', path.join(FX, 'boards.fixture.json'), '--out-dir', 'data/examples'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(res.status, 2);
  assert.equal(fs.readFileSync(tracked, 'utf8'), before);
});
