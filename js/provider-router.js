/* MTI6-GTADWIY-COCKPIT — Capability Router (Free-First Fallback Directive)
 *
 * The ONE provider-neutral request layer (§19). Screens ask for a
 * CAPABILITY — WorldData.weather(lat, lon), CryptoData.protocol(id) —
 * and never name a provider or a provider URL. Underneath, each
 * capability runs its fallback chain (§1):
 *
 *   PRIMARY -> SECONDARY -> TERTIARY -> VALID CACHE / LAST KNOWN
 *   -> honest NO_DATA / NOT_CONNECTED
 *
 * Every result is a normalized observation set (§20) that names the
 * provider that ACTUALLY answered (§3): provider, originalSource,
 * observedAt, retrievedAt, freshnessState, fallbackPosition and the
 * full failures list — a fallback is never silently dressed as the
 * primary. Nothing is fabricated to hide a provider failure (§23).
 *
 * Governance built in, not bolted on:
 *   - Governor (§13): per-provider minimum interval between network
 *     calls (serial queue), a sliding-window call budget taken from
 *     the provider's documented limits (or a conservative
 *     self-imposed cap where the provider publishes none — recorded
 *     as such, never invented as the provider's figure), in-flight
 *     dedupe of identical calls, and per-capability cache TTLs.
 *     The router exposes ONLY explicit-call capabilities — nothing
 *     here auto-fetches, and Globe movement fires no requests.
 *   - Exponential backoff after failures and a circuit breaker
 *     (§18): 3 consecutive failures mark the provider DEGRADED and
 *     it is skipped for a cooldown, then one controlled recheck.
 *   - Cache (§12): successful observations are cached in memory and
 *     (where terms permit — every provider wired here permits it)
 *     localStorage, keeping the ORIGINAL provider and times. A
 *     cached result served after a failed chain is LAST_KNOWN —
 *     never relabelled CURRENT / LIVE.
 *   - Health (§17): health() derives each provider's state from the
 *     ApiRegistry outcome history plus breaker state — measured
 *     from recorded attempts, never assumed. Every network attempt
 *     is recorded in ApiRegistry (js/api-registry.js).
 *
 * Provider boundaries wired here (all keyless, CORS-measured in the
 * 2026-11-16 discovery sweep, files/API-DISCOVERY-SWEEP-2026-11-16.md):
 *   - Weather: NWS primary for US points (open government data),
 *     Open-Meteo worldwide / fallback. NWS asks callers for an
 *     identifying User-Agent; BROWSERS CANNOT SET User-Agent — the
 *     browser sends its own. That fact is recorded on the registry
 *     entry; if NWS rejects a call the failure is recorded and the
 *     chain falls back. No proxy is used (proxy expansion is
 *     owner-gated).
 *   - Alerts: NWS (US) only. Outside the US the honest result is
 *     NO_DATA with UNSUPPORTED in the chain — silence is
 *     never presented as calm.
 *   - Geocoding: Open-Meteo Geocoding (Photon stays a CANDIDATE —
 *     not wired).
 *   - Earthquakes: USGS real-time GeoJSON summary feeds (§9).
 *   - Natural events: NASA EONET v3 (upstream sources preserved).
 *   - Protocol / chain data: DefiLlama FREE endpoints only (§7).
 *     The former free yield endpoints moved to the paid plan on
 *     2026-11-13, so CryptoData.yields() returns the §22
 *     capability-gap shape and makes ZERO network calls.
 *   - DEX pairs: DexScreener (§8 — an observation source, never a
 *     canonical identity authority), within its documented limits.
 */
