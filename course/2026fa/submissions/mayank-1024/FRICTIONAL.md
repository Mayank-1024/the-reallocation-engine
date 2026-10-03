# FRICTIONAL — swe-network-targets

## Executive summary

This is the honest log of how the assignment went: what was tried, what broke, what was checked, and who did what. The **What happened** and **What Claude contributed** lines were recorded from the working session and point to evidence in the repo. The **I tried / expected** and **What I understand now** lines hold Mayank's own answers, given on 2026-10-03 as multiple-choice responses to Claude's questions and phrased by Claude. Where Mayank gave no answer, the entry says so instead of inventing one.

---

### 2026-10-02 — Choosing the situation and recipe
- **I tried / expected:** I didn't know yet what the assignment would involve. I hadn't read the repo closely, and I relied on Claude to explore it first and propose options. I picked the situation (MS CS/SWE, F-1 OPT) and the network-targets angle myself.
- **What happened:** Claude cloned the repo read-only and listed the data. Mayank chose "MS CS/SWE, F-1 OPT" and the network-targets angle from four options, and approved forking to the Mayank-1024 account.
- **What Claude contributed:** the options and a recommendation (network-targets, because it feeds the networking hours and was expected to be less crowded). Later, `gh pr list` showed one other network-targets PR (engineering management) and one SWE sponsor-title PR.
- **What I understand now / still don't:** not recorded for this step.
- **Evidence:** branch `contrib/2026fa-mayank-1024-swe-network-targets`.

### 2026-10-02 — Toolchain baseline
- **I tried / expected:** not recorded separately for this step. I relied on Claude to run it (see the first entry).
- **What happened:** `npm run verify` failed before any change (`ModuleNotFoundError: No module named 'yaml'`). `pip install --user pyyaml` was blocked by PEP 668, and `python3 -m venv` failed at ensurepip. A `uv` venv in the session scratchpad worked, and `verify` passed with it on PATH. `npm run ats:scan -- --dry-run` failed with "portals.yml not found" until `data/ats/portals.example.yml` was copied. `npm install` modified `package-lock.json`, which was reverted.
- **What Claude contributed:** ran the commands, chose not to use `--break-system-packages`.
- **What I understand now / still don't:** not recorded for this step.
- **Evidence:** TEST-REPORT.md "before" section.

