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
//
// STAR (added 2026-11-23, owner's "Give STAR a real brain" package):
// one more narrowly scoped action, star.chat, behind the same
// discipline. The AI provider key is read ONLY from the Netlify
// dashboard environment variable MTI6_STAR_API_KEY; the provider base
// URL and model come from MTI6_STAR_BASE_URL / MTI6_STAR_MODEL with
// OpenRouter defaults (an OpenAI-compatible chat-completions API).
// The key travels only in the server-to-server Authorization header;
// it is never logged, never echoed, and no upstream body is ever
// returned to the client — responses are normalized to { reply,
// model } and errors to static messages. With no key configured,
// star.chat answers NOT_CONFIGURED and the app keeps STAR in its
// honest demo mode.
//
// PIPELINES (added 2026-11-23, owner's "make the pipelines, get the
// APIs" direction): two more narrowly scoped actions behind the
// same discipline — market.prices and the five crypto.* actions
// (CoinGecko: the owner's Demo key from MTI6_COINGECKO_API_KEY,
// required — there is no keyless fallback; the key travels only in
// the server-to-server x-cg-demo-api-key header) and geo.geocode
// (a fallback CHAIN:
// Geoapify via MTI6_GEOAPIFY_KEY first, LocationIQ via
// MTI6_LOCATIONIQ_KEY second; with neither configured the action
// answers NOT_CONFIGURED and places nothing). gateway.status now
// reports per-provider configured booleans — env presence only,
// never a value.
//
// FLIGHTS (added 2026-11-25, v227 Living World atmosphere): one
// more narrowly scoped action, flights.nearby, behind the same
// discipline. The upstream is adsb.lol — a keyless community
// ADS-B aggregator. It sends no CORS header, so a browser fetch
// cannot read it; the proxy is the only route. Responses are
// normalized to { aircraft: [...] } with callsign, position,
// altitude, speed and heading only; the upstream body is never
// echoed. OpenSky was probed twice and is unreachable from this
// host (000/timeout both times); adsb.lol was verified live
// (27–28 aircraft near NYC). Weather stays out of the proxy:
// Met Norway (locationforecast compact) sends ACAO * and is
// fetched directly from the browser.
//
// CAMERAS (added 2026-11-25, v233 CCTV on the map — the owner's
// "Add cctv and other sources like that to our map too"): one
// more narrowly scoped action, cameras.nyc, behind the same
// discipline. The upstream is the NYCDOT traffic-camera list —
// a keyless public feed (name, position, area, online flag,
// snapshot image URL per camera). It sends no CORS header, so
// a browser fetch cannot read the list; the proxy is the only
// route. The action takes no parameters and returns online
// cameras only, normalized to { id, name, lat, lon, area,
// imageUrl }; the upstream body is never echoed. The snapshot
// images themselves are plain <img> loads from the browser
// (display needs no CORS). USGS earthquakes stay out of the
// proxy: the feed sends ACAO * and is fetched directly. The
// ISS position API (api.open-notify.org) was probed twice and
// is unreachable from this host (fetch failed both times);
// Windy webcams are WIRED (v251, F6 — cameras.windy below):
// the free key lives in Netlify as MTI6_WINDY_API_KEY and the
// proxy queries the v3 list endpoint near the map centre.
// Verified against Windy's public docs 2026-11-26: the v3 path
// is /webcams/api/v3/webcams (NOT /api/webcams/v3/webcams) and
// free-tier image URLs expire after 10 minutes (NOT 15) —
// the client re-queries for a fresh snapshot.
//
// DISASTERS + CALIFORNIA CAMERAS (added 2026-11-25, v234 —
// the owner's "every state city and country cameras too" and
// "hurricanes, volcano, tornados, everything"): two more
// narrowly scoped actions. disasters.gdacs reads the GDACS
// global disaster list (keyless; sends no CORS header, so the
// proxy is the only route) and normalizes it to { id, type,
// name, country, alertlevel, alertscore, iscurrent, fromdate,
// todate, severitytext, lat, lon, reportUrl } — tropical
// cyclones, volcanoes, floods, wildfires, earthquakes and
// droughts, current and recent (each pin carries its dates).
// NWS severe alerts (tornadoes, hurricanes, severe storms)
// are fetched DIRECTLY by the browser — api.weather.gov sends
// ACAO * — at the map centre point, and stay out of the proxy.
// cameras.california reads the Caltrans CCTV ArcGIS
// FeatureServer (keyless public data; sends no CORS header)
// with a validated bounding box, and returns in-service
// cameras with a snapshot image URL only. 511NY needs a free
// developer key (request form, weekly review) and is NOT
// wired; the German Autobahn webcam API answers 200 but
// returns zero webcams on every road probed (A1/A3/A7/A9),
// so it is NOT wired either.
//
// MORE CAMERA STATES (added 2026-11-25, v236 — the owner's
// "scrape the web for all thing we need"): the ArcGIS portal
// search for "traffic cameras" turned up state camera services
// across the US and beyond. The ones that verified keyless
// from the shell are wired DIRECTLY by the browser (they send
// ACAO *): Kentucky (KYTC), Oregon (TripCheck), Iowa, Illinois,
// Washington (WashDOT ArcGIS — the images.wsdot.wa.gov
// snapshots are public, so the WSDOT AccessCode key is no
// longer needed), Missouri (HLS video links), Austin TX,
// Montgomery County TX (feed links), Ontario (511on.ca PNGs),
// New Zealand (NZTA). MARYLAND is the one exception here: the
// MDOT SHA CHART MapServer sends no CORS header, so it gets a
// narrow proxy action, cameras.maryland, same bbox discipline
// as California. Maryland and Missouri serve VIDEO (HLS /
// GetVideo), not stills — the client shows them as links.
// NOT wired: Hawaii (its ArcGIS service requires a token),
// Utah + DC (camera inventories with no viewable feed), New
// Orleans (the list is red-light / speed enforcement cameras,
// not CCTV), Portland OR layer 83 (unreachable from this host),
// the IBI 511 mapIcons route (az511 + fl511 return 000 from
// this host — the FL511 ArcGIS layer already covers Florida).

// OWNER LOCK (added 2026-11-25, v248 part 1 — the owner's gate for
// the whole app): two narrowly scoped actions behind the same
// discipline — appLock.status (reports only whether a lock is
// configured) and appLock.verify (checks one password against the
// stored secret). The stored secret is read ONLY from Netlify
// dashboard environment variables (Functions scope), in either of
// two forms — MTI6_APP_LOCK_HASH (SHA-256 hex of the password,
// preferred when set) or MTI6_APP_LOCK_PASSWORD (the password
// itself, as a secret; the proxy hashes it server-side with SHA-256
// and compares constant-time — added v250, because the hash cannot
// be produced without seeing the password, and the password must
// never be seen, copied, or written anywhere by anyone except the
// owner). The plain password is NEVER stored in the repo, the
// frontend, or this file. verify answers { ok: true/false } only —
// never the hash, never the password, never a reason that leaks
// which part failed, and it answers ok:false (not an error) when no
// lock is configured, so the endpoint cannot distinguish "no lock"
// from "wrong password".
// The Google step of the lock is client-side (Google Identity
// Services email vs the owner's address) and never touches this file.

import { createHash, timingSafeEqual } from "node:crypto";

const MAX_BODY_BYTES = 65536;
const STAR_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
// v244 (2026-11-25): v242's default google/gemma-4-31b-it:free
// exists and is configured, but the 5:27 PM live check answered
// RATE_LIMITED (upstream 429, no retry-after) on a call and one
// retry — the free model is rate-limited at the provider right
// now. The default switches to a different free model family,
// nvidia/nemotron-3.5-lightning:free, verified live on the public
// models list the same day ($0 prompt/completion). Honest caveat:
// if the 429 is a shared daily free-tier cap per key, a different
// free model may hit the same wall — this is a model switch, not
// a guarantee the limit lifts. MTI6_STAR_MODEL still overrides
// it when set.
const STAR_DEFAULT_MODEL = "nvidia/nemotron-3.5-lightning:free";
// v246 (2026-11-25): STAR fallback chain — Claude first, then
// Gemini. The owner confirmed both keys sit in Netlify as
// secrets (dashboard check, names only) but nothing in the app
// calls them. Model IDs verified live against the providers'
// public docs the same day: claude-sonnet-5-5 is Anthropic's
// current Sonnet (models overview checked Nov 22, 2026;
// Messages API POST /v1/messages, anthropic-version 2026-10-21
// per the official quickstart — that version rejects
// temperature/top_p/top_k, so none is sent); gemini-3.8-flash
// is Google's current stable Flash on the Gemini API models
// page (ai.google.dev, crawled Nov 25, 2026; generateContent
// v1beta, key in the documented ?key= parameter). Whether the
// Anthropic/Gemini accounts have credits or quota is UNKNOWN
// until a real call goes through one of them — the chain fails
// honestly per provider and reports what it actually did.
const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2026-10-21";
const ANTHROPIC_MODEL = "claude-sonnet-5-5";
const ANTHROPIC_MAX_TOKENS = 1024;
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_MAX_OUTPUT_TOKENS = 1024;
const STAR_TIMEOUT_MS = 30000;
const STAR_MAX_MESSAGES = 12;
const STAR_MAX_CONTENT_CHARS = 2000;
const STAR_ROLES = new Set(["system", "user", "assistant"]);
const TRANSITLAND_REST_BASE = "https://transit.land/api/v2/rest";
const ADSB_LOL_BASE = "https://api.adsb.lol/v2";
const NYCDOT_CAMERAS_URL = "https://webcams.nyctmc.org/api/cameras";
const MAX_CAMERAS = 400;
const GDACS_EVENTS_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH";
const MAX_DISASTERS = 100;
const CALTRANS_CCTV_BASE = "https://caltrans-gis.dot.ca.gov/arcgis/rest/services/CHhighway/CCTV/FeatureServer/0/query";
const MAX_CALTRANS_CAMERAS = 200;
const MARYLAND_CHART_BASE = "https://chartimap1.sha.maryland.gov/arcgis/rest/services/CHART/Cameras/MapServer/0/query";
const MAX_MARYLAND_CAMERAS = 200;
// v237 — Louisiana 511 (Baton Rouge city + St. George city
// ArcGIS views of the same 511LA feed; both send no CORS
// header, so both go through the proxy and merge server-side).
const LOUISIANA_BR_BASE = "https://maps.brla.gov/gis/rest/services/Transportation/Traffic_Camera/MapServer/0/query";
const LOUISIANA_SG_BASE = "https://gis.stgeorgela.gov/server/rest/services/Traffic_Cameras/FeatureServer/0/query";
const MAX_LOUISIANA_CAMERAS = 200;
// v237 — Utah UDOT (IBI 511 platform). The keyless
// GetUserCameras endpoint answers JSON but only after a
// session cookie is set by the homepage — the proxy does
// the two-step server-side. It returns a fixed set of 10
// featured cameras, not the statewide list (that needs the
// free UDOT developer key — see KEYS-NEEDED-2026-11-25.md).
const UDOT_HOME_URL = "https://www.udottraffic.utah.gov";
const UDOT_CAMERAS_URL = "https://www.udottraffic.utah.gov/Camera/GetUserCameras";
const MAX_BBOX_SPAN_DEG = 12;
const MAX_FLIGHT_DIST_NM = 100;
const MAX_FLIGHTS = 40;
// v251 (F6) — Windy Webcams API v3. Verified against Windy's
// public docs 2026-11-26 (api.windy.com/webcams/docs + the v2→v3
// migration guide): base https://api.windy.com, list path
// /webcams/api/v3/webcams, key ONLY in the x-windy-api-key
// header, nearby=lat,lon,radiusKm (max 250 km), limit 0–50,
// offset capped at 1,000 on the listing, include=images,location,
// urls selects the response parts. Free-tier image URLs carry a
// token that expires after 10 minutes — the client re-queries
// for a fresh snapshot instead of caching image URLs.
const WINDY_WEBCAMS_BASE = "https://api.windy.com/webcams/api/v3/webcams";
const WINDY_DEFAULT_LIMIT = 20;
const WINDY_MAX_LIMIT = 50;
const WINDY_MAX_RADIUS_KM = 250;
const WINDY_IMAGE_VALIDITY_MINUTES = 10;
// v251 (F6) — Twitch Helix live status. App access token via the
// client-credentials flow (POST id.twitch.tv/oauth2/token), then
// GET api.twitch.tv/helix/streams with Client-Id + Bearer.
// The token is cached in module scope only (never persisted,
// never returned to the client, never logged). Read-only
// observation only — no broadcast, no account actions, no chat.
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const TWITCH_STREAMS_URL = "https://api.twitch.tv/helix/streams";
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

