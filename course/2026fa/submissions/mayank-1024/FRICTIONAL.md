# FRICTIONAL — swe-network-targets

## Executive summary

This is the honest log of how the assignment went: what was tried, what broke, what was checked, and who did what. The **What happened** and **What Claude contributed** lines were recorded from the working session and point to evidence in the repo. The **I tried / expected** and **What I understand now** lines are Mayank's to write. They are left blank on purpose, because this log must hold Mayank's own experience, not an AI's account of it.

---

### 2026-10-02 — Choosing the situation and recipe
- **I tried / expected:** ____
- **What happened:** Claude cloned the repo read-only and listed the data. Mayank chose "MS CS/SWE, F-1 OPT" and the network-targets angle from four options, and approved forking to the Mayank-1024 account.
- **What Claude contributed:** the options and a recommendation (network-targets, because it feeds the networking hours and was expected to be less crowded). Later, `gh pr list` showed one other network-targets PR (engineering management) and one SWE sponsor-title PR.
- **What I understand now / still don't:** ____
- **Evidence:** branch `contrib/2026fa-mayank-1024-swe-network-targets`.

### 2026-10-02 — Toolchain baseline
- **I tried / expected:** ____
- **What happened:** `npm run verify` failed before any change (`ModuleNotFoundError: No module named 'yaml'`). `pip install --user pyyaml` was blocked by PEP 668, and `python3 -m venv` failed at ensurepip. A `uv` venv in the session scratchpad worked, and `verify` passed with it on PATH. `npm run ats:scan -- --dry-run` failed with "portals.yml not found" until `data/ats/portals.example.yml` was copied. `npm install` modified `package-lock.json`, which was reverted.
- **What Claude contributed:** ran the commands, chose not to use `--break-system-packages`.
- **What I understand now / still don't:** ____
- **Evidence:** TEST-REPORT.md "before" section.

### 2026-10-02 — Data surprises before any code
- **I tried / expected:** ____
- **What happened:** joining the 80 Days CSV to the four Form D samples by normalized name gave **0** matches (196 distinct sample names, 127 of them pooled funds). Every one of 1,557 approval counts and 1,557 denial counts is even. `role-scorer.mjs` uses `role.liveness?.factor ?? 1`, so an unchecked board would score as live.
- **What Claude contributed:** found all three and proposed the responses (Form D as presence-only; flag the doubling but don't fix it; keep unchecked boards out of the scorer).
- **Accepted / changed / rejected:** ____
- **What I understand now / still don't:** open question: is the doubling real? Next step: recipe TODO 3 (USCIS cross-check).
- **Evidence:** `data_anomalies` in `runs/2026-10-02/network-targets.log.json`. The test "unchecked board must not reach the scorer".

### 2026-10-02 — Board probing
- **I tried / expected:** ____
- **What happened:** probing 27 slugs found boards for 13 companies. "regent" answered on two ATSs. "lookout"'s board showed Canadian roles for a Boston CSV row. 1upHealth's boards had 0 jobs. Tulip's matching backend role was in Budapest. Fairmarkit's "Agentic AI Engineer (Boston)" was missed by the SWE regex.
- **What Claude contributed:** wrote the probe and the board map. Added the location filter, the WATCH-on-empty-board rule, and the adjacent-titles list. Set `identity_confirmed: false` everywhere.
- **What I understand now / still don't:** ____
- **Evidence:** `board-map.json`, `snapshots/boards-2026-10-02.json`.

### 2026-10-02 — Run 1 bug: false APPLY
- **I tried / expected:** ____
- **What happened:** the first live run put Abacus Insights in APPLY, matched on "Contractor: DevOps Engineer" and "Senior Manager, Engineering (DevOps…)". An `exclude_title_pattern` was added, and on the same snapshot Abacus became the one NETWORK target. The 24-month funding window was deliberately left alone, even though it was the reason NETWORK was 0 for every other company.
- **What Claude contributed:** spotted it by reading the generated report, then wrote the fix.
- **What I understand now / still don't:** ____
- **Evidence:** `runs/2026-10-02-live-run1-before-exclude-fix/` vs `runs/2026-10-02/`. WORKED-RUN.md "Run 1".

### 2026-10-02 — Tests and break attempts
- **I tried / expected:** ____
- **What happened:** 13 tests passed on the first run. That was suspicious, so two mutants were applied to `lib.mjs`; each made 2 tests fail, and the file was restored. `node --test <dir>` does not work on Node 24, so the command names the file. Playwright needed `npx playwright install chromium` before `ats:liveness` would run. The scorer's `role-scores.md` table broke because a placeholder title contained `|`, which was fixed.
- **What Claude contributed:** wrote the tests and ran the mutants.
- **What I understand now / still don't:** ____
- **Evidence:** WORKED-RUN.md "Attestation" and "Broke during testing, fixed".

### 2026-10-02 — Status decision
- **I tried / expected:** ____
- **What happened:** the plan said RUNNABLE-SAMPLE. On re-reading the lifecycle table (SPECIFIED needs zero open TODOs), the recipe was set to **DRAFT** with 6 typed TODOs.
- **What Claude contributed:** raised the conflict.
- **Accepted / changed / rejected:** ____

### ____ — (Mayank: add entries for your own review, the presentation dry-run, and any revision)
- **I tried / expected:**
- **What happened:**
- **What I did:**
- **What Claude or another person contributed:**
- **What I understand now / still do not understand:**
- **Evidence and next step:**
