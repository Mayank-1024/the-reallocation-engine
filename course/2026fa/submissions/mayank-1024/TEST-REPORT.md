# Test report — swe-network-targets

## Executive summary

This report records how the prototype was tested: the toolchain before and after the change, a run from a fresh copy of the branch, every named failure case, and proof that the change touches only this student's folders. The prototype reproduces its committed result exactly from a clean checkout, and all 13 offline tests pass. The repository's own checks pass once one missing Python package is installed. One privacy-scanner warning is pre-existing in the upstream repository, not part of this change. The one judgment no test can make, whether each job board really belongs to its company, is still open for a person.

## Environment

macOS (Darwin 25.2.0) · Node 24.8.0 (CI uses Node 20) · Python 3.14 (Homebrew) · fork of nikbearbrown/the-reallocation-engine at base `015843d`.

## Toolchain baseline: before any change (base `015843d`)

`npm run doctor` (tail):
```
  ✓ no private/PII paths are tracked

RECIPES (33)
  with lifecycle frontmatter: 33   missing: 0
  by status: DRAFT 28 · RUNNABLE-SAMPLE 4 · RUNNABLE-LIVE  # DRAFT | SPECIFIED | RUNNABLE-SAMPLE | RUNNABLE-LIVE | VERIFIED 1
  open TODOs: 318 declared (in frontmatter) · 318 [TODO markers in bodies

SUMMARY
  environment: ✓ runnable
  recipes: 33/33 carry lifecycle frontmatter — all tracked
  next: continue
EXIT 0
```

`npm run verify`, system Python (fails, no PyYAML):
```
ModuleNotFoundError: No module named 'yaml'

ERROR (1):
  E1 .ai/manifest.yaml does not parse: Error: Command failed: python3 -c "import yaml,json;print(json.dumps(yaml.safe_load(open('.ai/manifest.yaml'))))"

✗ manifest check FAILED (1 error)
EXIT 1
```

`pip install --user pyyaml` is refused under PEP 668, and `python3 -m venv` fails at ensurepip on this Homebrew Python. Workaround: `uv venv` + `uv pip install pyyaml` in a scratch directory, put first on PATH for `verify` only (CI does the equivalent with `pip install pyyaml`). With it:
```
  W1 ignore path not in .gitignore: archive/
  W2 private path not gitignored (PII/secret risk): private/
  W2 private path not gitignored (PII/secret risk): data/ats/

✓ manifest check passed (3 warnings)
EXIT 0
```

## Clean checkout of the branch

Run by Claude Code in Mayank's session on 2026-10-03: `git worktree add <scratch>/clean HEAD` at `a87d91d043b42913524b5180dc118718fb05cd81` (the final code commit; later commits change documentation only), then `npm ci`, then the commands below with the repo `.venv` (PyYAML) active. Mayank separately re-ran the prototype, the tests, a break attempt, and a G4 liveness check in Mayank's own terminal on 2026-10-03 (WORKED-RUN.md, rows marked (MB); FRICTIONAL.md). Mayank also ran a fresh clone of the pushed branch (below).

```
SUMMARY
  environment: ✓ runnable
  recipes: 33/33 carry lifecycle frontmatter — all tracked
  next: continue
[exit 0]


✓ manifest check passed (3 warnings)
[exit 0]

$ node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs --out-dir private/clean-run
✓ 57 candidates → NETWORK 1 · APPLY 4 · CONSIDER 2 · WATCH 5 · UNVERIFIED 44 · SKIP 1
  scorer: ✓ scored 13 roles → Apply 4 · Consider 2 · Skip 7 (skip 54%)
  private/clean-run/network-targets.log.json  +  private/clean-run/network-targets.report.md
  ! DATAROBOT INC: in-csv-but-not-a-candidate (state/title/approval filter)
  ! DYNOCARDIA INC: in-csv-but-not-a-candidate (state/title/approval filter)
[exit 0]

$ node --test scripts/contrib/2026fa/mayank-1024-swe-network-targets/test/network-targets.test.mjs
✔ CSV parser keeps quoted commas and blank cells (0.920041ms)
✔ sponsorship tier: blank approvals is NoRecord, never zero (0.06925ms)
✔ timeline gate refuses a past OPT end date instead of emitting a factor (0.1725ms)
✔ board evidence: excluded titles, wrong location, and empty boards do not count as live (0.396875ms)
✔ funding recency with no date is no-record, not stale (0.064375ms)
✔ fixture run: every bucket appears and the real scorer produced the decisions (59.492709ms)
✔ fixture run: every evidence value carries an allowed source label; no model judgments (60.053125ms)
✔ fixture run: report opens with an executive summary; names-not-in-CSV are reported, not scored (60.774583ms)
✔ failure: OPT end date already past → exit 3, nothing written (29.065709ms)
✔ failure: timeline gate closed → every company SKIP, including high-scoring ones (59.17725ms)
✔ failure: an authorization string the scorer reads as "no sponsorship needed" aborts (exit 4) (60.126625ms)
✔ failure: missing CSV and schema drift → exit 2 with a reason (57.585125ms)
✔ guard: refuses to write over tracked repo output (28.399334ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 457.456084
[exit 0]

$ node scripts/conformance.mjs scripts/contrib/2026fa/mayank-1024-swe-network-targets/
conformance: 14 files (1 md · 9 json · 4 js)
✓ all conform (machine half of P4). Adequacy is still the human gate.
[exit 0]
```

