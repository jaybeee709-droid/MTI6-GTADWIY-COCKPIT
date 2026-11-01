/* MTI6-GTADWIY-COCKPIT — Charts (zero-dependency SVG)
 * Small chart helpers used by the Crypto screen and the Analytics
 * screen. No chart library, no network calls here: callers pass real
 * data points only. A chart is never drawn from invented data — if
 * the caller has no points, it renders an honest "no data" note.
 * Colors are bright and high-contrast on the dark cockpit theme so
 * charts stay readable on a phone in daylight and on desktop.
 * SVG viewBox scaling makes every chart fit phone and desktop
 * widths without separate layouts.
 */
(function (global) {
  "use strict";

  var COLORS = ["#00e5ff", "#ffab00", "#76ff03", "#ff4081", "#7c4dff", "#00e676", "#ffea00"];

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function fmt(n) {
    return (Math.round(Number(n) * 100) / 100).toString();
  }

  // Line chart: points = [{x, y}] in data order. Returns an SVG string.
  function lineChart(points, opts) {
    opts = opts || {};
    var w = 600, h = 260, padL = 8, padR = 8, padT = 12, padB = 28;
    if (!points || points.length < 2) return '<div class="api-meta">Not enough data to draw this chart yet.</div>';
    var ys = points.map(function (p) { return p.y; });
    var min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
    if (max === min) { max = min + 1; }
    var iw = w - padL - padR, ih = h - padT - padB;
    var px = function (i) { return padL + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw); };
    var py = function (y) { return padT + (1 - (y - min) / (max - min)) * ih; };
    var d = points.map(function (p, i) { return (i === 0 ? "M" : "L") + fmt(px(i)) + " " + fmt(py(p.y)); }).join(" ");
    var color = opts.color || COLORS[0];
    var first = points[0], last = points[points.length - 1];
    var change = last.y - first.y;
    var changePct = first.y ? (change / first.y) * 100 : 0;
    var label = opts.label || "";
    var svg = '<svg class="chart-svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label) + '">'
      + '<line x1="' + padL + '" y1="' + fmt(py(min)) + '" x2="' + (w - padR) + '" y2="' + fmt(py(min)) + '" class="chart-grid"/>'
      + '<line x1="' + padL + '" y1="' + fmt(py(max)) + '" x2="' + (w - padR) + '" y2="' + fmt(py(max)) + '" class="chart-grid"/>'
      + '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>'
      + '<circle cx="' + fmt(px(points.length - 1)) + '" cy="' + fmt(py(last.y)) + '" r="6" fill="' + color + '"/>'
      + '<text x="' + padL + '" y="' + (h - 8) + '" class="chart-label">' + esc(opts.xLabel || "") + '</text>'
      + '<text x="' + (w - padR) + '" y="' + (h - 8) + '" class="chart-label" text-anchor="end">' + esc(opts.xLabelEnd || "") + '</text>'
      + '</svg>';
    var summary = label ? '<div class="chart-summary">' + esc(label) + ': ' + esc(fmt(last.y)) + ' (' + (change >= 0 ? "+" : "") + fmt(changePct) + '% over the period)</div>' : "";
    return '<div class="chart-wrap">' + svg + summary + '</div>';
  }

  // Bar chart: items = [{label, value}]. Values must be real counts or
  // sums from the caller's own data. Returns an HTML string.
  function barChart(items, opts) {
    opts = opts || {};
    if (!items || !items.length) return '<div class="api-meta">No data to chart yet.</div>';
    var max = Math.max.apply(null, items.map(function (i) { return Math.abs(i.value); })) || 1;
    var rows = items.map(function (item, i) {
      var color = opts.colors ? opts.colors[i % opts.colors.length] : COLORS[i % COLORS.length];
      var pct = Math.max(2, Math.round((Math.abs(item.value) / max) * 100));
      return '<div class="chart-bar-row"><span class="chart-bar-label">' + esc(item.label) + '</span>'
        + '<span class="chart-bar-track"><span class="chart-bar-fill" style="width:' + pct + '%;background:' + color + '"></span></span>'
        + '<span class="chart-bar-value">' + esc(String(item.value)) + '</span></div>';
    }).join("");
    return '<div class="chart-bars">' + rows + '</div>';
  }

  global.Charts = { lineChart: lineChart, barChart: barChart, COLORS: COLORS };
})(window);