// Control Plane auth-gate seam (P1, U25(c)) — testable, non-enforcing.
// The gate is DISABLED by explicit flag: U25(c) Google identity is not
// provisioned, so no client could satisfy an enforced boundary yet.
// requireControlPlaneAuth() returns the would-be decision; with the
// flag off it always allows. When a later package flips enforcement
// on (only after Google identity is provisioned and a client is
// proven to pass the gate), the seam verifies the Bearer JWT and
// denies with AUTH_REQUIRED when it is missing or unverifiable —
// fail-closed, never an unverified allow.
const CONTROL_PLANE_AUTH_ENFORCED = false;
async function requireControlPlaneAuth(req) {
  if (!CONTROL_PLANE_AUTH_ENFORCED) {
    return { enforced: false, allowed: true, decision: "ALLOW_UNENFORCED", reason: "U25(c) identity not provisioned" };
  }
  const auth = req && req.headers ? (req.headers.get("Authorization") || "") : "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!token) {
    return { enforced: true, allowed: false, code: "AUTH_REQUIRED", decision: "DENY_NO_TOKEN", reason: "No bearer token was supplied." };
  }
  return { enforced: true, allowed: false, code: "AUTH_REQUIRED", decision: "DENY_NOT_PROVISIONED", reason: "JWT verification is designed but not yet implemented for this proxy." };
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

// Owner lock (v248): the SHA-256 hex of the app password, from the
// Netlify dashboard environment variable MTI6_APP_LOCK_HASH only.
// Never logged, never echoed, never returned to the client.
function readAppLockHash() {
  const v = typeof process !== "undefined" && process.env
    ? process.env.MTI6_APP_LOCK_HASH
    : undefined;
  return typeof v === "string" && v.length > 0 ? v : null;
}

// Owner lock (v250): the app password itself, from the Netlify
// dashboard environment variable MTI6_APP_LOCK_PASSWORD (Functions
// scope, secret). The fallback when no hash is set — the hash cannot
// be produced without seeing the password, and the password must
// never be seen by anyone except the owner. Never logged, never
// echoed, never returned to the client; hashed server-side only.
function readAppLockPassword() {
  const v = typeof process !== "undefined" && process.env
    ? process.env.MTI6_APP_LOCK_PASSWORD
    : undefined;
  return typeof v === "string" && v.length > 0 ? v : null;
}

// Owner lock (v250): configured when EITHER stored form is set —
// the SHA-256 hex (preferred) or the password secret. Presence only,
// never a value.
function isAppLockConfigured() {
  return readAppLockHash() !== null || readAppLockPassword() !== null;
}

const APP_LOCK_HASH_HEX_RE = /^[0-9a-fA-F]{64}$/;

// Server-side password check for appLock.verify. Hashes the supplied
// password with SHA-256 and compares against the stored secret with
// a constant-time compare. The stored secret is the SHA-256 hex when
// MTI6_APP_LOCK_HASH is set (preferred); otherwise the password
// secret MTI6_APP_LOCK_PASSWORD is hashed server-side first and
// compared the same way. Returns false for every failure mode —
// missing secret, malformed hash, wrong password — with no reason, so
// the caller cannot learn which part failed.
function verifyAppLockPassword(password) {
  const storedHash = readAppLockHash();
  if (storedHash !== null && APP_LOCK_HASH_HEX_RE.test(storedHash)) {
    const expected = Buffer.from(storedHash, "hex");
    const actual = createHash("sha256").update(password, "utf8").digest();
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  }
  const storedPassword = readAppLockPassword();
  if (storedPassword === null) return false;
  const expected = createHash("sha256").update(storedPassword, "utf8").digest();
  const actual = createHash("sha256").update(password, "utf8").digest();
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

// Server-side validation for appLock.verify. Returns { password } on
// success or { error } (a Response) on failure. No hash comparison
// happens for invalid input.
function validateAppLockVerify(payload) {
  if (!isPlainObject(payload)) {
    return { error: fail("INVALID_REQUEST", "appLock.verify payload must be an object.", 400, "appLock") };
  }
  const bad = unknownKey(payload, new Set(["password"]));
  if (bad) {
    return { error: fail("INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for appLock.verify.", 400, "appLock") };
  }
  if (typeof payload.password !== "string" || payload.password.length < 1 || payload.password.length > 1024) {
    return { error: fail("INVALID_REQUEST", "password must be a string of 1 to 1024 characters.", 400, "appLock") };
  }
  return { password: payload.password };
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

// ------------------------------------------------------------------
// STAR chat (star.chat) — same discipline as the transit actions:
// validate first (no upstream call for bad input), require the
// server-side key, normalize everything that comes back.
// ------------------------------------------------------------------

function starFail(code, message, status, extra) {
  const error = { code, message };
  if (extra) {
    for (const k of Object.keys(extra)) error[k] = extra[k];
  }
  return envelope(false, "star", null, error, status);
}

function readStarConfig() {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  const apiKey = typeof env.MTI6_STAR_API_KEY === "string" && env.MTI6_STAR_API_KEY.length > 0
    ? env.MTI6_STAR_API_KEY
    : null;
  const baseUrl = typeof env.MTI6_STAR_BASE_URL === "string" && env.MTI6_STAR_BASE_URL.length > 0
    ? env.MTI6_STAR_BASE_URL.replace(/\/+$/, "")
    : STAR_DEFAULT_BASE_URL;
  const model = typeof env.MTI6_STAR_MODEL === "string" && env.MTI6_STAR_MODEL.length > 0
    ? env.MTI6_STAR_MODEL
    : STAR_DEFAULT_MODEL;
  return { apiKey, baseUrl, model, configured: apiKey !== null };
}

// Server-side validation for star.chat. Returns { messages } on
// success or { error } (a Response) on failure.
function validateStarChat(payload) {
  if (!isPlainObject(payload)) {
    return { error: starFail("INVALID_REQUEST", "star.chat payload must be an object.", 400) };
  }
  const bad = unknownKey(payload, new Set(["messages"]));
  if (bad) {
    return { error: starFail("INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for star.chat.", 400) };
  }
  const messages = payload.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > STAR_MAX_MESSAGES) {
    return { error: starFail("INVALID_REQUEST", "messages must be an array of 1 to " + STAR_MAX_MESSAGES + " entries.", 400) };
  }
  for (const m of messages) {
    if (!isPlainObject(m)) {
      return { error: starFail("INVALID_REQUEST", "Each message must be an object.", 400) };
    }
    const badKey = unknownKey(m, new Set(["role", "content"]));
    if (badKey) {
      return { error: starFail("INVALID_REQUEST", "Unknown message field \"" + badKey + "\".", 400) };
    }
    if (typeof m.role !== "string" || !STAR_ROLES.has(m.role)) {
      return { error: starFail("INVALID_REQUEST", "Message role must be system, user, or assistant.", 400) };
    }
    if (typeof m.content !== "string" || m.content.length < 1 || m.content.length > STAR_MAX_CONTENT_CHARS) {
      return { error: starFail("INVALID_REQUEST", "Message content must be a string of 1 to " + STAR_MAX_CONTENT_CHARS + " characters.", 400) };
    }
  }
  return { messages: messages.map((m) => ({ role: m.role, content: m.content })) };
}

// Provider calls return a plain result, never a Response, so the
// chain in handleStarChat can fall through to the next provider:
// { ok: true, reply, model } on success, { ok: false, status } on
// failure, where status is the upstream HTTP status (a number) or
// null for a network/timeout/invalid response. Upstream bodies are
// read only to extract the reply text; they are never echoed
// onward, and error messages are static strings built by the
// handler, never from the upstream.
async function callStar(config, messages) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STAR_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(config.baseUrl + "/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "Bearer " + config.apiKey,
        "X-Title": "MTI6 STAR"
      },
      body: JSON.stringify({ model: config.model, messages })
    });
  } catch {
    return { ok: false, status: null };
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  const reply = data && Array.isArray(data.choices) && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : null;
  if (typeof reply !== "string" || reply.length === 0) {
    return { ok: false, status: res.status };
  }
  const model = data && typeof data.model === "string" && data.model.length > 0 ? data.model : config.model;
  return { ok: true, reply, model };
}

