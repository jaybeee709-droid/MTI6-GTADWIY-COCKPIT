/* MTI6-GTADWIY-COCKPIT — World Globe screen (read-only)
 * Weather from Open-Meteo (no key, browser-direct) and world news
 * from the Hacker News API via the scouts layer. No fake data:
 * if a source fails, the error is shown, not a made-up forecast.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  function fmtTime(iso) {
    try { return new Date(iso).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }); }
    catch (e) { return iso || ""; }
  }

  async function render(root) {
    root.appendChild(global.ScreensNav ? global.ScreensNav.renderDots("globe") : U.el("div", {}, ""));
    root.appendChild(U.el("h2", { class: "section-title" }, "🌍 World Globe"));
    root.appendChild(U.el("p", { class: "api-subtitle" }, "Weather and news from public APIs. Nothing here is a live map of you or anyone else — just world weather and headlines."));

    var lat = U.el("input", { class: "price-input", type: "text", value: "40.71", "aria-label": "Latitude" });
    var lon = U.el("input", { class: "price-input", type: "text", value: "-74.00", "aria-label": "Longitude" });
    var btn = U.el("button", { class: "btn btn-primary", type: "button" }, "Load weather");
    var out = U.el("div", { class: "api-meta" }, "Enter latitude/longitude (default: New York City) and tap Load weather.");
    btn.addEventListener("click", function () {
      out.textContent = "Loading weather…";
      var url = "https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(lat.value.trim()) + "&longitude=" + encodeURIComponent(lon.value.trim()) + "&current_weather=true";
      fetch(url).then(function (res) { if (!res.ok) throw new Error("http_" + res.status); return res.json(); }).then(function (data) {
        try { if (global.ApiRegistry) global.ApiRegistry.record("open-meteo", true, 200); } catch (e) {}
        var w = data && data.current_weather;
        if (!w) { out.textContent = "No weather data returned for those coordinates."; return; }
        out.textContent = "Now: " + w.temperature + "°C, wind " + w.windspeed + " km/h, direction " + w.winddirection + "° · Open-Meteo · " + fmtTime(w.time);
      }).catch(function () {
        try { if (global.ApiRegistry) global.ApiRegistry.record("open-meteo", false, null); } catch (e) {}
        out.textContent = "Could not reach Open-Meteo right now. Check the coordinates and try again.";
      });
    });
    root.appendChild(U.el("div", { class: "api-panel" }, [
      U.el("h3", {}, "Weather"), U.el("div", { class: "price-input-row" }, [lat, lon, btn]), out
    ]));

    var newsBtn = U.el("button", { class: "btn btn-primary", type: "button" }, "Load headlines");
    var newsOut = U.el("div", { class: "api-meta" }, "Tap Load headlines for Hacker News top stories.");
    newsBtn.addEventListener("click", function () {
      newsOut.textContent = "Loading…";
      if (!global.KnowledgeScout) { newsOut.textContent = "News scout did not load. Reload and try again."; return; }
      global.KnowledgeScout.getNews(8).then(function (r) {
        if (r.status === "error") { newsOut.textContent = r.note; return; }
        newsOut.innerHTML = "";
        var list = U.el("ul", { class: "price-offer-list" });
        r.items.forEach(function (it) { list.appendChild(U.el("li", {}, it.title + " (" + it.score + " pts) — " + it.url)); });
        newsOut.appendChild(list);
      });
    });
    root.appendChild(U.el("div", { class: "api-panel" }, [U.el("h3", {}, "World headlines"), newsBtn, newsOut]));
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.globe = { render: render };
})(window);
