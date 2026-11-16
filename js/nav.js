/* MTI6-GTADWIY-COCKPIT — master-shell navigation structure (Build 1)
 *
 * Groups the app.js ROUTES into the drawer's Primary / Secondary
 * sections. Every drawer route appears in exactly one group, so
 * reorganizing navigation never orphans a working screen. Tasks,
 * Projects, and Resource Tracker are deliberately NOT in the drawer:
 * Mission Control belongs under Operations, and those three routes are
 * reached from the Operations screen (and the dashboard's Quick
 * Actions) instead.
 *
 * Secondary also keeps Crypto Market, Web, and Data Analytics reachable:
 * the master-shell nav lists do not name them, but the preservation rule
 * forbids deleting working screens, so they stay here instead of being
 * dropped. Data Analytics keeps its locked look; only its drawer
 * position changes.
 *
 * ICONS holds original MTI6 line-art (inline SVG / spans) for the
 * identities the spec calls out by shape — two interlocking gears for
 * Operations (never the single gear of Settings), a single gear for
 * Settings, a black house for Cockpit Status, a black credit card with a
 * metallic stripe for Accounts & Finance, and a dark motherboard chip
 * for Bot Operations (never a generic robot icon). Routes without an
 * entry here keep their emoji from ROUTES. The class names are semantic
 * so final icon assets can replace these placeholders without any
 * navigation refactoring.
 */
(function (global) {
  "use strict";

  var PRIMARY = [
    "globe",
    "crypto-world",
    "bot-ops",
    "wallets",
    "opportunities",
    "earn",
    "positions",
    "encyclopedia"
  ];

  var SECONDARY = [
    "dashboard",
    "operations",
    "vault",
    "accounts",
    "security",
    "settings",
    "crypto",
    "web",
    "analytics"
  ];

  function groupOf(route) {
    if (PRIMARY.indexOf(route) !== -1) return "primary";
    if (SECONDARY.indexOf(route) !== -1) return "secondary";
    return null;
  }

  var SVG_OPEN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

  var ICONS = {
    // Cockpit Status — black house, electric-blue detail (via CSS class).
    dashboard:
      SVG_OPEN +
      '<path d="M3 11.5 12 4l9 7.5"/>' +
      '<path d="M5.5 10.5V20h13v-9.5"/>' +
      '<path d="M10 20v-5.5h4V20"/>' +
      "</svg>",
    // Operations — two interlocking mechanical gears: one black, one
    // brushed metallic silver, small electric-blue detail.
    operations:
      '<span class="gear-pair" aria-hidden="true">' +
      '<span class="gear gear-black">⚙</span>' +
      '<span class="gear gear-silver">⚙</span>' +
      '<span class="gear-dot"></span>' +
      "</span>",
    // Settings — single gear identity.
    settings: '<span class="gear gear-single" aria-hidden="true">⚙</span>',
    // Accounts & Finance — black credit card, dark metallic-silver
    // magnetic stripe, subtle electric-blue accent.
    accounts:
      SVG_OPEN +
      '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/>' +
      '<rect x="2.5" y="8.5" width="19" height="2.6" fill="currentColor" stroke="none" class="card-stripe"/>' +
      '<path d="M6 15.5h4"/>' +
      "</svg>",
    // Bot Operations — dark motherboard processor chip, royal-purple /
    // violet circuit glow (via CSS class). NOT a generic robot icon.
    "bot-ops":
      SVG_OPEN +
      '<rect x="7" y="7" width="10" height="10" rx="1.5"/>' +
      '<rect x="10" y="10" width="4" height="4"/>' +
      '<path d="M9 7V3.5M12 7V3.5M15 7V3.5M9 20.5V17M12 20.5V17M15 20.5V17M7 9H3.5M7 12H3.5M7 15H3.5M20.5 9H17M20.5 12H17M20.5 15H17"/>' +
      "</svg>"
  };

  // Returns the drawer's icon HTML for a route, or the fallback (the
  // route's emoji from ROUTES) when no custom identity exists yet.
  function iconFor(route, fallback) {
    return ICONS[route] || fallback || "";
  }

  global.Mti6Nav = {
    PRIMARY: PRIMARY.slice(),
    SECONDARY: SECONDARY.slice(),
    groupOf: groupOf,
    iconFor: iconFor
  };
})(window);
