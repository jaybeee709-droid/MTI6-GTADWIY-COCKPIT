/**
 * MTI6 Control Plane — Cloudflare Worker entry (P1 scaffolding, DRAFT).
 *
 * STATUS: APPLIED in v252 (P1, 2026-11-25) as inert Cloudflare
 * scaffolding — in the repo, NOT deployed. (Drafted by Stream B while
 * the build was stopped by an execution-risk notice; applied after
 * Daniel's 14:57 EST "Yes go ahead". CORRECTED PLAN: truth-fix takes
 * v239-v242 taken, P1=v252.)
 *
 * Shape (U24 option (a), U25 option (c), U26 option (a)):
 *   request → JWT gate → capability routing → quota routing → provider proxying
 *
 * Honesty rules for this file:
 * - The JWT gate is DESIGNED here, not live: verifyGoogleJwt() returns
 *   NOT_PROVISIONED until Daniel provisions Google identity (JWKS URL
 *   + expected iss/aud) in the Cloudflare dashboard. No token is ever
 *   accepted on the strength of this scaffolding alone.
 * - No provider is wired. The provider-proxying step re-hosts the
 *   Netlify proxy's allowlist only in a later package, after the
 *   Worker is deployed and the gate is enforced and tested.
 * - Durable Object classes below are SCHEMA-ONLY in P1: table shapes
 *   and the storage API surface, no business logic, no execution.
 * - Nothing here signs, broadcasts, sends, or moves funds. Execution
 *   stays DISABLED everywhere; D6 stays DRY_RUN.
 */

export interface Env {
  WORK_LEDGER: DurableObjectNamespace;
  RESOURCE_STATE: DurableObjectNamespace;
  AUDIT_TRAIL: DurableObjectNamespace;
  WORKER_JOBS: Queue;
  /** Provisioned by Daniel in the Cloudflare dashboard, never in code. */
  GOOGLE_JWKS_URL?: string;
  /** Expected token issuer, e.g. https://accounts.google.com */
  GOOGLE_JWT_ISSUER?: string;
  /** Expected audience (the MTI6 client / Worker identifier). */
  GOOGLE_JWT_AUDIENCE?: string;
}

/** Error vocabulary shared with the Netlify proxy (P1). */
export const CONTROL_PLANE_CODES = [
  "AUTH_REQUIRED",
  "QUOTA_EXHAUSTED",
  "RATE_LIMITED",
  "UPSTREAM_ERROR",
  "NOT_CONFIGURED",
  "INVALID_REQUEST",
  "UNSUPPORTED_ACTION",
  "NOT_FOUND",
] as const;

export type ControlPlaneCode = (typeof CONTROL_PLANE_CODES)[number];

function fail(code: ControlPlaneCode, message: string, status: number): Response {
  return Response.json(
    {
      ok: false,
      source: "control-plane",
      timestamp: new Date().toISOString(),
      error: { code, message },
    },
    { status },
  );
}

/**
 * Google signed-JWT verification (U25 option (c)) — DESIGN ONLY in P1.
 *
 * Intended checks once provisioned: fetch the Google JWKS, verify the
 * RS256 signature, then check iss === GOOGLE_JWT_ISSUER,
 * aud === GOOGLE_JWT_AUDIENCE, exp in the future, short-lived tokens.
 * Revocation is by token expiry plus a blocklist in the AUDIT_TRAIL /
 * RESOURCE_STATE Durable Objects — never a shared long-lived token.
 *
 * Until GOOGLE_JWKS_URL is provisioned this function reports
 * NOT_PROVISIONED and the gate below refuses to enforce — the Worker
 * must never silently enforce a boundary no client can satisfy.
 */
export async function verifyGoogleJwt(
  token: string,
  env: Env,
): Promise<{ ok: true; sub: string } | { ok: false; code: ControlPlaneCode; message: string }> {
  if (!token) {
    return { ok: false, code: "AUTH_REQUIRED", message: "No bearer token was supplied." };
  }
  if (!env.GOOGLE_JWKS_URL || !env.GOOGLE_JWT_ISSUER || !env.GOOGLE_JWT_AUDIENCE) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message: "Google identity is not provisioned for this Worker (JWKS URL / issuer / audience missing).",
    };
  }
  // Provisioning gate passed — the live verification (JWKS fetch +
  // RS256 signature + iss/aud/exp checks) lands in the package that
  // enforces the gate, after Daniel provisions Google identity.
  // Deliberately NOT implemented as a stub that returns ok.
  return {
    ok: false,
    code: "NOT_CONFIGURED",
    message: "JWT verification is designed but not yet implemented for this Worker.",
  };
}