### 2026-10-02 — Data surprises before any code
- **I tried / expected:** not recorded separately for this step. I relied on Claude to run it (see the first entry).
- **What happened:** joining the 80 Days CSV to the four Form D samples by normalized name gave **0** matches (196 distinct sample names, 127 of them pooled funds). Every one of 1,557 approval counts and 1,557 denial counts is even. `role-scorer.mjs` uses `role.liveness?.factor ?? 1`, so an unchecked board would score as live.
- **What Claude contributed:** found all three and proposed the responses (Form D as presence-only; flag the doubling but don't fix it; keep unchecked boards out of the scorer).
- **Accepted / changed / rejected:** accepted as proposed.
- **Evidence:** `data_anomalies` in `runs/2026-10-02/network-targets.log.json`. The test "unchecked board must not reach the scorer".

### 2026-10-02 — Board probing
- **I tried / expected:** not recorded separately for this step. I relied on Claude to run it (see the first entry).
- **What happened:** probing 27 slugs found boards for 13 companies. "regent" answered on two ATSs. "lookout"'s board showed Canadian roles for a Boston CSV row. 1upHealth's boards had 0 jobs. Tulip's matching backend role was in Budapest. Fairmarkit's "Agentic AI Engineer (Boston)" was missed by the SWE regex.
- **What Claude contributed:** wrote the probe and the board map. Added the location filter, the WATCH-on-empty-board rule, and the adjacent-titles list. Set `identity_confirmed: false` everywhere.
- **What I understand now / still don't:** the two findings that changed my understanding most were here. First, the scorer treats an unchecked board as live (`?? 1`), so "not checked" can silently turn into "apply" unless something upstream keeps it out. Second, every H-1B count in the CSV is even, so official-looking data can be wrong by a factor of two, and the tool can't detect that from inside the file. Still open: my own prediction (CHANGE-BRIEF §5) is that the counts will turn out to match USCIS, which would make the even numbers some other artifact. I don't know which it is.
- **Evidence:** `board-map.json`, `snapshots/boards-2026-10-02.json`.

### 2026-10-02 — Run 1 bug: false APPLY
- **I tried / expected:** not recorded separately for this step. I relied on Claude to run it (see the first entry).
- **What happened:** the first live run put Abacus Insights in APPLY, matched on "Contractor: DevOps Engineer" and "Senior Manager, Engineering (DevOps…)". An `exclude_title_pattern` was added, and on the same snapshot Abacus became the one NETWORK target. The 24-month funding window was deliberately left alone, even though it was the reason NETWORK was 0 for every other company.
- **What Claude contributed:** spotted it by reading the generated report, then wrote the fix.
- **What I understand now / still don't:** not recorded for this step.
- **Evidence:** `runs/2026-10-02-live-run1-before-exclude-fix/` vs `runs/2026-10-02/`. WORKED-RUN.md "Run 1".

### 2026-10-02 — Tests and break attempts
- **I tried / expected:** not recorded separately for this step. I relied on Claude to run it (see the first entry).
- **What happened:** 13 tests passed on the first run. That was suspicious, so two mutants were applied to `lib.mjs`; each made 2 tests fail, and the file was restored. `node --test <dir>` does not work on Node 24, so the command names the file. Playwright needed `npx playwright install chromium` before `ats:liveness` would run. The scorer's `role-scores.md` table broke because a placeholder title contained `|`, which was fixed.
- **What Claude contributed:** wrote the tests and ran the mutants.
- **What I understand now / still don't:** not recorded for this step.
- **Evidence:** WORKED-RUN.md "Attestation" and "Broke during testing, fixed".

### 2026-10-02 — Status decision
- **I tried / expected:** not recorded separately for this step. I relied on Claude to run it (see the first entry).
- **What happened:** the plan said RUNNABLE-SAMPLE. On re-reading the lifecycle table (SPECIFIED needs zero open TODOs), the recipe was set to **DRAFT** with 6 typed TODOs.
- **What Claude contributed:** raised the conflict.
- **Accepted / changed / rejected:** accepted as proposed.

### 2026-10-02 — Privacy slip caught before push
- **What happened:** TEST-REPORT.md quoted the pii-scan finding verbatim, including the npm author's email from the upstream lockfile. `pii-scan --diff upstream/main` then flagged the branch's own history. The address was redacted and the unpushed commit amended, and the rescan was clean. Separately, the repo-local git identity was set to the GitHub noreply address so a university email isn't in public commit metadata.
- **What Claude contributed:** caused it, caught it with the history scan, fixed it.
- **What I understand now / still don't:** not recorded for this step.

### 2026-10-03 — Submission under deadline
- **What happened:** I answered short questions about my expectations, what I learned, and my v0.2 predictions, and Claude wrote those answers into this log, the worked-run reflection, SOURCES.md, and CHANGE-BRIEF §5. I then did my own checks (next entry).
- **What Claude contributed:** the questions, the phrasing, the check list I followed, the push, the PR, and the ZIP.

### 2026-10-03 — My own checks before resubmitting
- **I tried / expected:** I wanted to confirm for myself that the prototype runs and that its numbers are real before submitting. I expected the same counts as Claude's run.
- **What happened (my terminal, 2026-10-03):**
  - `node …/network-targets.mjs` → `57 candidates → NETWORK 1 · APPLY 4 · CONSIDER 2 · WATCH 5 · UNVERIFIED 44 · SKIP 1`, the same as the committed run. Only the `run_at` timestamp changed in `runs/2026-10-02/`.
  - `node --test …/network-targets.test.mjs` → 13 pass, 0 fail.
  - `grep "^ABACUS INSIGHTS INC" …csv` → `Series A,2024-10-01,22.0,0.0,100.0`, which matches the report row (22 approvals, 100% rate, funded 2024-10-01).
  - Break attempt: ran the `persona.opt-past.json` fixture → `window closed; nothing to score`, and `echo $?` → `3`.
  - Gate G4: `npm run ats:liveness -- "https://www.pathai.com/careers/8801819002?gh_jid=8801819002"` (PathAI, Senior Software Engineer, Backend) → `✅ active`.
  - Skimmed the generated report and the `nextAction` function in `lib.mjs`.
  - Opened https://job-boards.greenhouse.io/abacusinsights in my browser. There is no US backend SWE opening, which agrees with the report.
- **What I did, gate G5:** I judged "Senior AI Engineer" at Abacus Insights to be a role I would apply to. That is a human override: Abacus moves from NETWORK to **APPLY** for me. The prototype has no override input yet, so the machine output still says NETWORK. My decision is recorded here, in the worked run, and in the run log.
- **What I understand now:** the title pattern is narrower than the roles I'd actually take. The G5 adjacent-titles list exists for exactly that reason, and it worked: it surfaced a role the regex missed.
- **Not reviewed in depth, because of time:** the full recipe and card text, the domain justification, the test-suite internals, and board identity (G3) for the other 12 boards. I accepted Claude's drafts of those without changes.
- **Next step:** read `lib.mjs` and the recipe gates fully before the presentation. Add an override input (`--overrides`) so a G5 decision like mine flows through the scorer's documented-override field instead of living only in the log.
