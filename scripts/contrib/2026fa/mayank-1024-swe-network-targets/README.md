---
owner: Mayank-1024
term: 2026fa
component: swe-network-targets
status: DRAFT
promoted_to: null
---

# swe-network-targets — prototype

## Executive summary

This is a small program for a backend software engineer on F-1 OPT in Massachusetts. It answers a question the job boards don't: *which companies have a track record of sponsoring software engineers here, but have no matching opening right now?* Those companies are worth an informational interview before a role opens, not an application today. The program also lists companies with a matching opening (apply), companies it could not check (unverified, never guessed), and companies to skip. Every number it prints comes from the repository's data files, a job-board response, or a setting you chose. No AI model produces any value.

## Run it (one command, from the repo root)

```bash
node scripts/contrib/2026fa/mayank-1024-swe-network-targets/network-targets.mjs
```

Offline by default. It reads the committed board snapshot `snapshots/boards-2026-10-02.json` and writes to `course/2026fa/submissions/mayank-1024/runs/<as_of>/`:

| File | For | What |
|---|---|---|
| `network-targets.report.md` | the person | executive summary, network / apply / consider / watch / unverified / skip lists, pending human gates |
| `network-targets.log.json` | the agent | every value with its `record` / `your-input` label, funnel counts, anomalies, errors, gates |
| `roles.json`, `scorer-profile.json` | the scorer | input handed to `scripts/score/role-scorer.mjs` |
| `role-scores.json`, `role-scores.md` | audit | the existing scorer's own output and per-term trace |

## Test (offline, no network)

```bash
node --test scripts/contrib/2026fa/mayank-1024-swe-network-targets/test/network-targets.test.mjs
```

13 tests. Every spawned process preloads `fixtures/no-network.mjs`, so any `fetch()` throws. The end-to-end tests run the real scorer.

## Options

| Flag | Default | Meaning |
|---|---|---|
| `--persona <json>` | `persona.example.json` | fictional persona: OPT date, hiring lag, title/location patterns, tier thresholds (all `your-input`) |
| `--csv <csv>` | `data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv` | sponsor + funding records |
| `--formd-dir <dir>` | `data/sec/form-d/processed/sample` | Form D sample files (presence check only) |
| `--boards <json>` | `snapshots/boards-2026-10-02.json` | captured ATS board listings |
| `--live [--map <json>]` | off · `board-map.json` | re-fetch boards via `scripts/ats/providers/{greenhouse,lever,ashby}.mjs`. Hosts: `boards-api.greenhouse.io`, `api.lever.co`, `api.ashbyhq.com` only |
| `--out-dir <dir>` | `course/2026fa/submissions/mayank-1024/runs/<as_of>` | must be under that folder, `private/` (gitignored — use it for real dates), this folder, or the OS temp dir |

Exit codes: `0` ok · `2` missing/invalid input or refused out-dir · `3` OPT window already closed (nothing written) · `4` the scorer failed, or it read the profile as not needing sponsorship.

## Files

| Path | What |
|---|---|
| `network-targets.mjs` | CLI: load → funnel → board evidence → existing scorer → next action → two outputs |
| `lib.mjs` | pure functions (CSV parse, tiers, timeline gate, board evidence, next action) |
| `persona.example.json` | fictional persona; no real person's data |
| `board-map.json` | company → careers URL. **your-input**, proposed by probing, `identity_confirmed: false` for every entry |
| `snapshots/boards-2026-10-02.json` | live capture from `--live` on 2026-10-02 (public job titles, URLs, locations) |
| `fixtures/` | fictional mini CSV, board fixture, Form D fixture, persona variants for failure cases, no-network preload |
| `test/network-targets.test.mjs` | `node --test` suite |

Recipe: `recipes/cases/2026fa/mayank-1024-swe-network-targets.md` (agent) and `.card.md` (human).
