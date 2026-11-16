/* MTI6-GTADWIY-COCKPIT — shell chrome: STAR launcher (Responsive
 * Phase C, owner-authorized 2026-11-15) + skip link (Phase H).
 *
 * STAR's persistent launcher now lives at the bottom-right of the
 * shell (✨), out of the top command bar. It opens the EXISTING STAR
 * overlay (StarOverlay.open -> WindowManager) — STAR itself is not
 * rebuilt or moved, only its launcher.
 *
 * Colour has meaning (owner ruling 2026-11-16, superseding the
 * Phase C / directive §44 rule): the launcher rests ELECTRIC BLUE.
 * While STAR is actively producing a reply — the chat panel's own
 * status dot carries .star-status-thinking for exactly that
 * interval — the launcher switches to the GREEN talking glow
 * (.star-talking) and stays green and glowing until the reply
 * completes, then returns to electric blue. The mirror is a
 * MutationObserver over the document (event-driven; no polling, no
 * timers), so the glow can never claim STAR is talking when the
 * panel says it is not.
 *
 * STAR's face (owner ruling 2026-11-16): Daniel designated his own
 * portrait as STAR's avatar (js/data/star-avatar.js). When that
 * data file is present, the portrait fills the launcher disc; the
 * button's border and shadow keep carrying the state colour around
 * it. If the file is missing or the image fails to load, the
 * launcher keeps its ✨ glyph, exactly as before.
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
    // Skip link (Phase H): a button, not an anchor — an href hash
    // would be parsed by the router. Focus moves to the view root
    // (tabindex="-1" in index.html); the browser scrolls it in.
    var skip = document.getElementById("skip-link");
    if (skip) {
      skip.addEventListener("click", function () {
        var root = document.getElementById("view-root");
        if (root && typeof root.focus === "function") {
          try { root.focus({ preventScroll: false }); } catch (e) { root.focus(); }
        }
      });
    }
    var launcher = document.getElementById("star-launcher");
    if (!launcher) return;
    launcher.addEventListener("click", function () {
      if (global.StarOverlay && typeof global.StarOverlay.open === "function") {
        global.StarOverlay.open();
      }
    });
    // STAR's face (see header note): the owner's portrait fills the
    // launcher disc when the avatar data file loaded. The ✨ glyph
    // stays underneath as the fallback — if the image errors, it is
    // removed and the launcher looks exactly as it did before.
    if (typeof global.STAR_AVATAR_SRC === "string" && global.STAR_AVATAR_SRC) {
      var avatarImg = document.createElement("img");
      avatarImg.className = "star-launcher-img";
      avatarImg.alt = "";
      avatarImg.setAttribute("aria-hidden", "true");
      avatarImg.addEventListener("error", function () {
        if (avatarImg.parentNode) avatarImg.parentNode.removeChild(avatarImg);
      });
      avatarImg.src = global.STAR_AVATAR_SRC;
      launcher.appendChild(avatarImg);
    }
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