// Literal env reads (one named variable per provider) so the
// posture generator can mechanically extract every env NAME this
// file reads — no dynamic lookups.
function readStarProviderKeys() {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  const pick = (v) => (typeof v === "string" && v.length > 0 ? v : null);
  return {
    openrouter: pick(env.MTI6_STAR_API_KEY),
    anthropic: pick(env.ANTHROPIC_API_KEY),
    gemini: pick(env.GEMINI_API_KEY)
  };
}

// Claude via the Anthropic Messages API. The STAR messages use
// OpenAI-style roles; Anthropic takes the system prompt as a
// top-level `system` field and requires the messages array to
// alternate user/assistant starting with user, so same-role runs
// are merged and system turns are lifted out. No temperature /
// top_p / top_k is sent: API version 2026-10-21 rejects them.
function toAnthropicMessages(messages) {
  const systemParts = [];
  const turns = [];
  for (const m of messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
      continue;
    }
    const last = turns.length > 0 ? turns[turns.length - 1] : null;
    if (last && last.role === m.role) {
      last.content += "\n\n" + m.content;
    } else {
      turns.push({ role: m.role, content: m.content });
    }
  }
  if (turns.length === 0 || turns[0].role !== "user") return null;
  return {
    system: systemParts.length > 0 ? systemParts.join("\n\n") : null,
    messages: turns
  };
}

async function callAnthropic(apiKey, messages) {
  const converted = toAnthropicMessages(messages);
  if (!converted) return { ok: false, status: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STAR_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(ANTHROPIC_BASE_URL + "/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        ...(converted.system ? { system: converted.system } : {}),
        messages: converted.messages
      })
    });
  } catch {
    return { ok: false, status: null };
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  const blocks = data && Array.isArray(data.content) ? data.content : [];
  let reply = "";
  for (const b of blocks) {
    if (b && b.type === "text" && typeof b.text === "string") reply += b.text;
  }
  if (reply.length === 0) {
    return { ok: false, status: res.status };
  }
  const model = data && typeof data.model === "string" && data.model.length > 0 ? data.model : ANTHROPIC_MODEL;
  return { ok: true, reply, model };
}

// Gemini via the Generative Language API (v1beta generateContent).
// The API key travels in the documented ?key= query parameter,
// server-to-server only. Roles map user → "user" and assistant →
// "model"; the system prompt becomes a top-level
// systemInstruction. Contents must alternate user/model starting
// with user, so same-role runs are merged.
function toGeminiContents(messages) {
  const systemParts = [];
  const contents = [];
  for (const m of messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
      continue;
    }
    const role = m.role === "assistant" ? "model" : "user";
    const last = contents.length > 0 ? contents[contents.length - 1] : null;
    if (last && last.role === role) {
      last.parts[0].text += "\n\n" + m.content;
    } else {
      contents.push({ role, parts: [{ text: m.content }] });
    }
  }
  if (contents.length === 0 || contents[0].role !== "user") return null;
  return {
    systemInstruction: systemParts.length > 0
      ? { parts: [{ text: systemParts.join("\n\n") }] }
      : null,
    contents
  };
}

async function callGemini(apiKey, messages) {
  const converted = toGeminiContents(messages);
  if (!converted) return { ok: false, status: null };
  const url = GEMINI_BASE_URL + "/models/" + GEMINI_MODEL + ":generateContent?key=" + encodeURIComponent(apiKey);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STAR_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        ...(converted.systemInstruction ? { systemInstruction: converted.systemInstruction } : {}),
        contents: converted.contents,
        generationConfig: { maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS }
      })
    });
  } catch {
    return { ok: false, status: null };
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  const candidates = data && Array.isArray(data.candidates) ? data.candidates : [];
  let reply = "";
  const first = candidates.length > 0 ? candidates[0] : null;
  const parts = first && first.content && Array.isArray(first.content.parts) ? first.content.parts : [];
  for (const p of parts) {
    if (p && typeof p.text === "string") reply += p.text;
  }
  if (reply.length === 0) {
    return { ok: false, status: res.status };
  }
  const model = data && typeof data.modelVersion === "string" && data.modelVersion.length > 0 ? data.modelVersion : GEMINI_MODEL;
  return { ok: true, reply, model };
}

// The STAR fallback chain (v246): OpenRouter first (current
// behaviour, MTI6_STAR_MODEL env override still wins), then
// Claude (ANTHROPIC_API_KEY) as the first fallback — Claude is
// the best conversational model for STAR — then Gemini
// (GEMINI_API_KEY) as the second fallback. Any provider failure
// (network, 401, 429, 5xx, invalid response) falls through to
// the next configured provider; a provider with no key is
// skipped, not attempted. If every configured provider fails,
// the honest UPSTREAM_ERROR (upstream status only, no body) is
// returned so the client falls back to the local DEMO brain,
// exactly as v242 designed. The reply names the provider that
// actually answered, so a later probe can see which one served
// it. Honest caveat: the fallback trigger itself can only be
// proven live when OpenRouter actually fails — a successful
// OpenRouter call never exercises the chain — and whether the
// Anthropic/Gemini accounts have credits or quota is unknown
// until a real call goes through one of them.
async function handleStarChat(payload) {
  const validated = validateStarChat(payload);
  if (validated.error) return validated.error;
  const keys = readStarProviderKeys();
  if (!keys.openrouter && !keys.anthropic && !keys.gemini) {
    return starFail("NOT_CONFIGURED", "No STAR AI key is configured on the server (Netlify MTI6_STAR_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY). STAR stays in demo mode.", 503);
  }
  let lastStatus = null;
  if (keys.openrouter) {
    const config = readStarConfig();
    const result = await callStar(config, validated.messages);
    if (result.ok) {
      return envelope(true, "star", { reply: result.reply, model: result.model, provider: "openrouter" }, null, 200);
    }
    lastStatus = result.status;
  }
  if (keys.anthropic) {
    const result = await callAnthropic(keys.anthropic, validated.messages);
    if (result.ok) {
      return envelope(true, "star", { reply: result.reply, model: result.model, provider: "anthropic" }, null, 200);
    }
    lastStatus = result.status;
  }
  if (keys.gemini) {
    const result = await callGemini(keys.gemini, validated.messages);
    if (result.ok) {
      return envelope(true, "star", { reply: result.reply, model: result.model, provider: "gemini" }, null, 200);
    }
    lastStatus = result.status;
  }
  const extra = typeof lastStatus === "number" ? { upstreamStatus: lastStatus } : undefined;
  return starFail("UPSTREAM_ERROR", "The STAR AI provider returned an unexpected error.", 502, extra);
}

// ------------------------------------------------------------------
// Pipelines: market.prices (CoinGecko) + geo.geocode (Geoapify →
// LocationIQ chain) — same discipline: validate first, keys only
// from Netlify env, normalized responses, static error strings.
// ------------------------------------------------------------------

// Literal env reads (one named variable per provider) so the
// posture generator can mechanically extract every env NAME this
// file reads — no dynamic lookups.
function readPipelineKeys() {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  const pick = (v) => (typeof v === "string" && v.length > 0 ? v : null);
  return {
    coingecko: pick(env.MTI6_COINGECKO_API_KEY),
    geoapify: pick(env.MTI6_GEOAPIFY_KEY),
    locationiq: pick(env.MTI6_LOCATIONIQ_KEY)
  };
}

function pipelineFail(source, code, message, status, extra) {
  const error = { code, message };
  if (extra) {
    for (const k of Object.keys(extra)) error[k] = extra[k];
  }
  return envelope(false, source, null, error, status);
}

// Quota error envelope (P1 vocabulary): the helper for QUOTA_EXHAUSTED
// and other quota codes (RATE_LIMITED for per-minute windows). Defined
// now, first used in P9 — the vocabulary exists before anything
// crosses the boundary.
function quotaFail(source, code, message, status) { return envelope(false, source, null, { code, message }, status); }

const COINGECKO_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

async function handleMarketPrices(payload) {
  // Thin alias for crypto.simplePrice (P9): same validation, same
  // handler, same response — the keyed path, never keyless.
  // validateMarketPrices is removed (subsumed by validateSimplePrice).
  return handleSimplePrice(payload);
}

// ------------------------------------------------------------------
// CoinGecko (P9, U2) — the five keyed crypto.* actions. Every
// handler validates first (no upstream call for bad input), requires
// the server-side Demo key (missing key → AUTH_REQUIRED, never a
// keyless upstream attempt), then calls the upstream with the key in
// the server-side x-cg-demo-api-key header only. Responses are
// normalized to the pinned shapes; upstream bodies are never echoed.
// ------------------------------------------------------------------

function coinGeckoMissingKey() {
  return pipelineFail("coingecko", "AUTH_REQUIRED", "No CoinGecko Demo key is configured on the server (Netlify MTI6_COINGECKO_API_KEY).", 401);
}

async function callCoinGecko(path, searchParams, apiKey) {
  const url = new URL("https://api.coingecko.com/api/v3" + path);
  for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json", "x-cg-demo-api-key": apiKey }
    });
  } catch {
    return { error: pipelineFail("coingecko", "UPSTREAM_ERROR", "CoinGecko could not be reached.", 502) };
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.status === 401 || res.status === 403) {
    return { error: pipelineFail("coingecko", "AUTH_REQUIRED", "CoinGecko rejected the API key. Check the MTI6_COINGECKO_API_KEY Netlify variable.", 401) };
  }
  if (res.status === 429) {
    const retryAfter = res.headers ? res.headers.get("retry-after") : null;
    const extra = retryAfter ? { retryAfter } : undefined;
    return { error: pipelineFail("coingecko", "RATE_LIMITED", "CoinGecko rate limit reached. The client governor will serve its cached or fallback result.", 429, extra) };
  }
  if (res.status === 404) {
    return { error: pipelineFail("coingecko", "NOT_FOUND", "CoinGecko found nothing for that request.", 404) };
  }
  if (!res.ok || data === null || typeof data !== "object") {
    return { error: pipelineFail("coingecko", "UPSTREAM_ERROR", "CoinGecko returned an unexpected error.", 502) };
  }
  return { data };
}

const COINGECKO_DAYS = new Set([1, 7, 30, 90, 365]);

