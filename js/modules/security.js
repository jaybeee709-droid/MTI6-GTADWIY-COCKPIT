/* MTI6-GTADWIY-COCKPIT — Security screen
 * Two honest pieces, kept separate:
 * 1. Bot look & voice (cosmetic): pick Star's avatar look and a
 *    voice style, previewed with the device's own speech engine.
 *    The voice choice is stored locally and will be used when
 *    voice output is enabled — Star does not speak yet in chat.
 * 2. Camera preview (permission-only, local-only): a live preview
 *    that runs only while this screen is open and you tapped
 *    Allow. Nothing is recorded, sent, or used to identify anyone.
 *    Stop closes the camera immediately.
 * 3. Devices & alerts (account APIs, not cameras): check signed-in
 *    devices directly in each account. One item is still open from
 *    the Oct 31 Gmail summary: the Oct 30 Linux sign-in, awaiting
 *    the owner's confirmation whether it was them.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var STYLE_KEY = "mti6_star_style_v1";
  var AVATARS = ["🌟", "🤖", "🐱", "🔮"];
  var VOICES = [
    { name: "Default", rate: 1, pitch: 1 },
    { name: "Warm", rate: 0.9, pitch: 0.8 },
    { name: "Bright", rate: 1.15, pitch: 1.2 }
  ];

  function loadStyle() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(STYLE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : { avatar: "🌟", voice: "Default" };
    } catch (e) { return { avatar: "🌟", voice: "Default" }; }
  }
  function saveStyle(style) {
    try { if (global.localStorage) global.localStorage.setItem(STYLE_KEY, JSON.stringify(style)); } catch (e) {}
  }

  async function render(root) {
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("security") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "🛡️ Security & Bot Style"));
    root.appendChild(U.el("p", { class: "api-subtitle" }, "Look and voice are cosmetic choices stored on this device. Camera is a local preview only. Real device security comes from checking signed-in devices in each account — not from a camera watching you."));

    var style = loadStyle();
    var styleOut = U.el("div", { class: "api-meta" }, "Current look: " + style.avatar + " · Voice: " + style.voice);
    var avatarRow = U.el("div", { class: "price-input-row" });
    AVATARS.forEach(function (a) {
      var b = U.el("button", { class: "btn btn-ghost", type: "button" }, a);
      b.addEventListener("click", function () { style.avatar = a; saveStyle(style); styleOut.textContent = "Current look: " + style.avatar + " · Voice: " + style.voice; });
      avatarRow.appendChild(b);
    });
    var voiceRow = U.el("div", { class: "price-input-row" });
    VOICES.forEach(function (v) {
      var b = U.el("button", { class: "btn btn-ghost btn-sm", type: "button" }, v.name + " (preview)");
      b.addEventListener("click", function () {
        style.voice = v.name; saveStyle(style); styleOut.textContent = "Current look: " + style.avatar + " · Voice: " + style.voice;
        try {
          if ("speechSynthesis" in window) {
            var utter = new SpeechSynthesisUtterance("Hello, this is Star, in the " + v.name + " voice.");
            utter.rate = v.rate; utter.pitch = v.pitch; window.speechSynthesis.speak(utter);
          } else { styleOut.textContent += " — voice preview is not supported by this browser."; }
        } catch (e) { styleOut.textContent += " — voice preview failed on this device."; }
      });
      voiceRow.appendChild(b);
    });
    root.appendChild(U.el("div", { class: "api-panel" }, [U.el("h3", {}, "Bot look & voice"), avatarRow, voiceRow, styleOut]));

    var video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.style.width = "100%";
    video.style.display = "none";
    var camOut = U.el("div", { class: "api-meta" }, "Camera is off. Tap Start preview to allow it once, on this device only. Nothing is recorded or sent.");
    var stream = null;
    var startBtn = U.el("button", { class: "btn btn-primary", type: "button" }, "Start camera preview");
    var stopBtn = U.el("button", { class: "btn btn-ghost", type: "button" }, "Stop camera");
    startBtn.addEventListener("click", function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camOut.textContent = "Camera is not available in this browser."; return; }
      navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(function (s) {
        stream = s; video.srcObject = s; video.style.display = "block"; video.play();
        camOut.textContent = "Camera preview is live on this device only. Nothing is recorded, sent, or used to identify anyone. Tap Stop camera to close it.";
      }).catch(function () { camOut.textContent = "Camera permission was not granted. Nothing was recorded."; });
    });
    stopBtn.addEventListener("click", function () {
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      video.style.display = "none"; camOut.textContent = "Camera is off.";
    });
    root.appendChild(U.el("div", { class: "api-panel" }, [U.el("h3", {}, "Camera preview (local only)"), U.el("div", { class: "price-input-row" }, [startBtn, stopBtn]), camOut]));
    root.querySelectorAll(".api-panel")[1].appendChild(video);

    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Devices & alerts"),
      U.el("div", { class: "api-meta" }, "Open item from your Gmail summary (Oct 31): a Google sign-in on a Linux device on Oct 30 at 10:51 a.m. is still awaiting your confirmation whether it was you. If it was not you, secure the account at myaccount.google.com directly — never through an emailed link."),
      U.el("div", { class: "api-meta" }, "Check signed-in devices directly: Google — myaccount.google.com device activity; GitHub — github.com settings, Applications. A web page cannot list your devices for you without each account's own login and permission.")
    ]));
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.security = { render: render };
})(window);
