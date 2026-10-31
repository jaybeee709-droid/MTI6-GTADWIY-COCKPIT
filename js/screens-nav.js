/* MTI6-GTADWIY-COCKPIT — shared dot rail for the new screens
 * A horizontally scrollable row of dots at the top of each new
 * screen. Slide right to reach the next screen; the active dot is
 * filled. Tapping a dot changes the hash route — the same router
 * the rest of the cockpit uses, so no screen is a dead end.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;
  var SCREENS = [
    { route: "dashboard", icon: "🏠", label: "Dashboard" },
    { route: "globe", icon: "🌍", label: "Globe" },
    { route: "crypto", icon: "₿", label: "Crypto" },
    { route: "accounts", icon: "💼", label: "Our Accounts" },
    { route: "earn", icon: "💵", label: "Earn" },
    { route: "web", icon: "🌐", label: "Web" },
    { route: "security", icon: "🛡️", label: "Security" }
  ];
  function renderDots(current) {
    var rail = U.el("div", { class: "dot-rail", role: "navigation", "aria-label": "Screens" });
    SCREENS.forEach(function (s) {
      var btn = U.el("button", { class: "dot" + (s.route === current ? " dot-active" : ""), type: "button", title: s.label, "aria-label": s.label }, s.icon);
      btn.addEventListener("click", function () { location.hash = "#/" + s.route; });
      rail.appendChild(btn);
    });
    return rail;
  }
  global.ScreensNav = { renderDots: renderDots, SCREENS: SCREENS };
})(window);