function validateSimplePrice(payload) {
  if (!isPlainObject(payload)) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "crypto.simplePrice payload must be an object.", 400) };
  }
  const bad = unknownKey(payload, new Set(["ids"]));
  if (bad) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for crypto.simplePrice.", 400) };
  }
  const ids = payload.ids;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 25 ||
      ids.some((i) => typeof i !== "string" || !COINGECKO_ID_RE.test(i))) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "ids must be an array of 1 to 25 CoinGecko asset ids.", 400) };
  }
  return { ids: [...new Set(ids)] };
}

async function handleSimplePrice(payload) {
  const validated = validateSimplePrice(payload);
  if (validated.error) return validated.error;
  const apiKey = readPipelineKeys().coingecko;
  if (!apiKey) return coinGeckoMissingKey();
  const result = await callCoinGecko("/simple/price", { ids: validated.ids.join(","), vs_currencies: "usd", include_24hr_change: "true" }, apiKey);
  if (result.error) return result.error;
  const data = result.data;
  const prices = {};
  for (const id of validated.ids) {
    const row = data[id];
    if (row && typeof row.usd === "number" && Number.isFinite(row.usd)) {
      prices[id] = {
        usd: row.usd,
        change24h: typeof row.usd_24h_change === "number" && Number.isFinite(row.usd_24h_change)
          ? row.usd_24h_change
          : null
      };
    }
  }
  return envelope(true, "coingecko", { prices, keyed: true }, null, 200);
}

function validateCoinMarkets(payload) {
  if (!isPlainObject(payload)) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "crypto.coinMarkets payload must be an object.", 400) };
  }
  const bad = unknownKey(payload, new Set(["vs_currency", "per_page", "page"]));
  if (bad) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for crypto.coinMarkets.", 400) };
  }
  if (payload.vs_currency !== "usd") {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "vs_currency must be \"usd\".", 400) };
  }
  const perPage = payload.per_page === undefined ? 10 : payload.per_page;
  const page = payload.page === undefined ? 1 : payload.page;
  if (!isIntInRange(perPage, 1, 100)) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "per_page must be an integer from 1 to 100.", 400) };
  }
  if (!isIntInRange(page, 1, 100)) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "page must be an integer from 1 to 100.", 400) };
  }
  return { vs_currency: "usd", per_page: perPage, page };
}

async function handleCoinMarkets(payload) {
  const validated = validateCoinMarkets(payload);
  if (validated.error) return validated.error;
  const apiKey = readPipelineKeys().coingecko;
  if (!apiKey) return coinGeckoMissingKey();
  const result = await callCoinGecko("/coins/markets", { vs_currency: "usd", per_page: String(validated.per_page), page: String(validated.page) }, apiKey);
  if (result.error) return result.error;
  const data = result.data;
  if (!Array.isArray(data)) {
    return pipelineFail("coingecko", "UPSTREAM_ERROR", "CoinGecko returned an unexpected error.", 502);
  }
  return envelope(true, "coingecko", { markets: data }, null, 200);
}

function validateCoin(payload) {
  if (!isPlainObject(payload)) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "crypto.coin payload must be an object.", 400) };
  }
  const bad = unknownKey(payload, new Set(["id"]));
  if (bad) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for crypto.coin.", 400) };
  }
  if (typeof payload.id !== "string" || !COINGECKO_ID_RE.test(payload.id)) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "id must be a CoinGecko asset id.", 400) };
  }
  return { id: payload.id };
}

async function handleCoin(payload) {
  const validated = validateCoin(payload);
  if (validated.error) return validated.error;
  const apiKey = readPipelineKeys().coingecko;
  if (!apiKey) return coinGeckoMissingKey();
  const result = await callCoinGecko("/coins/" + encodeURIComponent(validated.id), {}, apiKey);
  if (result.error) return result.error;
  return envelope(true, "coingecko", { coin: result.data }, null, 200);
}

function validateMarketChart(payload) {
  if (!isPlainObject(payload)) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "crypto.marketChart payload must be an object.", 400) };
  }
  const bad = unknownKey(payload, new Set(["id", "days"]));
  if (bad) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for crypto.marketChart.", 400) };
  }
  if (typeof payload.id !== "string" || !COINGECKO_ID_RE.test(payload.id)) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "id must be a CoinGecko asset id.", 400) };
  }
  if (!COINGECKO_DAYS.has(payload.days)) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "days must be one of 1, 7, 30, 90, 365.", 400) };
  }
  return { id: payload.id, days: payload.days };
}

async function handleMarketChart(payload) {
  const validated = validateMarketChart(payload);
  if (validated.error) return validated.error;
  const apiKey = readPipelineKeys().coingecko;
  if (!apiKey) return coinGeckoMissingKey();
  const result = await callCoinGecko("/coins/" + encodeURIComponent(validated.id) + "/market_chart", { vs_currency: "usd", days: String(validated.days) }, apiKey);
  if (result.error) return result.error;
  const data = result.data;
  const raw = Array.isArray(data.prices) ? data.prices : null;
  if (!raw) {
    return pipelineFail("coingecko", "UPSTREAM_ERROR", "CoinGecko returned an unexpected error.", 502);
  }
  const points = raw
    .filter((pt) => Array.isArray(pt) && typeof pt[0] === "number" && typeof pt[1] === "number")
    .map(([t, p]) => ({ t, p }));
  return envelope(true, "coingecko", { points }, null, 200);
}

function validateSearch(payload) {
  if (!isPlainObject(payload)) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "crypto.search payload must be an object.", 400) };
  }
  const bad = unknownKey(payload, new Set(["query"]));
  if (bad) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for crypto.search.", 400) };
  }
  if (typeof payload.query !== "string" || payload.query.length < 1 || payload.query.length > 100) {
    return { error: pipelineFail("coingecko", "INVALID_REQUEST", "query must be a string of 1 to 100 characters.", 400) };
  }
  return { query: payload.query };
}

async function handleSearch(payload) {
  const validated = validateSearch(payload);
  if (validated.error) return validated.error;
  const apiKey = readPipelineKeys().coingecko;
  if (!apiKey) return coinGeckoMissingKey();
  const result = await callCoinGecko("/search", { query: validated.query }, apiKey);
  if (result.error) return result.error;
  const data = result.data;
  const raw = Array.isArray(data.coins) ? data.coins : [];
  const coins = raw
    .filter((c) => c && typeof c.id === "string" && typeof c.name === "string" && typeof c.symbol === "string")
    .map((c) => ({ id: c.id, name: c.name, symbol: c.symbol }));
  return envelope(true, "coingecko", { coins }, null, 200);
}

function validateGeocode(payload) {
  if (!isPlainObject(payload)) {
    return { error: pipelineFail("geoapify", "INVALID_REQUEST", "geo.geocode payload must be an object.", 400) };
  }
  const bad = unknownKey(payload, new Set(["q"]));
  if (bad) {
    return { error: pipelineFail("geoapify", "INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for geo.geocode.", 400) };
  }
  if (typeof payload.q !== "string" || payload.q.trim().length < 1 || payload.q.trim().length > 120) {
    return { error: pipelineFail("geoapify", "INVALID_REQUEST", "q must be a place search string of 1 to 120 characters.", 400) };
  }
  return { q: payload.q.trim() };
}

async function geocodeViaGeoapify(q, apiKey) {
  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.searchParams.set("text", q);
  url.searchParams.set("limit", "5");
  url.searchParams.set("apiKey", apiKey);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url.toString(), { signal: controller.signal, headers: { Accept: "application/json" } });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  const features = data && Array.isArray(data.features) ? data.features : [];
  const results = [];
  for (const f of features) {
    const p = f && f.properties ? f.properties : null;
    if (p && typeof p.lat === "number" && typeof p.lon === "number" &&
        Number.isFinite(p.lat) && Number.isFinite(p.lon)) {
      results.push({ label: typeof p.formatted === "string" ? p.formatted : q, lat: p.lat, lon: p.lon });
    }
  }
  return results;
}

async function geocodeViaLocationIQ(q, apiKey) {
  const url = new URL("https://us1.locationiq.com/v1/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("key", apiKey);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url.toString(), { signal: controller.signal, headers: { Accept: "application/json" } });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  const rows = Array.isArray(data) ? data : [];
  const results = [];
  for (const r of rows) {
    const lat = r ? Number.parseFloat(r.lat) : NaN;
    const lon = r ? Number.parseFloat(r.lon) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      results.push({ label: typeof r.display_name === "string" ? r.display_name : q, lat, lon });
    }
  }
  return results;
}

// The geocoding fallback chain: Geoapify first (the owner's
// researched primary), LocationIQ second. A provider that errors
// or returns nothing falls through to the next; the response
// names the provider that actually answered. Neither configured →
// NOT_CONFIGURED, and nothing is placed anywhere.
async function handleGeocode(payload) {
  const validated = validateGeocode(payload);
  if (validated.error) return validated.error;
  const pipelineKeys = readPipelineKeys();
  const geoapifyKey = pipelineKeys.geoapify;
  const locationiqKey = pipelineKeys.locationiq;
  if (!geoapifyKey && !locationiqKey) {
    return pipelineFail("geoapify", "NOT_CONFIGURED", "No geocoding key is configured on the server (Netlify MTI6_GEOAPIFY_KEY or MTI6_LOCATIONIQ_KEY).", 503);
  }
  if (geoapifyKey) {
    const results = await geocodeViaGeoapify(validated.q, geoapifyKey);
    if (results && results.length > 0) {
      return envelope(true, "geoapify", { results, provider: "geoapify" }, null, 200);
    }
  }
  if (locationiqKey) {
    const results = await geocodeViaLocationIQ(validated.q, locationiqKey);
    if (results && results.length > 0) {
      return envelope(true, "locationiq", { results, provider: "locationiq" }, null, 200);
    }
  }
  return pipelineFail("geoapify", "NOT_FOUND", "No geocoding provider found that place.", 404);
}

// ------------------------------------------------------------------
// Flights: flights.nearby (adsb.lol) — same discipline: validate
// first, normalize everything that comes back, static error
// strings, never echo the upstream body.
// ------------------------------------------------------------------

function flightsFail(code, message, status) {
  return envelope(false, "adsb.lol", null, { code, message }, status);
}

