# Worked run — swe-network-targets, 2026-10-02

## Executive summary

This document shows the prototype run on real repository data and on live job boards for a fictional Boston-area backend engineer on F-1 OPT. All terminal output is pasted, not described. The first live run had a bug: it counted manager and contractor postings as software-engineering openings, so it told the persona to apply to a company with no real opening. After a fix to the title rule, applied before any other change, the same board data produced one real "network, don't apply" target (Abacus Insights), four apply candidates, two to consider, five to watch, one skip, and 44 companies the tool honestly could not check. One target was cross-checked by hand against the source CSV and the live board. Six deliberate break attempts each failed the way the recipe says they should.

## Inputs

- **Persona** (fictional, all `your-input`): `scripts/contrib/2026fa/mayank-1024-swe-network-targets/persona.example.json`. MS CS, F-1 post-completion OPT ending 2027-06-30, as of 2026-10-02, hiring-lag assumption 75 days, Massachusetts, backend/platform/full-stack titles.
- **Sponsor records:** `data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv` (30,369 rows; sha256 `eccdee2addf472b1…`).
- **Form D:** the four shipped `*.sample.json` files (200 filings).
- **Boards:** `board-map.json` (27 companies; slugs proposed by probing, none human-confirmed). Live capture saved as `snapshots/boards-2026-10-02.json`.

## Commands and real output

### Engine baseline (assignment "run the engine once")

```
$ npm run ats:scan -- --dry-run
> node scripts/ats/scan.mjs --dry-run
Error: portals.yml not found. Run onboarding first.
EXIT 1
$ cp data/ats/portals.example.yml data/ats/portals.yml     # gitignored
$ npm run ats:scan -- --dry-run
  ... (tail)
  + Databricks | Staff Unified Communications Engineer | San Francisco, California; United States
  + Databricks | Strategic Account Executive - Retail vertical  | Remote - California
(dry run — run without --dry-run to save results)
EXIT 0
$ npm run score -- data/examples/ch11-roles.json --out-dir course/2026fa/submissions/mayank-1024/runs/engine-baseline
✓ scored 5 roles → Apply 2 · Consider 1 · Skip 2 (skip 40%)
EXIT 0
```

### Run 1: live boards, before the fix

```
$ node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs --live --out-dir course/2026fa/submissions/mayank-1024/runs/2026-10-02-live
live: fetching ATS boards listed in scripts/contrib/2026fa/mayank-1024-swe-network-targets/board-map.json
  board COHERE HEALTH INC            ok (76 jobs)
  board KLAVIYO INC                  ok (134 jobs)
  board OVERJET INC                  ok (22 jobs)
  board LENDBUZZ INC                 ok (56 jobs)
  board PATHAI INC                   ok (17 jobs)
  board ABACUS INSIGHTS INC          ok (12 jobs)
  board ACUITYMD INC                 ok (11 jobs)
  board CLOAKED INC                  ok (15 jobs)
  board 1UPHEALTH INC                ok (0 jobs)
  board LOOKOUT INC                  ok (4 jobs)
  board TULIP INTERFACES INC         ok (69 jobs)
  board FAIRMARKIT INC               ok (5 jobs)
  board ITERATIVE SCOPES INC         ok (61 jobs)
✓ 57 candidates → NETWORK 0 · APPLY 5 · CONSIDER 2 · WATCH 5 · UNVERIFIED 44 · SKIP 1
  scorer: ✓ scored 13 roles → Apply 5 · Consider 2 · Skip 6 (skip 46%)
  course/2026fa/submissions/mayank-1024/runs/2026-10-02-live/network-targets.log.json  +  course/2026fa/submissions/mayank-1024/runs/2026-10-02-live/network-targets.report.md
  ! DATAROBOT INC: in-csv-but-not-a-candidate (state/title/approval filter)
  ! DYNOCARDIA INC: in-csv-but-not-a-candidate (state/title/approval filter)
```

(Folder later renamed to `runs/2026-10-02-live-run1-before-exclude-fix/` and kept as evidence.) Reading the report showed Abacus Insights as **APPLY**, matched on exactly these two postings:

```
APPLY ['Contractor:  DevOps Engineer', 'Senior Manager, Engineering (DevOps, Infrastructure, and Release Engineering)']
```

Neither is a sponsorable individual-contributor SWE role. Fix: added `exclude_title_pattern` (`manager|director|head of|\bvp\b|principal|contract|intern`) to the persona. The funding window and tier thresholds were **not** touched.

