# Manual Triage — Issue #3: Cannot generate / renew / revoke API key

This is the MVP: the [maintenance flow](./MAINTENANCE_AUTOMATION_FLOW.md) run **by hand**, stage by stage, on the real report from Alex (@aolieman / regen67). The goal is to see what a good run looks like before we automate it. The final section is the ready-to-file GitHub issue (flow stage 5a).

---

## [0] Intake

- **Reporter:** Alex (@regen67 / @aolieman), OpenGrants API consumer running "PG Atlas".
- **Verbatim:** "My PG Atlas error log tells me it can't access OpenGrants… Maybe the API key expired… It's not possible to generate a new API key 😕… I found a workaround to generate a new key for myself. Had to craft a pretty simple request with the privy-token cookie."
- **Requests:** (a) longer default expiry, or option to choose 1 year; (b) ability to revoke an active key.
- **Reporter's workaround (big hint):** hand-crafted a request carrying the Privy token to mint a key — i.e. the *backend* works, the *UI path* is missing.

## [1] Triage

- **Category:** bug (broken/incomplete flow) **+** two feature requests (expiry duration, revocation).
- **Component:** API-key management — `server/routes.ts` auth routes, `client/src/pages/get-api-access.tsx`.
- **Severity:** high — an active integrator is fully locked out of self-service key renewal; only an undocumented workaround unblocks them.
- **Reproducible in principle:** yes — any already-registered user hits it.

## [2] Reproduce

Traced the "Generate API Key" path for an **already-registered** user:

1. `client/src/pages/get-api-access.tsx:61` — the only submit action is `registrationMutation`.
2. `:64` — it always `POST`s to `/api/auth/register`.
3. `server/routes.ts:71` — `register` upserts the user, then at `:89–90` finds the existing `apiUser` and returns **`409 "Already registered. This account already has an API key."`**

**Observed:** button → toast "Registration failed: This account already has an API key."
**Expected:** an existing user can mint a fresh key.

The existing-keys list (`get-api-access.tsx:329`) renders read-only chips with **no action buttons** — the footer literally says "Generate a new key above to replace expired or revoked keys," but the only control above is the register button that 409s.

✅ Reproduced. Matches Alex's report exactly, and explains why his workaround (hitting the backend directly with the Privy token) succeeded.

## [3] Root cause

Three distinct defects, one theme — **the backend is ahead of the UI, and one duration is hard-coded**:

1. **Renewal not wired.** A working endpoint `POST /api/auth/keys` exists (`server/routes.ts:164`) — Privy-verified, caps at 3 active keys, mints + returns a raw key. **No UI control ever calls it.** The form only knows `/api/auth/register`, which is one-shot per account by design (`:89`). This single wiring gap is the entire "can't generate a new key" bug.
2. **Revocation has no endpoint.** `storage.revokeApiKey(id)` is fully implemented (`server/storage.ts:282`, sets `status:'revoked'`) but **no route calls it** — no `DELETE /api/auth/keys/:id`, and no UI. The capability exists end-to-*storage* but is unreachable.
3. **Expiry is hard-coded to 3 months** in both mint paths (`routes.ts:108` and `:187`: `expiresAt.setMonth(getMonth()+3)`). No way to request a longer/1-year key. Frontend copy hard-asserts "API keys expire after 3 months" (`get-api-access.tsx` terms list).

**Falsifiable claims** (verify by reading the named lines):
- Grep confirms `revokeApiKey` appears only in `storage.ts` + the interface — never in any `routes*.ts`.
- Grep confirms no `app.delete` / `app.patch` on `/api/auth/keys`.
- Both expiry computations use `setMonth(+3)`; nothing reads a duration from the request.

## [4] Solution design (proposed — needs human sign-off)

**Fix #1 is the actual bug Alex hit; #2 and #3 are the features he requested. Recommend shipping #1 immediately, #2/#3 together right after.**

**#1 — Wire renewal into the UI.**
- Add a "Generate new key" button (visible when `registered`) that calls `POST /api/auth/keys` with the Privy Bearer token — the *same request Alex crafted by hand*.
- On success, surface the raw key in the existing "save it now" panel and invalidate `/api/auth/keys`.
- Handle the `400 "Maximum of 3 active API keys allowed"` case with a clear message pointing at revocation.