function validateFlightsNearby(payload) {
  if (!isPlainObject(payload)) {
    return { error: flightsFail("INVALID_REQUEST", "flights.nearby payload must be an object.", 400) };
  }
  const bad = unknownKey(payload, new Set(["lat", "lon", "dist"]));
  if (bad) {
    return { error: flightsFail("INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for flights.nearby.", 400) };
  }
  if (!isFiniteNumber(payload.lat) || payload.lat < -90 || payload.lat > 90) {
    return { error: flightsFail("INVALID_REQUEST", "lat must be a number between -90 and 90.", 400) };
  }
  if (!isFiniteNumber(payload.lon) || payload.lon < -180 || payload.lon > 180) {
    return { error: flightsFail("INVALID_REQUEST", "lon must be a number between -180 and 180.", 400) };
  }
  const dist = payload.dist === undefined ? 25 : payload.dist;
  if (!isFiniteNumber(dist) || dist <= 0 || dist > MAX_FLIGHT_DIST_NM) {
    return { error: flightsFail("INVALID_REQUEST", "dist must be a number greater than 0 and at most 100 (nautical miles).", 400) };
  }
  return { lat: payload.lat, lon: payload.lon, dist };
}

function haversineKm(aLat, aLon, bLat, bLon) {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function handleFlightsNearby(payload) {
  const validated = validateFlightsNearby(payload);
  if (validated.error) return validated.error;
  const url = ADSB_LOL_BASE + "/lat/" + validated.lat + "/lon/" + validated.lon + "/dist/" + validated.dist;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
  } catch {
    return flightsFail("UPSTREAM_ERROR", "adsb.lol could not be reached.", 502);
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.status === 429) {
    return flightsFail("RATE_LIMITED", "adsb.lol rate limit reached. Wait and try again.", 429);
  }
  if (!res.ok || data === null || typeof data !== "object" || !Array.isArray(data.ac)) {
    return flightsFail("UPSTREAM_ERROR", "adsb.lol returned an unexpected error.", 502);
  }
  const aircraft = [];
  for (const row of data.ac) {
    if (!row || typeof row !== "object") continue;
    const lat = typeof row.lat === "number" && Number.isFinite(row.lat) ? row.lat : null;
    const lon = typeof row.lon === "number" && Number.isFinite(row.lon) ? row.lon : null;
    if (lat === null || lon === null) continue;
    const hex = typeof row.hex === "string" && row.hex.length > 0 ? row.hex : null;
    if (!hex) continue;
    const callsign = typeof row.flight === "string" && row.flight.trim().length > 0
      ? row.flight.trim()
      : "UNKNOWN";
    const alt = row.alt_baro === "ground"
      ? "ground"
      : typeof row.alt_baro === "number" && Number.isFinite(row.alt_baro)
        ? row.alt_baro
        : null;
    const speed = typeof row.gs === "number" && Number.isFinite(row.gs) ? row.gs : null;
    const heading = typeof row.track === "number" && Number.isFinite(row.track) ? row.track : null;
    aircraft.push({
      hex, callsign, lat, lon, alt, speed, heading,
      distKm: haversineKm(validated.lat, validated.lon, lat, lon)
    });
  }
  aircraft.sort((a, b) => a.distKm - b.distKm);
  return envelope(true, "adsb.lol", { aircraft: aircraft.slice(0, MAX_FLIGHTS) }, null, 200);
}

// ------------------------------------------------------------------
// Cameras: cameras.nyc (NYCDOT traffic cameras) — same
// discipline: validate first, normalize everything that comes
// back, static error strings, never echo the upstream body.
// The action takes no parameters: the client filters the online
// list by distance from the map centre.
// ------------------------------------------------------------------

function camerasFail(code, message, status) {
  return envelope(false, "nycdot", null, { code, message }, status);
}

async function handleCamerasNyc(payload) {
  if (!isPlainObject(payload)) {
    return camerasFail("INVALID_REQUEST", "cameras.nyc payload must be an object.", 400);
  }
  const bad = unknownKey(payload, new Set([]));
  if (bad) {
    return camerasFail("INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for cameras.nyc.", 400);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(NYCDOT_CAMERAS_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
  } catch {
    return camerasFail("UPSTREAM_ERROR", "NYCDOT could not be reached.", 502);
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || !Array.isArray(data)) {
    return camerasFail("UPSTREAM_ERROR", "NYCDOT returned an unexpected error.", 502);
  }
  const cameras = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const id = typeof row.id === "string" && row.id.length > 0 ? row.id : null;
    const name = typeof row.name === "string" && row.name.length > 0 ? row.name : null;
    const lat = typeof row.latitude === "number" && Number.isFinite(row.latitude) ? row.latitude : null;
    const lon = typeof row.longitude === "number" && Number.isFinite(row.longitude) ? row.longitude : null;
    const imageUrl = typeof row.imageUrl === "string" && row.imageUrl.length > 0 ? row.imageUrl : null;
    const online = row.isOnline === true || row.isOnline === "true";
    if (!id || !name || lat === null || lon === null || !imageUrl || !online) continue;
    cameras.push({
      id,
      name,
      lat,
      lon,
      area: typeof row.area === "string" && row.area.length > 0 ? row.area : null,
      imageUrl
    });
    if (cameras.length >= MAX_CAMERAS) break;
  }
  return envelope(true, "nycdot", { cameras }, null, 200);
}

// ------------------------------------------------------------------
// Disasters: disasters.gdacs (GDACS global disaster list) —
// same discipline: validate first, normalize everything that
// comes back, static error strings, never echo the upstream
// body. The action takes no parameters: the client filters by
// type and distance.
// ------------------------------------------------------------------

function disastersFail(code, message, status) {
  return envelope(false, "gdacs", null, { code, message }, status);
}

const GDACS_TYPES = new Set(["DR", "TC", "EQ", "VO", "FL", "WF"]);

async function handleDisastersGdacs(payload) {
  if (!isPlainObject(payload)) {
    return disastersFail("INVALID_REQUEST", "disasters.gdacs payload must be an object.", 400);
  }
  const bad = unknownKey(payload, new Set([]));
  if (bad) {
    return disastersFail("INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for disasters.gdacs.", 400);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(GDACS_EVENTS_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
  } catch {
    return disastersFail("UPSTREAM_ERROR", "GDACS could not be reached.", 502);
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || data === null || typeof data !== "object" || !Array.isArray(data.features)) {
    return disastersFail("UPSTREAM_ERROR", "GDACS returned an unexpected error.", 502);
  }
  const events = [];
  for (const f of data.features) {
    if (!f || typeof f !== "object") continue;
    const p = f.properties && typeof f.properties === "object" ? f.properties : null;
    const coords = f.geometry && Array.isArray(f.geometry.coordinates) ? f.geometry.coordinates : null;
    if (!p || !coords) continue;
    const type = typeof p.eventtype === "string" ? p.eventtype : null;
    const eventid = typeof p.eventid === "number" ? p.eventid : null;
    const lon = typeof coords[0] === "number" && Number.isFinite(coords[0]) ? coords[0] : null;
    const lat = typeof coords[1] === "number" && Number.isFinite(coords[1]) ? coords[1] : null;
    if (!type || !GDACS_TYPES.has(type) || eventid === null || lat === null || lon === null) continue;
    const sev = p.severitydata && typeof p.severitydata === "object" ? p.severitydata : null;
    const url = p.url && typeof p.url === "object" ? p.url : null;
    events.push({
      id: type + "-" + eventid,
      type,
      name: typeof p.name === "string" && p.name.length > 0 ? p.name : (typeof p.eventname === "string" ? p.eventname : "UNNAMED"),
      country: typeof p.country === "string" && p.country.length > 0 ? p.country : null,
      alertlevel: typeof p.alertlevel === "string" && p.alertlevel.length > 0 ? p.alertlevel : null,
      alertscore: typeof p.alertscore === "number" && Number.isFinite(p.alertscore) ? p.alertscore : null,
      iscurrent: p.iscurrent === true || p.iscurrent === "true",
      fromdate: typeof p.fromdate === "string" ? p.fromdate : null,
      todate: typeof p.todate === "string" ? p.todate : null,
      severitytext: sev && typeof sev.severitytext === "string" ? sev.severitytext : null,
      lat,
      lon,
      reportUrl: url && typeof url.report === "string" && url.report.length > 0 ? url.report : null
    });
    if (events.length >= MAX_DISASTERS) break;
  }
  return envelope(true, "gdacs", { events }, null, 200);
}

// ------------------------------------------------------------------
// California cameras: cameras.california (Caltrans CCTV ArcGIS
// FeatureServer) — same discipline: validate the bounding box
// first (no upstream call for bad input), normalize everything
// that comes back, static error strings, never echo the
// upstream body. Only in-service cameras with a snapshot image
// URL are returned.
// ------------------------------------------------------------------

function caltransFail(code, message, status) {
  return envelope(false, "caltrans", null, { code, message }, status);
}

function validateCaltransBbox(payload) {
  if (!isPlainObject(payload)) {
    return { error: caltransFail("INVALID_REQUEST", "cameras.california payload must be an object.", 400) };
  }
  const bad = unknownKey(payload, new Set(["minLon", "minLat", "maxLon", "maxLat"]));
  if (bad) {
    return { error: caltransFail("INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for cameras.california.", 400) };
  }
  const nums = ["minLon", "minLat", "maxLon", "maxLat"].map((k) => payload[k]);
  if (nums.some((v) => !isFiniteNumber(v))) {
    return { error: caltransFail("INVALID_REQUEST", "minLon, minLat, maxLon and maxLat must all be numbers.", 400) };
  }
  const [minLon, minLat, maxLon, maxLat] = nums;
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90 || minLon >= maxLon || minLat >= maxLat) {
    return { error: caltransFail("INVALID_REQUEST", "The bounding box must be a valid lon/lat range.", 400) };
  }
  if (maxLon - minLon > MAX_BBOX_SPAN_DEG || maxLat - minLat > MAX_BBOX_SPAN_DEG) {
    return { error: caltransFail("INVALID_REQUEST", "The bounding box span must be at most 12 degrees per side.", 400) };
  }
  return { minLon, minLat, maxLon, maxLat };
}

