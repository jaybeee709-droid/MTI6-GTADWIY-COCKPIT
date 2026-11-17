// MTI6-GTADWIY-COCKPIT — server-side gateway (Phase 2: Transitland)
// Runs as a Netlify Function. The browser never talks to a provider
// directly through this file. Phase 2 wires ONE provider — Transitland
// (World Data → Transit/Transportation, Globe branch, NOT Crypto World)
// — behind two narrowly scoped actions, transit.stopsNear and
// transit.departures (owner rulings D1 + D2, 2026-11-17; v1 scope is
// STOPS + DEPARTURES only — no journey routing, no routes/operators
// lookups in this package; those stay unallowlisted until a later
// package with its own ruling).
// The Transitland key is read ONLY from the Netlify dashboard
// environment variable TRANSITLAND_API_KEY (Functions scope). It is
// never logged, never echoed in any response, and never leaves the
// server: it travels only in the server-to-server upstream query
// string. Runtime secrets come ONLY from Netlify dashboard environment
// variables, never from this file, the repo, or frontend code.
// Env read (verified 2026-11-17): this file is a serverless Netlify
// Function (Node runtime), so the documented read is process.env —
// the current Functions syntax for this exact handler shape. The
// Edge Functions (Deno) env-get API does not apply here. Dashboard
// variables apply at deploy time, so the key takes effect on the next
// deploy after it is saved.

const MAX_BODY_BYTES = 65536;
const TRANSITLAND_REST_BASE = "https://transit.land/api/v2/rest";
const UPSTREAM_TIMEOUT_MS = 10000;
const MAX_RADIUS_M = 10000;
const MAX_LIMIT = 50;
const RELATIVE_DATES = new Set([
  "TODAY", "YESTERDAY", "TOMORROW",
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
  "NEXT_MONDAY", "NEXT_TUESDAY", "NEXT_WEDNESDAY", "NEXT_THURSDAY",
  "NEXT_FRIDAY", "NEXT_SATURDAY", "NEXT_SUNDAY"
]);
// stop_key is an opaque Transitland lookup key: an integer ID, an
// Onestop ID (e.g. s-...), or a <feed_onestop_id>:<gtfs stop_id> key.
// It goes into the URL path, so it may only contain characters that
// cannot break out of that path segment.
const STOP_KEY_RE = /^[A-Za-z0-9][A-Za-z0-9:._~-]*$/;

function envelope(ok, source, data, error, status) {
  const body = { ok, source, timestamp: new Date().toISOString() };
  if (ok) {
    body.data = data;
  } else {
    body.error = error;
  }
  return Response.json(body, { status });
}

function fail(code, message, status, source) {
  return envelope(false, source || "gateway", null, { code, message }, status);
}

// Transit error envelope: source is always "transitland" (the provider
// that actually answered — or failed to), never "gateway", so the
// router can record originalSource correctly. `extra` carries only
// upstream signals the router needs (e.g. retryAfter); it never
// carries the key, the upstream URL, or an upstream body.
function transitFail(code, message, status, extra) {
  const error = { code, message };
  if (extra) {
    for (const k of Object.keys(extra)) error[k] = extra[k];
  }
  return envelope(false, "transitland", null, error, status);
}