/**
 * Auth gate seam. Returns the would-be decision; enforcement flips
 * only in a later package after Daniel provisions Google identity.
 * Mirrors the Netlify proxy seam (CONTROL_PLANE_AUTH_ENFORCED=false).
 */
export const CONTROL_PLANE_AUTH_ENFORCED = false;

export async function requireControlPlaneAuth(
  request: Request,
  env: Env,
): Promise<{ enforced: boolean; allowed: boolean; sub: string | null; code?: ControlPlaneCode }> {
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!CONTROL_PLANE_AUTH_ENFORCED) {
    // Unenforced by explicit flag (U25(c) identity not provisioned):
    // report the would-be decision, change no behaviour.
    const verdict = await verifyGoogleJwt(token, env);
    return {
      enforced: false,
      allowed: true,
      sub: null,
      ...(verdict.ok ? {} : { code: verdict.code }),
    };
  }
  const verdict = await verifyGoogleJwt(token, env);
  if (!verdict.ok) return { enforced: true, allowed: false, sub: null, code: verdict.code };
  return { enforced: true, allowed: true, sub: verdict.sub };
}

/* ------------------------------------------------------------------ */
/* Durable Objects — schema only in P1 (U24(a): SQLite-backed DOs).    */
/* ------------------------------------------------------------------ */

/** Work Ledger (canonical MTI6 Work Item store — P2 territory; schema only here). */
export class WorkLedger {
  private state: DurableObjectState;
  constructor(state: DurableObjectState) {
    this.state = state;
  }
  async fetch(request: Request): Promise<Response> {
    // Schema note (P1): work items carry work ID, parent work ID,
    // Daniel originating instruction, STAR interpretation, Tribe,
    // worker(s), status, dependencies, artifacts, evidence, branch,
    // test/security results, provenance, cost, approval status.
    // No work-item logic ships in P1.
    return Response.json({ ok: false, error: { code: "NOT_CONFIGURED", message: "Work Ledger logic ships with P2." } }, { status: 503 });
  }
}

/** Resource State (quota / provider-state store behind the P3 engine). */
export class ResourceState {
  private state: DurableObjectState;
  constructor(state: DurableObjectState) {
    this.state = state;
  }
  async fetch(request: Request): Promise<Response> {
    // Schema note (P1): per-provider usage ledgers keyed by provider
    // id + calendar window; the dashboard is authoritative and this
    // store is this-plane counts only. No enforcement logic in P1.
    return Response.json({ ok: false, error: { code: "NOT_CONFIGURED", message: "Resource State logic ships with the quota packages." } }, { status: 503 });
  }
}

/** Audit Trail (append-only decision / access record). */
export class AuditTrail {
  private state: DurableObjectState;
  constructor(state: DurableObjectState) {
    this.state = state;
  }
  async fetch(request: Request): Promise<Response> {
    // Schema note (P1): append-only rows (actor, action, decision,
    // timestamp, provenance). History is never deleted.
    return Response.json({ ok: false, error: { code: "NOT_CONFIGURED", message: "Audit Trail logic ships with the enforcement package." } }, { status: 503 });
  }
}

/* ------------------------------------------------------------------ */
/* Worker entry: JWT gate → capability routing → quota routing →       */
/* provider proxying (the last two steps are stubs in P1).             */
/* ------------------------------------------------------------------ */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return fail("INVALID_REQUEST", "POST required.", 405);
    }
    const gate = await requireControlPlaneAuth(request, env);
    if (!gate.allowed) {
      return fail(gate.code ?? "AUTH_REQUIRED", "Control Plane authentication failed.", 401);
    }
    // P1 stops here: capability routing, quota routing and provider
    // proxying re-host the Netlify allowlist in a later package, once
    // the Worker is deployed and the gate is enforced and tested.
    // Until then the Netlify proxy remains the only gateway.
    return Response.json(
      {
        ok: true,
        source: "control-plane",
        timestamp: new Date().toISOString(),
        data: {
          controlPlane: "scaffolding-only",
          authEnforced: gate.enforced,
          note: "P1: boundary contract + scaffolding. No provider is wired; the Netlify proxy remains the gateway.",
        },
      },
      { status: 200 },
    );
  },

  /** Queues consumer stub (WORKER_JOBS) — no jobs are produced or consumed in P1. */
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    // Intentionally empty in P1: the queue exists so the binding is
    // real; job shapes and the consumer land with the worker runtime
    // packages, which are out of P1 scope.
    void batch;
    void env;
  },
};
