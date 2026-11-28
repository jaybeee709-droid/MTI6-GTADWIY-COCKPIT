# MTI6 Control Plane — Cloudflare Worker (P1 scaffolding)

STATUS: APPLIED in v252 (P1, 2026-11-25) as inert scaffolding.
Nothing here is deployed. No agent performed any step below; every
step is Daniel-side (or parent-arranged).

## What this is

The inert scaffolding for the Cloudflare Control Plane:

- `wrangler.toml` — Workers Free plan, pinned `compatibility_date`,
  Durable Object bindings (`WORK_LEDGER`, `RESOURCE_STATE`,
  `AUDIT_TRAIL`), Queue binding (`WORKER_JOBS`). No secrets in the file.
- `workers/control-plane.ts` — entry: JWT gate → capability routing →
  quota routing → provider proxying. The gate is DESIGNED, not live:
  it reports `NOT_PROVISIONED` until Google identity is provisioned.
  The Durable Object classes are schema-only in P1. No provider is
  wired; the Netlify proxy remains the only gateway until a later
  package deploys this Worker AND enforces AND tests the gate.

Decisions behind it (ruled, not re-decided here):

- U24(a): Workers + SQLite Durable Objects (Work Ledger / Registry /
  Resource State / Assignments / Audit Trail) + Queues.
- U25(c): Google signed JWT (verify signature against Google JWKS,
  `iss` / `aud` / `exp` checks, short-lived tokens, revocation by
  expiry + DO blocklist — no shared long-lived token).
- U26(a): Netlify / Cloudflare coexistence — Netlify stays for
  Transitland; Cloudflare is the new boundary. P9 builds on the
  Netlify proxy first (D-alpha: Netlify-first, host-agnostic client
  contract so the Cloudflare port is a re-host, not a redesign);
  Daniel may reverse D-alpha to Cloudflare-first, in which case P9
  waits for the provisioning below.

## What Daniel must do in Cloudflare (later — NOT required for P9)

Do NOT do this until P1's scaffolding lands and the parent asks for
it. P9 does not need it.

1. Create a Cloudflare account (free plan) if there is none.
2. Workers & Pages → Create Worker → name it `mti6-control-plane`.
3. Deploy the scaffolding from the repo (`workers/control-plane.ts` +
   `wrangler.toml`) with `wrangler deploy` — or paste the Worker code
   in the dashboard. No agent runs `wrangler login`.
4. In the Worker → Settings → Variables / Secrets, add ONLY the
   identity configuration (no provider keys yet):
   - `GOOGLE_JWKS_URL` — the Google JWKS endpoint.
   - `GOOGLE_JWT_ISSUER` — expected `iss` (e.g.
     `https://accounts.google.com`).
   - `GOOGLE_JWT_AUDIENCE` — expected `aud` (the MTI6 client ID).
   Paste ONLY into the encrypted secret fields — never into chat,
   GitHub, source code, screenshots, or messages.
5. Create the Durable Object classes and the `mti6-worker-jobs`
   queue as bound in `wrangler.toml` (the `[[migrations]] v1` block
   declares them; `wrangler deploy` applies it).
6. Do NOT flip enforcement: `CONTROL_PLANE_AUTH_ENFORCED` stays
   `false` until a later package implements live JWT verification
   AND proves a client can pass the gate. Flipping it early would
   brick Transitland + STAR (no client could satisfy the boundary).

## Spending limits / fail-safe

- Free plan only. No paid plan, no auto-upgrade, no billing
  instrument is configured anywhere in this package.
- Overuse fails safe: the Worker refuses requests past the free
  limits; nothing is billed. The Netlify function has no spend cap;
  the quota governors are client-side until the Control Plane
  enforces them server-side in a later package.
- The Cloudflare own-quota numbers are recorded as data in
  `js/quota-config.js` (P3) and flagged UNVERIFIED-against-docs
  until re-checked against the Cloudflare dashboard at
  provisioning time. Never assert a number without a ruling or a
  dashboard reading.

## What P1 does NOT do

- No Cloudflare account / Worker / secret is created by any agent.
- No JWT is enforced. No provider is wired. No key is stored here.
- No execution: nothing signs, broadcasts, sends, or moves funds.
  D6 stays `DRY_RUN`.
