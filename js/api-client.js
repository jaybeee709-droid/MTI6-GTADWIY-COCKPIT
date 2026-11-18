/* MTI6-GTADWIY-COCKPIT — gateway client (Phase 1 + Transitland v1)
 * The single frontend layer for talking to the server-side gateway.
 * It posts an action envelope to the same-origin /api/mti6 path and
 * reads the gateway envelope back. It never builds an Authorization
 * header and never holds a credential of any kind — the gateway
 * authenticates itself server-side, if a provider is ever configured.
 * Actions: gateway.status, gateway.ping, transit.stopsNear,
 * transit.departures (Transitland via the proxy, v115/v116). Star
 * wiring is a later phase; nothing in this file calls it yet.
 */
(function (global) {
  "use strict";

  var ENDPOINT = "/api/mti6";

  function request(action, payload) {
    return global.fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: action, payload: payload || {} })
    }).then(function (res) {
      return res.json().catch(function () {
        throw new Error("MTI6 gateway returned an invalid response.");
      }).then(function (result) {
        if (!res.ok || !result || !result.ok) {
          // Package 3 (v116, 2026-11-17): the thrown error carries
          // the gateway's error code and HTTP status, so the
          // Capability Router can classify a transit failure
          // (AUTH_REQUIRED / RATE_LIMITED / NOT_FOUND /
          // UPSTREAM_ERROR / UNSUPPORTED_ACTION) instead of
          // guessing from the message. The message itself is
          // unchanged, and callers that only read .message see
          // exactly what they saw before.
          var err = new Error((result && result.error && result.error.message) || "MTI6 gateway request failed.");
          if (result && result.error && result.error.code) err.code = result.error.code;
          err.status = res.status;
          throw err;
        }
        return result;
      });
    });
  }

  function status() {
    return request("gateway.status", {});
  }

  global.MTI6API = { request: request, status: status, endpoint: ENDPOINT };
})(window);