async function handleCamerasCalifornia(payload) {
  const validated = validateCaltransBbox(payload);
  if (validated.error) return validated.error;
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "OBJECTID,locationName,nearbyPlace,longitude,latitude,inService,currentImageURL,county,route",
    f: "json",
    returnGeometry: "false",
    resultRecordCount: String(MAX_CALTRANS_CAMERAS),
    geometry: validated.minLon + "," + validated.minLat + "," + validated.maxLon + "," + validated.maxLat,
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    inSR: "4326"
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(CALTRANS_CCTV_BASE + "?" + params.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
  } catch {
    return caltransFail("UPSTREAM_ERROR", "Caltrans could not be reached.", 502);
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || data === null || typeof data !== "object" || !Array.isArray(data.features)) {
    return caltransFail("UPSTREAM_ERROR", "Caltrans returned an unexpected error.", 502);
  }
  const cameras = [];
  for (const f of data.features) {
    if (!f || typeof f !== "object") continue;
    const a = f.attributes && typeof f.attributes === "object" ? f.attributes : null;
    if (!a) continue;
    const id = typeof a.OBJECTID === "number" ? a.OBJECTID : null;
    const name = typeof a.locationName === "string" && a.locationName.length > 0 ? a.locationName : null;
    const lat = typeof a.latitude === "number" && Number.isFinite(a.latitude) ? a.latitude : null;
    const lon = typeof a.longitude === "number" && Number.isFinite(a.longitude) ? a.longitude : null;
    const imageUrl = typeof a.currentImageURL === "string" && a.currentImageURL.length > 0 ? a.currentImageURL : null;
    const inService = a.inService === true || a.inService === "True";
    if (id === null || !name || lat === null || lon === null || !imageUrl || !inService) continue;
    cameras.push({
      id,
      name,
      lat,
      lon,
      nearbyPlace: typeof a.nearbyPlace === "string" && a.nearbyPlace.length > 0 ? a.nearbyPlace : null,
      county: typeof a.county === "string" && a.county.length > 0 ? a.county : null,
      route: typeof a.route === "string" && a.route.length > 0 ? a.route : null,
      imageUrl
    });
    if (cameras.length >= MAX_CALTRANS_CAMERAS) break;
  }
  return envelope(true, "caltrans", { cameras }, null, 200);
}

// Maryland cameras: cameras.maryland (MDOT SHA CHART Cameras
// MapServer) — same discipline as California: validate the
// bounding box first, normalize what comes back, static error
// strings, never echo the upstream body. CHART serves VIDEO
// (CCTVPublicURL / HLS), not stills, so the client shows these
// as links, not inline images. Only cameras with a video URL
// are returned.
function marylandFail(code, message, status) {
  return envelope(false, "maryland", null, { code, message }, status);
}

function validateMarylandBbox(payload) {
  if (!isPlainObject(payload)) {
    return { error: marylandFail("INVALID_REQUEST", "cameras.maryland payload must be an object.", 400) };
  }
  const bad = unknownKey(payload, new Set(["minLon", "minLat", "maxLon", "maxLat"]));
  if (bad) {
    return { error: marylandFail("INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for cameras.maryland.", 400) };
  }
  const nums = ["minLon", "minLat", "maxLon", "maxLat"].map((k) => payload[k]);
  if (nums.some((v) => !isFiniteNumber(v))) {
    return { error: marylandFail("INVALID_REQUEST", "minLon, minLat, maxLon and maxLat must all be numbers.", 400) };
  }
  const [minLon, minLat, maxLon, maxLat] = nums;
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90 || minLon >= maxLon || minLat >= maxLat) {
    return { error: marylandFail("INVALID_REQUEST", "The bounding box must be a valid lon/lat range.", 400) };
  }
  if (maxLon - minLon > MAX_BBOX_SPAN_DEG || maxLat - minLat > MAX_BBOX_SPAN_DEG) {
    return { error: marylandFail("INVALID_REQUEST", "The bounding box span must be at most 12 degrees per side.", 400) };
  }
  return { minLon, minLat, maxLon, maxLat };
}

async function handleCamerasMaryland(payload) {
  const validated = validateMarylandBbox(payload);
  if (validated.error) return validated.error;
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "rowid,ID,location,CCTVPublicURL,Latitude,Longitude",
    f: "json",
    returnGeometry: "false",
    resultRecordCount: String(MAX_MARYLAND_CAMERAS),
    geometry: validated.minLon + "," + validated.minLat + "," + validated.maxLon + "," + validated.maxLat,
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    inSR: "4326"
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(MARYLAND_CHART_BASE + "?" + params.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
  } catch {
    return marylandFail("UPSTREAM_ERROR", "Maryland CHART could not be reached.", 502);
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || data === null || typeof data !== "object" || !Array.isArray(data.features)) {
    return marylandFail("UPSTREAM_ERROR", "Maryland CHART returned an unexpected error.", 502);
  }
  const cameras = [];
  for (const f of data.features) {
    if (!f || typeof f !== "object") continue;
    const a = f.attributes && typeof f.attributes === "object" ? f.attributes : null;
    if (!a) continue;
    const id = typeof a.rowid === "number" ? a.rowid : null;
    const name = typeof a.location === "string" && a.location.length > 0 ? a.location : null;
    const lat = typeof a.Latitude === "number" && Number.isFinite(a.Latitude) ? a.Latitude : null;
    const lon = typeof a.Longitude === "number" && Number.isFinite(a.Longitude) ? a.Longitude : null;
    const videoUrl = typeof a.CCTVPublicURL === "string" && a.CCTVPublicURL.length > 0 ? a.CCTVPublicURL : null;
    if (id === null || !name || lat === null || lon === null || !videoUrl) continue;
    cameras.push({ id, name, lat, lon, area: "MARYLAND", imageUrl: videoUrl });
    if (cameras.length >= MAX_MARYLAND_CAMERAS) break;
  }
  return envelope(true, "maryland", { cameras }, null, 200);
}

// Louisiana cameras: cameras.louisiana (Baton Rouge + St.
// George ArcGIS views of the 511LA feed) — same bbox
// discipline as Maryland. Both services send no CORS header,
// so the proxy queries both and merges the results. The
// image URL is the 511LA Cctv page URL (an image, like
// Ontario's). Only cameras with an image URL are returned.
function louisianaFail(code, message, status) {
  return envelope(false, "louisiana", null, { code, message }, status);
}

function validateLouisianaBbox(payload) {
  if (!isPlainObject(payload)) {
    return { error: louisianaFail("INVALID_REQUEST", "cameras.louisiana payload must be an object.", 400) };
  }
  const bad = unknownKey(payload, new Set(["minLon", "minLat", "maxLon", "maxLat"]));
  if (bad) {
    return { error: louisianaFail("INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for cameras.louisiana.", 400) };
  }
  const nums = ["minLon", "minLat", "maxLon", "maxLat"].map((k) => payload[k]);
  if (nums.some((v) => !isFiniteNumber(v))) {
    return { error: louisianaFail("INVALID_REQUEST", "minLon, minLat, maxLon and maxLat must all be numbers.", 400) };
  }
  const [minLon, minLat, maxLon, maxLat] = nums;
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90 || minLon >= maxLon || minLat >= maxLat) {
    return { error: louisianaFail("INVALID_REQUEST", "The bounding box must be a valid lon/lat range.", 400) };
  }
  if (maxLon - minLon > MAX_BBOX_SPAN_DEG || maxLat - minLat > MAX_BBOX_SPAN_DEG) {
    return { error: louisianaFail("INVALID_REQUEST", "The bounding box span must be at most 12 degrees per side.", 400) };
  }
  return { minLon, minLat, maxLon, maxLat };
}

async function handleCamerasLouisiana(payload) {
  const validated = validateLouisianaBbox(payload);
  if (validated.error) return validated.error;
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "ID,IMAGE_VIEW",
    f: "json",
    returnGeometry: "true",
    resultRecordCount: String(MAX_LOUISIANA_CAMERAS),
    geometry: validated.minLon + "," + validated.minLat + "," + validated.maxLon + "," + validated.maxLat,
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    inSR: "4326",
    // v238 fix: both Louisiana services store geometry in
    // Louisiana State Plane (feet). Without outSR the
    // response came back in feet (lat 699314, lon 3341977)
    // and every camera was silently filtered out client-side.
    outSR: "4326"
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let results;
  try {
    results = await Promise.allSettled([
      fetch(LOUISIANA_BR_BASE + "?" + params.toString(), { signal: controller.signal, headers: { Accept: "application/json" } }),
      fetch(LOUISIANA_SG_BASE + "?" + params.toString(), { signal: controller.signal, headers: { Accept: "application/json" } })
    ]);
  } catch {
    return louisianaFail("UPSTREAM_ERROR", "Louisiana 511 could not be reached.", 502);
  } finally {
    clearTimeout(timer);
  }
  const cameras = [];
  const sources = [
    { result: results[0], prefix: "br", namePrefix: "BATON ROUGE CAMERA" },
    { result: results[1], prefix: "sg", namePrefix: "ST. GEORGE CAMERA" }
  ];
  for (const src of sources) {
    if (src.result.status !== "fulfilled") continue;
    const res = src.result.value;
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok || data === null || typeof data !== "object" || !Array.isArray(data.features)) continue;
    for (const f of data.features) {
      if (!f || typeof f !== "object") continue;
      const a = f.attributes && typeof f.attributes === "object" ? f.attributes : null;
      if (!a) continue;
      const id = typeof a.ID === "number" ? a.ID : null;
      const imageUrl = typeof a.IMAGE_VIEW === "string" && a.IMAGE_VIEW.length > 0 ? a.IMAGE_VIEW : null;
      const lat = f.geometry && typeof f.geometry.y === "number" && Number.isFinite(f.geometry.y) ? f.geometry.y : null;
      const lon = f.geometry && typeof f.geometry.x === "number" && Number.isFinite(f.geometry.x) ? f.geometry.x : null;
      if (id === null || !imageUrl || lat === null || lon === null) continue;
      cameras.push({ id: src.prefix + "-" + id, name: src.namePrefix + " " + id, lat, lon, area: "LOUISIANA", imageUrl });
      if (cameras.length >= MAX_LOUISIANA_CAMERAS) break;
    }
    if (cameras.length >= MAX_LOUISIANA_CAMERAS) break;
  }
  if (results.every((r) => r.status === "rejected")) {
    return louisianaFail("UPSTREAM_ERROR", "Louisiana 511 could not be reached.", 502);
  }
  return envelope(true, "louisiana", { cameras }, null, 200);
}

