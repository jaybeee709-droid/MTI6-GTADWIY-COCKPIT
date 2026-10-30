/* MTI6-GTADWIY-COCKPIT — shared helpers */
(function (global) {
  "use strict";

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function esc(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtMoney(n) {
    const v = Number(n) || 0;
    return v.toLocaleString(undefined, { style: "currency", currency: getCurrency() });
  }

  function getCurrency() {
    try {
      return localStorage.getItem("cockpit_currency") || "USD";
    } catch (e) {
      return "USD";
    }
  }

  // Date-only values ("YYYY-MM-DD", from <input type="date">) must be parsed as a
  // LOCAL calendar date. `new Date("YYYY-MM-DD")` parses as UTC midnight, which
  // shifts the displayed/compared day backward by one in any negative UTC-offset
  // timezone (e.g. US timezones) — a due date of "2026-10-19" would show as
  // Oct 18 and could even be flagged overdue a day early. This helper avoids that.
  function parseLocalDate(value) {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function todayLocal() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // Local (not UTC) "YYYY-MM-DD", safe to drop straight into <input type="date">
  // or store as a date-only field. new Date().toISOString() is UTC and can land
  // on the wrong calendar day in the evening for negative-UTC-offset timezones.
  function todayDateInputValue() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    const d = parseLocalDate(iso);
    if (!d) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function fmtDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function monthKey(dateStr) {
    const d = dateStr ? parseLocalDate(dateStr) || new Date(dateStr) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function toast(message, kind = "info") {
    let host = document.getElementById("toast-host");
    if (!host) {
      host = el("div", { id: "toast-host", class: "toast-host" });
      document.body.appendChild(host);
    }
    const node = el("div", { class: `toast toast-${kind}` }, message);
    host.appendChild(node);
    requestAnimationFrame(() => node.classList.add("show"));
    setTimeout(() => {
      node.classList.remove("show");
      setTimeout(() => node.remove(), 300);
    }, 2600);
  }

  function confirmDialog(message) {
    return new Promise((resolve) => {
      const overlay = el("div", { class: "modal-overlay" });
      const box = el("div", { class: "modal-box" }, [
        el("p", { class: "modal-message" }, message),
        el("div", { class: "modal-actions" }, [
          el("button", { class: "btn btn-ghost", onclick: () => { overlay.remove(); resolve(false); } }, "Cancel"),
          el("button", { class: "btn btn-danger", onclick: () => { overlay.remove(); resolve(true); } }, "Delete")
        ])
      ]);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    });
  }

  function debounce(fn, delay = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  // ---- Inline field validation messages ---------------------------------
  // Shows/clears a small error line directly under a form field, in addition
  // to the toast notices already used for save-time feedback.
  function fieldError(input, message) {
    clearFieldError(input);
    if (!message) return;
    input.classList.add("input-invalid");
    input.setAttribute("aria-invalid", "true");
    const msg = el("div", { class: "field-error", role: "alert" }, message);
    input.insertAdjacentElement("afterend", msg);
  }

  function clearFieldError(input) {
    input.classList.remove("input-invalid");
    input.removeAttribute("aria-invalid");
    const next = input.nextElementSibling;
    if (next && next.classList && next.classList.contains("field-error")) {
      next.remove();
    }
  }

  // ---- Buttons that show progress while an async action runs ------------
  function withButtonLoading(btn, busyLabel, fn) {
    return async (...args) => {
      if (btn.disabled) return;
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.classList.add("btn-loading");
      btn.textContent = busyLabel || originalLabel;
      try {
        return await fn(...args);
      } finally {
        btn.disabled = false;
        btn.classList.remove("btn-loading");
        btn.textContent = originalLabel;
      }
    };
  }

  // ---- Skeleton loading placeholders --------------------------------------
  function skeletonBlock() {
    return el("div", { class: "skeleton-view" }, [
      el("div", { class: "skeleton-line skeleton-title" }),
      el("div", { class: "skeleton-card" }),
      el("div", { class: "skeleton-card" }),
      el("div", { class: "skeleton-card" })
    ]);
  }

  // ---- Error / empty-route panels ----------------------------------------
  function errorPanel({ title, message, onRetry, onHome }) {
    return el("div", { class: "error-panel" }, [
      el("div", { class: "error-icon" }, "⚠️"),
      el("h2", {}, title || "Something went wrong"),
      el("p", { class: "about-text" }, message || "Please try again."),
      el("div", { class: "modal-actions", style: "justify-content:center" }, [
        onRetry ? el("button", { class: "btn btn-secondary", onclick: onRetry }, "Try again") : null,
        onHome ? el("button", { class: "btn btn-primary", onclick: onHome }, "Go to dashboard") : null
      ])
    ]);
  }

  global.U = {
    el,
    esc,
    fmtMoney,
    fmtDate,
    fmtDateTime,
    monthKey,
    toast,
    confirmDialog,
    debounce,
    getCurrency,
    parseLocalDate,
    todayLocal,
    todayDateInputValue,
    fieldError,
    clearFieldError,
    withButtonLoading,
    skeletonBlock,
    errorPanel
  };
})(window);