### Run 2: the same board data (committed snapshot), after the fix

```
$ node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs
✓ 57 candidates → NETWORK 1 · APPLY 4 · CONSIDER 2 · WATCH 5 · UNVERIFIED 44 · SKIP 1
  scorer: ✓ scored 13 roles → Apply 4 · Consider 2 · Skip 7 (skip 54%)
  course/2026fa/submissions/mayank-1024/runs/2026-10-02/network-targets.log.json  +  course/2026fa/submissions/mayank-1024/runs/2026-10-02/network-targets.report.md
  ! DATAROBOT INC: in-csv-but-not-a-candidate (state/title/approval filter)
  ! DYNOCARDIA INC: in-csv-but-not-a-candidate (state/title/approval filter)

```

Report excerpt (`runs/2026-10-02/network-targets.report.md`):

```
## Network, don't apply (1)
| Company | Sponsor tier *(your-input rule)* | Approvals / rate *(record)* | Latest funding *(record)* | Board *(record)* |
|---|---|---|---|---|
| ABACUS INSIGHTS INC | Proven | 22 / 100% | 2024-10-01 (recent) | 12 jobs, 0 match |
- **ABACUS INSIGHTS INC** — adjacent engineering titles a human should read: Senior AI Engineer — United States; Senior AI Systems Quality Engineer — United States; Sr. Sustaining and Forward Deployed Engineer — United States
```

Scorer trace for that row (`runs/2026-10-02/role-scores.md`, written by `scripts/score/role-scorer.mjs`):

```
| ABACUS INSIGHTS INC — (no matching live posting on board) | 0.000 | **Skip** | gated: liveness ≈ 0.000 (a closed gate zeroes the composite regardless of votes) | sponsorship 0.9·0.35 [record] × liveness 0[record]×timeline 1[your-input] |
```

| Pile | Companies |
|---|---|
| NETWORK | Abacus Insights |
| APPLY | Cohere Health, Klaviyo, Lendbuzz, PathAI |
| CONSIDER | AcuityMD, Tulip Interfaces (Likely tier: 16 and 18 approvals, below the 20 needed for Proven) |
| WATCH | Overjet, Lookout (Proven, funding 2024-02 / 2021-03); Cloaked, Iterative Scopes (Likely, funding stale); 1upHealth (board lists 0 jobs) |
| SKIP | Fairmarkit (Possible tier, 2 approvals) |
| UNVERIFIED | 44: no board on the three ATSs, ambiguous (Regent Craft), or never mapped |

### Tests

```
$ node --test scripts/contrib/2026fa/mayank-1024-swe-network-targets/test/network-targets.test.mjs
✔ CSV parser keeps quoted commas and blank cells (1.203958ms)
✔ sponsorship tier: blank approvals is NoRecord, never zero (0.072958ms)
✔ timeline gate refuses a past OPT end date instead of emitting a factor (0.908834ms)
✔ board evidence: excluded titles, wrong location, and empty boards do not count as live (1.286958ms)
✔ funding recency with no date is no-record, not stale (0.081875ms)
✔ fixture run: every bucket appears and the real scorer produced the decisions (84.867625ms)
✔ fixture run: every evidence value carries an allowed source label; no model judgments (61.502209ms)
✔ fixture run: report opens with an executive summary; names-not-in-CSV are reported, not scored (66.799041ms)
✔ failure: OPT end date already past → exit 3, nothing written (28.333875ms)
✔ failure: timeline gate closed → every company SKIP, including high-scoring ones (59.2015ms)
✔ failure: an authorization string the scorer reads as "no sponsorship needed" aborts (exit 4) (59.513875ms)
✔ failure: missing CSV and schema drift → exit 2 with a reason (58.875875ms)
✔ guard: refuses to write over tracked repo output (27.846542ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 507.423541

```

## Verified vs. inferred (Abacus Insights row, line by line)

