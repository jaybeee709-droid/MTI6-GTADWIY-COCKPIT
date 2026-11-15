/* MTI6-GTADWIY-COCKPIT — shell chrome: STAR launcher (Responsive
 * Phase C, owner-authorized 2026-11-15).
 *
 * STAR's persistent launcher now lives at the bottom-right of the
 * shell (✨), out of the top command bar. It opens the EXISTING STAR
 * overlay (StarOverlay.open -> WindowManager) — STAR itself is not
 * rebuilt or moved, only its launcher.
 *
 * Colour has meaning (directive §44): the launcher rests PURPLE
 * (STAR's idle identity). While STAR is actively producing a reply —
 * the chat panel's own status dot carries .star-status-thinking for
 * exactly that interval — the launcher switches to the ELECTRIC-BLUE
 * talking glow. The mirror is a MutationObserver over the document
 * (event-driven; no polling, no timers), so the glow can never claim
 * STAR is talking when the panel says it is not.
 */
(function (global) {
  "use strict";

  function syncTalking(launcher) {
    var thinking = !!document.querySelector(".star-status-thinking");
    launcher.classList.toggle("star-talking", thinking);
  }

  var initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    var launcher = document.getElementById("star-launcher");
    if (!launcher) return;
    launcher.addEventListener("click", function () {
      if (global.StarOverlay && typeof global.StarOverlay.open === "function") {
        global.StarOverlay.open();
      }
    });
    if (typeof MutationObserver === "function") {
      var observer = new MutationObserver(function () { syncTalking(launcher); });
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class"]
      });
      syncTalking(launcher);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
