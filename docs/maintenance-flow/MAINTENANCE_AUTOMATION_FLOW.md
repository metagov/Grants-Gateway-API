# OpenGrants Maintenance Automation Flow

**Status:** Design v0.1 — MVP is manual (dogfooded on issue [#3](https://github.com/metagov/Grants-Gateway-API/issues/3))
**Owner:** Rashmi
**Goal:** Turn a raw customer complaint into a shipped, reviewed fix with the least human toil, without letting an agent ship something wrong.

---

## The idea in one line

A customer sends a problem to a bot → the problem is assessed, reproduced, and root-caused → a **fully-specified GitHub issue** (to-do list + acceptance criteria) is created → a coding agent implements it and opens a PR → a human reviews and ships.

The GitHub issue is the contract between the "figure out what's wrong" half and the "build the fix" half. If the issue is good, the agent's job is mechanical. **Almost all the leverage is in producing a high-quality issue**, so that is where the automation should be trusted last.

---

## Pipeline stages

Each stage has: an **input**, an **output**, an **owner** (human / agent / bot), and a **gate** it must pass before advancing. Outputs are structured so the next stage — human or agent — can consume them without re-reading everything.

```
[0] Intake ──► [1] Triage ──► [2] Reproduce ──► [3] Root cause ──► [4] Solution design
                                                                          │
                                              [7] Ship ◄── [6] Review ◄── [5] Issue + implementation
```

### [0] Intake — *bot*
- **Input:** a customer message (Discord/Telegram/email). MVP: a `/report` command or a watched channel.
- **Output:** a normalized ticket — `{reporter, product area, verbatim text, timestamp, any links/logs, severity guess}`.
- **Gate:** de-dupe against open issues; acknowledge to the reporter with a ticket id so they know they were heard.
- **Notes:** capture the reporter's *own workaround* if they mention one — it is usually a giant hint about the root cause (see issue #3, where Alex's cookie workaround pointed straight at the missing endpoint wiring).

### [1] Triage — *agent, human-approved*
- **Input:** normalized ticket.
- **Output:** `{category (bug|feature|question|abuse), affected component, severity, is-it-reproducible-in-principle, needs-more-info?}`.
- **Gate:** if `needs-more-info`, bounce one clarifying question back to the reporter *before* spending any deeper effort. Never guess when a single question resolves it.

### [2] Reproduce — *agent*
- **Input:** triaged ticket.
- **Output:** a concrete repro — exact request/route/state that triggers the bad behaviour, plus the observed vs. expected result. "Could not reproduce" is a valid, explicit output.
- **Gate:** the bug must be reproduced (or its impossibility explained) before anyone writes a line of fix. This is the **Iron Law**: no fix without a confirmed cause.

### [3] Root cause — *agent*
- **Input:** the repro.
- **Output:** the *exact* file + line + mechanism. Not "the key flow is broken" but "the submit button always calls `POST /api/auth/register`; that route 409s for anyone already registered; the working `POST /api/auth/keys` route is never wired to any UI control."
- **Gate:** the cause must be a specific, falsifiable claim someone can verify by reading the named code. Trace, don't theorize.

### [4] Solution design — *agent, human-approved*
- **Input:** root cause.
- **Output:** the proposed change described at the code level — which files change, what the new behaviour is, what stays the same, migration/DB impact, and the blast radius.
- **Gate:** a human signs off on the *approach* here. This is the cheapest place to catch "right diagnosis, wrong fix." Bundle related latent gaps found during diagnosis (e.g. issue #3 surfaced expiry duration + revocation while fixing renewal) but flag them as separate scope so the reviewer can accept or defer.

### [5] Issue + implementation — *agent*
- **Input:** approved solution design.
- **Output (5a):** a GitHub issue containing: problem statement, root cause, a checkboxed **to-do list**, and **acceptance criteria** (each one testable). This is the artifact the whole flow exists to produce well.
- **Output (5b):** a branch + PR that satisfies every acceptance criterion, one atomic commit per to-do item where possible.
- **Gate:** every acceptance-criteria box must map to a change in the diff. No orphan criteria, no scope creep beyond the issue.

### [6] Review — *human + agent reviewer*
- **Input:** the PR.
- **Output:** approve / request-changes with specific comments; verify each acceptance criterion actually holds (run it, don't just read it).
- **Gate:** CI green + acceptance criteria demonstrably met + a human approval. Security-sensitive areas (auth, keys, billing) always get a human, never agent-only approval.

### [7] Ship — *human-triggered*
- **Input:** approved PR.
- **Output:** merged, deployed, reporter notified on the original ticket that their issue is resolved, with what changed.
- **Gate:** post-deploy smoke check on the affected route; close the loop with the customer who reported it.

---

## What the MVP actually is

Rashmi's directive: **run the flow by hand first, then automate what proved itself.**

- **MVP (now):** stages 0–5a done manually by us, dogfooded on issue #3. Output = this repo's [`issue-3-manual-triage.md`](./issue-3-manual-triage.md), which *is* stage 5a's deliverable produced by hand. We learn what a good issue looks like before asking a bot to write one.
- **v1:** automate intake (0) and triage (1) — the highest-volume, lowest-risk stages. Keep humans on root cause → ship.
- **v2:** let the agent draft stages 2–5 and have a human approve at gate [4] and gate [6] only.
- **Never fully unattended:** gates [4] (approach) and [6] (review) keep a human in the loop, especially for auth/keys/billing.

## Design principles baked in

1. **The issue is the product.** Everything upstream exists to produce a correct, fully-specified issue; everything downstream is mechanical if it is.
2. **No fix without a reproduced root cause** (Iron Law).
3. **Cheapest gate first.** Approve the *approach* (stage 4) before code exists, not the diff after.
4. **Trust automation inversely to blast radius.** Intake auto; auth changes human-reviewed forever.
5. **Close the loop.** The reporter hears back at intake and at ship. Silent fixes waste the trust that generated the report.
6. **Surface, don't swallow, adjacent gaps.** Diagnosis often reveals neighbouring holes; list them as separate scope, let a human decide.

---

*Next: see [`issue-3-manual-triage.md`](./issue-3-manual-triage.md) for stages 0–5a executed by hand on the real API-key issue.*