| Value | Label | Where it came from |
|---|---|---|
| 22 approvals, 0 denials, 100% rate | record | CSV `Total Approvals`, `Total Denials`, `Approval_Rate` (caveat: all counts even) |
| sponsored titles "Software Engineer", "Business Analyst Manager…" | record | CSV `top_job_titles_sponsored` |
| Series A, 2024-10-01 | record | CSV `latest_funding_stage/date` (Form D-derived upstream) |
| not in Form D sample | record | the 4 sample files. Absence in a sample is **not** "no filing" |
| 12 jobs, 0 matching | record | Greenhouse board API at 2026-10-02T19:27Z |
| board `abacusinsights` is this company | **your-input, unconfirmed** | slug guessed from website domain (G3 pending) |
| tier Proven, p 0.9 | your-input rule | ≥20 approvals and ≥90% rate |
| funding "recent" | your-input rule | ≤24 months before as-of |
| timeline factor 1.0 | your-input | 271 days left − 75-day lag = 196 ≥ 120 |
| composite 0, Skip (gated) | scorer output | `role-scorer.mjs` |
| NETWORK | your-input rule applied to scorer output | gated by liveness + Proven + recent |
| fit | **not present** | no fit signal measured; none invented |
| model-judgment values | **0** | `model_judgment_values: 0` in the log |

## Verification

**Hand cross-check against the source CSV and the live board:**

```
$ grep "^ABACUS INSIGHTS INC" data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv | python3 -c "import csv,sys; r=next(csv.reader(sys.stdin)); print(r[0], r[3], r[4], r[13], r[14], r[15], r[16], r[17], r[19])"
ABACUS INSIGHTS INC BOSTON MA Series A 2024-10-01 22.0 0.0 100.0 ['Software Engineer', 'Business Analyst Manager - Data Distribution Team']
$ curl -s https://boards-api.greenhouse.io/v1/boards/abacusinsights/jobs | python3 -c "..." # titles + locations, live
  Business Solution Manager | United States
  Contractor:  DevOps Engineer | United States
  Growth Analytics Manager, Payment Integrity | United States
  Manager, Client Data Engineering | Nepal
  Principal Software Architect | United States
  Sales Operations Analyst | India
  Senior AI Engineer | United States
  Senior AI Systems Quality Engineer | United States
  Senior Manager, Engineering (DevOps, Infrastructure, and Release Engineering) | Remote US
  Solution Architect | United States
  Sr. Sustaining and Forward Deployed Engineer | United States
  Sustaining and Forward Deployed Engineer | India
```

The CSV values match the report (22 / 0 / 100%, Series A 2024-10-01). The live board lists the same 12 jobs as the snapshot. Of the three title matches, the contractor and senior-manager postings are excluded by rule, and "Principal Software Architect" is excluded by `principal`. That last exclusion is debatable, and it is a G5 call for a person.

**Deliberate break attempts:**

```
$ node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs --persona scripts/contrib/2026fa/mayank-1024-swe-network-targets/fixtures/persona.opt-past.json --out-dir private/nt-break
✗ timeline gate: OPT end date 2026-09-01 is not after as_of 2026-10-02 (-31 days) — window closed; nothing to score
[exit 3]
```

```
$ node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs --persona scripts/contrib/2026fa/mayank-1024-swe-network-targets/fixtures/persona.authorized-trap.json --out-dir private/nt-break
✗ scorer read the profile as NOT needing sponsorship (authorization "F-1 STEM OPT — work authorized (EAD)") — sponsorship weight would be 0; fix the persona string
[exit 4]
```

```
$ node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs --persona scripts/contrib/2026fa/mayank-1024-swe-network-targets/fixtures/persona.tight-timeline.json --out-dir private/nt-tight
✓ 57 candidates → NETWORK 0 · APPLY 0 · CONSIDER 0 · WATCH 0 · UNVERIFIED 0 · SKIP 57
  scorer: ✓ scored 13 roles → Apply 0 · Consider 0 · Skip 13 (skip 100%)
  private/nt-tight/network-targets.log.json  +  private/nt-tight/network-targets.report.md
  ! DATAROBOT INC: in-csv-but-not-a-candidate (state/title/approval filter)
  ! DYNOCARDIA INC: in-csv-but-not-a-candidate (state/title/approval filter)
[exit 0]
tight actions: {'NETWORK': 0, 'APPLY': 0, 'CONSIDER': 0, 'WATCH': 0, 'UNVERIFIED': 0, 'SKIP': 57} {'days_left': 40, 'hiring_lag_days': 75, 'slack_days': -35, 'factor': 0, 'opt_end_date': '2026-11-11', 'source': 'your-input'}
```

```
$ node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs --out-dir data/examples
✗ --out-dir data/examples is outside course/2026fa/submissions/mayank-1024/, private/, this prototype's folder, or the OS temp dir — refusing to write
[exit 2]
```

