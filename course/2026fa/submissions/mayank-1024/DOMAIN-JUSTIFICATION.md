# Domain justification — swe-network-targets

## Executive summary

The recipe is for a computer-science master's graduate on F-1 OPT in the Boston area, looking for backend or platform software work that comes with H-1B sponsorship. It surfaces something the job boards hide: which local companies have a real record of sponsoring software engineers but aren't advertising a matching role right now. Those companies are where the networking hours pay off, because an informational interview *before* a role opens is worth more than one application after it.

## Who, in exactly what situation

A recent MS CS graduate on 12-month post-completion OPT (STEM extension not yet filed), targeting backend / platform / full-stack roles in Massachusetts, with roughly six to nine months left before the EAD ends. Most of the companies they've heard of either don't sponsor or have hundreds of applicants per posting.

## The information asymmetry

From the outside, this person cannot easily see:
1. **Which mid-size Boston companies have actually sponsored software engineers.** Lists of H-1B employers are dominated by big tech and consultancies. A 100-person health-tech company with 22 approvals and a 100% approval rate is invisible.
2. **Which of those have no opening that fits.** A job board shows what's open, not what's missing. "Strong sponsor, nothing posted" never appears anywhere, yet that is the networking target.
3. **When an apparent opening isn't one.** Manager and contractor postings match "DevOps". A backend role turns out to be in Budapest. An empty ATS account looks like "not hiring".

## Engine layers

- **80 Days to Stay**: approvals, denials, approval rate, sponsored titles, Form D-derived funding dates (`data/80-days-to-stay/80-days-csv/`), plus Form D sample presence (`data/sec/form-d/processed/sample/`).
- **Job-Ops**: board listings through `scripts/ats/providers/`, posting liveness through `npm run ats:liveness`.
- Decisions come from the existing scorer, `scripts/score/role-scorer.mjs`.

## Where it fits in the 3-3-2 day

It takes over the **sponsor-research half of the two research-and-apply hours**: looking up whether each company sponsors this kind of title, checking its board, and checking its funding. It also **feeds the three networking hours** directly: the NETWORK pile is a ready target list.

**Time saved, estimate (not measured):** doing it by hand takes roughly 15–20 minutes per company to look up sponsorship history, find and scan the careers page, and check funding. For the 13 companies this run could check, that is about 3–4 hours. The run takes seconds, but the human gates still cost time: confirming 13 board identities (~2 min each), checking each posting before applying (~1 min each), and reading adjacent titles. Net, roughly **2–3 hours saved per weekly re-run** at today's coverage, more if the 44 unverified companies get boards. These figures are Claude's estimate, reviewed by Mayank. Neither of us timed them.

## Domain-specific failure modes

1. **Doubled sponsorship counts make thin sponsors look solid.** Every one of the 1,557 approval and denial counts in the source CSV is even. If petitions were double-counted upstream, "6 approvals" was 3, and a "Likely" sponsor is really a "Possible". The person hardest hit is the student comparing two small Boston startups on raw counts, because the number looks like an official record. The approval rate is unaffected by uniform doubling and is the safer field. The fix is a USCIS cross-check (recipe TODO 3).
2. **Right name, wrong company.** Board slugs were guessed from website domains. `regent` answers on two ATSs. `lookout`'s board lists Canadian sales roles. A wrong match turns a NETWORK verdict into a cold message to the wrong employer. The person hardest hit is a student working through the list quickly under OPT deadline pressure. The report says "Proven sponsor, funded 2024", and nothing on the page looks wrong until someone opens the board and notices the locations. Gate G3 makes identity a human confirmation, not an assumption.
