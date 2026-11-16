/* MTI6-GTADWIY-COCKPIT — sheet system (Responsive Phase E, Master
 * Responsive Directive, owner-authorized 2026-11-15; built
 * 2026-11-16 under the continuous-build instruction).
 *
 * Phone bands only (A/B, <768px): the cockpit's panels — floating
 * windows (.wm-window), the Accounts panel, and the World Globe's
 * layer Details panel — become bottom sheets with four states:
 * PEEK / HALF / EXPANDED / FULL. A state is a max-height cap (the
 * numbers live in css/style.css, Phase E section); a panel is
 * never forced taller than its own content. EXPANDED is the
 * default and equals the pre-Phase-E phone presentation (88dvh
 * cap), so opening any panel looks exactly as it did before —
 * the states exist so the owner can shrink a sheet to see the
 * screen beneath without closing it (the directive's continuous
 * context rule).
 *
 * Interaction: a grab handle is added at the top of each sheet.
 * Tap it to cycle states (EXPANDED -> HALF -> PEEK -> FULL ->
 * EXPANDED); drag it and the sheet follows the finger, snapping
 * to the nearest state on release. This module is presentation
 * only: it reads no panel content, changes no data, and stores
 * nothing — state lives in a data attribute on the element and
 * resets with the element. At >=768px it is inert (CSS ignores
 * the state attributes there) except for clearing any inline
 * drag height when the band changes.
 */
(function (global) {
  "use strict";

  var STATES = ["PEEK", "HALF", "EXPANDED", "FULL"];
  // Cap fractions of viewport height, mirroring the CSS caps —
  // used only to pick the nearest state after a drag.
  var CAPS = { PEEK: 0.33, HALF: 0.55, EXPANDED: 0.88, FULL: 1 };
  var DEFAULT_STATE = "EXPANDED";
  var TARGETS = ".wm-window, #accounts-panel, .globe-side-panel";

  var mq = null;
  if (typeof global.matchMedia === "function") {
    try { mq = global.matchMedia("(max-width: 767px)"); } catch (e) { mq = null; }
  }
  function phoneBand() {
    try { return !!(mq && mq.matches); } catch (e) { return false; }
  }

  function setState(el, state) {
    if (!el || STATES.indexOf(state) === -1) return;
    el.setAttribute("data-sheet-state", state);
    el.style.maxHeight = ""; // the CSS cap for the state governs
  }

  function cycle(el) {
    if (!el) return;
    var cur = el.getAttribute("data-sheet-state") || DEFAULT_STATE;
    var i = STATES.indexOf(cur);
    // Tap order walks DOWN first so one tap always reveals more
    // of the screen beneath: EXPANDED -> HALF -> PEEK -> FULL.
    var order = ["EXPANDED", "HALF", "PEEK", "FULL"];
    var j = order.indexOf(cur);
    setState(el, order[(j + 1) % order.length]);
    return el.getAttribute("data-sheet-state");
  }

  function nearestState(heightPx) {
    var vh = global.innerHeight || 0;
    if (!vh) return DEFAULT_STATE;
    var ratio = heightPx / vh;
    var best = DEFAULT_STATE, bestDist = Infinity;
    STATES.forEach(function (s) {
      var d = Math.abs(CAPS[s] - ratio);
      if (d < bestDist) { bestDist = d; best = s; }
    });
    return best;
  }

  function decorate(el) {
    if (!el || el.getAttribute("data-sheet") === "1") return;
    el.setAttribute("data-sheet", "1");
    if (!el.getAttribute("data-sheet-state")) {
      el.setAttribute("data-sheet-state", DEFAULT_STATE);
    }
    var handle = document.createElement("button");
    handle.type = "button";
    handle.className = "sheet-handle";
    handle.setAttribute("aria-label", "Resize panel — tap or drag to change the sheet size");
    var drag = null;
    var suppressClick = false;
    handle.addEventListener("pointerdown", function (e) {
      if (!phoneBand()) return;
      var rect = null;
      try { rect = el.getBoundingClientRect(); } catch (err) {}
      drag = {
        startY: e.clientY,
        startH: rect ? rect.height : 0,
        moved: false
      };
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    });
    handle.addEventListener("pointermove", function (e) {
      if (!drag || !phoneBand()) return;
      var dy = drag.startY - e.clientY;
      if (Math.abs(dy) > 6) drag.moved = true;
      if (!drag.moved) return;
      var vh = global.innerHeight || 0;
      var h = Math.max(120, drag.startH + dy);
      if (vh) h = Math.min(h, vh);
      el.style.maxHeight = h + "px";
    });
    function endDrag(e) {
      if (!drag) return;
      var wasDrag = drag.moved;
      drag = null;
      if (!wasDrag) return; // a tap: the click handler cycles
      suppressClick = true;
      var rect = null;
      try { rect = el.getBoundingClientRect(); } catch (err) {}
      setState(el, nearestState(rect ? rect.height : 0));
    }
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
    handle.addEventListener("click", function () {
      if (suppressClick) { suppressClick = false; return; }
      if (!phoneBand()) return;
      cycle(el);
    });
    el.insertBefore(handle, el.firstChild);
  }

  var scanQueued = false;
  function scan() {
    scanQueued = false;
    try {
      var nodes = document.querySelectorAll(TARGETS);
      for (var i = 0; i < nodes.length; i++) decorate(nodes[i]);
    } catch (e) {}
  }
  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    if (typeof global.requestAnimationFrame === "function") {
      global.requestAnimationFrame(scan);
    } else {
      setTimeout(scan, 0);
    }
  }

  var initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    scan();
    if (typeof MutationObserver === "function" && document.body) {
      var observer = new MutationObserver(queueScan);
      observer.observe(document.body, { childList: true, subtree: true });
    }
    global.addEventListener("hashchange", queueScan);
    if (mq && typeof mq.addEventListener === "function") {
      mq.addEventListener("change", function () {
        if (!phoneBand()) {
          // Leaving the phone bands: drop any inline drag height
          // so tablet/desktop geometry is never capped by a drag.
          try {
            var nodes = document.querySelectorAll(TARGETS);
            for (var i = 0; i < nodes.length; i++) nodes[i].style.maxHeight = "";
          } catch (e) {}
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.Mti6Sheets = {
    STATES: STATES.slice(),
    DEFAULT_STATE: DEFAULT_STATE,
    setState: setState,
    cycle: cycle,
    decorate: decorate,
    isPhoneBand: phoneBand
  };
})(window);