(function (global) {
  "use strict";

  // ------------------------------------------------------------------
  // Provider configuration. `budget` is the governor's sliding-window
  // cap: the provider's documented limit where one exists (noted),
  // otherwise a conservative self-imposed cap (noted as such).
  // ------------------------------------------------------------------
  var PROVIDERS = {
    "nws": {
      name: "National Weather Service", registryId: "nws",
      serviceArea: "US points",
      costState: "FREE_KEYLESS",
      minIntervalMs: 300, budget: { calls: 60, windowMs: 60 * 1000 },
      budgetNote: "NWS publishes no numeric limit (reasonable use + identifying User-Agent); 60/min is a conservative MTI6 self-imposed cap, not an NWS figure.",
      timeoutMs: 9000,
      breaker: { threshold: 3, cooldownMs: 5 * 60 * 1000 }
    },
    "open-meteo": {
      name: "Open-Meteo", registryId: "open-meteo",
      costState: "FREE_NONCOMMERCIAL",
      minIntervalMs: 200, budget: { calls: 300, windowMs: 60 * 1000 },
      budgetNote: "Open-Meteo documents 600 calls/min on the free tier; the governor runs at half that.",
      timeoutMs: 9000,
      breaker: { threshold: 3, cooldownMs: 5 * 60 * 1000 }
    },
    "open-meteo-geocoding": {
      name: "Open-Meteo Geocoding", registryId: "open-meteo-geocoding",
      costState: "FREE_NONCOMMERCIAL",
      minIntervalMs: 200, budget: { calls: 120, windowMs: 60 * 1000 },
      budgetNote: "Free-tier guideline ≈10,000 calls/day (provider-level); governor cap is conservative.",
      timeoutMs: 9000,
      breaker: { threshold: 3, cooldownMs: 5 * 60 * 1000 }
    },
    "usgs-earthquakes": {
      name: "USGS Earthquake Catalog", registryId: "usgs-earthquakes",
      costState: "FREE_KEYLESS",
      minIntervalMs: 1000, budget: { calls: 60, windowMs: 60 * 1000 },
      budgetNote: "USGS publishes no rate limit (recorded UNKNOWN in the catalog); 60/min is a conservative MTI6 self-imposed cap.",
      timeoutMs: 12000,
      breaker: { threshold: 3, cooldownMs: 5 * 60 * 1000 }
    },
    "nasa-eonet": {
      name: "NASA EONET", registryId: "nasa-eonet",
      costState: "FREE_KEYLESS",
      minIntervalMs: 1000, budget: { calls: 60, windowMs: 60 * 1000 },
      budgetNote: "EONET publishes no quota (recorded UNKNOWN in the catalog); 60/min is a conservative MTI6 self-imposed cap.",
      timeoutMs: 12000,
      breaker: { threshold: 3, cooldownMs: 5 * 60 * 1000 }
    },
    "defillama": {
      name: "DefiLlama", registryId: "defillama",
      costState: "FREE_KEYLESS",
      minIntervalMs: 1000, budget: { calls: 50, windowMs: 60 * 1000 },
      budgetNote: "Free API: no figure in the official docs; secondary sources report ≈300 requests / 5 min per IP. Governor runs at 50/min.",
      timeoutMs: 15000,
      breaker: { threshold: 3, cooldownMs: 5 * 60 * 1000 }
    },
    "dexscreener": {
      name: "DexScreener", registryId: "dexscreener",
      costState: "FREE_KEYLESS",
      minIntervalMs: 250, budget: { calls: 280, windowMs: 60 * 1000 },
      budgetNote: "Documented: 300 requests/min for the pairs/tokens/search group (60/min for profiles/boosts, not used here). Governor runs just under the documented limit.",
      timeoutMs: 9000,
      breaker: { threshold: 3, cooldownMs: 5 * 60 * 1000 }
    }
  };

  var BACKOFF_BASE_MS = 1000;         // exponential backoff: 1s, 2s, 4s… capped
  var BACKOFF_CAP_MS = 30 * 1000;
  var CACHE_KEY = "mti6_provider_cache_v1";
  var CACHE_MAX_ENTRIES = 60;

  // ------------------------------------------------------------------
  // Universal outcome vocabulary (owner refinement, 2026-11-16) —
  // exact and platform-wide. Every outcome the router records uses
  // one of these states and no other:
  //   SUCCESS          the provider answered with usable data
  //   NO_DATA          the provider answered but had no usable data
  //   UNSUPPORTED      the provider does not serve this request
  //                    (e.g. NWS outside the US) — advances the chain
  //                    WITHOUT damaging provider health
  //   RATE_LIMITED     provider limit or governor budget/window hit
  //   TIMEOUT          no answer within the attempt's timeout
  //   AUTH_REQUIRED    credentials required or rejected (401/403)
  //   OFFLINE          network failure, provider 5xx, or the
  //                    breaker/backoff governor skipping the call
  //   INVALID_RESPONSE an answer that cannot be used (bad shape)
  //   STALE            served data past its freshness window
  //                    (the LAST_KNOWN cache path)
  // Health (§17) derives ONLY from genuine failure states —
  // UNSUPPORTED and STALE never count against a provider, and the
  // breaker (§18) trips only on genuine failures: its threshold
  // and cooldown are per-provider policy (PROVIDERS[id].breaker);
  // 3 consecutive failures / 5 minutes is the DEFAULT policy
  // value, not a global constant.
  // ------------------------------------------------------------------
  var FAILURE_STATES = ["SUCCESS", "NO_DATA", "UNSUPPORTED", "RATE_LIMITED", "TIMEOUT",
    "AUTH_REQUIRED", "OFFLINE", "INVALID_RESPONSE", "STALE"];

  // ------------------------------------------------------------------
  // Capability policies (owner refinement, 2026-11-16): cache TTL
  // and minimum-refresh are PER-CAPABILITY policy — never one
  // global TTL, never hard-coded at a call site. Long-lived:
  // geocoding + protocol/chain reference data. Short and
  // event-driven: alerts, earthquake and natural-event feeds.
  // Very short: price (RESERVED — PriceScout owns the price chain
  // today; the policy is recorded so a future router price
  // capability inherits it). DEX pair/liquidity data: short.
  // ------------------------------------------------------------------
  var CAPABILITY_POLICIES = {
    weather:       { ttlMs: 30 * 60 * 1000, minFreshMs: 60 * 1000 },
    alerts:        { ttlMs: 5 * 60 * 1000, minFreshMs: 60 * 1000 },
    geocode:       { ttlMs: 24 * 60 * 60 * 1000, minFreshMs: 24 * 60 * 60 * 1000 },
    earthquakes:   { ttlMs: 5 * 60 * 1000, minFreshMs: 120 * 1000 },
    naturalEvents: { ttlMs: 30 * 60 * 1000, minFreshMs: 300 * 1000 },
    protocol:      { ttlMs: 2 * 60 * 60 * 1000, minFreshMs: 5 * 60 * 1000 },
    chain:         { ttlMs: 2 * 60 * 60 * 1000, minFreshMs: 5 * 60 * 1000 },
    dexPairs:      { ttlMs: 5 * 60 * 1000, minFreshMs: 60 * 1000 },
    price:         { ttlMs: 60 * 1000, minFreshMs: 30 * 1000 }
  };

  // ------------------------------------------------------------------
  // Fallback chains as DATA (owner refinement, 2026-11-16): chain
  // order lives in this policy table — never in adapter or UI
  // code — so the Resource Engine can later RECOMMEND a reorder
  // for owner approval (a reorder is never applied silently).
  // Weather carries two variants because the primary's service
  // area is data too (PROVIDERS.nws.serviceArea = US points):
  // outside it, the US chain's extra providers are recorded as
  // UNSUPPORTED chain advances, derived from this table.
  // ------------------------------------------------------------------
  var CHAINS = {
    weather: { US: ["nws", "open-meteo"], WORLD: ["open-meteo"] },
    alerts: ["nws"],
    geocode: ["open-meteo-geocoding"],
    earthquakes: ["usgs-earthquakes"],
    naturalEvents: ["nasa-eonet"],
    protocol: ["defillama"],
    chain: ["defillama"],
    dexPairs: ["dexscreener"]
  };

  // ------------------------------------------------------------------
  // Mutable router state (in-memory; cache persists where permitted).
  // ------------------------------------------------------------------
  var cacheMem = null;                // key -> { storedAt, result }
  var inFlight = {};                  // cache key -> Promise
  var providerQueue = {};             // providerId -> Promise (serial)
  var lastNetworkAt = {};             // providerId -> ms epoch
  var windowCalls = {};               // providerId -> [ms epoch]
  var consecFails = {};               // providerId -> count
  var breakerUntil = {};              // providerId -> ms epoch
  var backoffUntil = {};              // providerId -> ms epoch
  var lastFailureInfo = {};           // providerId -> { at, failureState, status }
  var lastSuccessAt = {};             // providerId -> ms epoch

  function nowMs() { return Date.now(); }
  function iso(ms) { return new Date(ms).toISOString(); }
  function isNum(v) { return typeof v === "number" && isFinite(v); }

  function failure(providerId, failureState, detail, status) {
    var cfg = PROVIDERS[providerId];
    return {
      provider: cfg ? cfg.name : providerId,
      providerId: providerId,
      failureState: failureState,
      detail: detail || "",
      status: (status === undefined ? null : status)
    };
  }
  function failObj(failureState, status, detail) {
    var e = new Error(detail || failureState);
    e.failureState = failureState;
    e.status = (status === undefined ? null : status);
    e.detail = detail || "";
    return e;
  }

  // ------------------------------------------------------------------
  // Cache (§12). Entries keep the original provider + times forever.
  // ------------------------------------------------------------------
  function loadCache() {
    if (cacheMem) return cacheMem;
    cacheMem = {};
    try {
      var raw = global.localStorage && global.localStorage.getItem(CACHE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === "object") cacheMem = parsed;
    } catch (e) { cacheMem = {}; }
    return cacheMem;
  }
  function saveCache() {
    try {
      if (!global.localStorage) return;
      var keys = Object.keys(cacheMem);
      if (keys.length > CACHE_MAX_ENTRIES) {
        keys.sort(function (a, b) { return cacheMem[a].storedAt - cacheMem[b].storedAt; });
        keys.slice(0, keys.length - CACHE_MAX_ENTRIES).forEach(function (k) { delete cacheMem[k]; });
      }
      global.localStorage.setItem(CACHE_KEY, JSON.stringify(cacheMem));
    } catch (e) { /* cache persistence must never break a lookup */ }
  }
  function cacheGet(key) {
    var c = loadCache();
    var entry = c[key];
    return entry && entry.result ? entry : null;
  }
  function cachePut(key, result) {
    var c = loadCache();
    c[key] = { storedAt: nowMs(), result: result };
    saveCache();
  }
  // Freshness of a cached result if it were served right now.
  function cachedResult(entry, ttlMs, servedAs) {
    var r = JSON.parse(JSON.stringify(entry.result));
    var age = nowMs() - entry.storedAt;
    r.fromCache = true;
    r.cacheAgeMs = age;
    if (servedAs === "LAST_KNOWN") r.freshnessState = "LAST_KNOWN";
    else r.freshnessState = age <= ttlMs ? "CURRENT" : "STALE";
    return r;
  }

  // ------------------------------------------------------------------
  // One governed network call to a provider. Resolves {status, data}
  // or rejects with an Error carrying .failureState (§2 taxonomy).
  // Records the attempt in ApiRegistry and feeds backoff / breaker.
  // ------------------------------------------------------------------
  function classifyHttp(status) {
    if (status === 429) return "RATE_LIMITED";
    if (status === 401 || status === 403) return "AUTH_REQUIRED";
    if (status >= 500) return "OFFLINE";
    return "INVALID_RESPONSE";
  }

  function rawFetch(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      if (typeof global.fetch !== "function") {
        reject(failObj("OFFLINE", null, "no fetch implementation is available in this runtime"));
        return;
      }
      var done = false;
      var ctrl = null, signal;
      try {
        if (typeof AbortController !== "undefined") { ctrl = new AbortController(); signal = ctrl.signal; }
      } catch (e) {}
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        try { if (ctrl) ctrl.abort(); } catch (e) {}
        reject(failObj("TIMEOUT", null, "no response within " + timeoutMs + "ms"));
      }, timeoutMs);
      function settle(fn, v) { if (!done) { done = true; clearTimeout(timer); fn(v); } }
      global.fetch(url, signal ? { signal: signal } : undefined).then(function (res) {
        if (!res || typeof res.json !== "function") {
          settle(reject, failObj("INVALID_RESPONSE", res ? res.status : null, "response object was not readable"));
          return;
        }
        if (!res.ok) {
          settle(reject, failObj(classifyHttp(res.status), res.status, "HTTP " + res.status));
          return;
        }
        res.json().then(function (data) {
          settle(resolve, { status: res.status, data: data });
        }, function () {
          settle(reject, failObj("INVALID_RESPONSE", res.status, "response body was not valid JSON"));
        });
      }, function (err) {
        settle(reject, failObj(err && err.name === "AbortError" ? "TIMEOUT" : "OFFLINE",
          null, String((err && err.message) || err)));
      });
    });
  }

  function noteSuccess(providerId) {
    consecFails[providerId] = 0;
    delete breakerUntil[providerId];
    delete backoffUntil[providerId];
    lastSuccessAt[providerId] = nowMs();
  }
  function noteFailure(providerId, failureState, status) {
    // Only GENUINE failure states reach this function (callProvider
    // network outcomes). UNSUPPORTED chain advances are recorded on
    // results without ever calling noteFailure — they do not damage
    // provider health and never trip the breaker.
    consecFails[providerId] = (consecFails[providerId] || 0) + 1;
    lastFailureInfo[providerId] = { at: nowMs(), failureState: failureState, status: status };
    var n = consecFails[providerId];
    var br = PROVIDERS[providerId].breaker; // per-provider policy (§18)
    if (n >= br.threshold) {
      breakerUntil[providerId] = nowMs() + br.cooldownMs;
    } else {
      backoffUntil[providerId] = nowMs() + Math.min(BACKOFF_BASE_MS * Math.pow(2, n - 1), BACKOFF_CAP_MS);
    }
  }

  // Skip check: breaker open or backoff active -> the provider is
  // not called at all; the chain records why (§18).
  function skipFailure(providerId) {
    var t = nowMs();
    if (breakerUntil[providerId] && t < breakerUntil[providerId]) {
      return failure(providerId, "OFFLINE",
        "circuit breaker open after " + (consecFails[providerId] || 0) +
        " consecutive failures — provider marked DEGRADED and skipped until a controlled recheck");
    }
    if (backoffUntil[providerId] && t < backoffUntil[providerId]) {
      return failure(providerId, "OFFLINE",
        "exponential backoff after a failure — provider skipped this attempt, no retry loop");
    }
    return null;
  }
  function budgetExceeded(providerId) {
    var cfg = PROVIDERS[providerId];
    var t = nowMs();
    var arr = (windowCalls[providerId] || []).filter(function (x) { return t - x < cfg.budget.windowMs; });
    windowCalls[providerId] = arr;
    return arr.length >= cfg.budget.calls;
  }

  function callProvider(providerId, url) {
    var cfg = PROVIDERS[providerId];
    var skip = skipFailure(providerId);
    if (skip) return Promise.reject(failObj(skip.failureState, null, skip.detail));
    if (budgetExceeded(providerId)) {
      return Promise.reject(failObj("RATE_LIMITED", null,
        "governor: MTI6's call budget for this provider (" + cfg.budget.calls + " calls / " +
        Math.round(cfg.budget.windowMs / 1000) + "s) is exhausted — the provider was not called"));
    }
    // Serial queue per provider: network calls are spaced by the
    // provider's minimum interval (§13 governor).
    var prev = providerQueue[providerId] || Promise.resolve();
    var run = prev.then(function () {
      var wait = Math.max(0, (lastNetworkAt[providerId] || 0) + cfg.minIntervalMs - nowMs());
      return new Promise(function (res) { setTimeout(res, wait); }).then(function () {
        lastNetworkAt[providerId] = nowMs();
        (windowCalls[providerId] = windowCalls[providerId] || []).push(nowMs());
        return rawFetch(url, cfg.timeoutMs).then(function (out) {
          noteSuccess(providerId);
          try { if (global.ApiRegistry) global.ApiRegistry.record(cfg.registryId, true, out.status); } catch (e) {}
          return out.data;
        }, function (err) {
          noteFailure(providerId, err.failureState || "OFFLINE", err.status);
          try { if (global.ApiRegistry) global.ApiRegistry.record(cfg.registryId, false, err.status); } catch (e) {}
          throw err;
        });
      });
    });
    providerQueue[providerId] = run.then(function () {}, function () {});
    return run;
  }

  // ------------------------------------------------------------------
  // Normalized observation + result assembly (§20).
  // ------------------------------------------------------------------
  var obsSeq = 0;
  function observation(capability, subjectId, fields) {
    obsSeq += 1;
    return {
      observationId: capability + ":" + subjectId + ":" + fields.retrievedAtMs + ":" + obsSeq,
      domain: capability,
      subjectId: subjectId,
      value: (fields.value === undefined ? null : fields.value),
      unit: (fields.unit === undefined ? null : fields.unit),
      provider: fields.providerName,
      originalSource: fields.originalSource || fields.providerName,
      observedAt: fields.observedAt || iso(fields.retrievedAtMs),
      retrievedAt: iso(fields.retrievedAtMs),
      freshnessState: fields.freshnessState || "CURRENT",
      sourceState: "CONNECTED",
      location: fields.location || null,
      verificationState: "UNVERIFIED",
      rawReference: fields.rawReference || null,
      details: fields.details || {}
    };
  }

  function baseResult(capability, subjectId) {
    return {
      capability: capability,
      subjectId: subjectId,
      observations: [],
      provider: null,
      providerId: null,
      originalSource: null,
      observedAt: null,
      retrievedAt: iso(nowMs()),
      freshnessState: "NO_DATA",
      sourceState: "NO_DATA",
      fallbackPosition: null,
      healthState: "UNKNOWN",
      failures: [],
      fromCache: false,
      note: null,
      mode: "FAST",
      corroboration: null,
      sources: null
    };
  }

  // Chain-exhaustion tail shared by FAST and CORROBORATE (§1, §12):
  // a cached result is served as LAST_KNOWN — with a STALE outcome
  // recorded against the original provider, since the served data
  // is past its freshness window — and with no cache the answer is
  // an honest NO_DATA. A cache hit is NEVER relabelled CURRENT.
  function exhaustedResult(capability, subjectId, cached, policy, failures) {
    if (cached) {
      var last = cachedResult(cached, policy.ttlMs, "LAST_KNOWN");
      last.failures = failures.concat([failure(last.providerId || "cache", "STALE",
        "the served result is the last known reading from " + (last.provider || "cache") +
        ", past this capability's freshness window — labelled LAST_KNOWN, never as current")]);
      last.note = (last.note ? last.note + " " : "") +
        "Every provider in the chain failed just now; this is the LAST KNOWN result from " +
        (last.provider || "cache") + " — labelled as such, never as current.";
      return last;
    }
    var none = baseResult(capability, subjectId);
    none.failures = failures;
    none.note = "No provider in the chain could answer and no cached result exists — NO DATA. Nothing is shown in its place.";
    return none;
  }

  // CORROBORATE comparison (§10): majority is not truth — the
  // router reports AGREEMENT or CONFLICTED and preserves every
  // source either way. Only weather has a defined comparison
  // today (temperature, unit-normalized to °C, 3°C tolerance);
  // other capabilities report NOT_COMPARABLE with all sources
  // preserved rather than inventing an equivalence.
  function compareSources(capability, sources) {
    if (capability !== "weather") return "NOT_COMPARABLE";
    var temps = [];
    for (var i = 0; i < sources.length; i++) {
      var o = sources[i].observations[0];
      if (!o || typeof o.value !== "number") return "NOT_COMPARABLE";
      var c = o.unit === "°F" ? (o.value - 32) * 5 / 9 : (o.unit === "°C" ? o.value : null);
      if (c === null) return "NOT_COMPARABLE";
      temps.push(c);
    }
    var spread = Math.max.apply(null, temps) - Math.min.apply(null, temps);
    return spread <= 3 ? "AGREEMENT" : "CONFLICTED";
  }

  // CORROBORATE mode (§10, owner refinement 2026-11-16): query the
  // chain's providers in PARALLEL, compare, and return AGREEMENT
  // or CONFLICTED with ALL sources preserved — never a silent
  // majority vote. The headline observations are the first chain
  // provider's (chain order is policy); every answerer is in
  // result.sources with its own observations and times. One
  // answerer = SINGLE_SOURCE (labelled, not dressed as agreement).
  // Corroboration always asks fresh — it does not take the
  // min-fresh cache shortcut — but it writes the cache and falls
  // back to LAST_KNOWN if nobody answers.
  function runCorroborate(capability, subjectId, cacheKey, chain, policy, opts) {
    var cached = cacheGet(cacheKey);
    var attempts = chain.map(function (step) {
      var skip = skipFailure(step.providerId);
      if (skip) return Promise.resolve({ step: step, skip: skip });
      return Promise.resolve().then(function () { return step.run(nowMs()); }).then(
        function (out) { return { step: step, out: out }; },
        function (err) { return { step: step, err: err }; });
    });
    return Promise.all(attempts).then(function (settled) {
      var failures = [], sources = [];
      settled.forEach(function (s) {
        if (s.skip) { failures.push(s.skip); return; }
        if (s.err) {
          failures.push(failure(s.step.providerId, s.err.failureState || "OFFLINE",
            s.err.detail || s.err.message || "", s.err.status));
          return;
        }
        var obs = s.out.observations || [];
        if (!obs.length && s.out.emptyIsFailure) {
          failures.push(failure(s.step.providerId, "NO_DATA",
            "the provider answered but returned no usable observation for this request"));
          return;
        }
        sources.push({
          providerId: s.step.providerId,
          provider: PROVIDERS[s.step.providerId].name,
          originalSource: s.out.originalSource || PROVIDERS[s.step.providerId].name,
          observedAt: s.out.observedAt || null,
          observations: obs,
          note: s.out.note || null
        });
      });
      if (!sources.length) return exhaustedResult(capability, subjectId, cached, policy, failures);
      var primary = sources[0];
      var result = baseResult(capability, subjectId);
      result.mode = "CORROBORATE";
      result.observations = primary.observations;
      result.provider = primary.provider;
      result.providerId = primary.providerId;
      result.originalSource = primary.originalSource;
      result.observedAt = primary.observedAt || iso(nowMs());
      result.retrievedAt = iso(nowMs());
      result.freshnessState = "CURRENT";
      result.sourceState = "CONNECTED";
      result.fallbackPosition = chain.map(function (s) { return s.providerId; }).indexOf(primary.providerId);
      result.healthState = healthOf(primary.providerId).state;
      result.failures = failures;
      result.sources = sources;
      result.corroboration = sources.length === 1 ? "SINGLE_SOURCE" : compareSources(capability, sources);
      result.note = result.corroboration === "CONFLICTED"
        ? "Sources disagree — every answering source is preserved in this result; no majority was taken as truth (§10)."
        : (result.corroboration === "AGREEMENT"
          ? "The answering sources agree within this capability's comparison tolerance; every source is preserved."
          : "Corroboration state: " + result.corroboration + " — every answering source is preserved.");
      cachePut(cacheKey, result);
      return result;
    });
  }

  // Run one capability's fallback chain (§1). chain: [{providerId,
  // run: fn(retrievedAtMs) -> Promise<{observations, observedAt,
  // originalSource, note, emptyIsFailure}>}]. policy comes from
  // CAPABILITY_POLICIES. opts.mode: "FAST" (default — primary,
  // fallback only on failure/unsupported) or "CORROBORATE" (§10).
  function runChain(capability, subjectId, cacheKey, chain, policy, opts) {
    opts = opts || {};
    if (opts.mode === "CORROBORATE") {
      return runCorroborate(capability, subjectId, cacheKey, chain, policy, opts);
    }
    if (inFlight[cacheKey]) return inFlight[cacheKey];
    var promise = Promise.resolve((function () {
      var cached = cacheGet(cacheKey);
      // §13 minimum useful refresh: a very recent success is served
      // from cache instead of re-asking the providers — unless the
      // caller explicitly asked for a fresh attempt (forceFresh,
      // the Search This Area pattern).
      if (cached && !opts.forceFresh && (nowMs() - cached.storedAt) <= policy.minFreshMs) {
        var fresh = cachedResult(cached, policy.ttlMs, "CACHE");
        fresh.note = (fresh.note ? fresh.note + " " : "") +
          "Served from cache — within this capability's minimum useful refresh interval, so no provider was re-asked.";
        return Promise.resolve(fresh);
      }
      var failures = [];
      var attempt = function (idx) {
        if (idx >= chain.length) {
          // Chain exhausted -> valid cache / LAST KNOWN (§1, §12).
          return exhaustedResult(capability, subjectId, cached, policy, failures);
        }
        var step = chain[idx];
        var skip = skipFailure(step.providerId);
        if (skip) {
          failures.push(skip);
          return attempt(idx + 1);
        }
        var retrievedAtMs = nowMs();
        // Promise.resolve().then(...) so an adapter that throws
        // synchronously (e.g. an unmapped-network guard) becomes a
        // chain failure, never an exception escaping the router.
        return Promise.resolve().then(function () { return step.run(retrievedAtMs); }).then(function (out) {
          var observations = out.observations || [];
          if (!observations.length && out.emptyIsFailure) {
            failures.push(failure(step.providerId, "NO_DATA",
              "the provider answered but returned no usable observation for this request"));
            return attempt(idx + 1);
          }
          var cfg = PROVIDERS[step.providerId];
          var result = baseResult(capability, subjectId);
          result.observations = observations;
          result.provider = cfg.name;
          result.providerId = step.providerId;
          result.originalSource = out.originalSource || cfg.name;
          result.observedAt = out.observedAt || iso(retrievedAtMs);
          result.retrievedAt = iso(retrievedAtMs);
          result.freshnessState = "CURRENT";
          result.sourceState = "CONNECTED";
          result.fallbackPosition = idx;
          result.healthState = healthOf(step.providerId).state;
          result.failures = failures;
          result.note = out.note || null;
          cachePut(cacheKey, result);
          return result;
        }, function (err) {
          failures.push(failure(step.providerId, err.failureState || "OFFLINE",
            err.detail || err.message || "", err.status));
          return attempt(idx + 1);
        });
      };
      return attempt(0);
    })());
    inFlight[cacheKey] = promise;
    promise.then(function () { delete inFlight[cacheKey]; }, function () { delete inFlight[cacheKey]; });
    return promise;
  }

  // ------------------------------------------------------------------
  // Health (§17) — measured from ApiRegistry outcomes + breaker state.
  // ------------------------------------------------------------------
  function usageFor(registryId) {
    try {
      if (!global.ApiRegistry || typeof global.ApiRegistry.getUsage !== "function") return null;
      var all = global.ApiRegistry.getUsage();
      for (var i = 0; i < all.length; i++) if (all[i].id === registryId) return all[i];
    } catch (e) {}
    return null;
  }
  function healthOf(providerId) {
    var cfg = PROVIDERS[providerId];
    var u = usageFor(cfg.registryId);
    var lf = lastFailureInfo[providerId] || null;
    var lastSuccess = lastSuccessAt[providerId] || (u && u.lastOk ? Date.parse(u.lastOk) : null);
    var state = "UNKNOWN";
    if (breakerUntil[providerId] && nowMs() < breakerUntil[providerId]) state = "DEGRADED";
    else if (lf && (!lastSuccess || lf.at >= lastSuccess)) {
      if (lf.failureState === "RATE_LIMITED") state = "RATE_LIMITED";
      else if (lf.failureState === "AUTH_REQUIRED") state = "AUTH_REQUIRED";
      else state = "OFFLINE";
    } else if (lastSuccess) state = "HEALTHY";
    return {
      id: providerId,
      name: cfg.name,
      state: state,
      costState: cfg.costState,
      lastSuccess: lastSuccess ? iso(lastSuccess) : null,
      lastFailure: lf ? { at: iso(lf.at), failureState: lf.failureState, status: lf.status } : null,
      consecutiveFailures: consecFails[providerId] || 0,
      breakerOpen: !!(breakerUntil[providerId] && nowMs() < breakerUntil[providerId]),
      callsToday: u ? u.callsToday : 0,
      successToday: u ? u.success : 0,
      failToday: u ? u.fail : 0
    };
  }
  function health() {
    var out = {};
    Object.keys(PROVIDERS).forEach(function (id) { out[id] = healthOf(id); });
    return out;
  }

  // ------------------------------------------------------------------
  // Adapters. Provider URLs live HERE and nowhere else.
  // ------------------------------------------------------------------
  function nwsServiceArea(lat, lon) {
    // Approximate NWS service boxes (CONUS, Alaska, Hawaii, Puerto
    // Rico, Guam, USVI, American Samoa). A point outside every box
    // is UNSUPPORTED — a chain advance, never an error,
    // and no network call is spent on it. Edge cases the boxes get
    // wrong are settled by NWS itself: a 404 from /points is also
    // classified UNSUPPORTED.
    var boxes = [
      [24.0, 50.0, -125.0, -66.0], [51.0, 72.0, -180.0, -129.0],
      [18.0, 23.0, -161.0, -154.0], [17.8, 18.6, -67.3, -65.5],
      [13.2, 13.7, 144.6, 145.0], [17.6, 18.5, -65.1, -64.5],
      [-14.6, -14.1, -171.0, -169.4]
    ];
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (lat >= b[0] && lat <= b[1] && lon >= b[2] && lon <= b[3]) return true;
    }
    return false;
  }

  function nwsWeather(lat, lon) {
    return function (retrievedAtMs) {
      var pointsUrl = "https://api.weather.gov/points/" + lat.toFixed(4) + "," + lon.toFixed(4);
      return callProvider("nws", pointsUrl).then(function (points) {
        var props = points && points.properties;
        if (!props || !props.forecast) {
          throw failObj("INVALID_RESPONSE", 200, "NWS /points returned no forecast reference for this point");
        }
        return callProvider("nws", props.forecast).then(function (fc) {
          var fp = fc && fc.properties;
          var periods = fp && fp.periods;
          if (!Array.isArray(periods) || !periods.length) {
            throw failObj("INVALID_RESPONSE", 200, "NWS forecast returned no periods");
          }
          var p = periods[0];
          var rel = props.relativeLocation && props.relativeLocation.properties;
          var observedAt = fp.updated || fp.generatedAt || p.startTime || iso(retrievedAtMs);
          var obs = observation("weather", lat.toFixed(2) + "," + lon.toFixed(2), {
            value: isNum(p.temperature) ? p.temperature : null,
            unit: p.temperatureUnit ? "°" + p.temperatureUnit : null,
            providerName: "National Weather Service",
            originalSource: "National Weather Service",
            observedAt: observedAt,
            retrievedAtMs: retrievedAtMs,
            location: { lat: lat, lon: lon },
            rawReference: props.forecast,
            details: {
              periodName: p.name || null,
              windSpeed: p.windSpeed || null,
              windDirection: p.windDirection || null,
              shortForecast: p.shortForecast || null,
              detailedForecast: p.detailedForecast || null,
              placeName: rel ? ((rel.city || "") + (rel.state ? ", " + rel.state : "")) : null
            }
          });
          return {
            observations: [obs], observedAt: observedAt,
            originalSource: "National Weather Service",
            note: "Forecast period reading from the official US source (NWS) — a snapshot with its source time, not a live feed."
          };
        });
      }, function (err) {
        if (err && err.status === 404) {
          throw failObj("UNSUPPORTED", 404, "NWS does not serve this point (outside its US service area)");
        }
        throw err;
      });
    };
  }

  function openMeteoWeather(lat, lon) {
    return function (retrievedAtMs) {
      var url = "https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(lat) +
        "&longitude=" + encodeURIComponent(lon) + "&current_weather=true";
      return callProvider("open-meteo", url).then(function (data) {
        var w = data && data.current_weather;
        if (!w || !isNum(w.temperature)) {
          throw failObj("INVALID_RESPONSE", 200, "Open-Meteo returned no current-conditions reading");
        }
        var obs = observation("weather", lat.toFixed(2) + "," + lon.toFixed(2), {
          value: w.temperature,
          unit: "°C",
          providerName: "Open-Meteo",
          originalSource: "Open-Meteo",
          observedAt: w.time || iso(retrievedAtMs),
          retrievedAtMs: retrievedAtMs,
          location: { lat: lat, lon: lon },
          rawReference: url,
          details: {
            windSpeedKmh: isNum(w.windspeed) ? w.windspeed : null,
            windDirectionDeg: isNum(w.winddirection) ? w.winddirection : null,
            weatherCode: (w.weathercode === undefined ? null : w.weathercode)
          }
        });
        return {
          observations: [obs], observedAt: obs.observedAt,
          originalSource: "Open-Meteo",
          note: "Current-conditions snapshot from Open-Meteo — a snapshot with its observation time, not a live feed."
        };
      });
    };
  }

  function nwsAlerts(lat, lon) {
    return function (retrievedAtMs) {
      var url = "https://api.weather.gov/alerts/active?point=" +
        encodeURIComponent(lat.toFixed(4)) + "," + encodeURIComponent(lon.toFixed(4));
      return callProvider("nws", url).then(function (data) {
        if (!data || !Array.isArray(data.features)) {
          throw failObj("INVALID_RESPONSE", 200, "NWS alerts returned no feature list");
        }
        var observations = data.features.map(function (f) {
          var p = (f && f.properties) || {};
          return observation("alerts", lat.toFixed(2) + "," + lon.toFixed(2), {
            value: p.event || "Weather alert",
            unit: null,
            providerName: "National Weather Service",
            originalSource: "National Weather Service",
            observedAt: p.effective || p.onset || iso(retrievedAtMs),
            retrievedAtMs: retrievedAtMs,
            location: { lat: lat, lon: lon },
            rawReference: f.id || p.id || url,
            details: {
              severity: p.severity || null,
              headline: p.headline || null,
              description: p.description || null,
              expires: p.expires || p.ends || null,
              areaDesc: p.areaDesc || null,
              senderName: p.senderName || null
            }
          });
        });
        return {
          observations: observations,
          observedAt: data.updated || iso(retrievedAtMs),
          originalSource: "National Weather Service",
          note: observations.length
            ? "Active NWS alerts for this point, as published by the National Weather Service."
            : "NWS answered for this point: there are no active alerts. That statement is NWS's, for this point and moment — not a general claim of safety."
        };
      }, function (err) {
        if (err && err.status === 404) {
          throw failObj("UNSUPPORTED", 404, "NWS does not serve this point (outside its US service area)");
        }
        throw err;
      });
    };
  }

  function openMeteoGeocode(query) {
    return function (retrievedAtMs) {
      var url = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(query) +
        "&count=10&language=en&format=json";
      return callProvider("open-meteo-geocoding", url).then(function (data) {
        if (!data || (data.results !== undefined && !Array.isArray(data.results))) {
          throw failObj("INVALID_RESPONSE", 200, "Open-Meteo Geocoding returned an unreadable result set");
        }
        var results = data.results || [];
        var observations = results.map(function (r) {
          return observation("geocode", query, {
            value: r.name || null,
            unit: null,
            providerName: "Open-Meteo Geocoding",
            originalSource: "Open-Meteo Geocoding",
            observedAt: iso(retrievedAtMs),
            retrievedAtMs: retrievedAtMs,
            location: { lat: r.latitude, lon: r.longitude },
            rawReference: url,
            details: {
              country: r.country || null,
              admin1: r.admin1 || null,
              admin2: r.admin2 || null,
              population: (r.population === undefined ? null : r.population),
              timezone: r.timezone || null,
              featureCode: r.feature_code || null,
              elevation: (r.elevation === undefined ? null : r.elevation)
            }
          });
        });
        return {
          observations: observations,
          observedAt: iso(retrievedAtMs),
          originalSource: "Open-Meteo Geocoding",
          note: observations.length
            ? "Place matches from Open-Meteo Geocoding — reference data, labelled with its source."
            : "Open-Meteo Geocoding answered: no place matches that name. That is the provider's answer, not a claim the place does not exist."
        };
      });
    };
  }

  var USGS_FEED_ID = "4.5_day";
  function usgsEarthquakes() {
    return function (retrievedAtMs) {
      // §9: USGS directs automated real-time display to its
      // pre-generated GeoJSON summary feeds. 4.5_day = every
      // M4.5+ earthquake worldwide in the past day — the
      // significant-events view, bounded and feed-labelled.
      var url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/" + USGS_FEED_ID + ".geojson";
      return callProvider("usgs-earthquakes", url).then(function (data) {
        if (!data || !Array.isArray(data.features)) {
          throw failObj("INVALID_RESPONSE", 200, "USGS feed returned no feature list");
        }
        var generated = data.metadata && data.metadata.generated
          ? new Date(data.metadata.generated).toISOString() : iso(retrievedAtMs);
        var observations = data.features.slice(0, 500).map(function (f) {
          var p = (f && f.properties) || {};
          var coords = (f && f.geometry && f.geometry.coordinates) || [];
          return observation("earthquakes", f.id || (p.place || "usgs-event"), {
            value: isNum(p.mag) ? p.mag : null,
            unit: "M",
            providerName: "USGS Earthquake Catalog",
            originalSource: "USGS Earthquake Catalog",
            observedAt: isNum(p.time) ? new Date(p.time).toISOString() : generated,
            retrievedAtMs: retrievedAtMs,
            freshnessState: "CURRENT",
            location: { lat: coords[1], lon: coords[0] },
            rawReference: p.url || f.id || url,
            details: {
              place: p.place || null,
              depthKm: isNum(coords[2]) ? coords[2] : null,
              tsunami: p.tsunami === 1,
              alertLevel: p.alert || null,
              title: p.title || null,
              url: p.url || null
            }
          });
        });
        return {
          observations: observations,
          observedAt: generated,
          originalSource: "USGS Earthquake Catalog",
          note: "USGS real-time GeoJSON summary feed (" + USGS_FEED_ID.replace("_", " ") +
            ") — the feed's own generated time is shown; positions are the events' real coordinates."
        };
      });
    };
  }

  function eonetEvents() {
    return function (retrievedAtMs) {
      var url = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=100";
      return callProvider("nasa-eonet", url).then(function (data) {
        if (!data || !Array.isArray(data.events)) {
          throw failObj("INVALID_RESPONSE", 200, "NASA EONET returned no event list");
        }
        var observations = data.events.map(function (ev) {
          var geoms = Array.isArray(ev.geometry) ? ev.geometry : [];
          var latest = geoms.length ? geoms[geoms.length - 1] : null;
          var loc = null;
          if (latest && latest.type === "Point" && Array.isArray(latest.coordinates)) {
            loc = { lat: latest.coordinates[1], lon: latest.coordinates[0] };
          }
          var sources = (ev.sources || []).map(function (s) { return s.id || s; });
          return observation("naturalEvents", ev.id || ev.title, {
            value: ev.title || null,
            unit: null,
            providerName: "NASA EONET",
            originalSource: "NASA EONET",
            observedAt: latest && latest.date ? latest.date : iso(retrievedAtMs),
            retrievedAtMs: retrievedAtMs,
            location: loc,
            rawReference: ev.link || ev.id || url,
            details: {
              categories: (ev.categories || []).map(function (c) { return c.title || c.id; }),
              sources: sources,
              sourceUrls: (ev.sources || []).map(function (s) { return s.url || null; }),
              status: "open",
              link: ev.link || null
            }
          });
        });
        return {
          observations: observations,
          observedAt: iso(retrievedAtMs),
          originalSource: "NASA EONET",
          note: "Curated natural events from NASA EONET — each event keeps the upstream source EONET records for it. Near-live / observed, never 'live video'."
        };
      });
    };
  }

  // DefiLlama snapshots: one call serves every protocol / chain —
  // the sweep's instruction is to cache the snapshot, never loop.
  function defillamaSnapshot(kind) {
    var url = kind === "protocols" ? "https://api.llama.fi/protocols" : "https://api.llama.fi/v2/chains";
    var key = "defillama-snapshot:" + kind;
    return function () {
      var cached = cacheGet(key);
      if (cached && (nowMs() - cached.storedAt) <= 120 * 1000) return Promise.resolve(cached.result);
      if (inFlight[key]) return inFlight[key];
      var p = callProvider("defillama", url).then(function (data) {
        if (!Array.isArray(data)) throw failObj("INVALID_RESPONSE", 200, "DefiLlama returned an unreadable snapshot");
        cachePut(key, data);
        return data;
      });
      inFlight[key] = p;
      p.then(function () { delete inFlight[key]; }, function () { delete inFlight[key]; });
      return p;
    };
  }

  function defillamaProtocol(input) {
    var getSnapshot = defillamaSnapshot("protocols");
    return function (retrievedAtMs) {
      return getSnapshot().then(function (list) {
        var raw = String(input || "");
        var cand = raw.replace(/^protocol-/, "");
        var candName = cand.replace(/-/g, " ").toLowerCase();
        var found = null;
        for (var i = 0; i < list.length && !found; i++) {
          var e = list[i];
          if (e.slug === cand || e.slug === raw) found = e;
        }
        if (!found) {
          for (var j = 0; j < list.length && !found; j++) {
            var n = list[j];
            if (n.name && n.name.toLowerCase() === candName) found = n;
          }
        }
        if (!found) {
          return {
            observations: [], observedAt: iso(retrievedAtMs),
            originalSource: "DefiLlama",
            note: "DefiLlama's free protocol list contains no entry matching \"" + raw +
              "\" by slug or recorded name — not matched by guesswork, and no other protocol's data is shown in its place."
          };
        }
        var obs = observation("protocol", raw, {
          value: isNum(found.tvl) ? found.tvl : null,
          unit: "USD",
          providerName: "DefiLlama",
          originalSource: "DefiLlama",
          observedAt: iso(retrievedAtMs),
          retrievedAtMs: retrievedAtMs,
          location: null,
          rawReference: "https://api.llama.fi/protocols",
          details: {
            name: found.name || null,
            slug: found.slug || null,
            symbol: found.symbol || null,
            category: found.category || null,
            chains: found.chains || [],
            change_1d: (found.change_1d === undefined ? null : found.change_1d),
            change_7d: (found.change_7d === undefined ? null : found.change_7d),
            methodologyNote: "TVL is DefiLlama's aggregated figure under its own adapter methodology — a sourced aggregate, not an on-chain-verified balance."
          }
        });
        return {
          observations: [obs], observedAt: iso(retrievedAtMs),
          originalSource: "DefiLlama",
          note: "Protocol observation from DefiLlama's free API (labelled with fetch time — the free list carries no per-protocol timestamp)."
        };
      });
    };
  }

  var DEFILLAMA_CHAIN_NAMES = {
    "ethereum-mainnet": "Ethereum", "bitcoin-mainnet": "Bitcoin",
    "solana-mainnet": "Solana", "base-mainnet": "Base",
    "arbitrum-mainnet": "Arbitrum", "bnb-chain-mainnet": "BSC",
    "polygon-mainnet": "Polygon", "avalanche-mainnet": "Avalanche",
    "optimism-mainnet": "OP Mainnet", "dydx-mainnet": "dYdX",
    "cosmos-hub": "CosmosHub"
  };
  function defillamaChain(input) {
    var getSnapshot = defillamaSnapshot("chains");
    return function (retrievedAtMs) {
      return getSnapshot().then(function (list) {
        var raw = String(input || "");
        var wanted = DEFILLAMA_CHAIN_NAMES[raw] || raw;
        var norm = function (s) { return String(s || "").toLowerCase().replace(/[\s-]+/g, ""); };
        var found = null;
        for (var i = 0; i < list.length && !found; i++) {
          if (list[i].name === wanted || norm(list[i].name) === norm(wanted)) found = list[i];
        }
        if (!found) {
          return {
            observations: [], observedAt: iso(retrievedAtMs),
            originalSource: "DefiLlama",
            note: "DefiLlama's free chain list contains no entry matching \"" + raw + "\" — not matched by guesswork."
          };
        }
        var obs = observation("chain", raw, {
          value: isNum(found.tvl) ? found.tvl : null,
          unit: "USD",
          providerName: "DefiLlama",
          originalSource: "DefiLlama",
          observedAt: iso(retrievedAtMs),
          retrievedAtMs: retrievedAtMs,
          location: null,
          rawReference: "https://api.llama.fi/v2/chains",
          details: {
            name: found.name || null,
            tokenSymbol: found.tokenSymbol || null,
            chainId: (found.chainId === undefined ? null : found.chainId),
            methodologyNote: "Chain TVL is DefiLlama's aggregated figure under its own methodology — a sourced aggregate, not an on-chain-verified balance."
          }
        });
        return {
          observations: [obs], observedAt: iso(retrievedAtMs),
          originalSource: "DefiLlama",
          note: "Chain observation from DefiLlama's free API (labelled with fetch time)."
        };
      });
    };
  }

  var DEX_CHAIN_IDS = {
    "ethereum-mainnet": "ethereum", "base-mainnet": "base",
    "arbitrum-mainnet": "arbitrum", "polygon-mainnet": "polygon",
    "bnb-chain-mainnet": "bsc", "solana-mainnet": "solana",
    "avalanche-mainnet": "avalanche", "optimism-mainnet": "optimism"
  };
  function looksLikeAddress(q) {
    return /^0x[0-9a-fA-F]{40}$/.test(q) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q);
  }
  function dexPairs(addressOrQuery, networkId) {
    return function (retrievedAtMs) {
      var q = String(addressOrQuery || "").trim();
      var url;
      if (looksLikeAddress(q) && networkId) {
        var chainId = DEX_CHAIN_IDS[networkId];
        if (!chainId) {
          throw failObj("UNSUPPORTED", null,
            "no DexScreener chain mapping is recorded for network \"" + networkId + "\" — the mapping is not guessed");
        }
        url = "https://api.dexscreener.com/tokens/v1/" + chainId + "/" + q;
      } else {
        url = "https://api.dexscreener.com/latest/dex/search?q=" + encodeURIComponent(q);
      }
      return callProvider("dexscreener", url).then(function (data) {
        var pairs = data && Array.isArray(data.pairs) ? data.pairs : null;
        if (!pairs) throw failObj("INVALID_RESPONSE", 200, "DexScreener returned no pair list");
        var sorted = pairs.slice().sort(function (a, b) {
          var la = a.liquidity && isNum(a.liquidity.usd) ? a.liquidity.usd : 0;
          var lb = b.liquidity && isNum(b.liquidity.usd) ? b.liquidity.usd : 0;
          return lb - la;
        }).slice(0, 10);
        var observations = sorted.map(function (p) {
          return observation("dexPairs", q, {
            value: p.priceUsd !== undefined && p.priceUsd !== null ? Number(p.priceUsd) : null,
            unit: "USD",
            providerName: "DexScreener",
            originalSource: "DexScreener",
            observedAt: iso(retrievedAtMs),
            retrievedAtMs: retrievedAtMs,
            location: null,
            rawReference: p.url || url,
            details: {
              chainId: p.chainId || null,
              dexId: p.dexId || null,
              pairAddress: p.pairAddress || null,
              baseSymbol: p.baseToken ? p.baseToken.symbol : null,
              quoteSymbol: p.quoteToken ? p.quoteToken.symbol : null,
              liquidityUsd: p.liquidity && isNum(p.liquidity.usd) ? p.liquidity.usd : null,
              volume24h: p.volume && isNum(p.volume.h24) ? p.volume.h24 : null,
              url: p.url || null,
              indexerNote: "DexScreener is an indexer: a pair appears once a pool exists and trades. Current-state data only — no OHLCV/history."
            }
          });
        });
        return {
          observations: observations,
          observedAt: iso(retrievedAtMs),
          originalSource: "DexScreener",
          note: observations.length
            ? "DEX pair observations from DexScreener (current state, labelled with fetch time)."
            : "DexScreener answered: no pairs are indexed for that token/query — the indexer's answer, not a claim no market exists anywhere."
        };
      });
    };
  }

  // ------------------------------------------------------------------
  // Public capability surface (§19). Capabilities, never providers.
  // ------------------------------------------------------------------
  function validLatLon(lat, lon) { return isNum(lat) && isNum(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180; }
  function invalidResult(capability, subjectId, note) {
    var r = baseResult(capability, subjectId);
    r.note = note;
    return Promise.resolve(r);
  }

  // Adapter runners: providerId -> run factory, per capability.
  // The ORDER providers are asked in comes only from CHAINS
  // (policy data above); this map merely binds a provider id to
  // its adapter for a capability.
  var RUNNERS = {
    weather: {
      "nws": function (a) { return nwsWeather(a.lat, a.lon); },
      "open-meteo": function (a) { return openMeteoWeather(a.lat, a.lon); }
    },
    alerts: {
      "nws": function (a) { return nwsAlerts(a.lat, a.lon); }
    },
    geocode: {
      "open-meteo-geocoding": function (a) { return openMeteoGeocode(a.query); }
    },
    earthquakes: {
      "usgs-earthquakes": function () { return usgsEarthquakes(); }
    },
    naturalEvents: {
      "nasa-eonet": function () { return eonetEvents(); }
    },
    protocol: {
      "defillama": function (a) { return defillamaProtocol(a.input); }
    },
    chain: {
      "defillama": function (a) { return defillamaChain(a.input); }
    },
    dexPairs: {
      "dexscreener": function (a) { return dexPairs(a.query, a.networkId); }
    }
  };
  function chainSteps(capability, providerIds, args) {
    return providerIds.map(function (id) {
      return { providerId: id, run: RUNNERS[capability][id](args) };
    });
  }
  // Providers present in the full chain but skipped by a selected
  // variant are recorded as UNSUPPORTED advances — derived from
  // the CHAINS table, never hand-listed at a call site.
  function unsupportedAdvance(fullIds, usedIds) {
    return fullIds.filter(function (id) { return usedIds.indexOf(id) === -1; }).map(function (id) {
      return failure(id, "UNSUPPORTED",
        PROVIDERS[id].name + " serves " + (PROVIDERS[id].serviceArea || "a limited service area") +
        " only; this request is outside it, so the chain advanced without asking it");
    });
  }

  var WorldData = {
    weather: function (lat, lon, opts) {
      if (!validLatLon(lat, lon)) {
        return invalidResult("weather", String(lat) + "," + String(lon),
          "Invalid coordinates — no provider was called.");
      }
      var us = nwsServiceArea(lat, lon);
      var variant = us ? "US" : "WORLD";
      var steps = chainSteps("weather", CHAINS.weather[variant], { lat: lat, lon: lon });
      var p = runChain("weather", lat.toFixed(2) + "," + lon.toFixed(2),
        "weather:" + lat.toFixed(2) + "," + lon.toFixed(2), steps,
        CAPABILITY_POLICIES.weather, opts);
      if (!us) {
        var skipped = unsupportedAdvance(CHAINS.weather.US, CHAINS.weather.WORLD);
        return p.then(function (r) {
          r.failures = skipped.concat(r.failures);
          return r;
        });
      }
      return p;
    },

    alerts: function (lat, lon, opts) {
      if (!validLatLon(lat, lon)) {
        return invalidResult("alerts", String(lat) + "," + String(lon),
          "Invalid coordinates — no provider was called.");
      }
      if (!nwsServiceArea(lat, lon)) {
        var r = baseResult("alerts", lat.toFixed(2) + "," + lon.toFixed(2));
        r.failures = unsupportedAdvance(CHAINS.alerts, []);
        r.note = "NO DATA for alerts at this location — not a statement that the area is calm. No provider was called: the chain's only alerts source does not cover it.";
        return Promise.resolve(r);
      }
      return runChain("alerts", lat.toFixed(2) + "," + lon.toFixed(2),
        "alerts:" + lat.toFixed(2) + "," + lon.toFixed(2),
        chainSteps("alerts", CHAINS.alerts, { lat: lat, lon: lon }),
        CAPABILITY_POLICIES.alerts, opts);
    },

    geocode: function (query, opts) {
      var q = String(query || "").trim();
      if (!q) return invalidResult("geocode", "", "Empty place query — no provider was called.");
      return runChain("geocode", q,
        "geocode:" + q.toLowerCase(),
        chainSteps("geocode", CHAINS.geocode, { query: q }),
        CAPABILITY_POLICIES.geocode, opts);
    },

    earthquakes: function (opts) {
      return runChain("earthquakes", "usgs:" + USGS_FEED_ID,
        "earthquakes:" + USGS_FEED_ID,
        chainSteps("earthquakes", CHAINS.earthquakes, {}),
        CAPABILITY_POLICIES.earthquakes, opts);
    },

    naturalEvents: function (opts) {
      return runChain("naturalEvents", "eonet:open-30d",
        "naturalEvents:open-30d",
        chainSteps("naturalEvents", CHAINS.naturalEvents, {}),
        CAPABILITY_POLICIES.naturalEvents, opts);
    }
  };

  var CryptoData = {
    protocol: function (slugOrId, opts) {
      var input = String(slugOrId || "").trim();
      if (!input) return invalidResult("protocol", "", "No protocol named — no provider was called.");
      return runChain("protocol", input,
        "protocol:" + input.toLowerCase(),
        chainSteps("protocol", CHAINS.protocol, { input: input }),
        CAPABILITY_POLICIES.protocol, opts);
    },

    chain: function (nameOrId, opts) {
      var input = String(nameOrId || "").trim();
      if (!input) return invalidResult("chain", "", "No chain named — no provider was called.");
      return runChain("chain", input,
        "chain:" + input.toLowerCase(),
        chainSteps("chain", CHAINS.chain, { input: input }),
        CAPABILITY_POLICIES.chain, opts);
    },

    dexPairsForToken: function (addressOrQuery, networkId, opts) {
      var q = String(addressOrQuery || "").trim();
      if (!q) return invalidResult("dexPairs", "", "No token or query given — no provider was called.");
      return runChain("dexPairs", q,
        "dexPairs:" + (networkId || "search") + ":" + q.toLowerCase(),
        chainSteps("dexPairs", CHAINS.dexPairs, { query: q, networkId: networkId }),
        CAPABILITY_POLICIES.dexPairs, opts);
    },

    // §7 + §22: DefiLlama's yield endpoints moved to the paid plan
    // on 2026-11-13. The yields capability therefore returns the
    // capability-gap shape and makes ZERO network calls — no free
    // provider is silently substituted and nothing is subscribed.
    yields: function (subjectId) {
      return Promise.resolve({
        capability: "yields",
        subjectId: subjectId || null,
        capabilityGap: true,
        gap: "CAPABILITY GAP — no free yield-data provider is wired. DefiLlama's yield endpoints moved from its free API to its paid plan on 2026-11-13, and no other approved free provider covers yields today.",
        currentFreeOptions: [
          "DefiLlama free API — protocol and chain TVL only; it carries no yield/APY data on the free tier.",
          "Protocol-level TVL via CryptoData.protocol / CryptoData.chain (wired, labelled DefiLlama)."
        ],
        limitation: "Yield/APY observations cannot be produced from the free resource universe as it stands; any number shown would be invented.",
        paidOption: "DefiLlama Pro API (paid plan, key-authenticated) — named for completeness; NOT subscribed and NOT called.",
        expectedBenefit: "Live yield/APY observations for the yield workspaces (Lending, Staking, Vaults, Farming) with source + freshness labels.",
        ownerDecisionRequired: true,
        observations: [],
        provider: null,
        providerId: null,
        originalSource: null,
        observedAt: null,
        retrievedAt: iso(nowMs()),
        freshnessState: "NO_DATA",
        sourceState: "NO_DATA",
        fallbackPosition: null,
        healthState: "UNKNOWN",
        failures: [],
        fromCache: false,
        note: "OWNER DECISION REQUIRED (§22): approve a paid/keyed yield provider, or leave yields as an honest gap."
      });
    }
  };

  // ------------------------------------------------------------------
  // Test hooks (harness only): deterministic governor/breaker proof.
  // ------------------------------------------------------------------
  var _test = {
    setProviderConfig: function (providerId, patch) {
      var cfg = PROVIDERS[providerId];
      if (!cfg || !patch) return false;
      if (patch.minIntervalMs !== undefined) cfg.minIntervalMs = patch.minIntervalMs;
      if (patch.budget) cfg.budget = patch.budget;
      if (patch.breaker) cfg.breaker = patch.breaker;
      if (patch.timeoutMs !== undefined) cfg.timeoutMs = patch.timeoutMs;
      return true;
    },
    setBreaker: function (providerId, patch) {
      // Breaker policy is per-provider config (PROVIDERS[id].breaker)
      // — the harness patches it here to prove configurability, and
      // proves the default by driving real failures.
      var cfg = PROVIDERS[providerId];
      if (!cfg) return null;
      if (patch) {
        if (patch.threshold !== undefined) cfg.breaker.threshold = patch.threshold;
        if (patch.cooldownMs !== undefined) cfg.breaker.cooldownMs = patch.cooldownMs;
      }
      return { threshold: cfg.breaker.threshold, cooldownMs: cfg.breaker.cooldownMs };
    },
    state: function () {
      return {
        consecFails: JSON.parse(JSON.stringify(consecFails)),
        breakerUntil: JSON.parse(JSON.stringify(breakerUntil)),
        lastNetworkAt: JSON.parse(JSON.stringify(lastNetworkAt))
      };
    },
    reset: function () {
      cacheMem = {};
      inFlight = {}; providerQueue = {}; lastNetworkAt = {};
      windowCalls = {}; consecFails = {}; breakerUntil = {};
      backoffUntil = {}; lastFailureInfo = {}; lastSuccessAt = {};
      try { if (global.localStorage) global.localStorage.removeItem(CACHE_KEY); } catch (e) {}
      try { if (global.ApiRegistry && global.ApiRegistry.resetUsageForTest) global.ApiRegistry.resetUsageForTest(); } catch (e) {}
    }
  };

  global.ProviderRouter = {
    WorldData: WorldData,
    CryptoData: CryptoData,
    health: health,
    healthOf: healthOf,
    PROVIDERS: PROVIDERS,
    CHAINS: CHAINS,
    CAPABILITY_POLICIES: CAPABILITY_POLICIES,
    FAILURE_STATES: FAILURE_STATES,
    _test: _test
  };
  global.WorldData = WorldData;
  global.CryptoData = CryptoData;
})(window);