```
$ node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs --csv data/80-days-to-stay/80-days-csv/nope.csv
✗ 80 Days CSV not found: data/80-days-to-stay/80-days-csv/nope.csv
[exit 2]
```

Posting-level liveness (gate G4) on a real posting and on a fabricated job id:

```
$ npm run ats:liveness -- https://job-boards.greenhouse.io/coherehealth/jobs/7930480003 https://job-boards.greenhouse.io/coherehealth/jobs/1
Checking 2 URL(s)...

✅ active     https://job-boards.greenhouse.io/coherehealth/jobs/7930480003
❌ expired    https://job-boards.greenhouse.io/coherehealth/jobs/1
           redirect to https://job-boards.greenhouse.io/coherehealth?error=true

Results: 1 active  1 expired  0 uncertain
EXIT 1
```

(The first attempt failed with `browserType.launch: Executable doesn't exist`. A fresh clone needs `npx playwright install chromium`.)

**Mutation check of the test suite.** Two mutants were applied to `lib.mjs` temporarily: "unchecked board counts as live", and "exclude pattern ignored". Each made 2 of the 13 tests fail. Restoring the file brought the suite back to 13/13.

## Reflection

Observed facts (recorded during the session):
- **Worked:** reusing the existing providers and scorer kept the prototype small, and the scorer's trace made the run-1 bug visible in one line.
- **Got wrong:** run 1's title rule (false APPLY). A `|` in a placeholder title broke the scorer's Markdown table.
- **Missed:** 77% of candidates are unverified. Funding data ends 2025-09, so the "recent" window is narrow. The approval-count doubling is flagged but unresolved.
- **Next concrete improvement:** recipe TODO 1, automatic posting-level liveness for every APPLY/CONSIDER URL, because the board listing alone does not prove a posting accepts applications.

**Mayank's reflection (own words):**
> ____

## Attestation
- Recipe: swe-network-targets v0.1.0
- By: ____ (name) · 2026-10-02

### Tested
| Ran | Saw | Expected |
|---|---|---|
| `network-targets.mjs` (offline snapshot) | 57 candidates → NETWORK 1 · APPLY 4 · CONSIDER 2 · WATCH 5 · UNVERIFIED 44 · SKIP 1; scorer skip 54% | ≥50% skipped by the scorer; every unchecked company UNVERIFIED |
| `network-targets.mjs --live` (run 1) | Abacus APPLY on contractor/manager postings | no APPLY without an IC SWE posting → **bug found**, fixed |
| hand cross-check of Abacus vs CSV row and live board | 22 / 0 / 100%, Series A 2024-10-01; 12 jobs, 0 IC SWE in US | report values equal source values |
| break: OPT end date in the past | exit 3, nothing written | refuse, write nothing |
| break: "work authorized (EAD)" authorization string | exit 4 | refuse rather than score with sponsorship weight 0 |
| break: 40 days left, 75-day lag | 57/57 SKIP, timeline factor 0 | gate zeroes everything, including Proven sponsors with openings |
| break: `--out-dir data/examples` | exit 2, tracked file unchanged | refuse |
| break: missing CSV | exit 2 | refuse with path |
| break: fabricated posting URL through `ats:liveness` | `expired` (redirect ?error=true) | not active |
| `node --test …/network-targets.test.mjs` | 13/13 pass; 2 mutants each caught | pass; mutants fail |

### Did not test
- Whether any board in `board-map.json` truly belongs to its CSV company (G3 not cleared by a person).
- Posting-level liveness for the 4 APPLY / 2 CONSIDER companies beyond the single Cohere Health URL.
- Any USCIS or DOL source to confirm the even-count doubling hypothesis.
- The 44 UNVERIFIED companies on Workday, iCIMS, or company sites.
- Real personal dates (only the fictional persona was run in committed outputs).
- Node 20 specifically. Runs were on Node 24.8.0. CI uses Node 20.

### Broke during testing, fixed
- Title pattern matched manager/contractor postings → `exclude_title_pattern` in `persona.example.json` (run 1 → run 2).
- Placeholder title contained the regex, whose `|` broke `role-scores.md` table rows → fixed title string in `network-targets.mjs`.
- Out-dir guard refused `private/` and macOS `/tmp` → `private/` allowed (gitignored) in `network-targets.mjs`.
- `node --test <directory>` fails on Node 24 → the documented test command names the file.
