/* MTI6-GTADWIY-COCKPIT — Resource Engine seed records (frozen data).
 *
 * The 52 governed provider records of FREE-RESOURCE-CATALOG.md
 * (2026-11-16) as RESOURCE_CANDIDATE records, plus the catalog's four
 * §22 capability gaps and two documented chain gaps as RESOURCE_GAP
 * records. Imported on first run by ResourceEngine.ensureSeeds()
 * (js/resource-engine.js); the store copy is the living record from
 * then on — this file is the import source, never a live view.
 *
 * Stage mapping (honest, from the catalog's own governance states):
 *   CONNECTED 12 — genuinely wired in-app: the six pre-router sources
 *     (Open-Meteo forecast, CoinGecko/Coinbase/CoinPaprika via
 *     PriceScout, Hacker News, GitHub REST) plus the six v92
 *     Capability Router wirings (NWS, Open-Meteo Geocoding, USGS,
 *     NASA EONET, DefiLlama free, DexScreener). Each carries
 *     connectionEvidence naming the wiring.
 *   PREPARED 2 — LocationIQ + Geoapify: free accounts created and
 *     verified under the owner's 2026-11-16 acquisition
 *     authorization; keys exist in the provider dashboards (values
 *     NEVER recorded anywhere in MTI6); integration awaits the
 *     owner-gated proxy/Netlify-env custody step.
 *   TESTED 16 — keyless endpoints live-probed in the 2026-11-16
 *     sweep (measured CORS/HTTP outcomes recorded as evidence,
 *     including the failing probes: GDACS 400, GDELT 429, Overpass
 *     406 — a recorded test is a fact, whatever its outcome).
 *   RESEARCHING 20 — documentation/terms researched in the catalog
 *     or the source catalog; no endpoint test recorded.
 *   DISCOVERED 2 — the 511/DOT family and public webcam networks:
 *     known to exist, per-member facts UNVERIFIED.
 *
 * Cost classes use the secret-governance addendum's EXACT vocabulary
 * (FREE_KEYLESS / FREE_KEY_REQUIRED / FREE_OAUTH / FREE_WITH_LIMITS /
 * FREE_WITH_ATTRIBUTION / FREEMIUM / PAID / SELF_HOSTABLE / UNKNOWN);
 * the catalog's original §15 string is preserved per record in
 * catalogCostState. Mobility Database is FREE_OAUTH per the addendum
 * (OAuth2 bearer — not keyless). NO record contains any credential
 * value: credentialState records only that a key EXISTS and where it
 * is held.
 */
