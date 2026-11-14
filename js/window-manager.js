/* MTI6-GTADWIY-COCKPIT — reusable floating-window shell (master shell, Build 1)
 *
 * One window system for STAR, summoned participants, and any MTI6 panel
 * that needs to float above the screen underneath without destroying it.
 *
 * Capabilities: default useful medium size, movable (drag the header),
 * resizable (drag the corner on desktop), minimize, maximize,
 * full-screen, close. On phones the window is a safe touch-first
 * near-full-width presentation. Windows never cause page-level
 * horizontal overflow: they are position:fixed and clamped to the
 * viewport, and the page itself clips horizontal overflow (see CSS).
 *
 * A window shows only what its caller builds into it — the manager
 * never invents content.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var openWindows = {}; // id -> { el, body, title, onClose }
  var order = []; // ids, most recently focused last
  var counter = 0;
  var zBase = 1000;

  function ensureHost() {
    var host = document.getElementById("wm-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "wm-host";
      document.body.appendChild(host);
    }
    return host;
  }

  function focus(id) {
    var win = openWindows[id];
    if (!win) return;
    order = order.filter(function (x) { return x !== id; });
    order.push(id);
    order.forEach(function (x, i) {
      if (openWindows[x]) openWindows[x].el.style.zIndex = String(zBase + i);
    });
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // opts: { id?, title, subtitle?, build(bodyEl), onClose? }
  // Returns the window id. Opening an id that is already open just
  // focuses it instead of duplicating it.
  function open(opts) {
    if (!opts || !opts.title) return null;
    var id = opts.id || "wm-" + ++counter;
    if (openWindows[id]) {
      focus(id);
      return id;
    }
    var host = ensureHost();

    var body = U.el("div", { class: "wm-body" });
    var titleEl = U.el("span", { class: "wm-title" }, opts.title);
    var headerActions = U.el("div", { class: "wm-actions" });
    var win = U.el("section", {
      class: "wm-window",
      role: "dialog",
      "aria-label": opts.title,
      "data-wm-id": id
    }, [
      U.el("div", { class: "wm-header" }, [
        titleEl,
        opts.subtitle ? U.el("span", { class: "wm-subtitle" }, opts.subtitle) : null,
        headerActions
      ]),
      body
    ]);

    function addBtn(label, aria, fn) {
      var b = U.el("button", { class: "btn btn-ghost btn-sm wm-btn", type: "button", "aria-label": aria, title: aria }, label);
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        fn();
      });
      headerActions.appendChild(b);
      return b;
    }

    addBtn("–", "Minimize window", function () { minimize(id); });
    addBtn("⤢", "Maximize window", function () { toggleMaximize(id); });
    addBtn("⛶", "Full-screen window", function () { toggleFullscreen(id); });
    addBtn("✕", "Close window", function () { close(id); });

    host.appendChild(win);
    openWindows[id] = { el: win, body: body, title: opts.title, onClose: opts.onClose || null };
    order.push(id);
    focus(id);

    // Drag by the header (not the buttons). Pointer events cover mouse
    // and touch; the window is clamped inside the viewport.
    var header = win.querySelector(".wm-header");
    var drag = null;
    header.addEventListener("pointerdown", function (e) {
      if (e.target && e.target.closest && e.target.closest("button")) return;
      var rect = win.getBoundingClientRect();
      drag = {
        startX: e.clientX,
        startY: e.clientY,
        left: rect.left,
        top: rect.top
      };
      win.classList.add("wm-placed");
      win.style.left = rect.left + "px";
      win.style.top = rect.top + "px";
      win.style.transform = "none";
      try { header.setPointerCapture(e.pointerId); } catch (err) {}
    });
    header.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var w = win.offsetWidth || 320;
      var h = win.offsetHeight || 200;
      var maxLeft = Math.max(0, (global.innerWidth || 800) - Math.min(w, 160));
      var maxTop = Math.max(0, (global.innerHeight || 600) - 80);
      win.style.left = clamp(drag.left + (e.clientX - drag.startX), 0, maxLeft) + "px";
      win.style.top = clamp(drag.top + (e.clientY - drag.startY), 0, maxTop) + "px";
    });
    function endDrag() { drag = null; }
    header.addEventListener("pointerup", endDrag);
    header.addEventListener("pointercancel", endDrag);

    win.addEventListener("pointerdown", function () { focus(id); });

    try {
      if (typeof opts.build === "function") opts.build(body);
    } catch (err) {
      body.appendChild(U.el("p", { class: "api-meta" }, "This window could not load its content. Close it and try again."));
    }
    return id;
  }

  function minimize(id) {
    var win = openWindows[id];
    if (!win) return;
    var el = win.el;
    var wasMin = el.classList.contains("wm-minimized");
    el.classList.remove("wm-maximized");
    el.classList.toggle("wm-minimized");
    if (!wasMin) {
      // Stack minimized windows above the bottom edge, newest lowest.
      var minCount = order.filter(function (x) {
        return openWindows[x] && openWindows[x].el.classList.contains("wm-minimized");
      }).length;
      el.style.bottom = 12 + (minCount - 1) * 52 + "px";
    } else {
      el.style.bottom = "";
    }
  }

  function toggleMaximize(id) {
    var win = openWindows[id];
    if (!win) return;
    var el = win.el;
    el.classList.remove("wm-minimized");
    el.style.bottom = "";
    el.classList.toggle("wm-maximized");
    if (!el.classList.contains("wm-maximized")) {
      el.style.left = "";
      el.style.top = "";
      el.style.transform = "";
      el.classList.remove("wm-placed");
    }
  }

  function toggleFullscreen(id) {
    var win = openWindows[id];
    if (!win) return;
    var el = win.el;
    if (document.fullscreenElement === el) {
      if (document.exitFullscreen) document.exitFullscreen().catch(function () {});
      return;
    }
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(function () {
        // Full-screen unavailable (e.g. permissions) — fall back to the
        // in-page maximized state instead of failing silently.
        toggleMaximize(id);
      });
    } else {
      toggleMaximize(id);
    }
  }

  function close(id) {
    var win = openWindows[id];
    if (!win) return;
    if (document.fullscreenElement === win.el && document.exitFullscreen) {
      document.exitFullscreen().catch(function () {});
    }
    if (win.el.parentNode) win.el.parentNode.removeChild(win.el);
    var onClose = win.onClose;
    delete openWindows[id];
    order = order.filter(function (x) { return x !== id; });
    if (typeof onClose === "function") {
      try { onClose(); } catch (e) {}
    }
  }

  function closeAll() {
    Object.keys(openWindows).forEach(close);
  }

  function list() {
    return order.slice();
  }

  // True when a window with this id is currently open. Used by
  // callers (e.g. Participants) to prune stale references to windows
  // closed outside their own bookkeeping.
  function isOpen(id) {
    return !!openWindows[id];
  }

  global.WindowManager = {
    open: open,
    close: close,
    closeAll: closeAll,
    minimize: minimize,
    toggleMaximize: toggleMaximize,
    toggleFullscreen: toggleFullscreen,
    focus: focus,
    isOpen: isOpen,
    list: list
  };
})(window);