The action counts from the clean checkout were compared programmatically with the committed `runs/2026-10-02/network-targets.log.json`: `identical to committed run: True {'NETWORK': 1, 'APPLY': 4, 'CONSIDER': 2, 'WATCH': 5, 'UNVERIFIED': 44, 'SKIP': 1}`.

### Fresh clone run by Mayank (2026-10-03, branch at `5e8a0c8`)

```
$ cd ~/Desktop && git clone -b contrib/2026fa-mayank-1024-swe-network-targets https://github.com/Mayank-1024/the-reallocation-engine.git re-check && cd re-check && npm install && node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs
Cloning into 're-check'...
Receiving objects: 100% (1203/1203), 14.78 MiB | 19.08 MiB/s, done.
Resolving deltas: 100% (281/281), done.
npm warn deprecated glob@10.5.0: Old versions of glob are not supported, ... contacting <npm author address, redacted>
added 74 packages, and audited 75 packages in 1s
3 high severity vulnerabilities
✓ 57 candidates → NETWORK 1 · APPLY 4 · CONSIDER 2 · WATCH 5 · UNVERIFIED 44 · SKIP 1
  scorer: ✓ scored 13 roles → Apply 4 · Consider 2 · Skip 7 (skip 54%)
  course/2026fa/submissions/mayank-1024/runs/2026-10-02/network-targets.log.json  +  course/2026fa/submissions/mayank-1024/runs/2026-10-02/network-targets.report.md
  ! DATAROBOT INC: in-csv-but-not-a-candidate (state/title/approval filter)
  ! DYNOCARDIA INC: in-csv-but-not-a-candidate (state/title/approval filter)
```

Same counts as the committed run. Some git and npm progress lines are trimmed, and the npm author address in the upstream `glob` deprecation warning is redacted. The warning and the `npm audit` count come from the repo's own `package.json` dependencies, which this branch does not change.

## Failure cases exercised

| Case | Command / fixture | Result |
|---|---|---|
| OPT end date already past | `--persona fixtures/persona.opt-past.json` | `✗ timeline gate: OPT end date 2026-09-01 is not after as_of 2026-10-02 (-31 days) — window closed; nothing to score` · exit 3 · no output dir |
| Timeline gate closed (40 days left, 75-day lag) | `--persona fixtures/persona.tight-timeline.json` | 57/57 SKIP, factor 0 · exit 0 |
| Authorization string read as "no sponsorship needed" | `--persona fixtures/persona.authorized-trap.json` | `✗ scorer read the profile as NOT needing sponsorship…` · exit 4 |
| Writing over tracked output | `--out-dir data/examples` | refused · exit 2 · `data/examples/role-scores.json` unchanged (test) |
| Missing CSV | `--csv …/nope.csv` | `✗ 80 Days CSV not found` · exit 2 |
| CSV schema drift | test writes a 2-column CSV | `missing columns` · exit 2 |
| Board not found / unmapped | 44 real companies; fixture `ECHO NOBOARD INC` | UNVERIFIED, absent from `roles.json` |
| Company in board map but not in CSV | fixture `GHOST CO INC` | `errors[]`: `not-in-80-days-csv` |
| Blank H-1B cells | fixture `FOXTROT NORECORD INC` | not a candidate, reported in `errors[]` |
| Fabricated posting URL | `npm run ats:liveness -- …/coherehealth/jobs/1` | `❌ expired` (redirect `?error=true`) |
| Test-suite mutants | unchecked-board-is-live; exclude-ignored | each made 2/13 fail; restored → 13/13 |

Full pasted output for each is in `WORKED-RUN.md`.

## Privacy

```
$ node scripts/pii-scan.mjs --diff upstream/main
pii-scan: clean ✓
```

Working-tree scan (`node scripts/pii-scan.mjs`) reports one finding, in a file this branch does not touch:

