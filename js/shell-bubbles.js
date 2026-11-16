/* MTI6-GTADWIY-COCKPIT — shell bubble/status rail (Responsive Phase C,
 * owner-authorized 2026-11-15).
 *
 * A compact rail of status bubbles in the top command bar, one per
 * World Globe layer. This module creates NO state of its own: every
 * bubble renders GlobeIntelligence layer state (the same records the
 * Globe itself shows), refreshed through the same paths the Globe
 * uses — synchronous layers first, the World Engine graph layers when
 * collected, and one re-collection after the boot import settles (the
 * cold-load consistency pattern). Normal bubbles are electric blue; a
 * bubble turns red ONLY when its layer reports a genuine alarm
 * (hasAlarm, which GlobeIntelligence raises only for confirmed active
 * security alerts), and the alarm bubble also carries a "!" marker so
 * the meaning never depends on colour alone. Bubbles are buttons:
 * pressing one opens the World Globe, where the layer lives.
 */
(function (global) {
  "use strict";

  var SHORT = {
    WORLD: "World",
    CRYPTO: "Crypto",
    OPPORTUNITIES: "Opps",
    BOT_ACTIVITY: "Bots",
    SECURITY_ALERTS: "Alerts"
  };

  function render(layers) {
    var rail = document.getElementById("bubble-rail");
    if (!rail || !Array.isArray(layers)) return;
    rail.innerHTML = "";
    layers.forEach(function (layer) {
      if (!layer || !layer.id) return;
      var alarm = !!layer.hasAlarm;
      var count = typeof layer.count === "number" ? layer.count : (layer.items ? layer.items.length : 0);
      var label = (SHORT[layer.id] || layer.id) + " — " + layer.state + " · " + count + (alarm ? " — ALARM" : "");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "bubble" + (alarm ? " bubble--alarm" : "");
      b.title = label;
      b.setAttribute("aria-label", label);
      var dot = document.createElement("span");
      dot.className = "bubble-dot";
      dot.setAttribute("aria-hidden", "true");
      dot.textContent = alarm ? "!" : "";
      var num = document.createElement("span");
      num.className = "bubble-count";
      num.textContent = String(count);
      b.appendChild(dot);
      b.appendChild(num);
      b.addEventListener("click", function () {
        global.location.hash = "#/globe";
      });
      rail.appendChild(b);
    });
  }

  function refreshFromLive() {
    var GI = global.GlobeIntelligence;
    if (GI && typeof GI.listLayersLive === "function") {
      GI.listLayersLive().then(render).catch(function () {});
    }
  }

  var initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    var rail = document.getElementById("bubble-rail");
    if (!rail) return;
    var GI = global.GlobeIntelligence;
    if (!GI || typeof GI.listLayers !== "function") {
      rail.title = "Status not loaded";
      return;
    }
    try { render(GI.listLayers()); } catch (e) {}
    refreshFromLive();
    // Cold-load consistency: if the first collection raced the boot
    // import's registrations, re-collect once when that shared run
    // settles — the existing completion signal, no polling.
    var EI = global.EncyclopediaImport;
    if (EI && typeof EI.importAll === "function") {
      EI.importAll().then(refreshFromLive).catch(function () {});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