// Utah cameras: cameras.utah (UDOT IBI GetUserCameras) —
// two-step: GET the homepage to set the session cookie,
// then GET the JSON listing with that cookie. The listing
// returns a fixed set of 10 featured cameras. Payload must
// be an object with no keys (no bbox — the endpoint ignores
// one). The client filters by distance as usual.
function utahFail(code, message, status) {
  return envelope(false, "utah", null, { code, message }, status);
}

async function handleCamerasUtah(payload) {
  if (!isPlainObject(payload)) {
    return utahFail("INVALID_REQUEST", "cameras.utah payload must be an object.", 400);
  }
  const bad = unknownKey(payload, new Set([]));
  if (bad) {
    return utahFail("INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for cameras.utah.", 400);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let cookie = "";
  try {
    const home = await fetch(UDOT_HOME_URL, { signal: controller.signal, headers: { Accept: "text/html" } });
    if (typeof home.headers.getSetCookie === "function") {
      cookie = home.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    } else {
      const single = home.headers.get("set-cookie");
      if (single) cookie = single.split(";")[0];
    }
    if (!home.ok) {
      return utahFail("UPSTREAM_ERROR", "UDOT Traffic could not be reached.", 502);
    }
  } catch {
    return utahFail("UPSTREAM_ERROR", "UDOT Traffic could not be reached.", 502);
  }
  let res;
  try {
    res = await fetch(UDOT_CAMERAS_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json", ...(cookie ? { Cookie: cookie } : {}) }
    });
  } catch {
    return utahFail("UPSTREAM_ERROR", "UDOT cameras could not be reached.", 502);
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok || data === null || typeof data !== "object" || !Array.isArray(data.data)) {
    return utahFail("UPSTREAM_ERROR", "UDOT cameras returned an unexpected response.", 502);
  }
  const cameras = [];
  for (const c of data.data) {
    if (!c || typeof c !== "object") continue;
    const id = typeof c.id === "number" ? c.id : null;
    const name = typeof c.location === "string" && c.location.length > 0 ? c.location : (typeof c.roadway === "string" ? c.roadway : null);
    const wkt = c.latLng && c.latLng.geography && typeof c.latLng.geography.wellKnownText === "string" ? c.latLng.geography.wellKnownText : null;
    const m = wkt ? wkt.match(/POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/) : null;
    const lon = m ? Number(m[1]) : null;
    const lat = m ? Number(m[2]) : null;
    const images = Array.isArray(c.images) ? c.images : [];
    const first = images.length > 0 && images[0] && typeof images[0] === "object" ? images[0] : null;
    const imagePath = first && typeof first.imageUrl === "string" && first.imageUrl.length > 0 && !first.disabled && !first.blocked ? first.imageUrl : null;
    if (id === null || !name || lat === null || lon === null || !Number.isFinite(lat) || !Number.isFinite(lon) || !imagePath) continue;
    cameras.push({ id, name, lat, lon, area: "UTAH", imageUrl: UDOT_HOME_URL + imagePath });
  }
  return envelope(true, "utah", { cameras }, null, 200);
}

// ------------------------------------------------------------------
// Windy webcams: cameras.windy (v251, F6) — same discipline:
// validate first, key only from Netlify env, normalize what
// comes back, static error strings, never echo the upstream
// body. Payload { lat, lon, radiusKm?, limit? }: webcams near
// the map centre. Free tier: link/embed only, image URLs valid
// ~10 minutes (Windy docs) — the response says so and the
// client re-queries instead of caching image URLs. Listing
// offset is always 0 here (never above the 1,000 cap).
// ------------------------------------------------------------------

// Literal env reads (one named variable per provider) so the
// posture generator can mechanically extract every env NAME this
// file reads — no dynamic lookups.
function readWindyKey() {
  const v = typeof process !== "undefined" && process.env
    ? process.env.MTI6_WINDY_API_KEY
    : undefined;
  return typeof v === "string" && v.length > 0 ? v : null;
}

function readTwitchKeys() {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  const pick = (v) => (typeof v === "string" && v.length > 0 ? v : null);
  return {
    clientId: pick(env.MTI6_TWITCH_CLIENT_ID),
    clientSecret: pick(env.MTI6_TWITCH_CLIENT_SECRET)
  };
}

function windyFail(code, message, status) {
  return envelope(false, "windy", null, { code, message }, status);
}

function validateCamerasWindy(payload) {
  if (!isPlainObject(payload)) {
    return { error: windyFail("INVALID_REQUEST", "cameras.windy payload must be an object.", 400) };
  }
  const bad = unknownKey(payload, new Set(["lat", "lon", "radiusKm", "limit"]));
  if (bad) {
    return { error: windyFail("INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for cameras.windy.", 400) };
  }
  if (!isFiniteNumber(payload.lat) || payload.lat < -90 || payload.lat > 90) {
    return { error: windyFail("INVALID_REQUEST", "lat must be a number between -90 and 90.", 400) };
  }
  if (!isFiniteNumber(payload.lon) || payload.lon < -180 || payload.lon > 180) {
    return { error: windyFail("INVALID_REQUEST", "lon must be a number between -180 and 180.", 400) };
  }
  const radiusKm = payload.radiusKm === undefined ? 50 : payload.radiusKm;
  if (!isFiniteNumber(radiusKm) || radiusKm <= 0 || radiusKm > WINDY_MAX_RADIUS_KM) {
    return { error: windyFail("INVALID_REQUEST", "radiusKm must be a number greater than 0 and at most 250.", 400) };
  }
  const limit = payload.limit === undefined ? WINDY_DEFAULT_LIMIT : payload.limit;
  if (!isIntInRange(limit, 1, WINDY_MAX_LIMIT)) {
    return { error: windyFail("INVALID_REQUEST", "limit must be an integer between 1 and 50.", 400) };
  }
  return { lat: payload.lat, lon: payload.lon, radiusKm, limit };
}

async function handleCamerasWindy(payload) {
  const validated = validateCamerasWindy(payload);
  if (validated.error) return validated.error;
  const apiKey = readWindyKey();
  if (!apiKey) {
    return windyFail("NOT_CONFIGURED", "No Windy API key is configured on the server (Netlify MTI6_WINDY_API_KEY).", 503);
  }
  const params = new URLSearchParams({
    include: "images,location,urls",
    nearby: validated.lat + "," + validated.lon + "," + validated.radiusKm,
    limit: String(validated.limit),
    offset: "0"
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(WINDY_WEBCAMS_BASE + "?" + params.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json", "x-windy-api-key": apiKey }
    });
  } catch {
    return windyFail("UPSTREAM_ERROR", "Windy could not be reached.", 502);
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.status === 401 || res.status === 403) {
    return windyFail("AUTH_REQUIRED", "Windy rejected the API key. Check the MTI6_WINDY_API_KEY Netlify variable.", 401);
  }
  if (!res.ok || data === null || typeof data !== "object" || !Array.isArray(data.webcams)) {
    return windyFail("UPSTREAM_ERROR", "Windy returned an unexpected error.", 502);
  }
  const webcams = [];
  for (const w of data.webcams) {
    if (!w || typeof w !== "object") continue;
    const id = typeof w.webcamId === "number" ? String(w.webcamId)
      : typeof w.webcamId === "string" && w.webcamId.length > 0 ? w.webcamId : null;
    const title = typeof w.title === "string" && w.title.length > 0 ? w.title : null;
    const loc = w.location && typeof w.location === "object" ? w.location : null;
    const lat = loc && typeof loc.latitude === "number" && Number.isFinite(loc.latitude) ? loc.latitude : null;
    const lon = loc && typeof loc.longitude === "number" && Number.isFinite(loc.longitude) ? loc.longitude : null;
    const images = w.images && typeof w.images === "object" ? w.images : null;
    const current = images && images.current && typeof images.current === "object" ? images.current : null;
    const daylight = images && images.daylight && typeof images.daylight === "object" ? images.daylight : null;
    const imageUrl = current && typeof current.preview === "string" && current.preview.length > 0 ? current.preview
      : current && typeof current.url === "string" && current.url.length > 0 ? current.url
      : current && typeof current.icon === "string" && current.icon.length > 0 ? current.icon
      : daylight && typeof daylight.preview === "string" && daylight.preview.length > 0 ? daylight.preview : null;
    const urls = w.urls && typeof w.urls === "object" ? w.urls : null;
    const url = urls && typeof urls.detail === "string" && urls.detail.length > 0 ? urls.detail : null;
    if (!id || !title || lat === null || lon === null || !imageUrl) continue;
    webcams.push({
      id,
      title,
      lat,
      lon,
      imageUrl,
      url,
      status: typeof w.status === "string" && w.status.length > 0 ? w.status : null
    });
    if (webcams.length >= validated.limit) break;
  }
  return envelope(true, "windy", {
    webcams,
    imageValidityMinutes: WINDY_IMAGE_VALIDITY_MINUTES,
    imageNote: "Image URLs are valid about 10 minutes on the free tier (Windy docs) — re-query for a fresh snapshot instead of caching them."
  }, null, 200);
}

// ------------------------------------------------------------------
// Twitch live status: streams.twitch (v251, F6) — same
// discipline: validate first, keys only from Netlify env,
// normalize what comes back, static error strings, never echo
// the upstream body, never return the app token. Payload {} or
// { channels?: string[] } — channels must be from the recorded
// IRL list (WorldGlobe TWITCH_CHANNELS, v238); no invented
// channels. Live status only: { channel, isLive, title?,
// viewers?, startedAt? } per channel. Read-only observation —
// no broadcast, no account actions, no chat actions.
// ------------------------------------------------------------------

// The recorded IRL channels (mirrors TWITCH_CHANNELS in
// src/worlds/WorldGlobe.tsx, v238 — verified from each channel
// page's own JSON-LD Nov 25, 2026). The proxy checks exactly
// these; a client-supplied channel outside this list is rejected.
const TWITCH_IRL_CHANNELS = ["jinnytty", "robcdee", "asianandy", "cyr", "extraemily"];
const TWITCH_IRL_SET = new Set(TWITCH_IRL_CHANNELS);

// App access token cache — module scope only. Never persisted,
// never returned to the client, never logged. expiresAt is the
// upstream expires_in minus a 60-second safety margin.
let twitchTokenCache = { token: null, expiresAt: 0 };

function twitchFail(code, message, status) {
  return envelope(false, "twitch", null, { code, message }, status);
}

