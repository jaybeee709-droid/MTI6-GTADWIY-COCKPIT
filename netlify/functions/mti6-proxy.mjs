// MTI6-GTADWIY-COCKPIT — server-side gateway (Phase 1)
// Runs as a Netlify Function. The browser never talks to a provider
// directly through this file, and this file never holds, reads, or
// returns a credential: Phase 1 wires NO provider at all. It exists to
// prove the plumbing — deploy, routing, envelope, and error handling —
// before any provider is chosen (Phase 3, owner approval required).
// Runtime secrets, when a provider is added later, come ONLY from
// Netlify dashboard environment variables, never from this file, the
// repo, or frontend code.

const MAX_BODY_BYTES = 65536;

function envelope(ok, source, data, error, status) {
  const body = { ok, source, timestamp: new Date().toISOString() };
  if (ok) {
    body.data = data;
  } else {
    body.error = error;
  }
  return Response.json(body, { status });
}

function fail(code, message, status) {
  return envelope(false, "gateway", null, { code, message }, status);
}

export default async (req) => {
  if (req.method !== "POST") {
    return fail("METHOD_NOT_ALLOWED", "POST required.", 405);
  }

  let raw;
  try {
    raw = await req.text();
  } catch {
    return fail("INVALID_REQUEST", "Request could not be read.", 400);
  }
  if (raw.length > MAX_BODY_BYTES) {
    return fail("PAYLOAD_TOO_LARGE", "Request is too large.", 413);
  }

  let body;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON.", 400);
  }

  const action = body && body.action;
  if (typeof action !== "string" || !action) {
    return fail("MISSING_ACTION", "No MTI6 action was supplied.", 400);
  }

  // Explicit allowlist. Anything not listed here is rejected before
  // any upstream code could run. Phase 1 has no upstream at all.
  switch (action) {
    case "gateway.status":
      return envelope(true, "gateway", {
        providers: [],
        actions: ["gateway.status", "gateway.ping"],
        note: "No provider is configured yet. Star remains in demo mode."
      }, null, 200);
    case "gateway.ping":
      return envelope(true, "gateway", { pong: true }, null, 200);
    default:
      return fail("UNSUPPORTED_ACTION", "That MTI6 action is not enabled.", 400);
  }
};
