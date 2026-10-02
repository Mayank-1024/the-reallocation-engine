# swe-network-targets — human card

**Audience:** a backend / platform software engineer on F-1 OPT in the Boston area, deciding where this week's networking and application hours go.
**Agent twin:** `recipes/cases/2026fa/mayank-1024-swe-network-targets.md` (DRAFT v0.1.0)
**Engine layers:** 80 Days to Stay (sponsorship + Form D-derived funding) and Job-Ops (ATS boards). Not the Cognitive Pivot.

## Purpose

Answer one question: **which companies have sponsored software engineers in Massachusetts before, but have no matching opening right now?** Those are the companies to meet before a role opens. The same run also tells you where a matching opening exists (apply), what it couldn't check (unverified), and what to drop (skip).

## What it can verify

- The sponsor record: H-1B approvals, denials, approval rate, and the top sponsored titles, exactly as the 80 Days CSV states them.
- At capture time, whether the company's public Greenhouse / Lever / Ashby board listed a posting that matches your title, exclusion, and location patterns, with links.
- Whether the company's name appears in the four shipped Form D sample files. For SWE sponsors it never does; see below.
- That every Apply / Consider / Skip came from the engine's existing scorer, with its arithmetic shown.

## What it cannot verify

- **That they sponsor new hires now.** The record is history. Every count in the source file is even, so counts may be doubled. The approval *rate* is the safer number.
- **That the board is theirs.** Board links were guessed from website names. You confirm them (G3).
- **That a listed posting is still open.** Run `npm run ats:liveness -- <url>` before you tailor anything (G4).
- **That "no opening" is true.** The company may post only on Workday or LinkedIn.
- **That the funding is current.** Funding dates in the source stop in September 2025 and can't see IPOs.
- Fit, salary, E-Verify, remote eligibility, and titles the pattern misses. Read the "adjacent titles" (G5).

## Dependencies

- Node 20+ and `npm install`. That's all for the offline run.
- `--live` needs network access to the three ATS API hosts. G4 needs `npx playwright install chromium` once.
- `data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv` and `data/sec/form-d/processed/sample/*.sample.json` (both ship with the repo).

## Annotated commands

Default run on the committed board snapshot (expected: 57 candidates; network 1 · apply 4 · consider 2 · watch 5 · unverified 44 · skip 1):

```bash
node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs
```

Refresh boards live (results will drift as postings change; that's the point):

```bash
node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs --live --out-dir course/2026fa/submissions/mayank-1024/runs/live-$(date +%F)
```

Your own dates, kept out of git:

```bash
cp scripts/contrib/2026fa/mayank-1024-swe-network-targets/persona.example.json private/my-persona.json   # edit, never commit
node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs --persona private/my-persona.json --out-dir private/nt-runs
```

Check one posting before applying (expected: `✅ active`, or `❌ expired` with a reason):

```bash
npm run ats:liveness -- https://job-boards.greenhouse.io/coherehealth/jobs/7930480003
```

## What it produces

- `network-targets.report.md`, for you: the piles, posting links, what you still have to judge.
- `network-targets.log.json`, for an agent: every value with its label (`record` or `your-input`; there are no `model-judgment` values).
- The scorer's own `role-scores.md` audit trace.

## Named failure modes

1. **Doubled sponsor counts.** All 1,557 non-empty approval counts and all 1,557 denial counts in the CSV are even. If petitions were counted twice upstream, a company shown with 6 approvals had 3, and "Likely" may really be "Possible". The tool can't detect this from inside the file. The person hardest hit is someone comparing two small sponsors on raw counts. Mitigation: trust the rate more than the count, and cross-check NETWORK companies in USCIS data before you invest networking time.
2. **Right slug, wrong company.** A board slug like `lookout` or `regent` can belong to a different company with the same word in its name, or the right company's board may be for another country (Lookout's board showed Canadian roles; Tulip's backend role was in Budapest). The person hardest hit is someone who trusts a NETWORK verdict and cold-messages the wrong firm. Mitigation: G3 identity confirmation, and the location filter.
3. **Abandoned or partial boards read as "not hiring".** An ATS account with 0 jobs, or a company that moved to Workday, looks exactly like a company with no openings. 1upHealth's boards answered on two ATSs with 0 jobs each. Mitigation: empty boards go to WATCH, not NETWORK.
4. **Pattern blind spots.** "Agentic AI Engineer (Boston)" is a real engineering opening the SWE pattern misses. "Principal Software Architect" is excluded by the "principal" rule. Mitigation: the adjacent-titles list (G5).