function validateStreamsTwitch(payload) {
  if (!isPlainObject(payload)) {
    return { error: twitchFail("INVALID_REQUEST", "streams.twitch payload must be an object.", 400) };
  }
  const bad = unknownKey(payload, new Set(["channels"]));
  if (bad) {
    return { error: twitchFail("INVALID_REQUEST", "Unknown parameter \"" + bad + "\" for streams.twitch.", 400) };
  }
  if (payload.channels === undefined) {
    return { channels: [...TWITCH_IRL_CHANNELS] };
  }
  if (!Array.isArray(payload.channels) || payload.channels.length < 1 || payload.channels.length > TWITCH_IRL_CHANNELS.length) {
    return { error: twitchFail("INVALID_REQUEST", "channels must be an array of 1 to 5 recorded IRL channel names.", 400) };
  }
  for (const c of payload.channels) {
    if (typeof c !== "string" || !TWITCH_IRL_SET.has(c.toLowerCase())) {
      return { error: twitchFail("INVALID_REQUEST", "channels must only name recorded IRL channels (jinnytty, robcdee, asianandy, cyr, extraemily).", 400) };
    }
  }
  return { channels: [...new Set(payload.channels.map((c) => c.toLowerCase()))] };
}

async function fetchTwitchAppToken(clientId, clientSecret) {
  if (twitchTokenCache.token !== null && Date.now() < twitchTokenCache.expiresAt) {
    return { token: twitchTokenCache.token };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(TWITCH_TOKEN_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials"
      }).toString()
    });
  } catch {
    return { error: "UPSTREAM_ERROR" };
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || data === null || typeof data !== "object" ||
      typeof data.access_token !== "string" || data.access_token.length === 0) {
    if (res.status === 400 || res.status === 401 || res.status === 403) return { error: "AUTH_REQUIRED" };
    return { error: "UPSTREAM_ERROR" };
  }
  const expiresIn = typeof data.expires_in === "number" && Number.isFinite(data.expires_in) ? data.expires_in : 3600;
  twitchTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(0, expiresIn - 60) * 1000
  };
  return { token: data.access_token };
}

async function handleStreamsTwitch(payload) {
  const validated = validateStreamsTwitch(payload);
  if (validated.error) return validated.error;
  const keys = readTwitchKeys();
  if (!keys.clientId || !keys.clientSecret) {
    return twitchFail("NOT_CONFIGURED", "No Twitch keys are configured on the server (Netlify MTI6_TWITCH_CLIENT_ID and MTI6_TWITCH_CLIENT_SECRET).", 503);
  }
  const tokenResult = await fetchTwitchAppToken(keys.clientId, keys.clientSecret);
  if (tokenResult.error === "AUTH_REQUIRED") {
    return twitchFail("AUTH_REQUIRED", "Twitch rejected the client credentials. Check the MTI6_TWITCH_CLIENT_ID and MTI6_TWITCH_CLIENT_SECRET Netlify variables.", 401);
  }
  if (tokenResult.error || !tokenResult.token) {
    return twitchFail("UPSTREAM_ERROR", "Twitch could not be reached.", 502);
  }
  const query = validated.channels.map((c) => "user_login=" + encodeURIComponent(c)).join("&");
  const fetchStreams = async (token) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      return await fetch(TWITCH_STREAMS_URL + "?" + query, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Client-Id": keys.clientId,
          Authorization: "Bearer " + token
        }
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  let res = await fetchStreams(tokenResult.token);
  if (res !== null && res.status === 401) {
    // Token rejected (expired between cache check and call):
    // drop it, mint one fresh token, retry exactly once.
    twitchTokenCache = { token: null, expiresAt: 0 };
    const retry = await fetchTwitchAppToken(keys.clientId, keys.clientSecret);
    if (retry.error === "AUTH_REQUIRED") {
      return twitchFail("AUTH_REQUIRED", "Twitch rejected the client credentials. Check the MTI6_TWITCH_CLIENT_ID and MTI6_TWITCH_CLIENT_SECRET Netlify variables.", 401);
    }
    if (retry.error || !retry.token) {
      return twitchFail("UPSTREAM_ERROR", "Twitch could not be reached.", 502);
    }
    res = await fetchStreams(retry.token);
  }
  if (res === null) {
    return twitchFail("UPSTREAM_ERROR", "Twitch could not be reached.", 502);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || data === null || typeof data !== "object" || !Array.isArray(data.data)) {
    return twitchFail("UPSTREAM_ERROR", "Twitch returned an unexpected error.", 502);
  }
  const liveByChannel = new Map();
  for (const s of data.data) {
    if (!s || typeof s !== "object") continue;
    const login = typeof s.user_login === "string" ? s.user_login.toLowerCase() : null;
    if (!login || !TWITCH_IRL_SET.has(login)) continue;
    liveByChannel.set(login, {
      channel: login,
      isLive: true,
      title: typeof s.title === "string" && s.title.length > 0 ? s.title : null,
      viewers: typeof s.viewer_count === "number" && Number.isFinite(s.viewer_count) ? s.viewer_count : null,
      startedAt: typeof s.started_at === "string" && s.started_at.length > 0 ? s.started_at : null
    });
  }
  const channels = validated.channels.map((c) => liveByChannel.get(c) ?? {
    channel: c,
    isLive: false,
    title: null,
    viewers: null,
    startedAt: null
  });
  return envelope(true, "twitch", { channels }, null, 200);
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

  const authGate = await requireControlPlaneAuth(req);
  if (!authGate.allowed) return fail(authGate.code || "AUTH_REQUIRED", "Control Plane authentication failed.", 401);

  // Explicit allowlist. Anything not listed here is rejected before
  // any upstream code could run. Transitland v1 admits exactly two
  // actions (D1 + D2, 2026-11-17): transit.stopsNear and
  // transit.departures. transit.routes / transit.route /
  // transit.operators and any Routing Platform action are NOT
  // allowlisted in v1.
  switch (action) {
    case "gateway.status": {
      const star = readStarConfig();
      return envelope(true, "gateway", {
        providers: ["transitland", "star", "coingecko", "geoapify", "locationiq", "adsb.lol", "nycdot", "gdacs", "caltrans", "maryland", "louisiana", "utah", "windy", "twitch"],
        actions: ["gateway.status", "gateway.ping", "transit.stopsNear", "transit.departures", "star.chat", "star.providers", "market.prices", "geo.geocode", "flights.nearby", "cameras.nyc", "disasters.gdacs", "cameras.california", "cameras.maryland", "cameras.louisiana", "cameras.utah", "cameras.windy", "streams.twitch", "crypto.simplePrice", "crypto.coinMarkets", "crypto.coin", "crypto.marketChart", "crypto.search", "appLock.status", "appLock.verify"],
        providersConfigured: {
          transitland: readTransitlandKey() !== null,
          star: star.configured,
          appLock: isAppLockConfigured(),
          anthropic: readStarProviderKeys().anthropic !== null,
          gemini: readStarProviderKeys().gemini !== null,
          coingecko: readPipelineKeys().coingecko !== null,
          geoapify: readPipelineKeys().geoapify !== null,
          locationiq: readPipelineKeys().locationiq !== null,
          adsb: true,
          nycdot: true,
          gdacs: true,
          caltrans: true,
          maryland: true,
          louisiana: true,
          utah: true,
          windy: readWindyKey() !== null,
          twitch: readTwitchKeys().clientId !== null && readTwitchKeys().clientSecret !== null
        },
        star: { configured: star.configured, model: star.configured ? star.model : null },
        controlPlane: { authEnforced: CONTROL_PLANE_AUTH_ENFORCED, jwtRequired: CONTROL_PLANE_AUTH_ENFORCED },
        note: "Providers sit behind the proxy as Capability Router providers; configured means the server's Netlify variable exists (presence only, never a value). CoinGecko is keyed-only via MTI6_COINGECKO_API_KEY (Demo plan, 10,000 credits/month; no keyless fallback). STAR chat is available when star.configured is true; otherwise STAR remains in demo mode. Powered by CoinGecko."
      }, null, 200);
    }
    case "gateway.ping":
      return envelope(true, "gateway", { pong: true }, null, 200);
    // v248 — owner lock. appLock.status takes no parameters and
    // reports only whether a lock is configured (either stored form;
    // env presence only, never a value). appLock.verify checks one
    // password server-side and answers { ok } only — never a reason.
    case "appLock.status": {
      return envelope(true, "appLock", { configured: isAppLockConfigured() }, null, 200);
    }
    case "appLock.verify": {
      const payload = body.payload === undefined ? {} : body.payload;
      const checked = validateAppLockVerify(payload);
      if (checked.error) return checked.error;
      return envelope(true, "appLock", { ok: verifyAppLockPassword(checked.password) }, null, 200);
    }
    case "transit.stopsNear":
    case "transit.departures": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleTransit(action, payload);
    }
    case "star.chat": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleStarChat(payload);
    }
    // v246: star.providers — diagnostics only. Reports booleans
    // for which STAR provider keys are configured (env presence
    // only, never a value, never a partial value).
    case "star.providers": {
      const keys = readStarProviderKeys();
      return envelope(true, "star", {
        providers: {
          openrouter: keys.openrouter !== null,
          anthropic: keys.anthropic !== null,
          gemini: keys.gemini !== null
        }
      }, null, 200);
    }
    case "market.prices": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleMarketPrices(payload);
    }
    case "geo.geocode": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleGeocode(payload);
    }
    case "flights.nearby": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleFlightsNearby(payload);
    }
    case "cameras.nyc": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleCamerasNyc(payload);
    }
    case "disasters.gdacs": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleDisastersGdacs(payload);
    }
    case "cameras.california": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleCamerasCalifornia(payload);
    }
    case "cameras.maryland": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleCamerasMaryland(payload);
    }
    case "cameras.louisiana": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleCamerasLouisiana(payload);
    }
    case "cameras.utah": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleCamerasUtah(payload);
    }
    case "cameras.windy": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleCamerasWindy(payload);
    }
    case "streams.twitch": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleStreamsTwitch(payload);
    }
    case "crypto.simplePrice": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleSimplePrice(payload);
    }
    case "crypto.coinMarkets": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleCoinMarkets(payload);
    }
    case "crypto.coin": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleCoin(payload);
    }
    case "crypto.marketChart": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleMarketChart(payload);
    }
    case "crypto.search": {
      const payload = body.payload === undefined ? {} : body.payload;
      return handleSearch(payload);
    }
    default:
      return fail("UNSUPPORTED_ACTION", "That MTI6 action is not enabled.", 400);
  }
};
