# The Reallocation Engine — Recipe Design Assignment · Mayank Bhadrasen (Mayank-1024)

## Executive summary

This folder is Mayank Bhadrasen's submission for INFO 7375 (Fall 2026), *The Reallocation Engine — Recipe Design Assignment*. It designs a recipe for a computer-science master's graduate on F-1 OPT in Massachusetts. The recipe finds companies with a record of sponsoring software engineers that have no matching opening today, so they're worth networking with before a role opens. It also finds the companies to apply to, consider, watch, or skip. A small prototype runs the recipe end to end on the repository's data, with offline tests. The lifecycle stage claimed is **DRAFT**: the sample run is complete, but six proposed additions are still open. The headline limitation is that **44 of 57 companies couldn't be checked**.

## Contents

| File | What it is |
|---|---|
| `CHANGE-BRIEF.md` | situation, reuse, gates, predicted failure cases, predictions (with an honest timing note) |
| `DOMAIN-JUSTIFICATION.md` | the information asymmetry, engine layers, 3-3-2 fit (time saved is an estimate), failure modes |
| `WORKED-RUN.md` | real commands with pasted output, verified-vs-inferred split, break attempts, reflection, attestation |
| `TEST-REPORT.md` | toolchain before/after, clean-checkout run, failure cases, `git diff --stat` scope |
| `FRICTIONAL.md` | dated log of attempts, friction, human vs AI contributions, linked to commits |
| `SOURCES.md` | credits; what Claude did vs what Mayank decided, checked, or overrode |
| `runs/2026-10-02/` | the committed sample run (report, JSON log, scorer output) |
| `runs/2026-10-02-live-run1-before-exclude-fix/` | first live run, kept as evidence of the bug it exposed |
| `runs/engine-baseline/` | the assignment's "run the engine once" scorer output |

Elsewhere in the repo (assigned namespaces):
- Recipe + card: `recipes/cases/2026fa/mayank-1024-swe-network-targets.md` and `.card.md`
- Prototype, tests, fixtures: `scripts/contrib/2026fa/mayank-1024-swe-network-targets/`
- Run-log entry: `logs/runs/2026fa-mayank-1024-1.md`

## Setup, run, test (from the repo root)

```bash
npm install                      # Node 20+
node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs
node --test scripts/contrib/2026fa/mayank-1024-swe-network-targets/test/network-targets.test.mjs
```

Expected first line of the run: `✓ 57 candidates → NETWORK 1 · APPLY 4 · CONSIDER 2 · WATCH 5 · UNVERIFIED 44 · SKIP 1`. Outputs go to `course/2026fa/submissions/mayank-1024/runs/2026-10-02/`.

Repo checks: `npm run doctor`, `node scripts/pii-scan.mjs`, and `npm run verify`. `verify` needs PyYAML; on macOS with Homebrew Python: `uv venv .venv && uv pip install -p .venv/bin/python pyyaml && source .venv/bin/activate`.

Optional: `--live` re-fetches job boards. `npm run ats:liveness -- <url>` checks one posting (needs `npx playwright install chromium` once).

## Credits and assistance

- Starting point: nikbearbrown/the-reallocation-engine (fork base `015843d`), its governing documents, the 80 Days to Stay CSV, and the SEC Form D samples. Reused unchanged: `scripts/score/role-scorer.mjs` and `scripts/ats/providers/`.
- Public job-board APIs (Greenhouse, Lever, Ashby), read-only, on 2026-10-02.
- AI assistance: Claude Code (Claude Opus 5.5) explored the repo, wrote the prototype and tests, and drafted the documents. Mayank chose the situation and angle, ran the checks recorded in `FRICTIONAL.md` (2026-10-03), and made the G4/G5 gate decisions. Full split in `SOURCES.md`.
- Folder note: the general GitHub-posting guide shows `fall-2025/first-name-last-initial/assignment-XX/`. This assignment assigns the namespaced paths above, and those are used.
