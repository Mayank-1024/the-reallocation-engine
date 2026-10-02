---
status: DRAFT
todos_open: 6
last_gate: "sample-run completed 2026-10-02 (offline snapshot + live boards), logs/runs/2026fa-mayank-1024-1.md — automatable gates only; no human gate cleared yet"
attestation: null
recipe_version: 0.1.0
---

# swe-network-targets — network, don't apply (backend SWE, F-1 OPT, Massachusetts)

## Executive summary

**What it does.** It starts from every Massachusetts company with a public record of sponsoring H-1B visas for software-engineering titles. It checks each company's public job board and sorts the companies into six piles. **Network**: a strong sponsor, funded recently, with no matching opening today; the move is an informational interview before a role opens. **Apply**: a matching opening exists. **Consider**: an opening exists but the sponsorship record is thinner. **Watch**: a strong sponsor whose funding is old or whose board is empty. **Unverified**: no board could be checked, so nothing is assumed. **Skip**: the rest.

**Who it's for.** A master's graduate in computer science on F-1 post-completion OPT, looking for backend, platform, or full-stack work in the Boston area, who needs an employer that will file an H-1B and has months, not years, of OPT left.

**What it decides, and what it doesn't.** It decides where the week's networking and application hours go first. It does not decide whether a company *will* sponsor *you*. It does not judge fit, salary, or whether the person on the other end of an informational interview will answer. Each pile hands a person a next action, and the person decides.

**Status: DRAFT.** The prototype runs end to end on the shipped data and on live job boards (2026-10-02). It is still DRAFT because six proposed additions below are open, and the lifecycle does not allow SPECIFIED, let alone RUNNABLE-SAMPLE, while any typed TODO is open. No human has cleared a gate yet.

Two customers: this file is for the agent. `recipes/cases/2026fa/mayank-1024-swe-network-targets.card.md` is for the person.

**Handoff condition (done when):** `network-targets.log.json` and `network-targets.report.md` both exist in the run folder; `funnel.candidates` equals the sum of the six action counts; no company with an unchecked board appears in `roles.json`; `role-scores.json` was written by `scripts/score/role-scorer.mjs` with `profile_needs_sponsorship: true`; and every evidence value carries `record` or `your-input`. "The list looks reasonable" is not the condition.

## Required reads

1. `SNICKERDOODLE.md`, `DOMAIN.md` (Known gaps 3 and 9), `DATA_CONTRACT.md` §Zero-Conditions.
2. `data/80-days-to-stay/data/SEC_DOL_H1b_data_mapped-audit.md`: what the sponsor data does and doesn't prove about entity resolution.
3. `scripts/score/role-scorer.mjs`: how missing gates default (see Facts that bite).
4. This recipe, its card, and `scripts/contrib/2026fa/mayank-1024-swe-network-targets/README.md`.

## Source inventory

| Evidence | Path / command | Label | Role |
|---|---|---|---|
| H-1B approvals, denials, rate, top sponsored titles, city/state | `data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv` (30,369 rows) | record | sponsorship **vote** |
| Latest funding date / stage / amount | same CSV, `latest_funding_*` (derived upstream from SEC Form D; newest date 2025-09-26) | record | network rule (outside scorer) |
| Form D presence | `data/sec/form-d/processed/sample/companies-sec-{2025q2,2025q3,2025q4,2026q1}-d.sample.json` (50 filings each) | record | corroboration only |
| Board listings | `scripts/contrib/2026fa/mayank-1024-swe-network-targets/snapshots/boards-2026-10-02.json`, or `--live` via `scripts/ats/providers/{greenhouse,lever,ashby}.mjs` | record | apply-side **liveness gate** |
| Company → board URL | `scripts/contrib/2026fa/mayank-1024-swe-network-targets/board-map.json` | your-input | gate G3 |
| OPT end, as-of, hiring lag, bands, tier thresholds, patterns, windows | `scripts/contrib/2026fa/mayank-1024-swe-network-targets/persona.example.json` (fictional) | your-input | **timeline gate**, rules |
| Composite + per-term trace | `node scripts/score/role-scorer.mjs <roles.json> --profile <p.json> --out-dir <dir>` | (combines) | decision core, not re-implemented |
| Posting-level liveness | `npm run ats:liveness -- <url>` (Playwright; needs `npx playwright install chromium` once) | record | gate G4, run by the person |

