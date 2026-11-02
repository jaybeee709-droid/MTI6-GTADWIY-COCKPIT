/* MTI6-GTADWIY-COCKPIT — gateway client (Phase 1)
 * The single frontend layer for talking to the server-side gateway.
 * It posts an action envelope to the same-origin /api/mti6 path and
 * reads the gateway envelope back. It never builds an Authorization
 * header and never holds a credential of any kind — the gateway
 * authenticates itself server-side, if a provider is ever configured.
 * Phase 1 actions: gateway.status, gateway.ping. Star wiring is a
 * later phase; nothing in this file calls it yet.
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
          throw new Error((result && result.error && result.error.message) || "MTI6 gateway request failed.");
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
