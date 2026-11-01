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
  // Example-dashboard palette the owner picked (photo of a dark teal
  // multi-panel dashboard, Nov 1, 2026): teal, peach, pink, amber,
  // lavender, green. Used for pies/donuts so shares read clearly.
  var PALETTE = ["#00d0c5", "#ffb08a", "#ff7eb6", "#ffc53d", "#b39ddb", "#69f0ae", "#4dd0e1"];

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

  // Pie / donut chart: items = [{label, value}] with non-negative
  // values only (shares of a total). Negative or zero slices are left
  // out and noted. opts.donut true cuts the center out (donut style).
  // Returns SVG + legend with percentages that sum to 100%.
  function pieChart(items, opts) {
    opts = opts || {};
    var slices = (items || []).filter(function (i) { return Number(i.value) > 0; });
    if (!slices.length) return '<div class="api-meta">No positive values to chart as shares yet.</div>';
    var total = slices.reduce(function (s, i) { return s + Number(i.value); }, 0);
    if (!(total > 0)) return '<div class="api-meta">No positive values to chart as shares yet.</div>';
    var cx = 150, cy = 150, r = 120, inner = opts.donut ? 62 : 0;
    var start = -Math.PI / 2;
    var paths = slices.map(function (item, i) {
      var color = (opts.colors || PALETTE)[i % (opts.colors || PALETTE).length];
      var frac = Number(item.value) / total;
      var end = start + frac * Math.PI * 2;
      var large = frac > 0.5 ? 1 : 0;
      var x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      var x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
      var d;
      if (frac >= 0.999) {
        d = "M " + cx + " " + cy + " m -" + r + " 0 a " + r + " " + r + " 0 1 0 " + (2 * r) + " 0 a " + r + " " + r + " 0 1 0 -" + (2 * r) + " 0";
      } else if (inner > 0) {
        var ix1 = cx + inner * Math.cos(start), iy1 = cy + inner * Math.sin(start);
        var ix2 = cx + inner * Math.cos(end), iy2 = cy + inner * Math.sin(end);
        d = "M " + fmt(x1) + " " + fmt(y1) + " A " + r + " " + r + " 0 " + large + " 1 " + fmt(x2) + " " + fmt(y2)
          + " L " + fmt(ix2) + " " + fmt(iy2) + " A " + inner + " " + inner + " 0 " + large + " 0 " + fmt(ix1) + " " + fmt(iy1) + " Z";
      } else {
        d = "M " + cx + " " + cy + " L " + fmt(x1) + " " + fmt(y1) + " A " + r + " " + r + " 0 " + large + " 1 " + fmt(x2) + " " + fmt(y2) + " Z";
      }
      start = end;
      return '<path d="' + d + '" fill="' + color + '" stroke="#0e3540" stroke-width="2"/>';
    }).join("");
    var legend = slices.map(function (item, i) {
      var color = (opts.colors || PALETTE)[i % (opts.colors || PALETTE).length];
      var pct = Math.round((Number(item.value) / total) * 1000) / 10;
      return '<div class="chart-legend-item"><span class="chart-legend-dot" style="background:' + color + '"></span>'
        + esc(item.label) + ' — ' + pct + '% (' + esc(String(item.value)) + ')</div>';
    }).join("");
    var svg = '<svg class="chart-svg chart-pie" viewBox="0 0 300 300" role="img" aria-label="Share chart">' + paths + "</svg>";
    return '<div class="chart-pie-wrap">' + svg + '<div class="chart-legend">' + legend + "</div></div>";
  }

  global.Charts = { lineChart: lineChart, barChart: barChart, pieChart: pieChart, COLORS: COLORS, PALETTE: PALETTE };
})(window);
