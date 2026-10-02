# Change brief — swe-network-targets

## Executive summary

This brief records what the recipe was designed to do, what it reuses, where it stops for a person, and what was expected to go wrong. **Read the timing note first.** The design and the prototype were built in one working session on 2026-10-02, with an AI coding agent (Claude Code) doing most of the exploration and code. The original brief was not written before the code. So this document separates three things: decisions fixed *before* code was written, things *discovered* while building, and predictions for the **next** version, which are written before that version exists.

## Timing note (honest record)

- 2026-10-02: the situation (MS CS, F-1 OPT, backend SWE) and the angle (network-targets) were chosen by Mayank. Everything else in §1–§4 was drafted by Claude during that session and reviewed by Mayank. It is labeled *design-time* where it was written into the persona or code before the first run, and *discovered* where the run produced it.
- Original predictions are not rewritten below. §5 is new and pre-registered for v0.2.

## 1. Career situation and engine layers

Master's graduate in computer science, F-1 post-completion OPT (12 months, STEM extension not yet filed), backend / platform / full-stack software engineer, Boston area, needs an H-1B-filing employer. Persona file: `scripts/contrib/2026fa/mayank-1024-swe-network-targets/persona.example.json` (fictional dates).

Layers: **80 Days to Stay** (sponsorship history, and funding dates derived from Form D) and **Job-Ops** (ATS board listings and posting liveness). Not the Cognitive Pivot.

## 2. Reuse vs. new

Reused, unchanged:
- `data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv`
- `data/sec/form-d/processed/sample/*.sample.json`
- `scripts/ats/providers/{greenhouse,lever,ashby}.mjs` and `_http.mjs` (live board fetch)
- `scripts/score/role-scorer.mjs` (all decisions; called as a subprocess, not copied)
- `scripts/ats/check-liveness.mjs` via `npm run ats:liveness` (gate G4, run by the person)

New, in `scripts/contrib/2026fa/mayank-1024-swe-network-targets/` only:
- the candidate funnel, tier rule, timeline gate, board-evidence rule, and next-action mapping;
- `board-map.json` (company → careers URL). It belongs here because the repo has no company-to-board mapping for 80 Days companies. The closest thing, `data/ats/portals.example.yml`, covers a handful of large employers.

## 3. Gates (design-time)

| Gate | A person needs to see |
|---|---|
| G1 timeline | the OPT end date, the hiring-lag assumption, and the resulting slack and factor |
| G3 board identity | the careers URL next to the CSV company's city and website; the person confirms it is the same company |
| G4 posting liveness | `npm run ats:liveness -- <url>` output for the exact posting, before tailoring |
| G5 adjacent titles | engineering titles on NETWORK/WATCH boards that the SWE pattern did not match |

(G2, the CSV schema check, is machine-only.)

## 4. Predicted failure cases

Design-time (written into the code and tests before the first real run):

| Case | How it is checked |
|---|---|
| OPT end date already past | `timelineGate` returns an error → exit 3, nothing written (test: `persona.opt-past.json`) |
| Company in the board map but not in the CSV | listed in `errors[]` as `not-in-80-days-csv`, never scored (fixture `GHOST CO INC`) |
| Board 404 / no board known | status `not_found` / `unmapped` → UNVERIFIED, kept out of the scorer |
| Blank H-1B cells | `NoRecord`, never zero; dropped from candidates (fixture `FOXTROT NORECORD INC`) |
| CSV missing or renamed columns | exit 2 "schema drift" |

Discovered while building (not predicted):
- The CSV and Form D samples share 0 companies.
- The scorer treats a missing liveness value as 1.0. This turned "board not found" from a nuisance into a correctness issue.
- An authorization string containing "authorized" makes the scorer drop sponsorship weight to 0. This is now a test (exit 4).
- All H-1B counts are even.
- Run 1's title pattern matched manager and contractor postings.

**Prediction about the first pass (design-time):** the prototype would cover only the companies whose board could be found on Greenhouse, Lever, or Ashby. Most candidates would end up UNVERIFIED, and the first live run would contain at least one false APPLY. **Outcome:** both happened. 44 of 57 (77%) were UNVERIFIED, and Abacus Insights was a false APPLY in run 1, matched on a contractor DevOps posting and a senior-manager posting.

## 5. Pre-registered predictions for v0.2 (Mayank — fill in before changing code)

- If the USCIS cross-check (proposed TODO 3) runs on the 13 board-checked companies, I expect: ____
- If `detect-ats.py` is tried on the 44 UNVERIFIED companies, I expect ____ of them to get a usable board.
- One thing I expect the next version to still get wrong: ____

## Revisions

- 2026-10-02: `exclude_title_pattern` added to the persona after run 1 (see `runs/2026-10-02-live-run1-before-exclude-fix/`). The funding window (24 months) and tier thresholds were **not** changed after seeing results.
- 2026-10-02: recipe status set to DRAFT, not RUNNABLE-SAMPLE, because six typed TODOs remain open.
