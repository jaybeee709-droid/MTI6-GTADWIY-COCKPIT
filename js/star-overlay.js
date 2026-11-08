/* MTI6-GTADWIY-COCKPIT — STAR global overlay (master shell, Build 1)
 *
 * STAR must be callable from the permanent STAR button while the user
 * stays on the current screen, so it opens as a floating overlay panel
 * (via the window manager) instead of forcing navigation away.
 *
 * Channels, stated honestly: TEXT is the only active channel. VOICE and
 * CAMERA are not connected in this build — the microphone and camera
 * stay off, their buttons are disabled, and nothing is recorded. Voice
 * and camera require explicit user/device permission; they are never
 * switched on silently, and no covert background capture is implemented.
 * A visible channel row shows the state at all times while the overlay
 * is open, with immediate controls for mic off / camera off / close.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  function connectionLabel() {
    if (global.StarBackend && typeof global.StarBackend.getStatusLabel === "function") {
      return global.StarBackend.getStatusLabel();
    }
    return "Demo mode — no AI backend connected";
  }

  function channel(name, state, note) {
    var stateLabel = state === "active" ? "ACTIVE" : state === "off" ? "OFF" : "NOT CONNECTED";
    return U.el("div", { class: "star-channel star-channel-" + state }, [
      U.el("div", { class: "star-channel-name" }, name),
      U.el("div", { class: "star-channel-state" }, stateLabel),
      U.el("div", { class: "star-channel-note" }, note)
    ]);
  }

  // Opens (or focuses) the STAR overlay window. Safe to call repeatedly.
  function open() {
    if (!global.WindowManager) {
      U.toast("The window manager did not load — reload and try again.");
      return null;
    }
    return global.WindowManager.open({
      id: "star-overlay",
      title: "🌟 STAR 3.0",
      subtitle: "Command chat — overlay",
      build: function (body) {
        body.appendChild(U.el("div", { class: "star-channels" }, [
          channel("TEXT", "active", "Text chat is active in this window."),
          channel("VOICE", "not-connected", "Voice is not connected. The microphone stays off until you turn it on."),
          channel("CAMERA", "off", "Camera is off. Nothing is recorded.")
        ]));
        body.appendChild(U.el("div", { class: "star-channel-controls" }, [
          U.el("button", { class: "btn btn-ghost btn-sm", type: "button", disabled: true, title: "Voice mode — coming soon" }, "🎤 Mic: off"),
          U.el("button", { class: "btn btn-ghost btn-sm", type: "button", disabled: true, title: "Video mode — coming soon" }, "📷 Camera: off"),
          U.el("span", { class: "api-meta" }, "Voice and camera need your explicit permission — they are never switched on silently.")
        ]));
        if (global.StarChatUI && typeof global.StarChatUI.renderPanel === "function") {
          body.appendChild(global.StarChatUI.renderPanel());
        } else {
          body.appendChild(U.el("p", { class: "api-meta" }, "Star chat did not load. Reload and try again."));
        }
        body.appendChild(U.el("div", { class: "api-meta star-conn" }, "Connection: " + connectionLabel()));
      }
    });
  }

  global.StarOverlay = { open: open };
})(window);
