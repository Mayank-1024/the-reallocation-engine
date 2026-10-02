# Sources and contributions — swe-network-targets

## Executive summary

This page credits everything the submission was built on: the course repository and its rules, the public datasets, the job-board APIs, and the AI coding agent that wrote most of the code and drafts. It also says plainly which decisions were Mayank's and which work was Claude's, so a reviewer can ask about either.

## Repository and governing documents

- *The Reallocation Engine*, nikbearbrown/the-reallocation-engine, forked at commit `015843d5` (2026-10-02): `SNICKERDOODLE.md`, `DOMAIN.md`, `CONTRIBUTING.md`, `DATA_CONTRACT.md` §Zero-Conditions, `recipes/_shared.md`.
- Style models: `recipes/local-wage-adjustment.md`, `recipes/local-wage-adjustment.card.md`, `recipes/scan.md`.
- Reused code, unchanged: `scripts/score/role-scorer.mjs`; `scripts/ats/providers/{greenhouse,lever,ashby,_http}.mjs`; `scripts/ats/check-liveness.mjs`; `scripts/conformance.mjs`; `scripts/pii-scan.mjs`; `scripts/doctor.mjs`.
- Example values copied: the Proven/Likely sponsorship p values (0.9 / 0.6) from `data/examples/ch11-roles.json`.

## Data

- 80 Days to Stay CSV, `data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv` (shipped with the repo; see its README and `data/80-days-to-stay/data/*-audit.md`).
- SEC Form D processed samples, `data/sec/form-d/processed/sample/*.sample.json` (shipped).
- Public ATS job-board APIs, read-only, 2026-10-02: `boards-api.greenhouse.io`, `api.lever.co`, `api.ashbyhq.com`. The captured responses are in `snapshots/boards-2026-10-02.json`. One posting page was fetched through `npm run ats:liveness`.
- Persona: fictional. No real person's data is used or committed.
- Essay context: Nik Bear Brown, *The 3-3-2 Split*. No figures from it are cited, so none needed tracing.

## Tools

- Claude Code (Anthropic, model Claude Opus 5.5) in VS Code, one session on 2026-10-02.
- Node 24.8.0, Python 3.14 (Homebrew), `uv` (scratchpad venv for PyYAML), Playwright Chromium, `gh` CLI.

## Who did what

| Work | Mayank | Claude |
|---|---|---|
| Career situation (MS CS/SWE, F-1 OPT) and recipe angle (network-targets) | chose | offered options |
| Permission to fork, branch, and (later) push / open the PR | granted | asked |
| Reading the repo, finding the data facts (0 CSV∩Form D overlap; all-even counts; scorer `?? 1` default; pre-existing lockfile PII flag) | reviewed | found and reported |
| Probing ATS boards and proposing slugs (`board-map.json`) | to confirm (G3) | proposed |
| Prototype code, fixtures, tests, mutation checks | reviewed | wrote |
| Persona thresholds (tiers, 24-month funding window, 75-day lag, patterns) | ____ accepted / changed | proposed |
| The run-1 bug (manager/contractor matches) and fix | ____ | spotted by reading the report; wrote the fix |
| Status DRAFT (not RUNNABLE-SAMPLE) | ____ | recommended, from the lifecycle rule |
| Recipe, card, brief, justification, worked run, test report | reviewed / edited: ____ | drafted |
| FRICTIONAL entries, reflection, attestation name | **writes** | supplied factual event list only |
| Time-saved estimate | ____ | estimated; not measured |

**What I (Mayank) rejected or changed from Claude's drafts:** ____