**#2 — Revocation endpoint + UI.**
- Backend: add `DELETE /api/auth/keys/:id` behind `verifyPrivyToken`; verify the key belongs to the caller's `apiUser` before calling `storage.revokeApiKey(id)`. (Ownership check is the security-critical part — don't let a valid Privy token revoke someone else's key.)
- Frontend: a "Revoke" button per key chip in the existing list, with a confirm dialog.

**#3 — Selectable expiry (default longer, up to 1 year).**
- Backend: accept an optional `expiryDays` (or `duration` enum: 90 / 180 / 365) on the mint routes; validate against an allow-list; default bumped from 3 months. Keep the DB column as-is (`expires_at`), just compute from the requested duration.
- Frontend: a duration selector on the generate control; update the hard-coded "expire after 3 months" copy to reflect the choice.

**Blast radius:** auth/keys — **security-sensitive**. Ownership check on revoke and the expiry allow-list are the two things a human reviewer must scrutinize. No schema migration required (columns already exist). Backward compatible: existing 3-month keys and the `register` first-key path are untouched.

---

## [5a] Ready-to-file GitHub issue

> Copy-paste target for `metagov/Grants-Gateway-API`. This is the artifact the whole flow exists to produce.

---

### Title
Wire up API-key renewal, add revocation, and make expiry selectable (up to 1 year)

### Problem
Registered users cannot generate a replacement API key from the UI. The "Generate API Key" button only calls `POST /api/auth/register`, which returns `409 Already registered` for anyone who already has an account (`server/routes.ts:89`). The working renewal endpoint `POST /api/auth/keys` is never called by the frontend. Reported by @aolieman, who was locked out on expiry and had to hand-craft a Privy-token request to mint a key (issue #3). He also asked for a longer/selectable expiry and the ability to revoke keys.

### Root cause
1. **Renewal:** `client/src/pages/get-api-access.tsx` only wires `/api/auth/register`; the functional `POST /api/auth/keys` (`server/routes.ts:164`, caps 3 active) has no UI control.
2. **Revocation:** `storage.revokeApiKey()` (`server/storage.ts:282`) exists but no route or UI reaches it.
3. **Expiry:** hard-coded to 3 months in both mint paths (`routes.ts:108`, `:187`).

### To-do

**Renewal (fixes the reported lockout)**
- [ ] Add a "Generate new key" control on `/get-api-access`, shown when `registered`, that calls `POST /api/auth/keys` with the Privy Bearer token.
- [ ] Show the returned raw key in the existing save-it-now panel; invalidate the `/api/auth/keys` query.
- [ ] Handle `400 Maximum of 3 active API keys` with a message that points the user to revoke an old key.

**Revocation**
- [ ] Add `DELETE /api/auth/keys/:id` behind `verifyPrivyToken`.
- [ ] Before revoking, confirm the key's `userId` maps to the caller's `apiUser` (reject others' keys with 403/404).
- [ ] Call `storage.revokeApiKey(id)` on success.
- [ ] Add a per-key "Revoke" button + confirm dialog in the key list; refresh the list after.

**Selectable expiry**
- [ ] Accept an optional validated `duration` (allow-list: 90 / 180 / 365 days) on `POST /api/auth/keys` (and optionally `register`); default longer than today's 3 months.
- [ ] Compute `expiresAt` from the requested duration; reject values outside the allow-list.
- [ ] Add a duration selector to the generate control; update the hard-coded "expire after 3 months" terms copy.

### Acceptance criteria
- [ ] A registered user can click one button on `/get-api-access` and receive a new, working API key — **no hand-crafted request needed** (validates the exact fix for Alex's report).
- [ ] A user may hold up to **5** active keys; generating a 6th returns a clear 400, and the UI tells the user to revoke one first.
- [ ] A user can revoke one of their own keys from the UI; the revoked key immediately fails auth (`401` from `authenticateNewApiKey`) and the other keys keep working.
- [ ] A user **cannot** revoke a key they don't own (verified by test with a mismatched Privy identity → 403/404, key stays active).
- [ ] A user can choose a duration and the returned key's `expiresAt` reflects it; durations outside the allow-list are rejected.
- [ ] Existing 3-month keys and the first-time `register` flow are unaffected; no DB migration required.
- [ ] CI green; auth changes reviewed by a human (security-sensitive area).

### Notes / blast radius
Auth + keys — **security-sensitive**. The ownership check on revoke and the expiry allow-list are the two review-critical items. No schema change (`api_keys.expires_at` / `status` already exist). Backward compatible.

---

*Flow stages 0–5a completed manually on 2026-07-08. Stages 5b–7 (implement → review → ship) follow once the approach above is signed off.*