Prototype command (repo root):

```bash
node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs
node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs --live   # re-fetch boards
node --test scripts/contrib/2026fa/mayank-1024-swe-network-targets/test/network-targets.test.mjs
```

Network hosts this recipe may touch: `boards-api.greenhouse.io`, `api.lever.co`, `api.ashbyhq.com` (only with `--live`), and the posting host named in a G4 `ats:liveness` call. Nothing else.

## Facts that bite (and what this recipe does about each)

| Fact | Applies? | Response |
|---|---|---|
| Role quality weight is 0.0 | not used | No BLS/O*NET input. Role quality is not claimed anywhere. The recipe proposes no weight. |
| `bls:local-wage` feeds nothing / fails on a fresh clone | not used | No salary claims. "Not checked: salary" is listed in the report. |
| Only Form D samples ship | **yes** | Checked: the 196 distinct sample names share **0** companies with the CSV (mostly pooled investment funds). Form D appears only as `form_d_sample: not-in-sample`, explicitly not "no funding". The funding signal comes from the CSV's own Form D-derived columns. |
| `data/raw/`, `data/verified/`, `logs/gate-decisions/` don't exist | **yes** | Gates point at the run folder and `board-map.json`. Gate decisions are written in `logs/runs/2026fa-mayank-1024-<n>.md`. |
| `snickerdoodle` CLI is roadmap | yes | No such command is used. |
| `validate-h1b-join-sample.py` needs full data | yes | Not run. The shipped CSV and samples are used directly. |
| *(found here)* scorer defaults missing liveness to 1.0 | **yes** | `role-scorer.mjs` reads `role.liveness?.factor ?? 1`. A company whose board was never checked would score as live. The prototype never sends those companies to the scorer (UNVERIFIED), and a test pins this behavior. |
| *(found here)* every H-1B count in the CSV is even | **yes** | 0 odd out of 1,557 approval counts, and 0 odd out of 1,557 denial counts. This is consistent with petitions being double-counted in the upstream join. Tiers use **raw** counts and are labeled so. Approval *rates* are unaffected by uniform doubling. See the TODO on cross-checking against USCIS data. |

## Phase gates (hard stops)