(function (global) {
  "use strict";
  var SEEDS = {
 "candidates": [
  {
   "id": "resource-nws-weather",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "National Weather Service / NOAA (api.weather.gov)",
   "provider": "US National Weather Service (NOAA)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "weather",
   "category": "WEATHER",
   "categoryNote": null,
   "capabilities": [
    "weather",
    "weather-alerts"
   ],
   "originalSource": "US National Weather Service (NOAA) · https://api.weather.gov (OpenAPI description served from the API root)",
   "documentation": "https://api.weather.gov",
   "repository": null,
   "apiDescription": "Weather — US forecasts, alerts, observations",
   "openApiAvailable": true,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS",
   "commercialUseState": "Yes — data is US public domain, free for any purpose.",
   "rateLimits": "Not published (documented as such); reasonable use. Never invent a figure.",
   "geographicCoverage": "United States and territories only (non-US points return 404 → UNSUPPORTED_LOCATION, the designed trigger for fallback to Open-Meteo).",
   "dataCoverage": "Point forecasts, hourly forecasts, **active alerts**, station observations (`/points/{lat,lon}` → forecast grid).",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "public-domain (US government data)",
   "attribution": "NOAA/NWS attribution appreciated.",
   "cachePolicy": "Cache responses (provider guidance); cached results keep original provider + observation/retrieval times and are labeled CURRENT / STALE / LAST KNOWN — never relabeled LIVE (§12).",
   "freshnessCharacteristics": "Live alerts + observations; forecast data updates on the order of hourly.",
   "securityReview": {
    "status": "REVIEWED",
    "note": "Reviewed as part of the wiring package named in connectionEvidence; source facts recorded in FREE-RESOURCE-CATALOG.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "termsReview": {
    "status": "REVIEWED",
    "note": "Terms, limits and attribution recorded in FREE-RESOURCE-CATALOG §1.1.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "INTEGRATED — see connectionEvidence",
   "expectedBenefit": "Catalog fallback role: PRIMARY (US weather; US weather alerts)",
   "benefitLabels": [
    "OPEN DATA",
    "BETTER SOURCE AUTHORITY",
    "NO KEY REQUIRED",
    "WORLD GLOBE BENEFIT"
   ],
   "existingProviderOverlap": "Shares the weather capability with the NWS / Open-Meteo / MET Norway chain (FREE-RESOURCE-CATALOG §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "PRIMARY (US weather; US weather alerts)",
   "ownerApprovalState": "APPROVED",
   "ownerDecision": {
    "decision": "APPROVED",
    "by": "OWNER:owner",
    "at": "2026-11-16T00:00:00.000Z",
    "note": "Wired under the owner's build program before this engine existed; recorded retroactively at catalog import. The connection is evidenced by the named wiring, not by this record."
   },
   "pipelineStage": "CONNECTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": "js/provider-router.js CHAINS.weather (US variant: nws primary) + CHAINS.alerts, on js/api-registry.js entry 'nws'; outcomes recorded via ProviderRouter.health(). Wired in the Capability Router package (cache v92).",
   "routerProviderId": "nws",
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §1.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Source Catalog #11) — not wired today.",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "WIRING",
     "ref": "connectionEvidence",
     "note": "js/provider-router.js CHAINS.weather (US variant: nws primary) + CHAINS.alerts, on js/api-registry.js entry 'nws'; outcomes recorded via ProviderRouter.health(). Wired in the Capability Router package (cache v92).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "CONNECTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §1.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Source Catalog #11) — not wired today."
    }
   ]
  },
  {
   "id": "resource-open-meteo-weather",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Open-Meteo Forecast API",
   "provider": "Open-Meteo (data from national weather services)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "weather",
   "category": "WEATHER",
   "categoryNote": null,
   "capabilities": [
    "weather"
   ],
   "originalSource": "Open-Meteo (data from national weather services) · endpoint in-repo: `https://api.open-meteo.com/v1/forecast` (`js/modules/globe.js`)",
   "documentation": "https://api.open-meteo.com/v1/forecast`",
   "repository": null,
   "apiDescription": "Weather — global point forecasts & current conditions",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_WITH_LIMITS",
   "catalogCostState": "FREE_NONCOMMERCIAL (with limits)",
   "commercialUseState": "**No** — the free/open-access tier is **non-commercial**; a separate customer API serves commercial use. Tracked explicitly per §4.",
   "rateLimits": "**600 calls/min · 5,000/hour · 10,000/day · 300,000/month** on the free tier. This is a limited tier, never \"unlimited free\" (§15).",
   "geographicCoverage": "Global.",
   "dataCoverage": "Current conditions + forecasts by latitude/longitude. (Point weather only in MTI6 today — no radar, satellite, alerts, or area search is wired.)",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "CC-BY-4.0 data attribution; free tier non-commercial per provider terms",
   "attribution": "Attribution to Open-Meteo and the underlying weather data sources; data under CC BY 4.0.",
   "cachePolicy": "Fair-use discipline; in-app usage is recorded in `js/api-registry.js`. Cached results keep provider + times (§12).",
   "freshnessCharacteristics": "Live current conditions, labeled in-app with source + observation time.",
   "securityReview": {
    "status": "REVIEWED",
    "note": "Reviewed as part of the wiring package named in connectionEvidence; source facts recorded in FREE-RESOURCE-CATALOG.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "termsReview": {
    "status": "REVIEWED",
    "note": "Terms, limits and attribution recorded in FREE-RESOURCE-CATALOG §1.2.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "INTEGRATED — see connectionEvidence",
   "expectedBenefit": "Catalog fallback role: PRIMARY (global weather) · SECONDARY (US weather, behind NWS)",
   "benefitLabels": [
    "NO KEY REQUIRED",
    "FALLBACK VALUE",
    "WORLD GLOBE BENEFIT",
    "LOWER COST"
   ],
   "existingProviderOverlap": "Shares the weather capability with the NWS / Open-Meteo / MET Norway chain (FREE-RESOURCE-CATALOG §20).",
   "possibleFallbackFor": [
    "weather"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "PRIMARY (global weather) · SECONDARY (US weather, behind NWS)",
   "ownerApprovalState": "APPROVED",
   "ownerDecision": {
    "decision": "APPROVED",
    "by": "OWNER:owner",
    "at": "2026-11-16T00:00:00.000Z",
    "note": "Wired under the owner's build program before this engine existed; recorded retroactively at catalog import. The connection is evidenced by the named wiring, not by this record."
   },
   "pipelineStage": "CONNECTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": "js/provider-router.js CHAINS.weather (open-meteo primary worldwide, US secondary); Globe Search This Area weather since Live World Globe Build 1 (v84); outcomes recorded in js/api-registry.js ('open-meteo').",
   "routerProviderId": "open-meteo",
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §1.2",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: **CONNECTED** (Source Catalog #10) — the app's one genuinely connected weather target: manual-coordinate weather lookup on the Globe screen, labeled \"· Open-Meteo · {time}\".",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "WIRING",
     "ref": "connectionEvidence",
     "note": "js/provider-router.js CHAINS.weather (open-meteo primary worldwide, US secondary); Globe Search This Area weather since Live World Globe Build 1 (v84); outcomes recorded in js/api-registry.js ('open-meteo').",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "CONNECTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §1.2 at the stage its recorded evidence supports. Catalog MTI6 STATE: **CONNECTED** (Source Catalog #10) — the app's one genuinely connected weather target: manual-coordinate weather lookup on the Globe screen, labeled \"· Open-Met"
    }
   ]
  },
  {
   "id": "resource-met-norway-weather",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "MET Norway Weather API (Locationforecast 2.0 + MetAlerts)",
   "provider": "Norwegian Meteorological Institute (MET Norway)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "weather",
   "category": "WEATHER",
   "categoryNote": null,
   "capabilities": [
    "weather"
   ],
   "originalSource": "Norwegian Meteorological Institute (MET Norway) · https://api.met.no/weatherapi/documentation ; TOS FAQ https://api.met.no/doc/FAQ",
   "documentation": "https://api.met.no/weatherapi/documentation",
   "repository": null,
   "apiDescription": "Weather — global point forecasts; Norwegian weather alerts",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS",
   "commercialUseState": "Yes, under CC BY 4.0 (credit, link the licence, note changes; do not imply endorsement).",
   "rateLimits": "Sustained **>20 requests/second per application** requires a special agreement (documented ceiling). Caching discipline is mandatory in practice (below).",
   "geographicCoverage": "Forecasts global (the data behind Yr.no); MetAlerts Norway only.",
   "dataCoverage": "Hourly point forecasts (`locationforecast/2.0/compact|complete`); Norwegian warnings in CAP format (`metalerts`).",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "CC-BY-4.0 (MET Norway terms)",
   "attribution": "CC BY 4.0 — credit MET Norway / Yr.",
   "cachePolicy": "Truncate coordinates to 4 decimals; cache responses and respect `Expires` / `If-Modified-Since` — re-requesting before expiry is the fastest route to a block. This obligation is why the sweep classed it CANDIDATE: it deserves one deliberate wiring design (shared cache layer), not an incidental fetch.",
   "freshnessCharacteristics": "Live forecasts + alerts, labeled with source + issue time.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: TERTIARY (US weather chain) · SECONDARY (global weather chain) — candidate status",
   "benefitLabels": [
    "NO KEY REQUIRED",
    "OPEN DATA",
    "FALLBACK VALUE",
    "WORLD GLOBE BENEFIT"
   ],
   "existingProviderOverlap": "Shares the weather capability with the NWS / Open-Meteo / MET Norway chain (FREE-RESOURCE-CATALOG §20).",
   "possibleFallbackFor": [
    "weather"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "TERTIARY (US weather chain) · SECONDARY (global weather chain) — candidate status",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §1.3",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C1) — first in the candidate queue.",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Sweep live probe 2026-11-16: HTTP 200, CORS Access-Control-Allow-Origin * (Origin-identification path documented by the provider FAQ).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §1.3 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C1) — first in the candidate queue."
    }
   ]
  },
  {
   "id": "resource-bright-sky-weather",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Bright Sky (DWD open data, community API)",
   "provider": "Bright Sky (open-source project) republishing **Deutscher Wetterdienst (DWD)** official open data",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "weather",
   "category": "WEATHER",
   "categoryNote": "Germany specialist over DWD open data",
   "capabilities": [
    "weather"
   ],
   "originalSource": "Bright Sky (open-source project) republishing **Deutscher Wetterdienst (DWD)** official open data · https://brightsky.dev",
   "documentation": "https://brightsky.dev",
   "repository": null,
   "apiDescription": "Weather — German station observations, forecasts, alerts",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS",
   "commercialUseState": "Per DWD open-data conditions; the sources do not separately state commercial terms → UNKNOWN beyond the open-data licence.",
   "rateLimits": "None published → UNKNOWN (never invented).",
   "geographicCoverage": "Germany only (DWD station network).",
   "dataCoverage": "Current weather, hourly forecasts, weather alerts, station lookup (`/sources`) by coordinates with radius.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "DWD open data via community API; terms recorded in catalog",
   "attribution": "**\"Quelle: Deutscher Wetterdienst\"** (DWD open-data conditions). The wrapper is software; the data source remains DWD — both facts recorded, per the name-proves-nothing rule.",
   "cachePolicy": "Not specified in the sources → UNKNOWN; apply §12 defaults (provider + times retained, last-known never relabeled LIVE).",
   "freshnessCharacteristics": "Live station observations + alerts (verified live 2026-11-16: `/weather` and `/sources` returned HTTP 200 with data; a date/timestamp window parameter is required).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: SPECIALIST (Germany)",
   "benefitLabels": [
    "NO KEY REQUIRED",
    "OPEN DATA",
    "BETTER GEOGRAPHIC COVERAGE"
   ],
   "existingProviderOverlap": "Shares the weather capability with the NWS / Open-Meteo / MET Norway chain (FREE-RESOURCE-CATALOG §20).",
   "possibleFallbackFor": [
    "weather"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SPECIALIST (Germany)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §1.4",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C6) — also the pattern-proof that a community wrapper over official open data is a legitimate access path when the underlying data licence is open.",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Verified live in the sweep (2026-11-16) over DWD open data.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §1.4 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C6) — also the pattern-proof that a community wrapper over official open data is a legitimate access path when the underlying data licence is o"
    }
   ]
  },
  {
   "id": "resource-eccc-geomet-weather",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Environment and Climate Change Canada — MSC GeoMet / GeoMet-Weather",
   "provider": "Environment and Climate Change Canada (ECCC), Meteorological Service of Canada",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "weather",
   "category": "WEATHER",
   "categoryNote": "Canada specialist: weather, air quality, hydrometric via one door",
   "capabilities": [
    "weather"
   ],
   "originalSource": "Environment and Climate Change Canada (ECCC), Meteorological Service of Canada · OGC API at `api.weather.gc.ca` · https://eccc-msc.github.io/open-data/msc-geomet/readme_en/",
   "documentation": "https://eccc-msc.github.io/open-data/msc-geomet/readme_en/",
   "repository": null,
   "apiDescription": "Weather & environment — Canadian forecasts, marine, air quality, hydrometric",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS",
   "commercialUseState": "Open Government Licence — Canada (attribution to ECCC/MSC).",
   "rateLimits": "None published → UNKNOWN; OGC services ask for reasonable use.",
   "geographicCoverage": "Canada.",
   "dataCoverage": "Collections verified by fetching the live collections index 2026-11-16: `citypageweather-realtime` (official city forecasts), `marineweather-realtime` (marine forecasts + warnings), `aqhi-forecasts-realtime` + `aqhi-observations-realtime` (Air Quality Health Index), `hydrometric-realtime` (river levels/flows), `hurricanes-cyclone-realtime`, `swob-realtime` (surface observations); companion WMS services carry radar and alert layers.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "Environment and Climate Change Canada open data terms",
   "attribution": "ECCC/MSC under the Open Government Licence — Canada.",
   "cachePolicy": "Not specified in the sources → UNKNOWN; §12 defaults apply.",
   "freshnessCharacteristics": "Live observations/forecasts/AQHI with timestamps.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: SPECIALIST (Canada — weather, air quality, hydrometric through one governed door)",
   "benefitLabels": [
    "OPEN DATA",
    "NO KEY REQUIRED",
    "BETTER GEOGRAPHIC COVERAGE"
   ],
   "existingProviderOverlap": "Shares the weather capability with the NWS / Open-Meteo / MET Norway chain (FREE-RESOURCE-CATALOG §20).",
   "possibleFallbackFor": [
    "weather"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SPECIALIST (Canada — weather, air quality, hydrometric through one governed door)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §1.5",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C7).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Sweep 2026-11-16: MSC GeoMet collections index fetched live (citypage weather, AQHI, hydrometric, marine).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §1.5 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C7)."
    }
   ]
  },
  {
   "id": "resource-open-meteo-archive-weather",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Open-Meteo Archive API (ERA5)",
   "provider": "Open-Meteo (data: ECMWF ERA5 reanalysis)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "weather",
   "category": "WEATHER",
   "categoryNote": "Historical weather (ERA5) — not part of the live fallback chain",
   "capabilities": [
    "weather"
   ],
   "originalSource": "Open-Meteo (data: ECMWF ERA5 reanalysis) · https://open-meteo.com/en/docs/historical-weather-api",
   "documentation": "https://open-meteo.com/en/docs/historical-weather-api",
   "repository": null,
   "apiDescription": "Weather — historical (reanalysis)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_WITH_LIMITS",
   "catalogCostState": "FREE_NONCOMMERCIAL (with limits)",
   "commercialUseState": "No — free tier is non-commercial (as §1.2).",
   "rateLimits": "Provider free-tier limits as §1.2 (600/min · 5,000/hr · 10,000/day · 300,000/mo across the free tier).",
   "geographicCoverage": "Global.",
   "dataCoverage": "Historical hourly weather back to 1940 by coordinates.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "CC-BY-4.0 data attribution; free tier non-commercial per provider terms",
   "attribution": "Open-Meteo terms; ERA5/ECMWF credit per provider terms.",
   "cachePolicy": "Historical data is immutable — long cache lifetimes are safe where terms permit; provider + observation date retained.",
   "freshnessCharacteristics": "Historical only — label with the observation date, never present as current.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: SPECIALIST (historical weather — \"what was the weather there then\"; not part of the live fallback chain)",
   "benefitLabels": [
    "NEW COVERAGE",
    "NO KEY REQUIRED"
   ],
   "existingProviderOverlap": "Shares the weather capability with the NWS / Open-Meteo / MET Norway chain (FREE-RESOURCE-CATALOG §20).",
   "possibleFallbackFor": [
    "weather"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SPECIALIST (historical weather — \"what was the weather there then\"; not part of the live fallback chain)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §1.6",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C5).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Sweep live probe 2026-11-16: HTTP 200, CORS *.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §1.6 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C5)."
    }
   ]
  },
  {
   "id": "resource-open-meteo-geocoding",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Open-Meteo Geocoding API",
   "provider": "Open-Meteo (same operator as the CONNECTED forecast API, §1.2)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "geocoding",
   "category": "GEOCODING",
   "categoryNote": null,
   "capabilities": [
    "geocoding"
   ],
   "originalSource": "Open-Meteo (same operator as the CONNECTED forecast API, §1.2) · https://open-meteo.com/en/docs/geocoding-api · `https://geocoding-api.open-meteo.com/v1/search?name={q}&count=10&language=en&format=json`",
   "documentation": "https://open-meteo.com/en/docs/geocoding-api",
   "repository": null,
   "apiDescription": "Geocoding / place search (forward)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_WITH_LIMITS",
   "catalogCostState": "FREE_NONCOMMERCIAL (with limits)",
   "commercialUseState": "No — free usage is non-commercial (geocoding documentation, verified in the directive cover note).",
   "rateLimits": "Free-tier guideline ≈10,000 calls/day (provider-level, as catalogued for Open-Meteo); the free usage is under 10,000 daily calls per the geocoding documentation (directive cover-note verification). Free-tier ceilings from §1.2 apply.",
   "geographicCoverage": "Global places database (cities, towns, administrative areas).",
   "dataCoverage": "Forward geocoding: name → coordinates, country, admin regions, population, elevation, timezone, feature type; multi-language results. **No reverse geocoding** — recorded honestly; reverse is Nominatim's role (§3.3).",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "Data © OpenStreetMap contributors (ODbL); free tier non-commercial per provider terms",
   "attribution": "Open-Meteo attribution; underlying place data per Open-Meteo's terms (CC BY 4.0 family, as the forecast API).",
   "cachePolicy": "Cache resolved location metadata (the §5 CACHE rung); results keep the provider label.",
   "freshnessCharacteristics": "Reference data (not live).",
   "securityReview": {
    "status": "REVIEWED",
    "note": "Reviewed as part of the wiring package named in connectionEvidence; source facts recorded in FREE-RESOURCE-CATALOG.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "termsReview": {
    "status": "REVIEWED",
    "note": "Terms, limits and attribution recorded in FREE-RESOURCE-CATALOG §3.1.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "INTEGRATED — see connectionEvidence",
   "expectedBenefit": "Catalog fallback role: PRIMARY (Globe place search)",
   "benefitLabels": [
    "NO KEY REQUIRED",
    "WORLD GLOBE BENEFIT"
   ],
   "existingProviderOverlap": "Shares the geocoding chain: Open-Meteo Geocoding PRIMARY, Photon instance SECONDARY candidate, self-hosted Photon / Nominatim tertiary rungs, LocationIQ + Geoapify keyed rungs (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "PRIMARY (Globe place search)",
   "ownerApprovalState": "APPROVED",
   "ownerDecision": {
    "decision": "APPROVED",
    "by": "OWNER:owner",
    "at": "2026-11-16T00:00:00.000Z",
    "note": "Wired under the owner's build program before this engine existed; recorded retroactively at catalog import. The connection is evidenced by the named wiring, not by this record."
   },
   "pipelineStage": "CONNECTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": "js/provider-router.js CHAINS.geocode + the Globe place-search field (Capability Router package, cache v92).",
   "routerProviderId": "open-meteo-geocoding",
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §3.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: WIREABLE-NOW-KEYLESS (Sweep W3).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "WIRING",
     "ref": "connectionEvidence",
     "note": "js/provider-router.js CHAINS.geocode + the Globe place-search field (Capability Router package, cache v92).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "CONNECTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §3.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: WIREABLE-NOW-KEYLESS (Sweep W3)."
    }
   ]
  },
  {
   "id": "resource-photon-instance-geocoding",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Photon — public geocoding instance (Komoot)",
   "provider": "Komoot public instance of the open-source Photon geocoder",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "geocoding",
   "category": "GEOCODING",
   "categoryNote": null,
   "capabilities": [
    "geocoding"
   ],
   "originalSource": "Komoot public instance of the open-source Photon geocoder · https://photon.komoot.io · software: https://github.com/komoot/photon (record §17.1)",
   "documentation": "https://photon.komoot.io",
   "repository": null,
   "apiDescription": "Geocoding / place search (forward, search-as-you-type)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS (fair-use constrained)",
   "commercialUseState": "Data under ODbL (attribution + share-alike); instance use is fair-use per above.",
   "rateLimits": "None published → UNKNOWN; the public instance is a **fair-use, demo-class service** — Komoot asks heavy/production users to self-host. That fair-use constraint is the operative limit.",
   "geographicCoverage": "Global (OpenStreetMap data).",
   "dataCoverage": "Forward geocoding + search-as-you-type with OSM-type filtering, language support, bbox biasing. Architecturally the autocomplete-capable counterpart to Nominatim, whose public-instance policy *prohibits* autocomplete.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "Data © OpenStreetMap contributors (ODbL); public instance fair-use terms",
   "attribution": "© OpenStreetMap contributors (ODbL).",
   "cachePolicy": "Cache resolved metadata per §5; respect fair use — no bulk querying.",
   "freshnessCharacteristics": "Reference data (freshness = OSM edit state).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: SECONDARY (candidate) — the typeahead-shaped geocoder behind the PRIMARY",
   "benefitLabels": [
    "FALLBACK VALUE",
    "NO KEY REQUIRED",
    "OPEN DATA"
   ],
   "existingProviderOverlap": "Shares the geocoding chain: Open-Meteo Geocoding PRIMARY, Photon instance SECONDARY candidate, self-hosted Photon / Nominatim tertiary rungs, LocationIQ + Geoapify keyed rungs (catalog §20).",
   "possibleFallbackFor": [
    "geocoding"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SECONDARY (candidate) — the typeahead-shaped geocoder behind the PRIMARY",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [
    "resource-gap-geocoding-fallback"
   ],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §3.2",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C15).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Sweep live probe 2026-11-16: HTTP 200, CORS * (light use; fair-use constrained).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §3.2 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C15)."
    }
   ]
  },
  {
   "id": "resource-nominatim-geocoding",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Nominatim (public instance)",
   "provider": "OpenStreetMap Foundation (public instance) / osm-search project (software)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "geocoding",
   "category": "REVERSE_GEOCODING",
   "categoryNote": "MTI6 role is reverse-geocoding specialist under the public-instance usage policy (1 req/s, no autocomplete)",
   "capabilities": [
    "geocoding"
   ],
   "originalSource": "OpenStreetMap Foundation (public instance) / osm-search project (software) · usage policy (authoritative): https://operations.osmfoundation.org/policies/nominatim/",
   "documentation": "https://operations.osmfoundation.org/policies/nominatim/",
   "repository": null,
   "apiDescription": "Geocoding / reverse geocoding",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_WITH_LIMITS",
   "catalogCostState": "FREE_WITH_LIMITS",
   "commercialUseState": "Results under ODbL; the public instance's policy (above) is the operative constraint, not price.",
   "rateLimits": "Absolute max **1 request/second for the whole application**; **no heavy use, no bulk geocoding** beyond small one-off jobs; **no client-side autocomplete**; cache results; policy may change without notice and access may be withdrawn.",
   "geographicCoverage": "Global (OSM coverage).",
   "dataCoverage": "Search / reverse / lookup over OSM data — place records with address breakdown. The governed **reverse-geocoding** source (coordinates → place name) in the keyless pool.",
   "frontendDirectPossible": null,
   "proxyRequired": true,
   "selfHostable": true,
   "license": "Data © OpenStreetMap contributors (ODbL); Nominatim usage policy applies",
   "attribution": "© OpenStreetMap contributors (ODbL) — legally required, visible.",
   "cachePolicy": "Cache results (policy requirement); the 1 req/s whole-app ceiling makes a caching proxy the only scalable shape, and production use points to self-hosting or a commercial Nominatim-based service (LocationIQ, §3.5).",
   "freshnessCharacteristics": "Reference data (OSM edit state).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: SPECIALIST (reverse geocoding) · TERTIARY-class forward fallback under its policy ceiling — candidate status",
   "benefitLabels": [
    "OPEN DATA",
    "FALLBACK VALUE"
   ],
   "existingProviderOverlap": "Shares the geocoding chain: Open-Meteo Geocoding PRIMARY, Photon instance SECONDARY candidate, self-hosted Photon / Nominatim tertiary rungs, LocationIQ + Geoapify keyed rungs (catalog §20).",
   "possibleFallbackFor": [
    "geocoding"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SPECIALIST (reverse geocoding) · TERTIARY-class forward fallback under its policy ceiling — candidate status",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [
    "resource-gap-geocoding-fallback"
   ],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §3.3",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Source Catalog #4) — a light-use/testing source under policy, never a production dependency on the public instance.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §3.3 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Source Catalog #4) — a light-use/testing source under policy, never a production dependency on the public instance."
    }
   ]
  },
  {
   "id": "resource-geoapify-geocoding",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Geoapify",
   "provider": "Geoapify GmbH",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "geocoding",
   "category": "GEOCODING",
   "categoryNote": "Also places + routing capabilities",
   "capabilities": [
    "geocoding",
    "places",
    "routing"
   ],
   "originalSource": "Geoapify GmbH · https://www.geoapify.com/geocoding-api",
   "documentation": "https://www.geoapify.com/geocoding-api",
   "repository": null,
   "apiDescription": "Geocoding / places / routing (commercial, free tier)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "API_KEY",
   "apiKeyRequired": true,
   "oauthRequired": false,
   "credentialState": "KEY_EXISTS_PROVIDER_DASHBOARD",
   "credentialCustody": "Geoapify provider dashboard — the key value was never copied into any MTI6 record. Future custody: Netlify environment via the MTI6 proxy, per the secret-governance addendum (owner-gated step).",
   "freeState": "FREEMIUM",
   "catalogCostState": "FREEMIUM",
   "commercialUseState": "Per Geoapify terms (commercial API); OSM attribution applies.",
   "rateLimits": "Per-plan credits (figure UNVERIFIED in the sources).",
   "geographicCoverage": "Global.",
   "dataCoverage": "Geocoding + reverse geocoding, place details, routing, isochrones over OSM-derived data.",
   "frontendDirectPossible": null,
   "proxyRequired": true,
   "selfHostable": false,
   "license": "proprietary-terms (free plan; commercial/production allowed with attribution)",
   "attribution": "© OpenStreetMap contributors + Geoapify terms.",
   "cachePolicy": "Per Geoapify terms at activation; §12 defaults until then.",
   "freshnessCharacteristics": "Reference data.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "REVIEWED",
    "note": "Provider terms were presented and accepted at account creation under the owner's authorization (2026-11-16); catalog terms summary on record.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (OWNER-CREDENTIAL) — a commercial-grade geocoding fallback if the keyless chain proves insufficient; an option on file, not a present need",
   "benefitLabels": [
    "BETTER COVERAGE",
    "FALLBACK VALUE"
   ],
   "existingProviderOverlap": "Shares the geocoding chain: Open-Meteo Geocoding PRIMARY, Photon instance SECONDARY candidate, self-hosted Photon / Nominatim tertiary rungs, LocationIQ + Geoapify keyed rungs (catalog §20).",
   "possibleFallbackFor": [
    "geocoding"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (OWNER-CREDENTIAL) — a commercial-grade geocoding fallback if the keyless chain proves insufficient; an option on file, not a present need",
   "ownerApprovalState": "PENDING",
   "ownerDecision": null,
   "pipelineStage": "PREPARED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [
    "resource-gap-geocoding-fallback",
    "resource-gap-production-routing"
   ],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §3.4",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: OWNER-CREDENTIAL-DECISION (Sweep D3) — free key; the decision + signup are the owner's.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "PREPARED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §3.4 at the stage its recorded evidence supports. Catalog MTI6 STATE: OWNER-CREDENTIAL-DECISION (Sweep D3) — free key; the decision + signup are the owner's."
    }
   ],
   "stageNote": "Account created and verified under the owner's 2026-11-16 acquisition authorization (free tier). Integration is the pending step: it requires the owner-gated proxy/Netlify-env custody path, so this candidate waits at PREPARED for the owner's integration decision. Approving here approves integration planning — it does not itself place any key anywhere."
  },
  {
   "id": "resource-locationiq-geocoding",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "LocationIQ",
   "provider": "LocationIQ",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "geocoding",
   "category": "GEOCODING",
   "categoryNote": "Reverse-geocoding depth option (hosted Nominatim-compatible)",
   "capabilities": [
    "geocoding",
    "reverse-geocoding",
    "routing"
   ],
   "originalSource": "LocationIQ · https://locationiq.com/docs",
   "documentation": "https://locationiq.com/docs",
   "repository": null,
   "apiDescription": "Geocoding / reverse geocoding (commercial, free tier)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "API_KEY",
   "apiKeyRequired": true,
   "oauthRequired": false,
   "credentialState": "KEY_EXISTS_PROVIDER_DASHBOARD",
   "credentialCustody": "LocationIQ provider dashboard — the key value was never copied into any MTI6 record. Future custody: Netlify environment via the MTI6 proxy, per the secret-governance addendum (owner-gated step).",
   "freeState": "FREEMIUM",
   "catalogCostState": "FREEMIUM",
   "commercialUseState": "Per LocationIQ terms; OSM attribution applies.",
   "rateLimits": "Per-plan (UNVERIFIED in the sources).",
   "geographicCoverage": "Global.",
   "dataCoverage": "Hosted Nominatim-compatible geocoding / reverse geocoding over OSM data — the policy-constrained public Nominatim (§3.3) operated commercially with an SLA-shaped free tier.",
   "frontendDirectPossible": null,
   "proxyRequired": true,
   "selfHostable": false,
   "license": "proprietary-terms (free plan; OSM attribution applies)",
   "attribution": "© OpenStreetMap contributors (ODbL) + LocationIQ terms.",
   "cachePolicy": "Per LocationIQ terms at activation; §12 defaults until then.",
   "freshnessCharacteristics": "Reference data.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "REVIEWED",
    "note": "Provider terms were presented and accepted at account creation under the owner's authorization (2026-11-16); catalog terms summary on record.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (OWNER-CREDENTIAL) — the reverse-geocoding depth option without the public Nominatim 1 req/s ceiling",
   "benefitLabels": [
    "FALLBACK VALUE",
    "BETTER COVERAGE"
   ],
   "existingProviderOverlap": "Shares the geocoding chain: Open-Meteo Geocoding PRIMARY, Photon instance SECONDARY candidate, self-hosted Photon / Nominatim tertiary rungs, LocationIQ + Geoapify keyed rungs (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (OWNER-CREDENTIAL) — the reverse-geocoding depth option without the public Nominatim 1 req/s ceiling",
   "ownerApprovalState": "PENDING",
   "ownerDecision": null,
   "pipelineStage": "PREPARED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [
    "resource-gap-geocoding-fallback"
   ],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §3.5",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: OWNER-CREDENTIAL-DECISION (Sweep D4).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "PREPARED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §3.5 at the stage its recorded evidence supports. Catalog MTI6 STATE: OWNER-CREDENTIAL-DECISION (Sweep D4)."
    }
   ],
   "stageNote": "Account created and verified under the owner's 2026-11-16 acquisition authorization (free tier). Integration is the pending step: it requires the owner-gated proxy/Netlify-env custody path, so this candidate waits at PREPARED for the owner's integration decision. Approving here approves integration planning — it does not itself place any key anywhere."
  },
  {
   "id": "resource-usgs-earthquakes",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "USGS Earthquake Feeds + FDSN Event API",
   "provider": "US Geological Survey (USGS)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "earthquakes",
   "category": "ENVIRONMENT",
   "categoryNote": "Earthquakes / geohazards (no dedicated category in the registry taxonomy)",
   "capabilities": [
    "earthquakes"
   ],
   "originalSource": "US Geological Survey (USGS) · feeds: https://earthquake.usgs.gov/earthquakes/feed/v1.0/ · FDSN service: https://earthquake.usgs.gov/fdsnws/event/1/",
   "documentation": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/",
   "repository": null,
   "apiDescription": "Geohazards — earthquakes",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS",
   "commercialUseState": "Yes — USGS data is US public domain.",
   "rateLimits": "None published → UNKNOWN (never invented); be conservative.",
   "geographicCoverage": "Global seismic networks.",
   "dataCoverage": "(a) Pre-generated GeoJSON summary feeds by magnitude window and period (e.g. `summary/4.5_day.geojson`, `2.5_day`, `significant_week`, `all_day`; `_hour|_day|_week|_month`); (b) FDSN parameterized queries (time, magnitude, bounding box, radius) returning GeoJSON/CSV/XML. Each feature carries magnitude, place description, time, depth, tsunami flag, PAGER alert level, and a link to the USGS event page — provenance is intrinsic to the record.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "public-domain (US government data)",
   "attribution": "Credit \"USGS\" per result; label every item `SOURCE: USGS Earthquake Catalog` + the feature's `time`.",
   "cachePolicy": "Cache per feed period rather than polling aggressively (provider guidance); §12 labeling for last-known.",
   "freshnessCharacteristics": "Near-real-time — feeds regenerate as events are catalogued; label with the feed's own `generated` timestamp. **Provider guidance (directive §9): use the real-time GeoJSON feeds for automated real-time display** (better performance/availability than query-per-view).",
   "securityReview": {
    "status": "REVIEWED",
    "note": "Reviewed as part of the wiring package named in connectionEvidence; source facts recorded in FREE-RESOURCE-CATALOG.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "termsReview": {
    "status": "REVIEWED",
    "note": "Terms, limits and attribution recorded in FREE-RESOURCE-CATALOG §4.1.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "INTEGRATED — see connectionEvidence",
   "expectedBenefit": "Catalog fallback role: PRIMARY (earthquakes)",
   "benefitLabels": [
    "OPEN DATA",
    "BETTER SOURCE AUTHORITY",
    "NO KEY REQUIRED",
    "WORLD GLOBE BENEFIT"
   ],
   "existingProviderOverlap": "Earthquakes chain: USGS PRIMARY, GDACS candidate SECONDARY (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "PRIMARY (earthquakes)",
   "ownerApprovalState": "APPROVED",
   "ownerDecision": {
    "decision": "APPROVED",
    "by": "OWNER:owner",
    "at": "2026-11-16T00:00:00.000Z",
    "note": "Wired under the owner's build program before this engine existed; recorded retroactively at catalog import. The connection is evidenced by the named wiring, not by this record."
   },
   "pipelineStage": "CONNECTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": "js/provider-router.js CHAINS.earthquakes (USGS M4.5+ day GeoJSON feed) + the Globe module-local EARTHQUAKES layer at real coordinates (cache v92).",
   "routerProviderId": "usgs-earthquakes",
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §4.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: WIREABLE-NOW-KEYLESS (Sweep W1).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "WIRING",
     "ref": "connectionEvidence",
     "note": "js/provider-router.js CHAINS.earthquakes (USGS M4.5+ day GeoJSON feed) + the Globe module-local EARTHQUAKES layer at real coordinates (cache v92).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "CONNECTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §4.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: WIREABLE-NOW-KEYLESS (Sweep W1)."
    }
   ]
  },
  {
   "id": "resource-gdacs-geohazards",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "GDACS — Global Disaster Alert and Coordination System",
   "provider": "GDACS (UN OCHA / European Commission JRC)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "natural-events",
   "category": "ENVIRONMENT",
   "categoryNote": "Multi-hazard alert-level rollup (earthquakes, floods, cyclones, volcanoes)",
   "capabilities": [
    "natural-events"
   ],
   "originalSource": "GDACS (UN OCHA / European Commission JRC) · https://www.gdacs.org/gdacsapi/",
   "documentation": "https://www.gdacs.org/gdacsapi/",
   "repository": null,
   "apiDescription": "Disaster alerts / multi-hazard events",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS",
   "commercialUseState": "Not stated in the sources; data is published for humanitarian/public use with attribution.",
   "rateLimits": "None published → UNKNOWN.",
   "geographicCoverage": "Global.",
   "dataCoverage": "Automated multi-hazard alerting — earthquakes, tropical cyclones, floods, volcanoes, droughts, wildfires — with alert levels (Green/Orange/Red) and impact estimates, via a REST API (`gdacsapi`) and RSS/GeoRSS feeds.",
   "frontendDirectPossible": null,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "GDACS terms recorded in catalog; attribution required",
   "attribution": "GDACS attribution.",
   "cachePolicy": "Not specified → UNKNOWN; a shared cache is the sane shape (§12 defaults).",
   "freshnessCharacteristics": "Near-live alerts (label with alert time).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: SECONDARY (candidate) — the multi-hazard alert-level rollup complementing USGS (seismic detail) and EONET (curated events): three different jobs, no duplication",
   "benefitLabels": [
    "FALLBACK VALUE",
    "NEW COVERAGE",
    "OPEN DATA"
   ],
   "existingProviderOverlap": "Natural-events chain: EONET PRIMARY, GDACS candidate SECONDARY, FIRMS keyed SPECIALIST (catalog §20).",
   "possibleFallbackFor": [
    "natural-events"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SECONDARY (candidate) — the multi-hazard alert-level rollup complementing USGS (seismic detail) and EONET (curated events): three different jobs, no duplication",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [
    "resource-gap-weather-alerts-outside-us"
   ],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §4.2",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C9) — shape-confirmation task named.",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Sweep probe 2026-11-16: API query returned HTTP 400 — query shape UNCONFIRMED; RSS surface lacks CORS. A recorded test with a failing outcome; shape-confirmation is the open research task.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §4.2 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C9) — shape-confirmation task named."
    }
   ]
  },
  {
   "id": "resource-nasa-eonet-natural-events",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "NASA EONET — Earth Observatory Natural Event Tracker (API v3)",
   "provider": "NASA (Earth Observatory)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "natural-events",
   "category": "ENVIRONMENT",
   "categoryNote": "Natural events (wildfires, storms, volcanoes, ice) with named upstream sources",
   "capabilities": [
    "natural-events"
   ],
   "originalSource": "NASA (Earth Observatory) · https://eonet.gsfc.nasa.gov/docs/v3 · endpoints: `/api/v3/events`, `/events/geojson`, `/categories/{id}`, `/sources`, `/layers`",
   "documentation": "https://eonet.gsfc.nasa.gov/docs/v3",
   "repository": null,
   "apiDescription": "Earth events — wildfires, severe storms, volcanoes, floods, drought, sea/lake ice, dust/haze, landslides, snow, temperature extremes, water color, manmade",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS",
   "commercialUseState": "NASA open-data norms; EONET metadata is subject to the EONET disclaimer linked from its docs.",
   "rateLimits": "None published → UNKNOWN; poll on a minutes-scale cadence at most.",
   "geographicCoverage": "Global.",
   "dataCoverage": "Curated events with categories, geometry (Point/Polygon with dates), magnitude where applicable, open/closed status, and **named upstream sources** (e.g. InciWeb for wildfires) — provenance is a first-class field, matching MTI6's source-under-every-item rule. Filterable by status, days, start/end, bbox, category, source.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "NASA open data",
   "attribution": "Credit \"NASA EONET\" + the event's own upstream source per item; label `SOURCE: NASA EONET · via {event.sources[]}` + geometry date.",
   "cachePolicy": "Minutes-scale polling at most; §12 labeling.",
   "freshnessCharacteristics": "Curated near-real-time (events appear as upstream sources report) — label **NEAR-LIVE / OBSERVED**, never \"live video\".",
   "securityReview": {
    "status": "REVIEWED",
    "note": "Reviewed as part of the wiring package named in connectionEvidence; source facts recorded in FREE-RESOURCE-CATALOG.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "termsReview": {
    "status": "REVIEWED",
    "note": "Terms, limits and attribution recorded in FREE-RESOURCE-CATALOG §5.1.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "INTEGRATED — see connectionEvidence",
   "expectedBenefit": "Catalog fallback role: PRIMARY (natural events; keyless wildfire/event source)",
   "benefitLabels": [
    "OPEN DATA",
    "NO KEY REQUIRED",
    "WORLD GLOBE BENEFIT",
    "NEW COVERAGE"
   ],
   "existingProviderOverlap": "Natural-events chain: EONET PRIMARY, GDACS candidate SECONDARY, FIRMS keyed SPECIALIST (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "PRIMARY (natural events; keyless wildfire/event source)",
   "ownerApprovalState": "APPROVED",
   "ownerDecision": {
    "decision": "APPROVED",
    "by": "OWNER:owner",
    "at": "2026-11-16T00:00:00.000Z",
    "note": "Wired under the owner's build program before this engine existed; recorded retroactively at catalog import. The connection is evidenced by the named wiring, not by this record."
   },
   "pipelineStage": "CONNECTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": "js/provider-router.js CHAINS.naturalEvents + the Globe Natural Events section (Capability Router package, cache v92).",
   "routerProviderId": "nasa-eonet",
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §5.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: WIREABLE-NOW-KEYLESS (Sweep W2).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "WIRING",
     "ref": "connectionEvidence",
     "note": "js/provider-router.js CHAINS.naturalEvents + the Globe Natural Events section (Capability Router package, cache v92).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "CONNECTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §5.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: WIREABLE-NOW-KEYLESS (Sweep W2)."
    }
   ]
  },
  {
   "id": "resource-open-meteo-air-quality",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Open-Meteo Air Quality API (CAMS)",
   "provider": "Open-Meteo (data: Copernicus Atmosphere Monitoring Service, CAMS)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "environment",
   "category": "AIR_QUALITY",
   "categoryNote": null,
   "capabilities": [
    "environment"
   ],
   "originalSource": "Open-Meteo (data: Copernicus Atmosphere Monitoring Service, CAMS) · https://open-meteo.com/en/docs/air-quality-api",
   "documentation": "https://open-meteo.com/en/docs/air-quality-api",
   "repository": null,
   "apiDescription": "Environment — air quality",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_WITH_LIMITS",
   "catalogCostState": "FREE_NONCOMMERCIAL (with limits)",
   "commercialUseState": "No — free tier non-commercial (as §1.2).",
   "rateLimits": "Provider free-tier guideline ≈10,000 calls/day; free-tier ceilings as §1.2.",
   "geographicCoverage": "Global (CAMS global domain; pollen Europe only).",
   "dataCoverage": "Hourly air quality by coordinates — PM2.5/PM10, ozone, NO₂, SO₂, CO, pollen (European domain), US/European AQI, UV index — from CAMS models.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "CC-BY-4.0 data attribution; free tier non-commercial per provider terms",
   "attribution": "Open-Meteo terms; CAMS/Copernicus credit.",
   "cachePolicy": "§12 defaults; provider + model time retained.",
   "freshnessCharacteristics": "Model data — label OBSERVED/MODEL + time, never as sensor readings.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (designated PRIMARY for global air quality when wired)",
   "benefitLabels": [
    "NEW COVERAGE",
    "NO KEY REQUIRED"
   ],
   "existingProviderOverlap": "Sole-source candidate for its environment sub-capability today (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (designated PRIMARY for global air quality when wired)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §6.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C2).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Sweep live probe 2026-11-16: HTTP 200, CORS *.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §6.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C2)."
    }
   ]
  },
  {
   "id": "resource-open-meteo-marine",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Open-Meteo Marine API",
   "provider": "Open-Meteo",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "environment",
   "category": "ENVIRONMENT",
   "categoryNote": "Marine / ocean conditions — sole source for the Globe's ocean contexts",
   "capabilities": [
    "environment"
   ],
   "originalSource": "Open-Meteo · https://open-meteo.com/en/docs/marine-weather-api",
   "documentation": "https://open-meteo.com/en/docs/marine-weather-api",
   "repository": null,
   "apiDescription": "Environment — marine forecasts",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_WITH_LIMITS",
   "catalogCostState": "FREE_NONCOMMERCIAL (with limits)",
   "commercialUseState": "No — free tier non-commercial.",
   "rateLimits": "As §6.1.",
   "geographicCoverage": "Global oceans/coasts.",
   "dataCoverage": "Hourly marine forecasts by ocean coordinates — wave height/direction/period, wind waves, swell.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "CC-BY-4.0 data attribution; free tier non-commercial per provider terms",
   "attribution": "Open-Meteo terms.",
   "cachePolicy": "§12 defaults.",
   "freshnessCharacteristics": "Model forecast data, labeled with time.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (sole source — completes the weather family for the Globe's ocean contexts and any future boat/ferry route context)",
   "benefitLabels": [
    "NEW COVERAGE",
    "NO KEY REQUIRED"
   ],
   "existingProviderOverlap": "Sole-source candidate for its environment sub-capability today (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (sole source — completes the weather family for the Globe's ocean contexts and any future boat/ferry route context)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §6.2",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C3).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Sweep live probe 2026-11-16: HTTP 200, CORS *.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §6.2 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C3)."
    }
   ]
  },
  {
   "id": "resource-open-meteo-flood",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Open-Meteo Flood API (GloFAS)",
   "provider": "Open-Meteo (data: Copernicus GloFAS)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "environment",
   "category": "FLOOD",
   "categoryNote": "River flood forecasts (GloFAS)",
   "capabilities": [
    "environment"
   ],
   "originalSource": "Open-Meteo (data: Copernicus GloFAS) · https://open-meteo.com/en/docs/flood-api",
   "documentation": "https://open-meteo.com/en/docs/flood-api",
   "repository": null,
   "apiDescription": "Environment — flood risk (river discharge forecasts)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_WITH_LIMITS",
   "catalogCostState": "FREE_NONCOMMERCIAL (with limits)",
   "commercialUseState": "No — free tier non-commercial.",
   "rateLimits": "As §6.1.",
   "geographicCoverage": "Global river network.",
   "dataCoverage": "Daily river-discharge forecasts (with ensemble percentiles) for the nearest river point to given coordinates — a flood-risk **signal**, not a sensor reading.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "CC-BY-4.0 data attribution; free tier non-commercial per provider terms",
   "attribution": "Open-Meteo terms; GloFAS/Copernicus credit.",
   "cachePolicy": "§12 defaults.",
   "freshnessCharacteristics": "Model forecast — label DERIVED/MODEL, never \"live\".",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (sole source — hazard context alongside §4/§5)",
   "benefitLabels": [
    "NEW COVERAGE",
    "NO KEY REQUIRED"
   ],
   "existingProviderOverlap": "Sole-source candidate for its environment sub-capability today (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (sole source — hazard context alongside §4/§5)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §6.3",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C4).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Sweep live probe 2026-11-16: HTTP 200, CORS *.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §6.3 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C4)."
    }
   ]
  },
  {
   "id": "resource-noaa-swpc-space-weather",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "NOAA Space Weather Prediction Center (SWPC) JSON services",
   "provider": "NOAA SWPC",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "environment",
   "category": "ENVIRONMENT",
   "categoryNote": "Space weather (geomagnetic storms, aurora awareness)",
   "capabilities": [
    "environment"
   ],
   "originalSource": "NOAA SWPC · https://www.swpc.noaa.gov/content/data-access · e.g. `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json`, alerts via `https://services.swpc.noaa.gov/products/alerts.json`",
   "documentation": "https://www.swpc.noaa.gov/content/data-access",
   "repository": null,
   "apiDescription": "Environment — space weather",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS",
   "commercialUseState": "Yes — US public domain.",
   "rateLimits": "None published → UNKNOWN.",
   "geographicCoverage": "Global (Earth-environment).",
   "dataCoverage": "Machine-readable space-weather products as static JSON — planetary K-index, solar wind, geomagnetic storm alerts/watches, aurora forecasts.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "public-domain (US government data)",
   "attribution": "Credit NOAA SWPC.",
   "cachePolicy": "§12 defaults; product timestamps retained.",
   "freshnessCharacteristics": "Live, labeled with product timestamps.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (sole source — aurora visibility / geomagnetic-storm awareness at zero integration risk)",
   "benefitLabels": [
    "NEW COVERAGE",
    "OPEN DATA",
    "NO KEY REQUIRED"
   ],
   "existingProviderOverlap": "Sole-source candidate for its environment sub-capability today (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (sole source — aurora visibility / geomagnetic-storm awareness at zero integration risk)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §6.4",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C8).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Sweep live probe 2026-11-16: HTTP 200 (NOAA SWPC JSON services).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §6.4 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C8)."
    }
   ]
  },
  {
   "id": "resource-defillama-protocol-data",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "DefiLlama Public API (free tier)",
   "provider": "DefiLlama (open-source DeFi analytics project)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "crypto-protocol",
   "category": "EXTERNAL_APIS",
   "categoryNote": "Crypto protocol & chain data — no crypto category exists in the registry taxonomy; nearest category used per spec rule",
   "capabilities": [
    "crypto-protocol"
   ],
   "originalSource": "DefiLlama (open-source DeFi analytics project) · https://api-docs.defillama.com · free API at `api.llama.fi` (31 endpoints), prices at `coins.llama.fi`",
   "documentation": "https://api-docs.defillama.com",
   "repository": null,
   "apiDescription": "Crypto — DeFi protocol & chain data (TVL, volumes, fees overviews, stablecoins)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREEMIUM",
   "catalogCostState": "FREEMIUM (genuinely free keyless tier + paid Pro — the paid tier is never described as part of the free surface)",
   "commercialUseState": "Not stated in the sources for the free API → UNKNOWN.",
   "rateLimits": "No figure in the official docs (\"Standard\"); secondary sources consistently report **≈300 requests / 5 minutes per IP** — recorded as DOCUMENTED-SECONDARY, to be re-verified at TESTED stage. Bursts and per-protocol loops draw HTTP 429.",
   "geographicCoverage": "Global DeFi (all major chains).",
   "dataCoverage": "Protocol list with TVL + 1d/7d change (`/protocols`), per-protocol historical TVL (`/protocol/{slug}`), chain TVL (`/v2/chains`, `/chains`), DEX volume and fees overviews, stablecoin circulation (`stablecoins.llama.fi`), coin prices (`coins.llama.fi/prices/current/{chain}:{tokenAddress}` — chain-qualified addresses, matching MTI6's network-qualified anchor rule). **Boundary (§7): the former free yield endpoints moved to the paid plan on 2026-11-13 — yields are a §22 capability gap (§19.1), not part of this free surface.**",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "proprietary-terms (genuinely free keyless API tier; paid Pro tier is a separate surface)",
   "attribution": "Credit \"DefiLlama\" per result; label every value `SOURCE: DefiLlama · {fetchedAt}`.",
   "cachePolicy": "Cache the full `/protocols` snapshot — one large response; **do not loop per-protocol**. §12 labeling for last-known.",
   "freshnessCharacteristics": "Aggregated market data, hourly-scale freshness; label with fetch time + \"DefiLlama\". TVL follows DefiLlama's adapter methodology (double-count/lag caveats are documented by DefiLlama and independent reviews) — MTI6 labels it as a sourced aggregate, never as on-chain truth, a balance, or a verified figure.",
   "securityReview": {
    "status": "REVIEWED",
    "note": "Reviewed as part of the wiring package named in connectionEvidence; source facts recorded in FREE-RESOURCE-CATALOG.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "termsReview": {
    "status": "REVIEWED",
    "note": "Terms, limits and attribution recorded in FREE-RESOURCE-CATALOG §7.1.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "INTEGRATED — see connectionEvidence",
   "expectedBenefit": "Catalog fallback role: PRIMARY (crypto protocol & chain data; also the designated cross-check source for prices via `coins.llama.fi`, §9)",
   "benefitLabels": [
    "NO KEY REQUIRED",
    "CRYPTO WORLD BENEFIT",
    "LOWER COST"
   ],
   "existingProviderOverlap": "Crypto protocol & chain data chain: DefiLlama free PRIMARY, GeckoTerminal candidate SECONDARY; Bitcoin sub-chain mempool.space -> Esplora (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "PRIMARY (crypto protocol & chain data; also the designated cross-check source for prices via `coins.llama.fi`, §9)",
   "ownerApprovalState": "APPROVED",
   "ownerDecision": {
    "decision": "APPROVED",
    "by": "OWNER:owner",
    "at": "2026-11-16T00:00:00.000Z",
    "note": "Wired under the owner's build program before this engine existed; recorded retroactively at catalog import. The connection is evidenced by the named wiring, not by this record."
   },
   "pipelineStage": "CONNECTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": "js/provider-router.js CHAINS.protocol + CHAINS.chain — DefiLlama FREE endpoints only; yields endpoints excluded (paid since 2026-11-13) and answered as a capability gap with zero network calls (cache v92).",
   "routerProviderId": "defillama",
   "gapRefs": [
    "resource-gap-crypto-yields"
   ],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §7.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: WIREABLE-NOW-KEYLESS (Sweep W4) — the direct match for live TVL on the 19 canonical protocols / 11 networks, which currently have no live source.",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "WIRING",
     "ref": "connectionEvidence",
     "note": "js/provider-router.js CHAINS.protocol + CHAINS.chain — DefiLlama FREE endpoints only; yields endpoints excluded (paid since 2026-11-13) and answered as a capability gap with zero network calls (cache v92).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "CONNECTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §7.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: WIREABLE-NOW-KEYLESS (Sweep W4) — the direct match for live TVL on the 19 canonical protocols / 11 networks, which currently have no live source."
    }
   ]
  },
  {
   "id": "resource-mempool-space-bitcoin",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "mempool.space API",
   "provider": "The Mempool Open Source Project",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "crypto-protocol",
   "category": "EXTERNAL_APIS",
   "categoryNote": "Bitcoin network intelligence — observation only; transaction broadcasting is never an MTI6 capability",
   "capabilities": [
    "crypto-protocol"
   ],
   "originalSource": "The Mempool Open Source Project · https://mempool.space/docs/api/rest · e.g. `GET https://mempool.space/api/v1/fees/recommended`, `/api/blocks/tip/height`, `/api/address/{address}` (owner-supplied addresses only — no address discovery exists or is implied)",
   "documentation": "https://mempool.space/docs/api/rest",
   "repository": null,
   "apiDescription": "Crypto — Bitcoin network state",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS (self-hostable)",
   "commercialUseState": "The hosted instance's terms ask commercial-scale users to self-host or sponsor — recorded as the operative usage-policy fact.",
   "rateLimits": "None published → UNKNOWN; poll gently.",
   "geographicCoverage": "Bitcoin mainnet (testnet/signet instances exist).",
   "dataCoverage": "Mempool congestion + recommended fees, tip height/hash, block/transaction lookup, address state, mining pool/hashrate data, Lightning network statistics.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "Open-source project; public API terms recorded in catalog",
   "attribution": "Credit mempool.space; the project is open source (official JS client is MIT — record §17.2).",
   "cachePolicy": "§12 defaults; poll gently.",
   "freshnessCharacteristics": "Live mempool state, labeled with fetch time.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: SPECIALIST (Bitcoin network intelligence for the canonical `bitcoin-mainnet` record — fees/congestion from the network's own reference explorer rather than an aggregator)",
   "benefitLabels": [
    "NO KEY REQUIRED",
    "SELF-HOSTABLE",
    "CRYPTO WORLD BENEFIT",
    "BETTER SOURCE AUTHORITY"
   ],
   "existingProviderOverlap": "Crypto protocol & chain data chain: DefiLlama free PRIMARY, GeckoTerminal candidate SECONDARY; Bitcoin sub-chain mempool.space -> Esplora (catalog §20).",
   "possibleFallbackFor": [
    "crypto-protocol"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SPECIALIST (Bitcoin network intelligence for the canonical `bitcoin-mainnet` record — fees/congestion from the network's own reference explorer rather than an aggregator)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §7.2",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C11).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Sweep live probe 2026-11-16: HTTP 200, CORS *.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §7.2 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C11)."
    }
   ]
  },
  {
   "id": "resource-blockstream-esplora-bitcoin",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Blockstream Esplora API (blockstream.info)",
   "provider": "Blockstream",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "crypto-protocol",
   "category": "EXTERNAL_APIS",
   "categoryNote": "Bitcoin data via Esplora — observation only. Per the secret-governance addendum this record is model A (public Esplora endpoints); model B (self-hosted Esplora) is the selfHostable path on this same record, and model C (commercial Blockstream Explorer API) is a separate PAID surface that is NOT recorded as acquired and is never purchased without owner authorization.",
   "capabilities": [
    "crypto-protocol"
   ],
   "originalSource": "Blockstream · API doc: https://github.com/Blockstream/esplora/blob/master/API.md",
   "documentation": "https://github.com/Blockstream/esplora/blob/master/API.md",
   "repository": null,
   "apiDescription": "Crypto — Bitcoin + Liquid explorer data",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS (self-hostable)",
   "commercialUseState": "Per Blockstream terms for the hosted instance (not detailed in the sources).",
   "rateLimits": "None published → UNKNOWN.",
   "geographicCoverage": "Bitcoin + Liquid networks.",
   "dataCoverage": "Blocks, transactions, addresses (paginated), fee estimates; Liquid equivalents.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "Open-source (Esplora); public endpoint terms recorded in catalog",
   "attribution": "Credit Blockstream / blockstream.info per their terms.",
   "cachePolicy": "§12 defaults.",
   "freshnessCharacteristics": "Live chain state.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: SPECIALIST / SECONDARY (independent second Bitcoin source behind §7.2 — cross-checking is a stated MTI6 truth principle, §10)",
   "benefitLabels": [
    "NO KEY REQUIRED",
    "SELF-HOSTABLE",
    "REDUNDANCY",
    "CRYPTO WORLD BENEFIT"
   ],
   "existingProviderOverlap": "Crypto protocol & chain data chain: DefiLlama free PRIMARY, GeckoTerminal candidate SECONDARY; Bitcoin sub-chain mempool.space -> Esplora (catalog §20).",
   "possibleFallbackFor": [
    "crypto-protocol"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SPECIALIST / SECONDARY (independent second Bitcoin source behind §7.2 — cross-checking is a stated MTI6 truth principle, §10)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §7.3",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C12).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Sweep live probe 2026-11-16: HTTP 200 (public Esplora endpoints).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §7.3 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C12)."
    }
   ]
  },
  {
   "id": "resource-dexscreener-dex-pairs",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "DexScreener API",
   "provider": "DexScreener",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "dex-market",
   "category": "EXTERNAL_APIS",
   "categoryNote": "DEX pair/token observation — no crypto category exists in the registry taxonomy",
   "capabilities": [
    "dex-market"
   ],
   "originalSource": "DexScreener · https://docs.dexscreener.com/api/reference · e.g. `GET https://api.dexscreener.com/latest/dex/search?q={q}`, `/latest/dex/pairs/{chainId}/{pairAddress}`, `/tokens/v1/{chainId}/{tokenAddresses}`",
   "documentation": "https://docs.dexscreener.com/api/reference",
   "repository": null,
   "apiDescription": "Crypto — DEX / pair / token market observation",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS",
   "commercialUseState": "**Yes** — its terms allow both commercial and non-commercial API use subject to its restrictions (directive cover-note verification).",
   "rateLimits": "**300 requests/min** for the pairs/tokens/search group; **60 requests/min** for the token-profiles/boosts/orders group; per client IP. Stay within the documented per-group limits; cache and back off on 429 (§13 governor).",
   "geographicCoverage": "80+ chains' DEXes.",
   "dataCoverage": "Trading pairs by chain+pair address (price, FDV, market cap, liquidity, volume, txn counts, price change), tokens by chain+address, pair search, token profiles/boosts. An *indexer* (a pair appears once a pool exists and trades) with **no OHLCV/history endpoints** — current-state data only; never present it as a charting history source.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "proprietary-terms (API use allowed for commercial and non-commercial use subject to provider restrictions)",
   "attribution": "Credit \"DexScreener\" per result; label every value `SOURCE: DexScreener · {fetchedAt}`.",
   "cachePolicy": "Cache within the documented rate groups; back off on 429; §12 labeling.",
   "freshnessCharacteristics": "Live current pair state; label with fetch time.",
   "securityReview": {
    "status": "REVIEWED",
    "note": "Reviewed as part of the wiring package named in connectionEvidence; source facts recorded in FREE-RESOURCE-CATALOG.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "termsReview": {
    "status": "REVIEWED",
    "note": "Terms, limits and attribution recorded in FREE-RESOURCE-CATALOG §8.1.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "INTEGRATED — see connectionEvidence",
   "expectedBenefit": "Catalog fallback role: PRIMARY (DEX pair/token observation)",
   "benefitLabels": [
    "NO KEY REQUIRED",
    "CRYPTO WORLD BENEFIT"
   ],
   "existingProviderOverlap": "DEX / market data chain: DexScreener PRIMARY, GeckoTerminal candidate SECONDARY (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "PRIMARY (DEX pair/token observation)",
   "ownerApprovalState": "APPROVED",
   "ownerDecision": {
    "decision": "APPROVED",
    "by": "OWNER:owner",
    "at": "2026-11-16T00:00:00.000Z",
    "note": "Wired under the owner's build program before this engine existed; recorded retroactively at catalog import. The connection is evidenced by the named wiring, not by this record."
   },
   "pipelineStage": "CONNECTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": "js/provider-router.js CHAINS.dexPairs within documented per-endpoint limits (Capability Router package, cache v92).",
   "routerProviderId": "dexscreener",
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §8.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: WIREABLE-NOW-KEYLESS (Sweep W5).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "WIRING",
     "ref": "connectionEvidence",
     "note": "js/provider-router.js CHAINS.dexPairs within documented per-endpoint limits (Capability Router package, cache v92).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "CONNECTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §8.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: WIREABLE-NOW-KEYLESS (Sweep W5)."
    }
   ]
  },
  {
   "id": "resource-geckoterminal-dex",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "GeckoTerminal API (CoinGecko)",
   "provider": "CoinGecko (GeckoTerminal)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "dex-market",
   "category": "EXTERNAL_APIS",
   "categoryNote": "DEX data + OHLCV specialist — no crypto category exists in the registry taxonomy",
   "capabilities": [
    "dex-market"
   ],
   "originalSource": "CoinGecko (GeckoTerminal) · https://docs.geckoterminal.com — the public API is still labelled **Beta** by its own docs (stability caveat, recorded)",
   "documentation": "https://docs.geckoterminal.com",
   "repository": null,
   "apiDescription": "Crypto — DEX market data (pools, OHLCV)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_WITH_LIMITS",
   "catalogCostState": "FREE_WITH_LIMITS",
   "commercialUseState": "Per CoinGecko terms (not detailed in the sources).",
   "rateLimits": "**30 calls/minute** free, no key — the tightest budget in the crypto set; wiring design must be cache-first. Higher limits ride on paid CoinGecko plans (not requested).",
   "geographicCoverage": "250+ networks, 1,800+ DEXes.",
   "dataCoverage": "Pools, token prices, **OHLCV candles**, trending/new pools, trades.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "proprietary-terms (CoinGecko; Beta label noted in catalog)",
   "attribution": "CoinGecko terms; attribution requested (\"Data provided by GeckoTerminal\" posture per their docs).",
   "cachePolicy": "Cache-first design is mandatory at 30/min; §12 labeling.",
   "freshnessCharacteristics": "Live, polled at seconds scale; label with fetch time.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: SECONDARY (DEX data) · SPECIALIST (OHLCV) · SECONDARY for protocol data (§7 chain)",
   "benefitLabels": [
    "FALLBACK VALUE",
    "NEW COVERAGE",
    "CRYPTO WORLD BENEFIT"
   ],
   "existingProviderOverlap": "DEX / market data chain: DexScreener PRIMARY, GeckoTerminal candidate SECONDARY (catalog §20).",
   "possibleFallbackFor": [
    "dex-market"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SECONDARY (DEX data) · SPECIALIST (OHLCV) · SECONDARY for protocol data (§7 chain)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §8.2",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C13). Operated by CoinGecko, whose price API MTI6 already uses (§9.1) — a sibling service, separately governed here.",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Sweep live probe 2026-11-16: HTTP 200; documented limit 30 calls/min; Beta label noted.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §8.2 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C13). Operated by CoinGecko, whose price API MTI6 already uses (§9.1) — a sibling service, separately governed here."
    }
   ]
  },
  {
   "id": "resource-coingecko-prices",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "CoinGecko Price API",
   "provider": "CoinGecko",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "prices",
   "category": "EXTERNAL_APIS",
   "categoryNote": "Crypto prices — the unauthenticated public endpoint PriceScout uses today; the keyed Demo API is a separate acquisition item",
   "capabilities": [
    "prices"
   ],
   "originalSource": "CoinGecko · public API base in-repo: `https://api.coingecko.com/api/v3/simple/price` (`js/price-scout.js`)",
   "documentation": "https://api.coingecko.com/api/v3/simple/price`",
   "repository": null,
   "apiDescription": "Crypto — asset prices",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREEMIUM",
   "catalogCostState": "FREEMIUM (free public tier in use; keyed/paid tiers exist and are not used)",
   "commercialUseState": "Per CoinGecko's public API terms (not detailed in the sources).",
   "rateLimits": "≈30 calls/min public-tier guidance (registry-recorded); 5-minute cache TTL in-app.",
   "geographicCoverage": "Global markets.",
   "dataCoverage": "Per-asset prices (point lookups).",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "proprietary-terms (free public tier in use; keyed/paid tiers exist and are not used)",
   "attribution": "Per CoinGecko's public API terms.",
   "cachePolicy": "5-minute TTL (in-app registry); §12 labeling.",
   "freshnessCharacteristics": "Live prices, labeled with source + fetch time.",
   "securityReview": {
    "status": "REVIEWED",
    "note": "Reviewed as part of the wiring package named in connectionEvidence; source facts recorded in FREE-RESOURCE-CATALOG.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "termsReview": {
    "status": "REVIEWED",
    "note": "Terms, limits and attribution recorded in FREE-RESOURCE-CATALOG §9.1.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "INTEGRATED — see connectionEvidence",
   "expectedBenefit": "Catalog fallback role: PRIMARY (prices — head of the built PriceScout chain)",
   "benefitLabels": [
    "CRYPTO WORLD BENEFIT",
    "LOWER COST"
   ],
   "existingProviderOverlap": "PriceScout chain: CoinGecko -> Coinbase -> CoinPaprika, DefiLlama coins as cross-check (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "PRIMARY (prices — head of the built PriceScout chain)",
   "ownerApprovalState": "APPROVED",
   "ownerDecision": {
    "decision": "APPROVED",
    "by": "OWNER:owner",
    "at": "2026-11-16T00:00:00.000Z",
    "note": "Wired under the owner's build program before this engine existed; recorded retroactively at catalog import. The connection is evidenced by the named wiring, not by this record."
   },
   "pipelineStage": "CONNECTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": "js/price-scout.js — PriceScout chain head (CoinGecko public endpoint), outcomes recorded in js/api-registry.js ('coingecko').",
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §9.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: **CONNECTED** (Source Catalog #21) — genuinely used by the app today (Crypto World / price scouts).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "WIRING",
     "ref": "connectionEvidence",
     "note": "js/price-scout.js — PriceScout chain head (CoinGecko public endpoint), outcomes recorded in js/api-registry.js ('coingecko').",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "CONNECTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §9.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: **CONNECTED** (Source Catalog #21) — genuinely used by the app today (Crypto World / price scouts)."
    }
   ]
  },
  {
   "id": "resource-coinbase-prices",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Coinbase (PriceScout fallback)",
   "provider": "Coinbase (public price surface as consumed by `js/price-scout.js`)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "prices",
   "category": "EXTERNAL_APIS",
   "categoryNote": "Crypto prices — PriceScout fallback",
   "capabilities": [
    "prices"
   ],
   "originalSource": "Coinbase (public price surface as consumed by `js/price-scout.js`)",
   "documentation": null,
   "repository": null,
   "apiDescription": "Crypto — asset prices",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS",
   "commercialUseState": "Not recorded → UNKNOWN.",
   "rateLimits": "Not recorded in the sources → UNKNOWN (never invented).",
   "geographicCoverage": "Global markets.",
   "dataCoverage": "Per-asset prices (PriceScout fallback rung).",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "proprietary-terms (public price endpoints)",
   "attribution": "Per Coinbase terms (not detailed in the sources).",
   "cachePolicy": "PriceScout chain cache (5-minute TTL posture, §9.1).",
   "freshnessCharacteristics": "Live prices; PriceScout labels results `{source, status: \"live\", fetchedAt}` — when Coinbase answers, the label says Coinbase (§3).",
   "securityReview": {
    "status": "REVIEWED",
    "note": "Reviewed as part of the wiring package named in connectionEvidence; source facts recorded in FREE-RESOURCE-CATALOG.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "termsReview": {
    "status": "REVIEWED",
    "note": "Terms, limits and attribution recorded in FREE-RESOURCE-CATALOG §9.2.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "INTEGRATED — see connectionEvidence",
   "expectedBenefit": "Catalog fallback role: SECONDARY (prices)",
   "benefitLabels": [
    "FALLBACK VALUE",
    "REDUNDANCY",
    "CRYPTO WORLD BENEFIT"
   ],
   "existingProviderOverlap": "PriceScout chain: CoinGecko -> Coinbase -> CoinPaprika, DefiLlama coins as cross-check (catalog §20).",
   "possibleFallbackFor": [
    "prices"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SECONDARY (prices)",
   "ownerApprovalState": "APPROVED",
   "ownerDecision": {
    "decision": "APPROVED",
    "by": "OWNER:owner",
    "at": "2026-11-16T00:00:00.000Z",
    "note": "Wired under the owner's build program before this engine existed; recorded retroactively at catalog import. The connection is evidenced by the named wiring, not by this record."
   },
   "pipelineStage": "CONNECTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": "js/price-scout.js — PriceScout chain SECONDARY (Coinbase public price endpoints).",
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §9.2",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: **CONNECTED** (as a fallback inside Source Catalog #21).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "WIRING",
     "ref": "connectionEvidence",
     "note": "js/price-scout.js — PriceScout chain SECONDARY (Coinbase public price endpoints).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "CONNECTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §9.2 at the stage its recorded evidence supports. Catalog MTI6 STATE: **CONNECTED** (as a fallback inside Source Catalog #21)."
    }
   ]
  },
  {
   "id": "resource-coinpaprika-prices",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "CoinPaprika (PriceScout fallback)",
   "provider": "CoinPaprika (public price surface as consumed by `js/price-scout.js`)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "prices",
   "category": "EXTERNAL_APIS",
   "categoryNote": "Crypto prices — PriceScout fallback",
   "capabilities": [
    "prices"
   ],
   "originalSource": "CoinPaprika (public price surface as consumed by `js/price-scout.js`)",
   "documentation": null,
   "repository": null,
   "apiDescription": "Crypto — asset prices",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS",
   "commercialUseState": "Not recorded → UNKNOWN.",
   "rateLimits": "Not recorded in the sources → UNKNOWN.",
   "geographicCoverage": "Global markets.",
   "dataCoverage": "Per-asset prices (PriceScout fallback rung).",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "proprietary-terms (free tier)",
   "attribution": "Per CoinPaprika terms (not detailed in the sources).",
   "cachePolicy": "PriceScout chain cache (5-minute TTL posture, §9.1).",
   "freshnessCharacteristics": "Live prices, labeled with the answering source + fetch time (§3).",
   "securityReview": {
    "status": "REVIEWED",
    "note": "Reviewed as part of the wiring package named in connectionEvidence; source facts recorded in FREE-RESOURCE-CATALOG.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "termsReview": {
    "status": "REVIEWED",
    "note": "Terms, limits and attribution recorded in FREE-RESOURCE-CATALOG §9.3.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "INTEGRATED — see connectionEvidence",
   "expectedBenefit": "Catalog fallback role: TERTIARY (prices)",
   "benefitLabels": [
    "FALLBACK VALUE",
    "REDUNDANCY",
    "CRYPTO WORLD BENEFIT"
   ],
   "existingProviderOverlap": "PriceScout chain: CoinGecko -> Coinbase -> CoinPaprika, DefiLlama coins as cross-check (catalog §20).",
   "possibleFallbackFor": [
    "prices"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "TERTIARY (prices)",
   "ownerApprovalState": "APPROVED",
   "ownerDecision": {
    "decision": "APPROVED",
    "by": "OWNER:owner",
    "at": "2026-11-16T00:00:00.000Z",
    "note": "Wired under the owner's build program before this engine existed; recorded retroactively at catalog import. The connection is evidenced by the named wiring, not by this record."
   },
   "pipelineStage": "CONNECTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": "js/price-scout.js — PriceScout chain TERTIARY (CoinPaprika public endpoints).",
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §9.3",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: **CONNECTED** (as a fallback inside Source Catalog #21).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "WIRING",
     "ref": "connectionEvidence",
     "note": "js/price-scout.js — PriceScout chain TERTIARY (CoinPaprika public endpoints).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "CONNECTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §9.3 at the stage its recorded evidence supports. Catalog MTI6 STATE: **CONNECTED** (as a fallback inside Source Catalog #21)."
    }
   ]
  },
  {
   "id": "resource-alternative-me-sentiment",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Alternative.me Crypto Fear & Greed Index API",
   "provider": "Alternative.me",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "sentiment",
   "category": "EXTERNAL_APIS",
   "categoryNote": "Crypto market sentiment (Fear & Greed) — display-only context, never a signal to act",
   "capabilities": [
    "sentiment"
   ],
   "originalSource": "Alternative.me · https://alternative.me/crypto/fear-and-greed-index/#api · `GET https://api.alternative.me/fng/?limit={n}`",
   "documentation": "https://alternative.me/crypto/fear-and-greed-index/#api",
   "repository": null,
   "apiDescription": "Crypto — market sentiment",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS",
   "commercialUseState": "Free for use with attribution per their API page.",
   "rateLimits": "None published → UNKNOWN.",
   "geographicCoverage": "Global crypto market aggregate.",
   "dataCoverage": "A single daily sentiment value (0–100) with classification, plus history. One number, honestly scoped: a *sentiment indicator*, not market data.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "proprietary-terms (free API)",
   "attribution": "Credit Alternative.me.",
   "cachePolicy": "Daily data — cache for the day; §12 labeling.",
   "freshnessCharacteristics": "**Daily** — label with its date, never \"live\".",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (sole source — a labeled sentiment context line for Crypto World; display-only context, never a signal to act, matching the no-advice posture of the opportunity pipeline)",
   "benefitLabels": [
    "NEW COVERAGE",
    "NO KEY REQUIRED",
    "CRYPTO WORLD BENEFIT"
   ],
   "existingProviderOverlap": "Sole-source candidate for sentiment (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (sole source — a labeled sentiment context line for Crypto World; display-only context, never a signal to act, matching the no-advice posture of the opportunity pipeline)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §10.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C14).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Sweep live probe 2026-11-16: HTTP 200.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §10.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C14)."
    }
   ]
  },
  {
   "id": "resource-hacker-news",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Hacker News API (Firebase)",
   "provider": "Hacker News (Y Combinator)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "news",
   "category": "EXTERNAL_APIS",
   "categoryNote": "Tech news headlines via the official Firebase API",
   "capabilities": [
    "news"
   ],
   "originalSource": "Hacker News (Y Combinator) · API base in-repo: `https://hacker-news.firebaseio.com/v0/` (`js/knowledge.js` — top stories + per-item reads)",
   "documentation": "https://hacker-news.firebaseio.com/v0/`",
   "repository": null,
   "apiDescription": "News / knowledge — tech headlines",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS",
   "commercialUseState": "The HN API is published for public read use; headlines link to original publishers.",
   "rateLimits": "None published (registry: generous; app caches 15 min).",
   "geographicCoverage": "Global (English-language tech news).",
   "dataCoverage": "Top/new story lists + per-item reads. No keyword search in the official API.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "Hacker News API terms (public read API)",
   "attribution": "Hacker News; stories link to original publishers.",
   "cachePolicy": "15-minute in-app cache; §12 labeling.",
   "freshnessCharacteristics": "Live headlines, labeled with source + time by KnowledgeScout.",
   "securityReview": {
    "status": "REVIEWED",
    "note": "Reviewed as part of the wiring package named in connectionEvidence; source facts recorded in FREE-RESOURCE-CATALOG.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "termsReview": {
    "status": "REVIEWED",
    "note": "Terms, limits and attribution recorded in FREE-RESOURCE-CATALOG §11.1.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "INTEGRATED — see connectionEvidence",
   "expectedBenefit": "Catalog fallback role: PRIMARY (news — connected today, tech-scoped)",
   "benefitLabels": [
    "NO KEY REQUIRED",
    "LOWER COST"
   ],
   "existingProviderOverlap": "News chain: Hacker News PRIMARY (connected), GDELT candidate SECONDARY behind a proxy/cache design (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "PRIMARY (news — connected today, tech-scoped)",
   "ownerApprovalState": "APPROVED",
   "ownerDecision": {
    "decision": "APPROVED",
    "by": "OWNER:owner",
    "at": "2026-11-16T00:00:00.000Z",
    "note": "Wired under the owner's build program before this engine existed; recorded retroactively at catalog import. The connection is evidenced by the named wiring, not by this record."
   },
   "pipelineStage": "CONNECTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": "js/knowledge.js — KnowledgeScout headlines (hacker-news.firebaseio.com), outcomes recorded in js/api-registry.js ('hacker-news').",
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §11.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: **CONNECTED** (Source Catalog #22) — genuinely used today (KnowledgeScout + NEWS search scope).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "WIRING",
     "ref": "connectionEvidence",
     "note": "js/knowledge.js — KnowledgeScout headlines (hacker-news.firebaseio.com), outcomes recorded in js/api-registry.js ('hacker-news').",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "CONNECTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §11.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: **CONNECTED** (Source Catalog #22) — genuinely used today (KnowledgeScout + NEWS search scope)."
    }
   ]
  },
  {
   "id": "resource-gdelt-news-events",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "GDELT DOC 2.0 API",
   "provider": "The GDELT Project",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "news",
   "category": "EXTERNAL_APIS",
   "categoryNote": "Global news/events awareness — needs a proxy/cache design before any wiring (429 from a standing start in the sweep probe)",
   "capabilities": [
    "news"
   ],
   "originalSource": "The GDELT Project · https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/ · endpoint root `https://api.gdeltproject.org/api/v2/doc/doc`",
   "documentation": "https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/",
   "repository": null,
   "apiDescription": "News / events — global news monitoring",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS",
   "commercialUseState": "GDELT data is open for use with attribution (\"The GDELT Project\"); article content remains the publishers'.",
   "rateLimits": "Enforced but **not published as a number** → UNKNOWN, with the probe as the operative fact: a single light DOC query (`mode=ArtList&maxrecords=1`) returned **HTTP 429 from a standing start** on 2026-11-16. GDELT throttles aggressively per IP (shared/datacenter egress especially). CORS could not be confirmed on a 429 response.",
   "geographicCoverage": "Global, multilingual.",
   "dataCoverage": "Article lists with source, language, country, tone, themes (DOC API); geographic and timeline modes (GEO mode shape unconfirmed in the sweep). A *news-monitoring index*, not a wire service: results are pointers to publishers' articles, labeled as such.",
   "frontendDirectPossible": null,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "GDELT terms recorded in catalog",
   "attribution": "\"The GDELT Project\"; articles remain their publishers'.",
   "cachePolicy": "A single shared cache absorbing the throttle is the only sane shape; never per-keystroke.",
   "freshnessCharacteristics": "Near-live news index (label with article time + publisher).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: SECONDARY (candidate) — global news/events awareness beyond Hacker News' tech slice, behind a proxy/cache design",
   "benefitLabels": [
    "NEW COVERAGE",
    "NO KEY REQUIRED",
    "FALLBACK VALUE"
   ],
   "existingProviderOverlap": "News chain: Hacker News PRIMARY (connected), GDELT candidate SECONDARY behind a proxy/cache design (catalog §20).",
   "possibleFallbackFor": [
    "news"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SECONDARY (candidate) — global news/events awareness beyond Hacker News' tech slice, behind a proxy/cache design",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §11.2",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C10) — explicitly not wireable-now.",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Sweep probe 2026-11-16: a single minimal query drew HTTP 429 from a standing start — DEMOTED from wireable; needs a proxy/cache design before any wiring.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §11.2 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C10) — explicitly not wireable-now."
    }
   ]
  },
  {
   "id": "resource-github-rest-knowledge",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "GitHub REST API — the app's public, unauthenticated use",
   "provider": "GitHub",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "knowledge",
   "category": "EXTERNAL_APIS",
   "categoryNote": "Public repository activity (unauthenticated tier, rate-limited) — the app's use, not the Muse tooling connector",
   "capabilities": [
    "knowledge"
   ],
   "originalSource": "GitHub · API base in-repo: `https://api.github.com/repos/{owner}/{repo}` (`js/knowledge.js`, KnowledgeScout GitHub activity; also the Search GITHUB scope and `js/api-registry.js` entry `github-public`)",
   "documentation": "https://api.github.com/repos/{owner}/{repo}`",
   "repository": null,
   "apiDescription": "Knowledge / code activity (public data only)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS (unauthenticated tier in use)",
   "commercialUseState": "Per GitHub API terms; public data only.",
   "rateLimits": "**60 requests/hour unauthenticated per IP**; app caches 15 min.",
   "geographicCoverage": "N/A (global platform).",
   "dataCoverage": "Public repository activity and releases (repository-scoped reads; no in-app code search). **This is not the GitHub connector** (appendix) and not bot GitHub discovery — it is the app reading public web data, owner-triggered. It confers no write access, no discovery capability, and no connection to the owner's account inside the app.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "GitHub API terms",
   "attribution": "Per GitHub API terms.",
   "cachePolicy": "15-minute in-app cache; §12 labeling.",
   "freshnessCharacteristics": "Live public activity, labeled.",
   "securityReview": {
    "status": "REVIEWED",
    "note": "Reviewed as part of the wiring package named in connectionEvidence; source facts recorded in FREE-RESOURCE-CATALOG.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "termsReview": {
    "status": "REVIEWED",
    "note": "Terms, limits and attribution recorded in FREE-RESOURCE-CATALOG §11.3.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "INTEGRATED — see connectionEvidence",
   "expectedBenefit": "Catalog fallback role: SPECIALIST (sole source for public repo activity — connected, limited)",
   "benefitLabels": [
    "NO KEY REQUIRED"
   ],
   "existingProviderOverlap": "Sole source for public repository activity in-app (catalog §11.3).",
   "possibleFallbackFor": [
    "knowledge"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SPECIALIST (sole source for public repo activity — connected, limited)",
   "ownerApprovalState": "APPROVED",
   "ownerDecision": {
    "decision": "APPROVED",
    "by": "OWNER:owner",
    "at": "2026-11-16T00:00:00.000Z",
    "note": "Wired under the owner's build program before this engine existed; recorded retroactively at catalog import. The connection is evidenced by the named wiring, not by this record."
   },
   "pipelineStage": "CONNECTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": "js/knowledge.js — KnowledgeScout repository activity via api.github.com (unauthenticated tier), outcomes recorded in js/api-registry.js ('github-public'). Limited tier, recorded as such.",
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §11.3",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: **CONNECTED (limited)** (Source Catalog #23).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "WIRING",
     "ref": "connectionEvidence",
     "note": "js/knowledge.js — KnowledgeScout repository activity via api.github.com (unauthenticated tier), outcomes recorded in js/api-registry.js ('github-public'). Limited tier, recorded as such.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "CONNECTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §11.3 at the stage its recorded evidence supports. Catalog MTI6 STATE: **CONNECTED (limited)** (Source Catalog #23)."
    }
   ]
  },
  {
   "id": "resource-gtfs-static-transit",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "GTFS (static transit schedules)",
   "provider": "Transit agencies worldwide; specification stewarded by MobilityData (gtfs.org)",
   "formerName": null,
   "resourceType": "OPEN_DATA",
   "domain": "transit",
   "category": "TRANSIT",
   "categoryNote": "Open standard; per-agency feeds, each governed by its own record before activation",
   "capabilities": [
    "transit"
   ],
   "originalSource": "Transit agencies worldwide; specification stewarded by MobilityData (gtfs.org)",
   "documentation": null,
   "repository": null,
   "apiDescription": "Transit — schedules, stops, routes (format standard)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "UNKNOWN",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "UNKNOWN",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS (per-agency; some feeds FREE_KEYED)",
   "commercialUseState": "**Per-agency terms** — many feeds are open-data licensed, some restrict redistribution; there is no single GTFS license for feed *content*. Each agency feed needs its own terms check before activation.",
   "rateLimits": "Per-agency (download cadence, not per-query).",
   "geographicCoverage": "Wherever agencies publish (extensive in North America/Europe; varies globally).",
   "dataCoverage": "Not an API — an open **feed format** (zip of CSV files) published by each agency on its own developer page. Stops carry coordinates; routes/trips are first-class (point/radius/bounds/route queries exist only after ingestion).",
   "frontendDirectPossible": false,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "Per-agency feed licenses (open standard)",
   "attribution": "Per-agency.",
   "cachePolicy": "Feeds are files for server-side ingestion/caching; cache per agency cadence.",
   "freshnessCharacteristics": "Static schedules (per-agency publication cadence).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (the foundation data layer of the transit chain)",
   "benefitLabels": [
    "OPEN DATA",
    "WORLD GLOBE BENEFIT"
   ],
   "existingProviderOverlap": "Transit chain: Mobility Database (discovery) + Transitland (query), both owner-credential; per-agency GTFS / GTFS-RT beneath (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (the foundation data layer of the transit chain)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §12.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Source Catalog #8) — open standard, zero integration today; per-agency governance is the work, not the format.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §12.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Source Catalog #8) — open standard, zero integration today; per-agency governance is the work, not the format."
    }
   ]
  },
  {
   "id": "resource-gtfs-realtime-transit",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "GTFS Realtime (vehicle positions, arrivals, alerts)",
   "provider": "Transit agencies (same publishers as GTFS static); GTFS Realtime specification (gtfs.org family)",
   "formerName": null,
   "resourceType": "OPEN_DATA",
   "domain": "transit",
   "category": "TRANSIT",
   "categoryNote": "Live layer of the transit chain (vehicle positions, arrivals, alerts); per-agency feeds",
   "capabilities": [
    "transit"
   ],
   "originalSource": "Transit agencies (same publishers as GTFS static); GTFS Realtime specification (gtfs.org family)",
   "documentation": null,
   "repository": null,
   "apiDescription": "Transit — live",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "UNKNOWN",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "UNKNOWN",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS (per-agency; some feeds FREE_KEYED)",
   "commercialUseState": "Per-agency, as with GTFS static.",
   "rateLimits": "Per-agency polling guidance (feeds are polled, typically every 10–60s).",
   "geographicCoverage": "Where agencies publish realtime (a subset of GTFS coverage).",
   "dataCoverage": "Protocol-Buffers feeds: vehicle positions, trip updates (arrival estimates), service alerts — genuinely live data, labeled as such. Companion to a GTFS static feed for the same agency.",
   "frontendDirectPossible": false,
   "proxyRequired": true,
   "selfHostable": false,
   "license": "Per-agency feed licenses (open standard)",
   "attribution": "Per-agency.",
   "cachePolicy": "Poll per agency guidance; §12 labeling (live data ages in seconds — last-known must be labeled with its time).",
   "freshnessCharacteristics": "Live (polling cadence 10–60s).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (the live layer of the transit chain — the natural first genuinely-live transit source when transit is built)",
   "benefitLabels": [
    "OPEN DATA",
    "NEW COVERAGE",
    "WORLD GLOBE BENEFIT"
   ],
   "existingProviderOverlap": "Transit chain: Mobility Database (discovery) + Transitland (query), both owner-credential; per-agency GTFS / GTFS-RT beneath (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (the live layer of the transit chain — the natural first genuinely-live transit source when transit is built)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §12.2",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Source Catalog #9) — nothing exists today.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §12.2 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Source Catalog #9) — nothing exists today."
    }
   ]
  },
  {
   "id": "resource-transitland-transit",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Transitland API v2 (Interline)",
   "provider": "Interline (Transitland)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "transit",
   "category": "TRANSIT",
   "categoryNote": null,
   "capabilities": [
    "transit"
   ],
   "originalSource": "Interline (Transitland) · https://www.transit.land/documentation (\"All Transitland APIs require an API key\")",
   "documentation": "https://www.transit.land/documentation",
   "repository": null,
   "apiDescription": "Transit — global GTFS/GTFS-RT/GBFS aggregation & discovery",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "API_KEY",
   "apiKeyRequired": true,
   "oauthRequired": false,
   "credentialState": "NOT_PROVISIONED",
   "credentialCustody": null,
   "freeState": "FREE_KEY_REQUIRED",
   "catalogCostState": "FREE_KEYED",
   "commercialUseState": "Transitland platform terms; underlying feed data per-agency (the per-agency governance of §12.1/§12.2 still applies to the data itself).",
   "rateLimits": "Free tier 10,000 queries/month (documented).",
   "geographicCoverage": "Global (2,500+ agency feeds; feed-dependent).",
   "dataCoverage": "Feeds, operators, routes, stops, departures (static + realtime where agencies publish it), with stable Onestop IDs. The discovery + query layer the raw GTFS records lack.",
   "frontendDirectPossible": false,
   "proxyRequired": true,
   "selfHostable": false,
   "license": "proprietary-terms (free monthly quota; paid options exist)",
   "attribution": "Transitland platform terms + per-agency data attribution.",
   "cachePolicy": "Cache within the 10k/month budget (§13 governor); §12 labeling.",
   "freshnessCharacteristics": "Static + partially live (GTFS-RT-backed departures where available).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: SPECIALIST (transit aggregation/query — owner-credential)",
   "benefitLabels": [
    "NEW COVERAGE",
    "WORLD GLOBE BENEFIT"
   ],
   "existingProviderOverlap": "Transit chain: Mobility Database (discovery) + Transitland (query), both owner-credential; per-agency GTFS / GTFS-RT beneath (catalog §20).",
   "possibleFallbackFor": [
    "transit"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SPECIALIST (transit aggregation/query — owner-credential)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §12.3",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: OWNER-CREDENTIAL-DECISION (Sweep D1) — free key; decision + signup are the owner's.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §12.3 at the stage its recorded evidence supports. Catalog MTI6 STATE: OWNER-CREDENTIAL-DECISION (Sweep D1) — free key; decision + signup are the owner's."
    }
   ],
   "stageNote": "Account acquisition authorized by the owner on 2026-11-16 and queued in the acquisition program; no account exists yet at catalog import, so the candidate waits at RESEARCHING."
  },
  {
   "id": "resource-mobility-database-transit",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Mobility Database API (MobilityData)",
   "provider": "MobilityData (the GTFS/GBFS specification steward)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "transit",
   "category": "TRANSIT",
   "categoryNote": "Feed discovery front door (GTFS / GTFS-RT / GBFS catalog)",
   "capabilities": [
    "transit"
   ],
   "originalSource": "MobilityData (the GTFS/GBFS specification steward) · https://mobilitydatabase.org · API at `api.mobilitydatabase.org/v1`",
   "documentation": "https://mobilitydatabase.org",
   "repository": null,
   "apiDescription": "Transit — feed catalog (discovery)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "OAUTH",
   "apiKeyRequired": false,
   "oauthRequired": true,
   "credentialState": "NOT_PROVISIONED",
   "credentialCustody": null,
   "freeState": "FREE_OAUTH",
   "catalogCostState": "FREE_KEYED (token API) — the CSV variant is FREE_KEYLESS",
   "commercialUseState": "Catalog data published openly by MobilityData (catalog under CC0 per their published materials — re-verify at TESTED); feed contents per-agency.",
   "rateLimits": "None published → UNKNOWN.",
   "geographicCoverage": "Global catalog.",
   "dataCoverage": "Feed metadata, download URLs, providers, locations, license notes, feed status for GTFS Schedule, GTFS Realtime, and GBFS feeds — the *index* from which per-agency feeds are chosen. Metadata only; not vehicles.",
   "frontendDirectPossible": false,
   "proxyRequired": true,
   "selfHostable": false,
   "license": "MobilityData terms (open catalog data)",
   "attribution": "MobilityData (CC0 posture above); feeds per-agency.",
   "cachePolicy": "Periodic refresh (or CSV snapshot) is the natural shape; §12 labeling.",
   "freshnessCharacteristics": "Catalog currency per MobilityData publication.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: SPECIALIST (transit feed discovery — the front door of the transit chain; pairs with §12.3: Mobility Database finds candidate feeds, Transitland queries aggregated data, per-agency records govern actual use)",
   "benefitLabels": [
    "NEW COVERAGE",
    "WORLD GLOBE BENEFIT"
   ],
   "existingProviderOverlap": "Transit chain: Mobility Database (discovery) + Transitland (query), both owner-credential; per-agency GTFS / GTFS-RT beneath (catalog §20).",
   "possibleFallbackFor": [
    "transit"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SPECIALIST (transit feed discovery — the front door of the transit chain; pairs with §12.3: Mobility Database finds candidate feeds, Transitland queries aggregated data, per-agency records govern actual use)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §12.4",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: OWNER-CREDENTIAL-DECISION (Sweep D2).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §12.4 at the stage its recorded evidence supports. Catalog MTI6 STATE: OWNER-CREDENTIAL-DECISION (Sweep D2)."
    }
   ],
   "stageNote": "Account acquisition authorized by the owner on 2026-11-16 and queued in the acquisition program; no account exists yet at catalog import, so the candidate waits at RESEARCHING."
  },
  {
   "id": "resource-osrm-routing",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Project OSRM (routing engine)",
   "provider": "Project OSRM (open-source; public demo operated for the project)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "routing",
   "category": "ROUTING",
   "categoryNote": "Public demo server is demonstration/testing only — production form is self-hosted",
   "capabilities": [
    "routing"
   ],
   "originalSource": "Project OSRM (open-source; public demo operated for the project) · http://project-osrm.org · demo server https://router.project-osrm.org",
   "documentation": "http://project-osrm.org",
   "repository": null,
   "apiDescription": "Routing",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "SELF_HOSTABLE",
   "catalogCostState": "SELF_HOSTABLE",
   "commercialUseState": "Software BSD (2-clause); route results derive from OSM data (ODbL).",
   "rateLimits": "No published quota on the demo; best-effort, abuse is blocked. **The demo server's policy explicitly forbids production use** (no SLA or uptime guarantee).",
   "geographicCoverage": "Global where OSM data exists (demo server: driving profile).",
   "dataCoverage": "HTTP API — route / table / match / trip / nearest — over OpenStreetMap data. Route geometry, duration, distance. Static road network; **no traffic**.",
   "frontendDirectPossible": null,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "Open-source (BSD); OSM data ODbL",
   "attribution": "© OpenStreetMap contributors.",
   "cachePolicy": "Cache routes per §12/§13 discipline; viewport movement must never fire unlimited requests (§13 governor).",
   "freshnessCharacteristics": "Static network data (OSM edit state); not live.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (sole routing candidate; self-host is its production form)",
   "benefitLabels": [
    "SELF-HOSTABLE",
    "NO KEY REQUIRED",
    "WORLD GLOBE BENEFIT"
   ],
   "existingProviderOverlap": "Routing: OSRM self-host is the only governed candidate; no production routing exists today (catalog §19.3).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (sole routing candidate; self-host is its production form)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [
    "resource-gap-production-routing"
   ],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §13.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Source Catalog #3) — no routing exists in the app today.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §13.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Source Catalog #3) — no routing exists in the app today."
    }
   ]
  },
  {
   "id": "resource-windy-webcams",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Windy Webcams API",
   "provider": "Windy (Windy.com)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "cameras-media",
   "category": "WEBCAMS",
   "categoryNote": "Key may not be published — proxy custody mandatory",
   "capabilities": [
    "cameras-media"
   ],
   "originalSource": "Windy (Windy.com) · Webcams API https://api.windy.com/webcams/ · terms: https://account.windy.com/agreements/windy-webcams-api-terms-of-use",
   "documentation": "https://api.windy.com/webcams/",
   "repository": null,
   "apiDescription": "Public cameras / webcams (global webcam discovery)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "API_KEY",
   "apiKeyRequired": true,
   "oauthRequired": false,
   "credentialState": "NOT_PROVISIONED",
   "credentialCustody": null,
   "freeState": "FREEMIUM",
   "catalogCostState": "FREEMIUM",
   "commercialUseState": "Per the proprietary API terms (Free / Professional versions).",
   "rateLimits": "Not published in the API spec (UNVERIFIED figure); tier-dependent.",
   "geographicCoverage": "Global (density varies; strong in Europe/tourism areas). One of the largest webcam catalogs (tens of thousands of cameras).",
   "dataCoverage": "REST API v3 — webcam search by location/category; per-webcam metadata, current image URLs, timelapse/player embeds. Near-live refreshed stills + player embeds (not raw live video); free tier returns low-resolution images only; free-tier image URLs are tokenized and short-lived (reported ~10 minutes) — images must be fetched through fresh API calls, not long-cached.",
   "frontendDirectPossible": false,
   "proxyRequired": true,
   "selfHostable": false,
   "license": "proprietary-terms (free tier exists; Professional tier price UNVERIFIED in the sources)",
   "attribution": "Mandatory per API terms (\"Webcams provided by windy.com\" with links, incl. an add-webcam link).",
   "cachePolicy": "Re-query rather than cache (provider posture); short-lived image URLs enforce this.",
   "freshnessCharacteristics": "Near-live refreshed stills; availability changes frequently — re-query rather than cache.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (OWNER-CREDENTIAL) — the governed-API path for webcams; the PRIMARY-shaped option inside its family once the owner decides",
   "benefitLabels": [
    "NEW COVERAGE"
   ],
   "existingProviderOverlap": "Cameras / street imagery / media family — no governed keyless source is connected today (catalog §§14, 19.2).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (OWNER-CREDENTIAL) — the governed-API path for webcams; the PRIMARY-shaped option inside its family once the owner decides",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [
    "resource-gap-live-webcams"
   ],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §14.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: AUTH_REQUIRED (Source Catalog #5) — no key has been requested (credentials are a reserved owner decision) and nothing is wired.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §14.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: AUTH_REQUIRED (Source Catalog #5) — no key has been requested (credentials are a reserved owner decision) and nothing is wired."
    }
   ]
  },
  {
   "id": "resource-kartaview-street-imagery",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "KartaView (street-level imagery)",
   "provider": "Grab (GrabMaps)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "cameras-media",
   "category": "STREET_IMAGERY",
   "categoryNote": "Only keyless governed street-imagery door in the catalog",
   "capabilities": [
    "cameras-media"
   ],
   "originalSource": "Grab (GrabMaps) · https://kartaview.org/doc/ · API at api.openstreetcam.org (https://api.openstreetcam.org/api/doc.html)",
   "documentation": "https://kartaview.org/doc/",
   "repository": null,
   "apiDescription": "Street imagery (crowdsourced; formerly OpenStreetCam)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS (with hourly limits)",
   "commercialUseState": "Imagery and spatial data **CC BY-SA 4.0**; platform code MIT. Provider may suspend access; accuracy not guaranteed.",
   "rateLimits": "**100 requests/hour public; 1,000 requests/hour with a token.**",
   "geographicCoverage": "Global but **uneven, community-dependent** — strongest in Southeast Asia; sparse in many US areas (secondary-source assessment). Coverage unevenness is the main fitness question for US-centric use.",
   "dataCoverage": "REST API 2.0 — photo/sequence search by lat/lng + radius and by bounding box; coverage tiles. Photos carry position, time, heading, GPS accuracy, processed-image URLs.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "Open imagery platform terms recorded in catalog",
   "attribution": "\"© Grab and KartaView Contributors\" style credit.",
   "cachePolicy": "Within the hourly limits; §12 labeling with capture time.",
   "freshnessCharacteristics": "Recorded imagery (capture time per photo) — never \"live\".",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (the only keyless governed street-imagery door — designated PRIMARY for street imagery when wired)",
   "benefitLabels": [
    "NEW COVERAGE",
    "NO KEY REQUIRED",
    "OPEN DATA"
   ],
   "existingProviderOverlap": "Cameras / street imagery / media family — no governed keyless source is connected today (catalog §§14, 19.2).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (the only keyless governed street-imagery door — designated PRIMARY for street imagery when wired)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §14.2",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Source Catalog #6).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §14.2 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Source Catalog #6)."
    }
   ]
  },
  {
   "id": "resource-mapillary-street-imagery",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Mapillary (+ MapillaryJS)",
   "provider": "Mapillary (Meta)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "cameras-media",
   "category": "STREET_IMAGERY",
   "categoryNote": "Token required for all API/tile calls",
   "capabilities": [
    "cameras-media"
   ],
   "originalSource": "Mapillary (Meta) · https://www.mapillary.com/developer/api-documentation · developer dashboard https://www.mapillary.com/dashboard/developers",
   "documentation": "https://www.mapillary.com/developer/api-documentation",
   "repository": null,
   "apiDescription": "Street imagery + derived map features",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "API_KEY",
   "apiKeyRequired": true,
   "oauthRequired": false,
   "credentialState": "NOT_PROVISIONED",
   "credentialCustody": null,
   "freeState": "FREE_KEY_REQUIRED",
   "catalogCostState": "FREE_KEYED",
   "commercialUseState": "Imagery shared under **CC BY-SA 4.0** (platform terms; **UNVERIFIED** in the Source Catalog pass against the current terms text — re-check at integration).",
   "rateLimits": "~50,000 requests/minute per app on graph endpoints; ~50,000/day on tiles (secondary capture of the docs — re-verify at integration).",
   "geographicCoverage": "Global, crowdsourced (strong in many metro areas; varies).",
   "dataCoverage": "API v4 entity endpoints (graph.mapillary.com) + vector tiles (tiles.mapillary.com); MapillaryJS open-source viewer for street-level playback. Photos + machine-generated map features; sequences traversable in the viewer.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "proprietary-terms (free token)",
   "attribution": "Mapillary attribution required on imagery/views.",
   "cachePolicy": "Per Mapillary developer terms; §12 labeling with capture time.",
   "freshnessCharacteristics": "Recorded imagery (capture time per image).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (OWNER-CREDENTIAL) — the depth option behind KartaView for street imagery",
   "benefitLabels": [
    "FALLBACK VALUE",
    "BETTER COVERAGE"
   ],
   "existingProviderOverlap": "Cameras / street imagery / media family — no governed keyless source is connected today (catalog §§14, 19.2).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (OWNER-CREDENTIAL) — the depth option behind KartaView for street imagery",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §14.3",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: AUTH_REQUIRED (Source Catalog #7) — free but token-gated; no token has been requested.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §14.3 at the stage its recorded evidence supports. Catalog MTI6 STATE: AUTH_REQUIRED (Source Catalog #7) — free but token-gated; no token has been requested."
    }
   ]
  },
  {
   "id": "resource-nyc-dot-traffic-cameras",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "NYC DOT (traffic cameras + NYC open data)",
   "provider": "New York City Department of Transportation",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "cameras-media",
   "category": "TRAFFIC_CAMERAS",
   "categoryNote": "Developer camera feed is agreement-gated (data-sharing agreement)",
   "capabilities": [
    "cameras-media"
   ],
   "originalSource": "New York City Department of Transportation · \"Data Feeds, Dashboards & Open Data\" page (nyc.gov); camera map published at webcams.nyctmc.org (third-party-reported catalog of ~980 cameras across the five boroughs)",
   "documentation": null,
   "repository": null,
   "apiDescription": "Traffic cameras / road data (official)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "OWNER_ACCOUNT",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NOT_PROVISIONED",
   "credentialCustody": null,
   "freeState": "UNKNOWN",
   "catalogCostState": "OWNER_ACCOUNT_REQUIRED (data-sharing agreement)",
   "commercialUseState": "Per agreement / NYC Open Data terms.",
   "rateLimits": "Not published (UNVERIFIED).",
   "geographicCoverage": "New York City.",
   "dataCoverage": "Traffic cameras (**refreshed stills, not live video**) + NYC open-data datasets. Do not treat the public viewing page as a developer API.",
   "frontendDirectPossible": null,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "NYC DOT data-sharing agreement (terms review required)",
   "attribution": "Per agreement / NYC Open Data terms.",
   "cachePolicy": "Per agreement; Socrata datasets per city open-data terms.",
   "freshnessCharacteristics": "Refreshed stills (§20 media-state honesty: REFRESHED STILL, never LIVE).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "TERMS_REVIEW_REQUIRED",
    "note": "Terms/agreement review is the gate for this source (catalog MTI6 STATE: TERMS_REVIEW_REQUIRED). It cannot advance past the terms gate while this stands.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (terms/agreement-gated — one jurisdiction's official camera door)",
   "benefitLabels": [
    "BETTER SOURCE AUTHORITY",
    "NEW COVERAGE"
   ],
   "existingProviderOverlap": "Cameras / street imagery / media family — no governed keyless source is connected today (catalog §§14, 19.2).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (terms/agreement-gated — one jurisdiction's official camera door)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [
    "resource-gap-realtime-traffic"
   ],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §14.4",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: TERMS_REVIEW_REQUIRED (Source Catalog #14) — nothing may be wired until terms are reviewed and the owner approves the route.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §14.4 at the stage its recorded evidence supports. Catalog MTI6 STATE: TERMS_REVIEW_REQUIRED (Source Catalog #14) — nothing may be wired until terms are reviewed and the owner approves the route."
    }
   ]
  },
  {
   "id": "resource-dot-511-traffic-feeds",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "511 systems / state & provincial DOT feeds (family)",
   "provider": "State/provincial transportation agencies (511NY, FL511, Ontario 511, etc.) — there is **no single 511 API**; each system publishes its own developer page.",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "traffic",
   "category": "TRAFFIC",
   "categoryNote": "A FAMILY of per-jurisdiction feeds — each member must be researched and governed individually; 511NY-specific facts are UNVERIFIED in the sources",
   "capabilities": [
    "traffic"
   ],
   "originalSource": "State/provincial transportation agencies (511NY, FL511, Ontario 511, etc.) — there is **no single 511 API**; each system publishes its own developer page.",
   "documentation": null,
   "repository": null,
   "apiDescription": "Traffic / traveler information (cameras, incidents, road weather, closures)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "UNKNOWN",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "UNKNOWN",
   "credentialCustody": null,
   "freeState": "UNKNOWN",
   "catalogCostState": "UNKNOWN (varies per jurisdiction — keyless → free-keyed → consent-only)",
   "commercialUseState": "Per-jurisdiction — a \"511\" label never implies uniform rights.",
   "rateLimits": "Per-jurisdiction (UNVERIFIED as a family).",
   "geographicCoverage": "Per state/province.",
   "dataCoverage": "Cameras (refreshed stills), incidents, road weather, closures via GIS-layer feeds; incident-along-route possible consumer-side.",
   "frontendDirectPossible": null,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "UNKNOWN (varies per jurisdiction)",
   "attribution": "Per-jurisdiction.",
   "cachePolicy": "Per-jurisdiction; §12 labeling.",
   "freshnessCharacteristics": "Live incidents/alerts; cameras REFRESHED STILL.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (a family of per-jurisdiction candidates — each member must be researched and governed individually before any activation; 511NY-specific API/key facts are UNVERIFIED in the sources)",
   "benefitLabels": [
    "BETTER SOURCE AUTHORITY",
    "NEW COVERAGE"
   ],
   "existingProviderOverlap": "Traffic arrives jurisdiction-by-jurisdiction only; no unified source exists (catalog §19.4).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (a family of per-jurisdiction candidates — each member must be researched and governed individually before any activation; 511NY-specific API/key facts are UNVERIFIED in the sources)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "DISCOVERED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [
    "resource-gap-realtime-traffic"
   ],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §14.5",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Source Catalog #15).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "DISCOVERED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §14.5 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Source Catalog #15)."
    }
   ]
  },
  {
   "id": "resource-public-webcam-networks",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Public webcam networks (EarthCam, SkylineWebcams, and similar directories)",
   "provider": "Each network's own site/terms — **no official public developer API was found for the major directories** in the Source Catalog research pass (UNVERIFIED — absence of evidence; re-check per network before ruling any out). The sweep's GitHub search for an open-source webcam directory/API project returned **zero results** (2026-11-16): no governed open alternative exists.",
   "formerName": null,
   "resourceType": "PUBLIC_WEB",
   "domain": "cameras-media",
   "category": "WEBCAMS",
   "categoryNote": "Directories publish no official developer API; sanctioned embeds only, per network, after terms review. No scraping path exists or will be built",
   "capabilities": [
    "cameras-media"
   ],
   "originalSource": "Each network's own site/terms — **no official public developer API was found for the major directories** in the Source Catalog research pass (UNVERIFIED — absence of evidence; re-check per network before ruling any out). The sweep's GitHub search for an open-source webcam directory/API project returned **zero results** (2026-11-16): no governed open alternative exists.",
   "documentation": null,
   "repository": null,
   "apiDescription": "Public cameras / webcams (directories)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "UNKNOWN",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "UNKNOWN",
   "credentialCustody": null,
   "freeState": "UNKNOWN",
   "catalogCostState": "UNKNOWN (no developer program/pricing documented)",
   "commercialUseState": "Per-network terms; camera owners retain rights in their feeds.",
   "rateLimits": "N/A (no API documented).",
   "geographicCoverage": "Global, tourism-heavy.",
   "dataCoverage": "Consumer viewing sites; many feeds are genuine live streams (label per item); embedding, where offered, is via each network's own player/terms. On-site search only; no governed machine search documented.",
   "frontendDirectPossible": null,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "UNKNOWN (no developer program documented)",
   "attribution": "Per-network terms.",
   "cachePolicy": "Hot-linking/scraping is prohibited territory under §29 and typical site terms; sanctioned embeds only, per network terms.",
   "freshnessCharacteristics": "Per feed (live streams vs refreshed stills — labeled per item, §20).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "TERMS_REVIEW_REQUIRED",
    "note": "Terms/agreement review is the gate for this source (catalog MTI6 STATE: TERMS_REVIEW_REQUIRED). It cannot advance past the terms gate while this stands.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (terms-review only — usable, if at all, through each network's sanctioned embed path after a terms review; Windy §14.1 is the governed-API alternative for the same family)",
   "benefitLabels": [
    "NEW COVERAGE"
   ],
   "existingProviderOverlap": "Cameras / street imagery / media family — no governed keyless source is connected today (catalog §§14, 19.2).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (terms-review only — usable, if at all, through each network's sanctioned embed path after a terms review; Windy §14.1 is the governed-API alternative for the same family)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "DISCOVERED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [
    "resource-gap-live-webcams"
   ],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §14.6",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: TERMS_REVIEW_REQUIRED (Source Catalog #19).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "DISCOVERED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §14.6 at the stage its recorded evidence supports. Catalog MTI6 STATE: TERMS_REVIEW_REQUIRED (Source Catalog #19)."
    }
   ]
  },
  {
   "id": "resource-youtube-video",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "YouTube (official APIs + embeds)",
   "provider": "YouTube (Google)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "cameras-media",
   "category": "PUBLIC_VIDEO",
   "categoryNote": "Data API is quota-managed (10,000 units/day; search costs 100 units)",
   "capabilities": [
    "cameras-media"
   ],
   "originalSource": "YouTube (Google) · Data API v3 + IFrame Player API (developers.google.com/youtube); API base `www.googleapis.com/youtube/v3`, oEmbed `https://www.youtube.com/oembed`, player `https://www.youtube.com/iframe_api`",
   "documentation": "https://www.youtube.com/oembed`",
   "repository": null,
   "apiDescription": "Video (recorded; some live streams) — discovery + playback",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "API_KEY",
   "apiKeyRequired": true,
   "oauthRequired": false,
   "credentialState": "NOT_PROVISIONED",
   "credentialCustody": null,
   "freeState": "FREE_KEY_REQUIRED",
   "catalogCostState": "FREE_KEYED (quota-managed)",
   "commercialUseState": "Per YouTube Terms of Service + API Services Terms (no downloading/caching of content; metadata retention limits apply; Developer Policies govern API clients).",
   "rateLimits": "Default quota **10,000 units/day** per project; `search.list` costs **100 units** per call (≈100 searches/day at default quota) — search is the expensive operation and must be cached/governed.",
   "geographicCoverage": "Global (content availability varies by rights holder).",
   "dataCoverage": "Search/discovery/metadata (Data API, incl. location search); playback of known videos (embeds). Livestreams exist but must be labeled per §20 and verified per item; default state is RECORDED VIDEO. (oEmbed no longer returns author/thumbnail fields since Nov 2025, per changelog reporting — verify at integration.)",
   "frontendDirectPossible": null,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "YouTube API Services terms",
   "attribution": "YouTube branding/attribution rules apply to API clients.",
   "cachePolicy": "No content caching (terms); metadata within retention limits; search results cached/governed under the quota.",
   "freshnessCharacteristics": "Per item (recorded vs live stream, labeled).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (OWNER-CREDENTIAL) — the video-discovery door; keyless embeds alone cannot power discovery",
   "benefitLabels": [
    "NEW COVERAGE"
   ],
   "existingProviderOverlap": "Cameras / street imagery / media family — no governed keyless source is connected today (catalog §§14, 19.2).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (OWNER-CREDENTIAL) — the video-discovery door; keyless embeds alone cannot power discovery",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §14.7",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: AUTH_REQUIRED (Source Catalog #16) — no project/key exists.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §14.7 at the stage its recorded evidence supports. Catalog MTI6 STATE: AUTH_REQUIRED (Source Catalog #16) — no project/key exists."
    }
   ]
  },
  {
   "id": "resource-meta-facebook",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Meta / Facebook official capabilities",
   "provider": "Meta",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "social-media",
   "category": "SOCIAL_VIDEO",
   "categoryNote": "Official capabilities only, scoped to owner-authorized assets; app registration + review",
   "capabilities": [
    "social-media"
   ],
   "originalSource": "Meta · Meta for Developers — Graph API / Facebook Login / oEmbed documentation (developers.facebook.com)",
   "documentation": null,
   "repository": null,
   "apiDescription": "Social / public content (Pages, public video, embeds)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "OWNER_ACCOUNT",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NOT_PROVISIONED",
   "credentialCustody": null,
   "freeState": "UNKNOWN",
   "catalogCostState": "OWNER_ACCOUNT_REQUIRED (app registration + review)",
   "commercialUseState": "Meta Platform Terms + Developer Policies; **no scraping** — the §29 bot web boundary rules out every non-official path.",
   "rateLimits": "Per-app, per-token call/hour models (specifics UNVERIFIED in the sources).",
   "geographicCoverage": "Global platform; content access is permission-scoped, not geography-scoped.",
   "dataCoverage": "Graph API for Pages and authorized content; oEmbed for public post/video embeds. **No general public-content search API for third parties** (UNVERIFIED as a blanket statement — Meta has removed/restricted such surfaces repeatedly; treat discovery as unavailable until a specific documented surface is verified).",
   "frontendDirectPossible": null,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "Meta platform terms (review-gated)",
   "attribution": "Per Meta Platform Terms; embeds must remain intact.",
   "cachePolicy": "Per Meta Platform Terms.",
   "freshnessCharacteristics": "Per item (Page live videos exist, permission-scoped).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "TERMS_REVIEW_REQUIRED",
    "note": "Terms/agreement review is the gate for this source (catalog MTI6 STATE: TERMS_REVIEW_REQUIRED). It cannot advance past the terms gate while this stands.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (terms-review — official-only, scoped to authorized assets)",
   "benefitLabels": [
    "NEW COVERAGE"
   ],
   "existingProviderOverlap": "Social media family — official capabilities only, owner-account gated (catalog §§14.8-14.9).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (terms-review — official-only, scoped to authorized assets)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §14.8",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: TERMS_REVIEW_REQUIRED (Source Catalog #17) — no app registration exists and none may be created without owner approval.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §14.8 at the stage its recorded evidence supports. Catalog MTI6 STATE: TERMS_REVIEW_REQUIRED (Source Catalog #17) — no app registration exists and none may be created without owner approval."
    }
   ]
  },
  {
   "id": "resource-instagram",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Instagram official capabilities",
   "provider": "Meta (Instagram)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "social-media",
   "category": "SOCIAL_VIDEO",
   "categoryNote": "Professional-account-scoped, review-gated; Basic Display API was retired 2024-12-04",
   "capabilities": [
    "social-media"
   ],
   "originalSource": "Meta (Instagram) · Meta for Developers — Instagram API documentation (developers.facebook.com)",
   "documentation": null,
   "repository": null,
   "apiDescription": "Social / public content (media, embeds)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "OWNER_ACCOUNT",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NOT_PROVISIONED",
   "credentialCustody": null,
   "freeState": "UNKNOWN",
   "catalogCostState": "OWNER_ACCOUNT_REQUIRED (app registration + review)",
   "commercialUseState": "Meta Platform Terms; embeds must remain intact.",
   "rateLimits": "oEmbed ~1,000 requests/hour.",
   "geographicCoverage": "Global platform; permission-scoped.",
   "dataCoverage": "Authorized-account media (photos, Reels) via the API; single-post embeds via oEmbed. No public discovery search for third parties; hashtag/media surfaces are permission-scoped. No third-party live surface.",
   "frontendDirectPossible": null,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "Meta/Instagram platform terms (review-gated)",
   "attribution": "Per Meta Platform Terms.",
   "cachePolicy": "Per Meta Platform Terms.",
   "freshnessCharacteristics": "Per item.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "TERMS_REVIEW_REQUIRED",
    "note": "Terms/agreement review is the gate for this source (catalog MTI6 STATE: TERMS_REVIEW_REQUIRED). It cannot advance past the terms gate while this stands.",
    "at": "2026-11-16T00:00:00.000Z",
    "by": "WORKER:catalog-import"
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (terms-review — professional-account-scoped, review-gated)",
   "benefitLabels": [
    "NEW COVERAGE"
   ],
   "existingProviderOverlap": "Social media family — official capabilities only, owner-account gated (catalog §§14.8-14.9).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (terms-review — professional-account-scoped, review-gated)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §14.9",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: TERMS_REVIEW_REQUIRED (Source Catalog #18) — nothing is registered or connected.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §14.9 at the stage its recorded evidence supports. Catalog MTI6 STATE: TERMS_REVIEW_REQUIRED (Source Catalog #18) — nothing is registered or connected."
    }
   ]
  },
  {
   "id": "resource-nasa-earthdata-imagery",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "NASA Earth observation (Earthdata / GIBS imagery)",
   "provider": "NASA (Earthdata program; Global Imagery Browse Services — GIBS)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "earth-observation",
   "category": "SATELLITE_EO",
   "categoryNote": "Imagery base layer; GIBS posture UNVERIFIED in the sources; never label as live satellite",
   "capabilities": [
    "earth-observation"
   ],
   "originalSource": "NASA (Earthdata program; Global Imagery Browse Services — GIBS)",
   "documentation": null,
   "repository": null,
   "apiDescription": "Satellite / Earth observation imagery",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "API_KEY",
   "apiKeyRequired": true,
   "oauthRequired": false,
   "credentialState": "NOT_PROVISIONED",
   "credentialCustody": null,
   "freeState": "FREE_KEY_REQUIRED",
   "catalogCostState": "FREE_KEYED (free Earthdata Login for downloads; GIBS posture UNVERIFIED)",
   "commercialUseState": "NASA Earth science data is generally open (no copyright, with attribution norms) — per-product terms vary; UNVERIFIED per-product in the sources.",
   "rateLimits": "Per-service; not captured in the sources (UNVERIFIED).",
   "geographicCoverage": "Global.",
   "dataCoverage": "Satellite browse imagery via map services (point/bounds + temporal search); science datasets via Earthdata download.",
   "frontendDirectPossible": null,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "NASA Earthdata terms (free Earthdata Login for downloads)",
   "attribution": "\"NASA\" credit per product.",
   "cachePolicy": "Per Earthdata terms of use / per-service; §12 labeling with product time.",
   "freshnessCharacteristics": "**SATELLITE OBSERVATION** — near-real-time products are hours old, never \"live\".",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (the imagery base layer of this family)",
   "benefitLabels": [
    "NEW COVERAGE",
    "OPEN DATA"
   ],
   "existingProviderOverlap": "Earth observation: GIBS candidate base, FIRMS keyed specialist, EONET events layer (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (the imagery base layer of this family)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §15.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Source Catalog #12) — nothing NASA-derived exists in the app.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §15.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Source Catalog #12) — nothing NASA-derived exists in the app."
    }
   ]
  },
  {
   "id": "resource-nasa-firms-fire",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "NASA FIRMS (active fire detection)",
   "provider": "NASA FIRMS (Fire Information for Resource Management System; MODIS/VIIRS/Landsat)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "earth-observation",
   "category": "FIRE",
   "categoryNote": "Free MAP_KEY with transaction quota; proxy-mandatory per catalog (key in request)",
   "capabilities": [
    "earth-observation"
   ],
   "originalSource": "NASA FIRMS (Fire Information for Resource Management System; MODIS/VIIRS/Landsat) · MAP_KEY signup: https://firms.modaps.eosdis.nasa.gov/api/map_key · API index: https://firms.modaps.eosdis.nasa.gov/api/",
   "documentation": "https://firms.modaps.eosdis.nasa.gov/api/map_key",
   "repository": null,
   "apiDescription": "Earth observation — events (wildfire detection)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "API_KEY",
   "apiKeyRequired": true,
   "oauthRequired": false,
   "credentialState": "NOT_PROVISIONED",
   "credentialCustody": null,
   "freeState": "FREE_KEY_REQUIRED",
   "catalogCostState": "FREE_KEYED",
   "commercialUseState": "NASA open-data norms; FIRMS data use terms apply.",
   "rateLimits": "**5,000 transactions per 10-minute window** per MAP_KEY.",
   "geographicCoverage": "Global.",
   "dataCoverage": "Area/data-availability APIs (CSV/JSON), WMS/WFS map services, KML fire footprints. Detections carry confidence, FRP, satellite/time. (NRT products carry processing caveats; the sensor line-up changes over time — e.g. a Suomi NPP delivery end was announced for Nov 2, 2026 — confirm active sources at integration.)",
   "frontendDirectPossible": false,
   "proxyRequired": true,
   "selfHostable": false,
   "license": "NASA FIRMS terms (free key)",
   "attribution": "Credit \"NASA FIRMS\" with a link back.",
   "cachePolicy": "Within the transaction budget; §12 labeling with detection time.",
   "freshnessCharacteristics": "Near-real-time — global within ~3 hours; ultra-real-time within ~60 seconds (US/Canada). Label **NEAR-LIVE**.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: SPECIALIST (highest-resolution fire detection, behind EONET in the natural-events chain, §5)",
   "benefitLabels": [
    "BETTER FRESHNESS",
    "NEW COVERAGE"
   ],
   "existingProviderOverlap": "Earth observation: GIBS candidate base, FIRMS keyed specialist, EONET events layer (catalog §20).",
   "possibleFallbackFor": [
    "earth-observation"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SPECIALIST (highest-resolution fire detection, behind EONET in the natural-events chain, §5)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §15.2",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: AUTH_REQUIRED (Source Catalog #13) — free key, but a key nonetheless; none has been requested.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §15.2 at the stage its recorded evidence supports. Catalog MTI6 STATE: AUTH_REQUIRED (Source Catalog #13) — free key, but a key nonetheless; none has been requested."
    }
   ]
  },
  {
   "id": "resource-openstreetmap-data",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "OpenStreetMap data (geographic foundation)",
   "provider": "OpenStreetMap Foundation (OSMF) / contributor community",
   "formerName": null,
   "resourceType": "OPEN_DATA",
   "domain": "maps-foundation",
   "category": "GEOGRAPHIC_DATA",
   "categoryNote": "Geographic foundation; the app today vendors Natural Earth + Census data instead",
   "capabilities": [
    "maps-foundation"
   ],
   "originalSource": "OpenStreetMap Foundation (OSMF) / contributor community · OSMF policy pages (operations.osmfoundation.org)",
   "documentation": null,
   "repository": null,
   "apiDescription": "Geographic data (foundation dataset)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS (open data; hosted tile service is policy-limited, not a free service)",
   "commercialUseState": "Data under **ODbL** (attribution + share-alike for derivative databases) — commercial use permitted under the licence; the tile *service* restrictions above are separate.",
   "rateLimits": "Tile service is best-effort, no SLA. **Tile usage policy (verified):** no heavy use, no bulk downloading/pre-fetching, no offline use of tile.openstreetmap.org, no missing attribution; access can be blocked without notice. \"Open data is not a free service\": the data is free; the OSMF servers are a limited, donation-funded resource.",
   "geographicCoverage": "Global, crowdsourced (density varies by region).",
   "dataCoverage": "Downloadable extracts (planet/regional) and community services (standard tiles, vector tiles); rich feature tagging (metadata). Geographic queries belong to companion services (Nominatim §3.3, OSRM §13.1, Overpass §16.3), not the dataset itself.",
   "frontendDirectPossible": null,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "ODbL-1.0",
   "attribution": "\"© OpenStreetMap contributors\" — a legal requirement, visibly on the map.",
   "cachePolicy": "Extracts are self-held by design; OSMF tiles must not be bulk-cached (policy above).",
   "freshnessCharacteristics": "Continuously edited (extract cadence per provider of the extract).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (foundation — the leading candidate if street-level geography is ever built)",
   "benefitLabels": [
    "OPEN DATA",
    "SELF-HOSTABLE",
    "WORLD GLOBE BENEFIT"
   ],
   "existingProviderOverlap": "Geographic foundation: OSM data + MapLibre component candidates over the vendored Natural Earth + Census base in-app today (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (foundation — the leading candidate if street-level geography is ever built)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §16.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Source Catalog #2) — the app today vendors Natural Earth + Census data, not OSM.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §16.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Source Catalog #2) — the app today vendors Natural Earth + Census data, not OSM."
    }
   ]
  },
  {
   "id": "resource-maplibre-gl-js",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOFTWARE",
   "name": "MapLibre GL JS",
   "provider": "MapLibre (community open-source project, Linux Foundation charter)",
   "formerName": null,
   "resourceType": "GITHUB_PROJECT",
   "domain": "maps-foundation",
   "category": "MAPS",
   "categoryNote": "Renderer component (software), not a data source; adoption is a reserved framework decision",
   "capabilities": [
    "maps-foundation"
   ],
   "originalSource": "MapLibre (community open-source project, Linux Foundation charter) · https://maplibre.org/maplibre-gl-js/docs/API/",
   "documentation": "https://maplibre.org/maplibre-gl-js/docs/API/",
   "repository": "https://github.com/maplibre/maplibre-gl-js",
   "apiDescription": "Maps — globe/map rendering library (**a component, not a data source**)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS (open-source library; cost, if any, sits in the tile source)",
   "commercialUseState": "Yes (BSD-3-Clause); tile-source terms apply separately.",
   "rateLimits": "None for the library; tile-source limits apply.",
   "geographicCoverage": "Global (whatever the chosen tile source covers).",
   "dataCoverage": "WebGL vector-tile renderer; renders GeoJSON/vector metadata supplied by other sources. No live/photo/street/video capability of its own.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "Open-source (MapLibre terms)",
   "attribution": "Per the tile source used (e.g. © OpenStreetMap contributors).",
   "cachePolicy": "Per tile source.",
   "freshnessCharacteristics": "N/A (renderer).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (renderer component — adoption is a reserved framework decision)",
   "benefitLabels": [
    "SELF-HOSTABLE",
    "NO KEY REQUIRED"
   ],
   "existingProviderOverlap": "Geographic foundation: OSM data + MapLibre component candidates over the vendored Natural Earth + Census base in-app today (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (renderer component — adoption is a reserved framework decision)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §16.2",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Source Catalog #1) — not present in the app (grep-verified).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §16.2 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Source Catalog #1) — not present in the app (grep-verified)."
    }
   ]
  },
  {
   "id": "resource-overpass-api",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOURCE",
   "name": "Overpass API (OpenStreetMap query service)",
   "provider": "Overpass API public instances (community-operated; `overpass-api.de`)",
   "formerName": null,
   "resourceType": "OFFICIAL_API",
   "domain": "maps-foundation",
   "category": "GEOGRAPHIC_DATA",
   "categoryNote": "Area-content queries over OSM data (SEARCH THIS AREA for real-world features)",
   "capabilities": [
    "maps-foundation"
   ],
   "originalSource": "Overpass API public instances (community-operated; `overpass-api.de`) · https://wiki.openstreetmap.org/wiki/Overpass_API",
   "documentation": "https://wiki.openstreetmap.org/wiki/Overpass_API",
   "repository": null,
   "apiDescription": "Geographic data — query (OSM features by area)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_WITH_LIMITS",
   "catalogCostState": "FREE_WITH_LIMITS",
   "commercialUseState": "Data under ODbL (attribution + share-alike).",
   "rateLimits": "Instance-enforced quotas (per-IP slots/quotas on the public instances; figures vary by instance → UNKNOWN with the policy noted). Public instances are a shared community resource — **no heavy/bulk querying**; queries are expected to be small and area-bounded; abusive use is blocked.",
   "geographicCoverage": "Global (OSM).",
   "dataCoverage": "Read-only query engine over the full OSM database — \"all {feature} within {radius/bbox}\" for arbitrary OSM tags (fuel stations, hospitals, EV chargers, parks, cameras tagged in OSM, …), returned as JSON/XML with full tag sets.",
   "frontendDirectPossible": true,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "ODbL-1.0 (OSM data); Overpass usage policy",
   "attribution": "© OpenStreetMap contributors (ODbL).",
   "cachePolicy": "Small, user-triggered, area-bounded queries only; cache results per §12 — query discipline is a design requirement, not an afterthought.",
   "freshnessCharacteristics": "Reference/POI data (freshness = OSM edit state; label \"OpenStreetMap data\").",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: SPECIALIST (candidate) — \"what is near here in the open map\": the deepest legitimate area-content source available without a key (SEARCH THIS AREA for real-world features)",
   "benefitLabels": [
    "NEW COVERAGE",
    "NO KEY REQUIRED",
    "OPEN DATA"
   ],
   "existingProviderOverlap": "Geographic foundation: OSM data + MapLibre component candidates over the vendored Natural Earth + Census base in-app today (catalog §20).",
   "possibleFallbackFor": [
    "maps-foundation"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "SPECIALIST (candidate) — \"what is near here in the open map\": the deepest legitimate area-content source available without a key (SEARCH THIS AREA for real-world features)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "TESTED",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §16.3",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep C16).",
     "at": "2026-11-16T00:00:00.000Z"
    },
    {
     "kind": "ENDPOINT_PROBE",
     "ref": "API-DISCOVERY-SWEEP-2026-11-16",
     "note": "Sweep probe 2026-11-16: HTTP 406 — CORS posture recorded as documented-not-measured; endpoint reachable, query contract to confirm at wiring time.",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "TESTED",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §16.3 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep C16)."
    }
   ]
  },
  {
   "id": "resource-photon-software-geocoding",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOFTWARE",
   "name": "Photon (komoot/photon) — the geocoder software",
   "provider": "Komoot (open-source project)",
   "formerName": null,
   "resourceType": "GITHUB_PROJECT",
   "domain": "geocoding",
   "category": "GEOCODING",
   "categoryNote": "The geocoder SOFTWARE (self-host rung of the geocoding chain) — distinct from the public instance record",
   "capabilities": [
    "geocoding"
   ],
   "originalSource": "Komoot (open-source project) · https://github.com/komoot/photon — the software behind the public instance at §3.2",
   "documentation": "https://github.com/komoot/photon",
   "repository": "https://github.com/komoot/photon",
   "apiDescription": "Geocoding (self-hostable software)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "SELF_HOSTABLE",
   "catalogCostState": "SELF_HOSTABLE",
   "commercialUseState": "Yes under Apache-2.0 (software); data remains OSM/ODbL.",
   "rateLimits": "Self-imposed (own infrastructure); planet/country extracts downloadable.",
   "geographicCoverage": "Global (OSM extracts).",
   "dataCoverage": "Self-hostable geocoder for OpenStreetMap data (Elasticsearch-backed; Java service).",
   "frontendDirectPossible": false,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "Apache-2.0",
   "attribution": "© OpenStreetMap contributors (data).",
   "cachePolicy": "Operator-defined.",
   "freshnessCharacteristics": "Per extract refresh (operator-run).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: TERTIARY (the §5 geocoding chain's self-host rung, when a backend phase is owner-approved)",
   "benefitLabels": [
    "SELF-HOSTABLE",
    "FALLBACK VALUE",
    "OPEN DATA"
   ],
   "existingProviderOverlap": "Shares the geocoding chain: Open-Meteo Geocoding PRIMARY, Photon instance SECONDARY candidate, self-hosted Photon / Nominatim tertiary rungs, LocationIQ + Geoapify keyed rungs (catalog §20).",
   "possibleFallbackFor": [
    "geocoding"
   ],
   "possibleReplacementFor": [],
   "fallbackRole": "TERTIARY (the §5 geocoding chain's self-host rung, when a backend phase is owner-approved)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [
    "resource-gap-geocoding-fallback"
   ],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §17.1",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep S1) — actively maintained (3,196 stars; last push 2026-11-15, per the sweep).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §17.1 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep S1) — actively maintained (3,196 stars; last push 2026-11-15, per the sweep)."
    }
   ]
  },
  {
   "id": "resource-mempool-js-client",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOFTWARE",
   "name": "mempool.js (mempool/mempool.js) — official mempool.space client",
   "provider": "The Mempool Open Source Project",
   "formerName": null,
   "resourceType": "GITHUB_PROJECT",
   "domain": "crypto-protocol",
   "category": "EXTERNAL_APIS",
   "categoryNote": "Official mempool.space client library (software) — reference/optional",
   "capabilities": [
    "crypto-protocol"
   ],
   "originalSource": "The Mempool Open Source Project · https://github.com/mempool/mempool.js",
   "documentation": "https://github.com/mempool/mempool.js",
   "repository": "https://github.com/mempool/mempool.js",
   "apiDescription": "Crypto — Bitcoin client library (software)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS (open-source library)",
   "commercialUseState": "Yes under MIT.",
   "rateLimits": "Those of the API it wraps (§7.2).",
   "geographicCoverage": "N/A (library; wraps the Bitcoin data source §7.2).",
   "dataCoverage": "TypeScript/NPM client library for the mempool.space REST + WebSocket APIs.",
   "frontendDirectPossible": null,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "MIT",
   "attribution": "MIT licence notice.",
   "cachePolicy": "N/A.",
   "freshnessCharacteristics": "N/A (library).",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "UNKNOWN",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (reference/optional)",
   "benefitLabels": [
    "NO KEY REQUIRED"
   ],
   "existingProviderOverlap": "Crypto protocol & chain data chain: DefiLlama free PRIMARY, GeckoTerminal candidate SECONDARY; Bitcoin sub-chain mempool.space -> Esplora (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (reference/optional)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §17.2",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep S2) — maintained (308 stars; last push 2026-10-24; not archived).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §17.2 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep S2) — maintained (308 stars; last push 2026-10-24; not archived)."
    }
   ]
  },
  {
   "id": "resource-gdelt-doc-api-client",
   "recordKind": "RESOURCE_CANDIDATE",
   "registry": "resources",
   "candidateType": "SOFTWARE",
   "name": "gdelt-doc-api (alex9smith/gdelt-doc-api) — GDELT DOC client",
   "provider": "Individual maintainer (Alex Smith)",
   "formerName": null,
   "resourceType": "GITHUB_PROJECT",
   "domain": "news",
   "category": "EXTERNAL_APIS",
   "categoryNote": "GDELT DOC client library (software); maintenance slowing since 2025-04 — recorded honestly in the sweep",
   "capabilities": [
    "news"
   ],
   "originalSource": "Individual maintainer (Alex Smith) · https://github.com/alex9smith/gdelt-doc-api",
   "documentation": "https://github.com/alex9smith/gdelt-doc-api",
   "repository": "https://github.com/alex9smith/gdelt-doc-api",
   "apiDescription": "News — GDELT client library (software)",
   "openApiAvailable": null,
   "mcpAvailable": null,
   "authenticationType": "NONE",
   "apiKeyRequired": false,
   "oauthRequired": false,
   "credentialState": "NONE_REQUIRED",
   "credentialCustody": null,
   "freeState": "FREE_KEYLESS",
   "catalogCostState": "FREE_KEYLESS (open-source library)",
   "commercialUseState": "Yes under MIT (library); GDELT data terms per §11.2.",
   "rateLimits": "Those of the API it wraps (§11.2 — throttled).",
   "geographicCoverage": "N/A (library).",
   "dataCoverage": "Python client for the GDELT 2.0 DOC API — query building, mode handling, pandas-friendly output.",
   "frontendDirectPossible": false,
   "proxyRequired": false,
   "selfHostable": false,
   "license": "MIT",
   "attribution": "MIT licence notice; GDELT attribution per §11.2.",
   "cachePolicy": "N/A.",
   "freshnessCharacteristics": "N/A (library). Maintenance: 234 stars, 50 forks; last push **2025-04-22** — slowing cadence, recorded honestly; not archived.",
   "securityReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "termsReview": {
    "status": "NOT_REVIEWED",
    "note": null,
    "at": null,
    "by": null
   },
   "maintenanceState": "Maintenance slowing since 2025-04 (recorded in the sweep)",
   "integrationComplexity": "UNKNOWN",
   "expectedBenefit": "Catalog fallback role: CANDIDATE (worker-phase reference)",
   "benefitLabels": [
    "NO KEY REQUIRED"
   ],
   "existingProviderOverlap": "News chain: Hacker News PRIMARY (connected), GDELT candidate SECONDARY behind a proxy/cache design (catalog §20).",
   "possibleFallbackFor": [],
   "possibleReplacementFor": [],
   "fallbackRole": "CANDIDATE (worker-phase reference)",
   "ownerApprovalState": "NOT_REQUESTED",
   "ownerDecision": null,
   "pipelineStage": "RESEARCHING",
   "dedupe": {
    "verdict": "DISTINCT",
    "matchedCandidateId": null,
    "matchedResourceId": null,
    "signals": [
     "catalog-import: one governed record per provider+capability; the catalog itself is the dedupe pass (merged, not duplicated)"
    ],
    "checkedAt": "2026-11-16T00:00:00.000Z",
    "checkedBy": "WORKER:catalog-import"
   },
   "rejection": null,
   "supersededBy": null,
   "connectionEvidence": null,
   "routerProviderId": null,
   "gapRefs": [],
   "evidence": [
    {
     "kind": "CATALOG",
     "ref": "FREE-RESOURCE-CATALOG.md §17.3",
     "note": "Governed catalog record (merged LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16). MTI6 STATE in catalog: CANDIDATE (Sweep S3).",
     "at": "2026-11-16T00:00:00.000Z"
    }
   ],
   "discoveredThrough": "FREE-RESOURCE-CATALOG (LIVE-WORLD-SOURCE-CATALOG + API-DISCOVERY-SWEEP-2026-11-16)",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "source": "catalog-import",
   "verificationStatus": "UNVERIFIED",
   "lastReviewedAt": "2026-11-16",
   "history": [
    {
     "from": null,
     "to": "RESEARCHING",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §17.3 at the stage its recorded evidence supports. Catalog MTI6 STATE: CANDIDATE (Sweep S3)."
    }
   ]
  }
 ],
 "gaps": [
  {
   "id": "resource-gap-crypto-yields",
   "capability": "crypto-yields",
   "title": "Crypto yields data",
   "currentState": "NO_DATA — no governed free yield source exists; the v92 router answers yields as this capability gap with zero network calls",
   "description": "Yield / APY data for Crypto World yield workspaces (lending rates, staking yields, vault APYs as sourced observations).",
   "currentFreeOptions": "None governed. DefiLlama's former free yield endpoints were moved to the paid/API plan on 2026-11-13 (verified). No other free/keyless yield provider appears in either source document.",
   "limitation": "The free DefiLlama API serves TVL/volumes/fees overviews but not yields. Any yield figure shown today would have no governed free source behind it — so MTI6 shows none.",
   "paidOption": "DefiLlama Pro API — $300/mo (per the sweep's documentation read); key custody would be proxy-side. Never subscribed automatically.",
   "expectedBenefit": "Sourced, labeled yield observations for the yield workspace family, from the same aggregator already PRIMARY for protocol data.",
   "ownerDecisionRequired": true,
   "status": "OPEN",
   "candidateRefs": [
    "resource-defillama-protocol-data"
   ],
   "recordKind": "RESOURCE_GAP",
   "registry": "resources",
   "source": "catalog-import",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "history": [
    {
     "from": null,
     "to": "OPEN",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §19 / documented chain gaps. A gap is a statement about MTI6's coverage, not about the world."
    }
   ]
  },
  {
   "id": "resource-gap-live-webcams",
   "capability": "live-webcams",
   "title": "Live webcams",
   "currentState": "NOT_CONNECTED — no governed keyless webcam API exists",
   "description": "Discoverable live/refreshed webcam imagery by location (the Live World media selector's camera categories).",
   "currentFreeOptions": "No governed keyless webcam API exists. The sweep's GitHub search for an open-source webcam directory/API returned zero results; the major directories publish no official developer API and are TERMS_REVIEW_REQUIRED (sanctioned embeds only). Scraping is prohibited by the Bot Web Boundary — no scraping path exists or will be built.",
   "limitation": "The only governed-API door is Windy Webcams: free tier exists but is key-gated, the key may not be published (proxy mandatory), free-tier images are low-resolution with short-lived URLs, and its rate limits are unpublished.",
   "paidOption": "Windy Webcams Professional tier (exists per the API terms; price UNVERIFIED in the source documents). The free tier itself requires the owner's credential decision + an owner-approved proxy expansion.",
   "expectedBenefit": "A governed, source-labeled webcam layer for Live World — the single largest missing media family.",
   "ownerDecisionRequired": true,
   "status": "OPEN",
   "candidateRefs": [
    "resource-windy-webcams",
    "resource-public-webcam-networks"
   ],
   "recordKind": "RESOURCE_GAP",
   "registry": "resources",
   "source": "catalog-import",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "history": [
    {
     "from": null,
     "to": "OPEN",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §19 / documented chain gaps. A gap is a statement about MTI6's coverage, not about the world."
    }
   ]
  },
  {
   "id": "resource-gap-production-routing",
   "capability": "production-routing",
   "title": "Production routing",
   "currentState": "NOT_CONNECTED — the Globe travel context honestly reports routing NOT_CONNECTED and draws no route lines",
   "description": "Route computation (driving directions/geometry) for the Globe's travel context.",
   "currentFreeOptions": "Project OSRM — keyless and open-source, but its public demo server is explicitly demonstration/testing only, not for production. Geoapify includes routing but is a keyed freemium owner-credential row, not a free option.",
   "limitation": "The free production path is self-hosting OSRM, which requires backend infrastructure MTI6 does not operate today. There is no keyless, CORS-open, production-permitted routing API in the governed pool.",
   "paidOption": "None identified in the source documents — identifying one is a discovery task, not a fact the catalog can state.",
   "expectedBenefit": "Real route lines + durations for the travel/routing surfaces, from MTI6's own governed infrastructure rather than a demo server.",
   "ownerDecisionRequired": true,
   "status": "OPEN",
   "candidateRefs": [
    "resource-osrm-routing",
    "resource-geoapify-geocoding"
   ],
   "recordKind": "RESOURCE_GAP",
   "registry": "resources",
   "source": "catalog-import",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "history": [
    {
     "from": null,
     "to": "OPEN",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §19 / documented chain gaps. A gap is a statement about MTI6's coverage, not about the world."
    }
   ]
  },
  {
   "id": "resource-gap-realtime-traffic",
   "capability": "realtime-traffic",
   "title": "Real-time traffic (production-ready, unified)",
   "currentState": "NOT_CONNECTED — no unified, keyless, production-permitted traffic API exists in the governed pool",
   "description": "Live traffic conditions (incidents, closures, road weather, official cameras) as a dependable layer rather than a patchwork.",
   "currentFreeOptions": "Per-jurisdiction only: the 511/DOT family (heterogeneous; each feed needs its own governed record before activation; none is activated) and NYC DOT (agreement-gated). OSRM provides no traffic.",
   "limitation": "Coverage would arrive jurisdiction-by-jurisdiction, each with its own terms, keys, and custody decisions.",
   "paidOption": "None identified in the source documents.",
   "expectedBenefit": "A truthful live-traffic lens for the Globe, built jurisdiction-by-jurisdiction on official DOT data.",
   "ownerDecisionRequired": true,
   "status": "OPEN",
   "candidateRefs": [
    "resource-dot-511-traffic-feeds",
    "resource-nyc-dot-traffic-cameras"
   ],
   "recordKind": "RESOURCE_GAP",
   "registry": "resources",
   "source": "catalog-import",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "history": [
    {
     "from": null,
     "to": "OPEN",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §19 / documented chain gaps. A gap is a statement about MTI6's coverage, not about the world."
    }
   ]
  },
  {
   "id": "resource-gap-weather-alerts-outside-us",
   "capability": "weather-alerts",
   "title": "Weather alerts outside the US",
   "currentState": "NO_DATA outside the US — NWS covers US points only; the router's alerts chain honestly ends at NO_DATA (never calm) for non-US points",
   "description": "Active weather alerts for non-US locations. Documented chain gap: the v92 Capability Router wires NWS alerts for the US; no non-US alert provider is connected.",
   "currentFreeOptions": "GDACS (candidate, TESTED with an unconfirmed API shape) is the multi-hazard rollup candidate; regional official sources are unresearched per country.",
   "limitation": "No governed non-US alert source has passed testing; GDACS's API query shape is unconfirmed (sweep probe returned HTTP 400).",
   "paidOption": null,
   "expectedBenefit": "Alert coverage for the whole Globe, not only US points, with the same never-calm honesty.",
   "ownerDecisionRequired": true,
   "status": "OPEN",
   "candidateRefs": [
    "resource-gdacs-geohazards"
   ],
   "recordKind": "RESOURCE_GAP",
   "registry": "resources",
   "source": "catalog-import",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "history": [
    {
     "from": null,
     "to": "OPEN",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §19 / documented chain gaps. A gap is a statement about MTI6's coverage, not about the world."
    }
   ]
  },
  {
   "id": "resource-gap-geocoding-fallback",
   "capability": "geocoding",
   "title": "Geocoding fallback (single connected geocoder)",
   "currentState": "Single connected geocoder — Open-Meteo Geocoding is wired; the Photon fallback candidate is researched and probed but NOT connected, so the chain has no live second rung",
   "description": "Documented chain gap (addendum fallback target): no geocoder may become critical infrastructure — primary -> secondary -> third/self-hosted -> valid cached result -> NO CURRENT RESULT.",
   "currentFreeOptions": "Photon public instance (TESTED, fair-use constrained), Nominatim public instance (RESEARCHING, 1 req/s policy), self-hosted Photon software (RESEARCHING), plus the keyed LocationIQ/Geoapify rungs at PREPARED.",
   "limitation": "The public Photon instance carries no availability guarantee and may throttle heavy use; the durable fallback is the self-hosted rung, which needs a backend phase.",
   "paidOption": null,
   "expectedBenefit": "A geocoding chain that survives one provider's failure — place search never breaks the Globe.",
   "ownerDecisionRequired": true,
   "status": "OPEN",
   "candidateRefs": [
    "resource-photon-instance-geocoding",
    "resource-photon-software-geocoding",
    "resource-nominatim-geocoding",
    "resource-locationiq-geocoding",
    "resource-geoapify-geocoding"
   ],
   "recordKind": "RESOURCE_GAP",
   "registry": "resources",
   "source": "catalog-import",
   "discoveredBy": {
    "type": "WORKER",
    "ref": "catalog-import"
   },
   "discoveredAt": "2026-11-16T00:00:00.000Z",
   "history": [
    {
     "from": null,
     "to": "OPEN",
     "actor": "WORKER:catalog-import",
     "at": "2026-11-16T00:00:00.000Z",
     "note": "Seeded from FREE-RESOURCE-CATALOG §19 / documented chain gaps. A gap is a statement about MTI6's coverage, not about the world."
    }
   ]
  }
 ]
};
  global.ResourceSeeds = {
    candidates: SEEDS.candidates,
    gaps: SEEDS.gaps,
    source: "FREE-RESOURCE-CATALOG.md (2026-11-16) + documented chain gaps"
  };
})(window);