```
  [email] package-lock.json — <npm-author-address, redacted here so this report does not re-add it>
```

It is the npm package author's address inside the upstream lockfile (present at the "Fall 2026 fresh cut" commit `d08afdd`). This branch does not modify `package-lock.json`: a local `npm install` modified it, and that change was reverted with `git checkout package-lock.json`. Commits on this branch use the GitHub noreply address.

## Scope

```
$ git diff --stat upstream/main...HEAD      # at a87d91d
 .../2026fa/submissions/mayank-1024/CHANGE-BRIEF.md |   74 +
 .../mayank-1024/DOMAIN-JUSTIFICATION.md            |   33 +
 .../2026fa/submissions/mayank-1024/FRICTIONAL.md   |   98 +
 course/2026fa/submissions/mayank-1024/README.md    |   45 +
 course/2026fa/submissions/mayank-1024/SOURCES.md   |   44 +
 .../2026fa/submissions/mayank-1024/TEST-REPORT.md  |  200 +
 .../2026fa/submissions/mayank-1024/WORKED-RUN.md   |  280 ++
 .../boards-snapshot.json                           | 2589 +++++++++++
 .../network-targets.log.json                       | 4911 ++++++++++++++++++++
 .../network-targets.report.md                      |   71 +
 .../role-scores.json                               |  491 ++
 .../role-scores.md                                 |   23 +
 .../roles.json                                     |  236 +
 .../scorer-profile.json                            |    3 +
 .../runs/2026-10-02/network-targets.log.json       | 4864 +++++++++++++++++++
 .../runs/2026-10-02/network-targets.report.md      |   74 +
 .../mayank-1024/runs/2026-10-02/role-scores.json   |  491 ++
 .../mayank-1024/runs/2026-10-02/role-scores.md     |   23 +
 .../mayank-1024/runs/2026-10-02/roles.json         |  236 +
 .../runs/2026-10-02/scorer-profile.json            |    3 +
 .../runs/engine-baseline/role-scores.json          |  241 +
 .../runs/engine-baseline/role-scores.md            |   15 +
 logs/runs/2026fa-mayank-1024-1.md                  |   12 +
 .../2026fa/mayank-1024-swe-network-targets.card.md |   73 +
 .../2026fa/mayank-1024-swe-network-targets.md      |  171 +
 .../mayank-1024-swe-network-targets/README.md      |   63 +
 .../mayank-1024-swe-network-targets/board-map.json |  182 +
 .../fixtures/boards.fixture.json                   |   25 +
 .../fixtures/formd/companies-fixture-d.sample.json |    7 +
 .../fixtures/mini-80days.csv                       |    9 +
 .../fixtures/no-network.mjs                        |    3 +
 .../fixtures/persona.authorized-trap.json          |   75 +
 .../fixtures/persona.fixture.json                  |   75 +
 .../fixtures/persona.opt-past.json                 |   75 +
 .../fixtures/persona.tight-timeline.json           |   75 +
 .../2026fa/mayank-1024-swe-network-targets/lib.mjs |  138 +
 .../network-targets.mjs                            |  371 ++
 .../persona.example.json                           |   38 +
 .../snapshots/boards-2026-10-02.json               | 2589 +++++++++++
 .../test/network-targets.test.mjs                  |  165 +
 40 files changed, 19191 insertions(+)

$ git diff --name-only upstream/main...HEAD | cut -d/ -f1-3 | sort -u
course/2026fa/submissions
logs/runs/2026fa-mayank-1024-1.md
recipes/cases/2026fa
scripts/contrib/2026fa
```

Every path is under `scripts/contrib/2026fa/mayank-1024-swe-network-targets/`, `recipes/cases/2026fa/mayank-1024-*`, `logs/runs/2026fa-mayank-1024-1.md`, or `course/2026fa/submissions/mayank-1024/`. `logs/RUN_LOG.md`, `package.json`, and other students' folders are untouched. (This report's own update is a later commit in the same namespace.)

## What a person still has to judge

- **G3:** that each of the 13 careers URLs in `board-map.json` belongs to its CSV company (`identity_confirmed` is `false` for all).
- **G4:** posting-level liveness for each APPLY/CONSIDER posting before applying (two URLs checked: Cohere Health by Claude, PathAI by Mayank).
- **G5:** Mayank judged Abacus Insights' "Senior AI Engineer" a target role on 2026-10-03 (override NETWORK → APPLY). Iterative Health's "Applied AI Engineer" and Abacus' "Principal Software Architect" are still open.
- Whether the 24-month funding window, the tier thresholds, and the 75-day hiring lag are sensible. They were fixed before results were seen, but they remain one person's assumptions.