function readTransitlandKey() {
  const v = typeof process !== "undefined" && process.env
    ? process.env.TRANSITLAND_API_KEY
    : undefined;
  return typeof v === "string" && v.length > 0 ? v : null;
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function unknownKey(payload, allowed) {
  for (const k of Object.keys(payload)) {
    if (!allowed.has(k)) return k;
  }
  return null;
}

function isIntInRange(v, min, max) {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}

function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function invalidTransit(action, message) {
  return fail("INVALID_REQUEST", message, 400, "transitland");
}

// Server-side validation for transit.stopsNear. Returns { path, params }
// on success or { error } (a Response) on failure. No upstream call is
// made for invalid input.
function validateStopsNear(payload) {
  if (!isPlainObject(payload)) {
    return { error: invalidTransit("transit.stopsNear", "transit.stopsNear payload must be an object.") };
  }
  const bad = unknownKey(payload, new Set(["lat", "lon", "radius", "limit", "include_routes"]));
  if (bad) {
    return { error: invalidTransit("transit.stopsNear", "Unknown parameter \"" + bad + "\" for transit.stopsNear.") };
  }
  if (!isFiniteNumber(payload.lat) || payload.lat < -90 || payload.lat > 90) {
    return { error: invalidTransit("transit.stopsNear", "lat must be a number between -90 and 90.") };
  }
  if (!isFiniteNumber(payload.lon) || payload.lon < -180 || payload.lon > 180) {
    return { error: invalidTransit("transit.stopsNear", "lon must be a number between -180 and 180.") };
  }
  if (payload.radius !== undefined &&
      (!isFiniteNumber(payload.radius) || payload.radius <= 0 || payload.radius > MAX_RADIUS_M)) {
    return { error: invalidTransit("transit.stopsNear", "radius must be a number greater than 0 and at most 10000 (meters).") };
  }
  if (payload.limit !== undefined && !isIntInRange(payload.limit, 1, MAX_LIMIT)) {
    return { error: invalidTransit("transit.stopsNear", "limit must be an integer between 1 and 50.") };
  }
  if (payload.include_routes !== undefined && typeof payload.include_routes !== "boolean") {
    return { error: invalidTransit("transit.stopsNear", "include_routes must be true or false.") };
  }
  const params = { lat: String(payload.lat), lon: String(payload.lon) };
  if (payload.radius !== undefined) params.radius = String(payload.radius);
  if (payload.limit !== undefined) params.limit = String(payload.limit);
  if (payload.include_routes !== undefined) params.include_routes = payload.include_routes ? "true" : "false";
  return { path: "/stops", params };
}

// Server-side validation for transit.departures. Same contract as
// validateStopsNear. The stop key is validated as an opaque Transitland
// lookup key before it is placed in the URL path.
function validateDepartures(payload) {
  if (!isPlainObject(payload)) {
    return { error: invalidTransit("transit.departures", "transit.departures payload must be an object.") };
  }
  const bad = unknownKey(payload, new Set(["stop_key", "relative_date", "limit", "include_alerts"]));
  if (bad) {
    return { error: invalidTransit("transit.departures", "Unknown parameter \"" + bad + "\" for transit.departures.") };
  }
  const key = payload.stop_key;
  if (typeof key !== "string" || key.length < 1 || key.length > 128 ||
      !STOP_KEY_RE.test(key) || key.indexOf("..") !== -1) {
    return { error: invalidTransit("transit.departures", "stop_key must be a Transitland stop lookup key (Onestop ID, feed:stop key, or integer ID).") };
  }
  if (payload.relative_date !== undefined &&
      (typeof payload.relative_date !== "string" || !RELATIVE_DATES.has(payload.relative_date))) {
    return { error: invalidTransit("transit.departures", "relative_date must be one of TODAY, TOMORROW, or a weekday label (see the Transitland REST schema).") };
  }
  if (payload.limit !== undefined && !isIntInRange(payload.limit, 1, MAX_LIMIT)) {
    return { error: invalidTransit("transit.departures", "limit must be an integer between 1 and 50.") };
  }
  if (payload.include_alerts !== undefined && typeof payload.include_alerts !== "boolean") {
    return { error: invalidTransit("transit.departures", "include_alerts must be true or false.") };
  }
  const params = {};
  if (payload.relative_date !== undefined) params.relative_date = payload.relative_date;
  if (payload.limit !== undefined) params.limit = String(payload.limit);
  if (payload.include_alerts !== undefined) params.include_alerts = payload.include_alerts ? "true" : "false";
  return { path: "/stops/" + encodeURIComponent(key) + "/departures", params };
}

// One Transitland REST call. Returns { data } on success or { error }
// (a Response) on failure. Upstream bodies are never echoed: error
// messages are static strings, so no upstream content — and no part of
// the request URL, which carries the key — can leak into a response.
// Upstream 401 → AUTH_REQUIRED, 429 → RATE_LIMITED (with the upstream
// Retry-After value surfaced when the response carries one; whether
// Transitland sends one is NOT verifiable from its public docs, so the
// proxy passes through whatever it sees and never assumes one exists).
// 404 → NOT_FOUND. Anything else non-2xx, an invalid JSON body, or a
// network/timeout failure → UPSTREAM_ERROR (502).
async function callTransitland(path, params, apiKey) {
  const url = new URL(TRANSITLAND_REST_BASE + path);
  url.searchParams.set("apikey", apiKey);
  for (const k of Object.keys(params)) url.searchParams.set(k, params[k]);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
  } catch {
    return { error: transitFail("UPSTREAM_ERROR", "Transitland could not be reached.", 502) };
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.status === 401) {
    return { error: transitFail("AUTH_REQUIRED", "Transitland rejected the API key. Check the TRANSITLAND_API_KEY Netlify variable.", 401) };
  }
  if (res.status === 429) {
    const retryAfter = res.headers ? res.headers.get("retry-after") : null;
    const extra = retryAfter ? { retryAfter } : undefined;
    return { error: transitFail("RATE_LIMITED", "Transitland quota reached — requests are refused until the next-month reset. See the Interline dashboard.", 429, extra) };
  }
  if (res.status === 404) {
    return { error: transitFail("NOT_FOUND", "Transitland found nothing for that stop.", 404) };
  }
  if (!res.ok) {
    return { error: transitFail("UPSTREAM_ERROR", "Transitland returned an unexpected error.", 502) };
  }
  if (data === null || typeof data !== "object") {
    return { error: transitFail("UPSTREAM_ERROR", "Transitland returned an invalid response.", 502) };
  }
  return { data };
}

// A transit action: validate first (no upstream call for bad input),
// then require the server-side key (no keyless upstream attempt —
// Transitland returns 401 without a key), then call upstream.
async function handleTransit(action, payload) {
  const validated = action === "transit.stopsNear"
    ? validateStopsNear(payload)
    : validateDepartures(payload);
  if (validated.error) return validated.error;
  const apiKey = readTransitlandKey();
  if (!apiKey) {
    return transitFail("AUTH_REQUIRED", "No Transitland API key is configured on the server (Netlify TRANSITLAND_API_KEY).", 401);
  }
  const result = await callTransitland(validated.path, validated.params, apiKey);
  if (result.error) return result.error;
  return envelope(true, "transitland", result.data, null, 200);
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
  // any upstream code could run. Transitland v1 admits exactly two
  // actions (D1 + D2, 2026-11-17): transit.stopsNear and
  // transit.departures. transit.routes / transit.route /
  // transit.operators and any Routing Platform action are NOT
  // allowlisted in v1.
  switch (action) {
    case "gateway.status":
      return envelope(true, "gateway", {
        providers: [],
        actions: ["gateway.status", "gateway.ping"],
        note: "No provider is configured yet. Star remains in demo mode."
      }, null, 200);
    case "gateway.ping":
      return envelope(true, "gateway", { pong: true }, null, 200);
    case "transit.stopsNear":
    case "transit.departures": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleTransit(action, payload);
    }
    default:
      return fail("UNSUPPORTED_ACTION", "That MTI6 action is not enabled.", 400);
  }
};
