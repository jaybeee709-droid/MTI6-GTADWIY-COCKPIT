/* MTI6-GTADWIY-COCKPIT — Pure URL detection (Universal Search Phase 1)
 *
 * Classification only. No DOM, no network, no storage, and no request
 * of any kind is made from this file. In particular an .onion address
 * is only ever CLASSIFIED here — it is never requested, never opened,
 * and never sent anywhere. An unknown scheme is never opened and its
 * handler is never guessed. An http:// address is labelled insecure
 * and is never silently upgraded to https://.
 *
 * A bare word is text, not a URL: "example" or "foo.bar" with no
 * scheme is never turned into a domain. Nothing here invents a
 * missing domain.
 */
(function (global) {
  "use strict";

  var ONION_LABEL = "ONION SERVICE";
  var TOR_REQUIRED = "TOR ACCESS REQUIRED";

  // Known in-app routes (the router in js/app.js). A "#/..." hash or
  // a bare route name only counts as an internal route when the route
  // is on this list.
  var KNOWN_ROUTES = [
    "globe", "crypto-world", "bot-ops", "wallets", "opportunities",
    "earn", "positions", "encyclopedia", "dashboard", "operations",
    "accounts", "web", "analytics", "security", "settings", "vault",
    "tasks", "projects", "expenses", "crypto"
  ];

  function isKnownRoute(route) {
    if (typeof route !== "string") return false;
    var lower = route.toLowerCase();
    for (var i = 0; i < KNOWN_ROUTES.length; i++) {
      if (KNOWN_ROUTES[i] === lower) return KNOWN_ROUTES[i];
    }
    return false;
  }

  function textResult() {
    return { kind: "text", url: null, route: null, param: null, host: null, scheme: null, label: null, torRequired: null };
  }

  function decodeParam(raw) {
    if (raw === null || raw === undefined || raw === "") return null;
    try { return decodeURIComponent(raw); } catch (e) { return raw; }
  }

  // Host of a "scheme://..." string: the part after "://" up to the
  // first /, ? or #, with any userinfo and port stripped. Null when
  // there is no host at all (for example "https://").
  function hostOfSchemed(text) {
    var after = text.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
    var hostport = after.split(/[\/?#]/)[0] || "";
    if (hostport.indexOf("@") !== -1) hostport = hostport.slice(hostport.lastIndexOf("@") + 1);
    if (hostport.charAt(0) === "[") {
      var close = hostport.indexOf("]");
      if (close !== -1) return hostport.slice(0, close + 1).toLowerCase();
      return hostport.toLowerCase();
    }
    var colon = hostport.indexOf(":");
    if (colon !== -1) hostport = hostport.slice(0, colon);
    return hostport ? hostport.toLowerCase() : null;
  }

  function isOnionHost(host) {
    if (typeof host !== "string" || !host) return false;
    var lower = host.toLowerCase();
    if (lower === "onion") return false;
    if (lower.slice(-6) !== ".onion") return false;
    // At least one label before ".onion", made of safe characters.
    var head = lower.slice(0, -6);
    return /^[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(head);
  }

  function schemeOf(text) {
    var m = text.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
    return m ? m[1].toLowerCase() : null;
  }

  function classify(text) {
    try {
      if (typeof text !== "string") return textResult();
      // Defensive cap: a pathological input is treated as plain text
      // rather than parsed. Ordinary URLs are far below this.
      if (text.length > 65536) return textResult();
      var trimmed = text.trim();
      if (trimmed === "") return textResult();

      var lower = trimmed.toLowerCase();

      // .onion first: it wins over the http/https rule, so an onion
      // address is never mistaken for an ordinary web URL. It is
      // classified only — never requested.
      var host = null;
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
        host = hostOfSchemed(trimmed);
        if (isOnionHost(host)) {
          return { kind: "onion", url: trimmed, route: null, param: null, host: host, scheme: schemeOf(trimmed), label: ONION_LABEL, torRequired: TOR_REQUIRED };
        }
      } else {
        // Bare onion address, with or without a path: "example.onion"
        // or "example.onion/path". Only the host part may end .onion.
        var bareHost = trimmed.split(/[\/?#]/)[0];
        if (isOnionHost(bareHost) && /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.onion([/?#].*)?$/i.test(trimmed)) {
          return { kind: "onion", url: trimmed, route: null, param: null, host: bareHost.toLowerCase(), scheme: null, label: ONION_LABEL, torRequired: TOR_REQUIRED };
        }
      }

      // In-app deep link (Phase 1: classification only).
      if (/^mticockpit:\/\//i.test(trimmed)) {
        var deepHost = hostOfSchemed(trimmed);
        return { kind: "deep-link", url: trimmed, route: null, param: null, host: deepHost, scheme: "mticockpit", label: deepHost || "MTI6 DEEP LINK", torRequired: null };
      }

      // Internal route: "#/route" or "#/route/param".
      if (trimmed.charAt(0) === "#" && trimmed.charAt(1) === "/") {
        var hashParts = trimmed.slice(2).split("/");
        var route = isKnownRoute(hashParts[0]);
        if (route) {
          var param = hashParts.length > 1 ? decodeParam(hashParts[1]) : null;
          var url = "#/" + route + (param !== null && param !== "" ? "/" + hashParts[1] : "");
          return { kind: "internal-route", url: url, route: route, param: param, host: null, scheme: null, label: route, torRequired: null };
        }
        return textResult();
      }

      // Bare route name ("encyclopedia", "wallets") or "route/param".
      var bareParts = trimmed.split("/");
      var bareRoute = bareParts.length >= 1 ? isKnownRoute(bareParts[0]) : false;
      if (bareRoute && bareParts.length <= 2 && !/[\s:?#]/.test(trimmed)) {
        var bareParam = bareParts.length === 2 ? decodeParam(bareParts[1]) : null;
        var bareUrl = "#/" + bareRoute + (bareParam !== null && bareParam !== "" ? "/" + bareParts[1] : "");
        return { kind: "internal-route", url: bareUrl, route: bareRoute, param: bareParam, host: null, scheme: null, label: bareRoute, torRequired: null };
      }

      // Ordinary web URLs. http is labelled insecure and is NOT
      // upgraded to https.
      if (/^https:\/\//i.test(trimmed)) {
        var httpsHost = hostOfSchemed(trimmed);
        if (!httpsHost) return textResult();
        return { kind: "https", url: trimmed, route: null, param: null, host: httpsHost, scheme: "https", label: httpsHost, torRequired: null };
      }
      if (/^http:\/\//i.test(trimmed)) {
        var httpHost = hostOfSchemed(trimmed);
        if (!httpHost) return textResult();
        return { kind: "http", url: trimmed, route: null, param: null, host: httpHost, scheme: "http", label: "INSECURE HTTP (NOT UPGRADED)", torRequired: null };
      }

      // Any other scheme ("ftp://x", "tel:+123", ...): never opened,
      // handler never guessed.
      var otherScheme = schemeOf(trimmed);
      if (otherScheme) {
        var otherHost = null;
        if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) otherHost = hostOfSchemed(trimmed);
        return { kind: "unknown-scheme", url: trimmed, route: null, param: null, host: otherHost, scheme: otherScheme, label: "UNKNOWN SCHEME — NOT OPENED", torRequired: null };
      }

      // Everything else — including a bare word like "example" or
      // "foo.bar" with no scheme — is plain text, never a URL.
      return textResult();
    } catch (e) {
      return textResult();
    }
  }

  function isOnion(text) {
    try { return classify(text).kind === "onion"; } catch (e) { return false; }
  }

  function isInternalRoute(text) {
    try {
      var c = classify(text);
      if (c.kind !== "internal-route") return null;
      return { route: c.route, param: c.param };
    } catch (e) { return null; }
  }

  // The trimmed https/http URL, or null for anything else: no onion,
  // no unknown scheme, no deep link, no internal route, no bare text.
  function normalizeUrl(text) {
    try {
      var c = classify(text);
      if (c.kind === "https" || c.kind === "http") return c.url;
      return null;
    } catch (e) { return null; }
  }

  global.SearchUrl = {
    classify: classify,
    isOnion: isOnion,
    isInternalRoute: isInternalRoute,
    normalizeUrl: normalizeUrl,
    ONION_LABEL: ONION_LABEL,
    TOR_REQUIRED: TOR_REQUIRED
  };
})(window);
