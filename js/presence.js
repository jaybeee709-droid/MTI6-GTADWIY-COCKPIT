/* MTI6-GTADWIY-COCKPIT — Presence (Presence Anywhere Build 1)
 *
 * Owner ruling (2026-11-16): "star or any bot can appear talking
 * anywhere on any screen." This module is the reusable presence
 * card behind that ruling: a figure (a portrait image with a
 * graceful fallback) standing at a corner of the CURRENT screen
 * with a speech bubble beside it and a close control. It is
 * position:fixed inside the app viewport, above the screen's
 * content, anchored bottom-left — the STAR launcher lives
 * bottom-right and the card never covers it.
 *
 * Only ONE presence exists at a time: show() replaces whatever is
 * showing, hide() removes it. There are no timers and no sound:
 * the card renders when show() is called and changes only when
 * show() / hide() is called again. Its one motion is a small
 * entrance fade/slide, disabled under prefers-reduced-motion.
 *
 * Truth rules (do not weaken them):
 * - The bubble only ever carries text the caller derived from
 *   real state: STAR's actual chat content, or a principal's
 *   recorded state presented under a label that says it is a
 *   record readout, not live speech. This component never
 *   invents dialogue, opinions, or activity for anyone.
 * - A missing image (or one that fails to load) falls back to
 *   the caller's fallback node / mark text; the card still
 *   renders honestly without any portrait at all.
 *
 * API:
 *   Presence.show({ figureSrc, fallbackNode, fallbackText, name,
 *                   label, lines, mood }) -> the card element
 *   Presence.hide()
 *   Presence.isShowing() -> boolean
 *   Presence.currentName() -> string | null
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var rootEl = null;
  var currentName = null;

  function fallbackFigure(opts) {
    if (opts.fallbackNode && typeof opts.fallbackNode === "object" &&
        typeof opts.fallbackNode.nodeType === "number") {
      return opts.fallbackNode;
    }
    var text = typeof opts.fallbackText === "string" && opts.fallbackText
      ? opts.fallbackText
      : (typeof opts.name === "string" && opts.name ? opts.name.charAt(0) : "?");
    return U.el("div", { class: "presence-figure-mark", "aria-hidden": "true" }, text);
  }

  function figureNode(opts) {
    var src = typeof opts.figureSrc === "string" && opts.figureSrc ? opts.figureSrc : null;
    if (!src) return fallbackFigure(opts);
    var img = U.el("img", {
      class: "presence-figure-img",
      src: src,
      alt: "",
      onerror: function () {
        var slot = img.parentNode;
        if (slot) {
          slot.innerHTML = "";
          slot.appendChild(fallbackFigure(opts));
        }
      }
    });
    return img;
  }

  function show(opts) {
    opts = opts && typeof opts === "object" ? opts : {};
    hide();
    var name = typeof opts.name === "string" && opts.name ? opts.name : "Presence";
    var lines = Array.isArray(opts.lines) ? opts.lines
      : (typeof opts.lines === "string" && opts.lines ? [opts.lines] : []);
    var mood = typeof opts.mood === "string" && /^[a-z0-9-]+$/i.test(opts.mood) ? opts.mood : null;

    var bubbleChildren = [];
    lines.forEach(function (line) {
      bubbleChildren.push(U.el("div", { class: "presence-line" }, String(line)));
    });

    var mainChildren = [
      U.el("div", { class: "presence-head" }, [
        U.el("span", { class: "presence-name" }, name),
        U.el("button", {
          class: "btn btn-ghost btn-sm presence-close",
          type: "button",
          "aria-label": "Close presence",
          title: "Close presence",
          onclick: function () { hide(); }
        }, "×")
      ])
    ];
    if (typeof opts.label === "string" && opts.label) {
      mainChildren.push(U.el("div", { class: "presence-label" }, opts.label));
    }
    mainChildren.push(U.el("div", { class: "presence-bubble" }, bubbleChildren));

    rootEl = U.el("div", {
      class: "presence" + (mood ? " presence--" + mood : ""),
      role: "dialog",
      "aria-label": name + " presence"
    }, [
      U.el("div", { class: "presence-figure", "aria-hidden": "true" }, [figureNode(opts)]),
      U.el("div", { class: "presence-main" }, mainChildren)
    ]);
    currentName = name;
    document.body.appendChild(rootEl);
    return rootEl;
  }

  function hide() {
    if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
    rootEl = null;
    currentName = null;
  }

  function isShowing() {
    return !!rootEl;
  }

  global.Presence = {
    show: show,
    hide: hide,
    isShowing: isShowing,
    currentName: function () { return currentName; }
  };
})(window);