| Gate | Testable condition | Who clears | On fail |
|---|---|---|---|
| G1 timeline | `persona.visa.opt_end_date` > `persona.as_of`; slack = days left − `hiring_lag_days` maps to a factor via `persona.timeline.bands` | machine (the inputs are the person's) | past date → exit 3, **nothing written**. Factor ≤ 0.05 → every company SKIP "timeline gate closed" |
| G2 sponsor data | CSV exists and has `company_name, state, Total Approvals, Approval_Rate, top_job_titles_sponsored, latest_funding_date` | machine | exit 2 "missing columns — schema drift" |
| G3 board identity | each `careers_url` in `board-map.json` belongs to the CSV company; the person sets `identity_confirmed: true` | **person** | entries stay listed under "What a person still has to judge". Ambiguous slugs (`status: ambiguous`) stay UNVERIFIED |
| G4 posting liveness | before tailoring an application, `npm run ats:liveness -- <url>` prints `active` for that exact posting | **person** runs it | `expired` / `uncertain` → do not apply; re-run the board |
| G5 adjacent titles | for NETWORK/WATCH companies, the person reads `adjacent_titles` (engineering titles the target pattern missed, e.g. "Applied AI Engineer") and decides whether any is really a target role | **person** | if one is, it becomes an APPLY candidate by human override, logged with a reason |

Liveness and timeline are **gates** (multipliers in the scorer), not votes. Gate decisions go in the run log with name, date, and what was seen.

## Workflow

1. Confirm inputs: `test -f data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv && ls data/sec/form-d/processed/sample/`
2. Edit a **local, uncommitted** copy of the persona (`--persona private/my-persona.json`) with your dates. Never commit real immigration dates.
3. Run offline: `node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs`. Optionally `--live` to refresh boards (writes `boards-snapshot.json` into the run folder).
4. Read `network-targets.report.md` top to bottom. Clear G3 for every company you will act on. Run G4 on each posting you will apply to. Read the G5 adjacent titles.
5. Write the run log entry (template below).

## Decision logic

- **Candidate funnel** (counted in the log): CSV rows → state ∈ `geography.states` → non-blank `Total Approvals` → a sponsored title matches `target.title_pattern` → approvals ≥ `sponsorship_rules.possible.min_approvals`.
- **Tier** (your-input rule on record counts): Proven = ≥20 approvals and rate ≥90% (p 0.9) · Likely = ≥6 (p 0.6) · Possible = ≥2 (p 0.3). Proven/Likely p values come from `data/examples/ch11-roles.json`.
- **Board evidence**: postings whose title matches `title_pattern`, does **not** match `exclude_title_pattern` (manager, director, principal, contract, intern…), and whose location matches `location_pattern`. One or more → liveness 1.0. Zero on a reachable board → 0.0. Not found / ambiguous / unmapped → not scored.
- **Scorer**: sponsorship vote only (fit omitted: no fit signal is measured, and none is invented) × liveness × timeline.
- **Next action** (reads the scorer's output, never recomputes it): timeline closed → SKIP. Not scored → UNVERIFIED. Apply → APPLY. Consider → CONSIDER. Gated by liveness + Proven/Likely + board with 0 jobs of any kind → WATCH (possibly abandoned ATS account). Gated by liveness + Proven/Likely + funding `recent` (≤24 months) → **NETWORK**. Gated by liveness + Proven/Likely otherwise → WATCH. Else SKIP.

## Next action per result (connection to the 3-3-2 day)

| Action | Next step | Hours it feeds |
|---|---|---|
| NETWORK | find an engineer or engineering manager at the company. Ask for a 20-minute informational interview about the team's roadmap, then set a board re-check date | 3 networking |
| APPLY | clear G4 on the posting, then tailor the application | 2 research-and-apply |
| CONSIDER | clear G4. Apply only if the posting is unusually close to your experience | 2 research-and-apply |
| WATCH | re-check the board in two weeks. Look for the real careers page if the board is empty | none this week |
| UNVERIFIED | find the careers page by hand, add it to the board map, re-run | 2 (research) |
| SKIP | nothing. Skipping is the point | — |

## What it can verify

- That a company has a record of sponsoring a title matching your pattern, with counts and approval rate exactly as the CSV states them.
- That at capture time a company's public ATS board listed (or did not list) a posting matching your title, exclusion, and location patterns, and the URL of each one.
- That the Form D sample files do or do not contain the company's normalized name.
- That the timeline factor follows from your stated dates and assumption, and that a closed window zeroes everything.
- That every decision came from `scripts/score/role-scorer.mjs`, with the per-term trace in `role-scores.md`.

## What it cannot verify

- Whether the company sponsors **new** hires **today**. The record is historical, and counts may be doubled.
- Whether a board URL belongs to the company. Slugs were proposed from website domains, so this is G3, a person's call.
- Whether a listed posting is still open. A board listing is not a posting check, so this is G4.
- Whether there is "no opening" at all. The company may post on Workday or LinkedIn only. Absence on one ATS is weak evidence.
- Whether funding is current. CSV funding dates stop at 2025-09-26, and they cannot see later rounds or an IPO (Klaviyo shows "Series C 2022").
- Fit, salary, E-Verify enrollment (needed for a STEM extension), cap-exempt status, or remote-work eligibility under OPT.
- Titles the regex misses or wrongly excludes ("Agentic AI Engineer"; "Principal Software Architect"). This is G5.

## Proposed additions

1. [TODO: DEV] Run G4 automatically for APPLY/CONSIDER postings by calling `scripts/ats/check-liveness.mjs` on each matching URL and writing `posting_liveness` per posting. Reason: the board API proves a listing exists, not that the posting accepts applications.
2. [TODO: DEV] Board discovery for the 44 UNVERIFIED companies: evaluate whether `scripts/ats/detect-ats.py` can propose careers URLs, still marked `identity_confirmed: false`. Reason: 77% of candidates go unchecked today.
3. [TODO: DATA SOURCE] Cross-check H-1B counts for NETWORK/APPLY companies against the USCIS H-1B Employer Data Hub export (path to be named, e.g. `data/uscis/employer-data-hub/`). Reason: every CSV count is even.
4. [TODO: DATA SOURCE] Full Form D quarters (`data/sec/form-d/processed/companies-sec-*-d.json`, gitignored, fetched with `scripts/sec/`) so funding can be corroborated past 2025-09. Reason: the shipped samples match 0 candidates.
5. [TODO: DEV] Add the OPT unemployment-day clock (90 days, plus 60 on a STEM extension) to G1 as a second your-input term. Reason: days left on the EAD is not the binding constraint once unemployment days run out.
6. [TODO: DEFINE] Replace the 75-day hiring-lag assumption with a value and one sentence of reasoning drawn from the person's own tracker (kept private). Reason: the timeline factor is only as good as this number.

## Output contract

Written to `--out-dir` (default `course/2026fa/submissions/mayank-1024/runs/<as_of>/`). The prototype refuses any other location except gitignored `private/`, its own folder, and the OS temp dir. Runs on real dates go to `private/`.

**Agent log, `network-targets.log.json`:** `recipe`, `recipe_version`, `run_at`, `mode` (`offline-snapshot` | `live-boards`), `model_judgment_values` (always 0), `inputs` (paths, CSV sha256, snapshot `captured_at`), `timeline`, `funnel`, `data_anomalies`, `actions` (counts), `scorer` (command + stdout), `gates_pending_human`, `errors` (e.g. `not-in-80-days-csv`), and `companies[]`, each with `evidence.{field}: {value, source, from}`, `scorer` (composite, recommendation, reason, arithmetic), and `next`.

**Human report, `network-targets.report.md`:** an executive summary first, then the timeline, the six piles (Network table with adjacent/off-location titles; Apply/Consider with posting links), "What a person still has to judge", "Verified vs. inferred", and a run record last.

Scorer artifacts in the same folder: `roles.json`, `scorer-profile.json`, `role-scores.json`, `role-scores.md`.

## Stop conditions

Stop, and do not invent a value, when:
- the OPT date is past or missing (exit 3 / 2);
- the CSV is missing or lacks a required column (exit 2);
- the scorer exits non-zero, or reads the profile as not needing sponsorship (exit 4). The trap string "work authorized (EAD)" does this;
- someone asks to widen `funding_windows` or loosen tier thresholds after seeing which companies fall out. That is weakening a rule to pass a company you like. Change rules only before a run, and log the change;
- someone asks to treat an unchecked board as "probably hiring". UNVERIFIED stays unverified.

## Verification checks

- `node --test scripts/contrib/2026fa/mayank-1024-swe-network-targets/test/network-targets.test.mjs`: 13 tests, offline (fetch is stubbed to throw).
- `node scripts/conformance.mjs scripts/contrib/2026fa/mayank-1024-swe-network-targets/ recipes/cases/2026fa/`
- Hand cross-check: pick one NETWORK company, `grep` its CSV row, and compare approvals, rate, and funding date with the report. Open its board URL and confirm no matching US posting.

## Run-log template (`logs/runs/2026fa-<handle>-<n>.md`)

```markdown
## YYYY-MM-DD — swe-network-targets run <n>

- **Recipe:** recipes/cases/2026fa/mayank-1024-swe-network-targets.md v<version>
- **Inputs:** persona <path, fictional or "private, not committed">; CSV sha256 <first 16>; boards <snapshot path + captured_at | live>
- **Command:** <exact command>
- **Outputs:** <run folder>/network-targets.{log.json,report.md}, role-scores.{json,md}
- **Result:** candidates <n> → NETWORK <n> · APPLY <n> · CONSIDER <n> · WATCH <n> · UNVERIFIED <n> · SKIP <n>; scorer skip rate <x>%
- **Gate decisions:** G3 <companies confirmed, by whom, date> · G4 <urls checked, result> · G5 <titles judged>
- **Open issues:** <what did not work, what is still missing>
```
