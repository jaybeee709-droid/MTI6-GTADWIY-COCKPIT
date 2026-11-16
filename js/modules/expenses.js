/* MTI6-GTADWIY-COCKPIT — Expense Tracker module (no payment/financial-transaction features — a local ledger only) */
(function (global) {
  "use strict";
  const { el, fmtMoney, fmtDate, monthKey, parseLocalDate, todayDateInputValue } = U;

  const KINDS = ["expense", "asset", "purchase"];
  const KIND_LABELS = { expense: "Expense", asset: "Asset", purchase: "Purchase" };

  let state = { month: monthKey(), kindFilter: "all", expenses: [] };

  async function render(root) {
    const expenses = await CockpitDB.getAll("expenses");
    state.expenses = expenses;
    const months = Array.from(new Set(expenses.map((e) => e.monthKey))).sort().reverse();
    if (!months.includes(state.month)) {
      if (!months.includes(monthKey())) months.unshift(monthKey());
      state.month = months[0];
    }

    root.innerHTML = "";
    root.appendChild(
      el("div", { class: "view-header" }, [
        el("h1", {}, "Resource Tracker"),
        el("button", { class: "btn btn-primary", onclick: () => openEditor(root) }, "+ Add Entry")
      ])
    );

    const monthSelect = el(
      "select",
      { class: "input", onchange: (e) => { state.month = e.target.value; renderBody(root); } },
      months.map((m) => el("option", { value: m, selected: m === state.month || undefined }, m))
    );
    const kindSelect = el(
      "select",
      { class: "input", onchange: (e) => { state.kindFilter = e.target.value; renderBody(root); } },
      [
        el("option", { value: "all", selected: state.kindFilter === "all" || undefined }, "All kinds"),
        ...KINDS.map((k) => el("option", { value: k, selected: k === state.kindFilter || undefined }, KIND_LABELS[k]))
      ]
    );
    root.appendChild(el("div", { class: "toolbar" }, [monthSelect, kindSelect]));
    root.appendChild(el("div", { id: "expense-stats", class: "stat-row" }));
    root.appendChild(el("h2", { class: "section-title" }, "Category Breakdown"));
    root.appendChild(el("div", { id: "expense-breakdown" }));
    root.appendChild(el("h2", { class: "section-title" }, "Expenses, Assets & Purchases This Month"));
    root.appendChild(el("div", { id: "expense-list", class: "list-stack" }));
    renderBody(root);
  }

  function renderBody(root) {
    const monthExpenses = state.expenses
      .filter((e) => e.monthKey === state.month)
      .filter((e) => (state.kindFilter === "all" ? true : (e.kind || "expense") === state.kindFilter))
      .sort((a, b) => (parseLocalDate(b.date) || 0) - (parseLocalDate(a.date) || 0));
    const monthTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const runningTotal = state.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const byCategory = {};
    monthExpenses.forEach((e) => {
      byCategory[e.category || "Other"] = (byCategory[e.category || "Other"] || 0) + Number(e.amount || 0);
    });

    const statsEl = root.querySelector("#expense-stats");
    statsEl.innerHTML = "";
    statsEl.appendChild(statCard("Month total", fmtMoney(monthTotal), state.month));
    statsEl.appendChild(statCard("Running total (all time)", fmtMoney(runningTotal), `${state.expenses.length} entries`));
    statsEl.appendChild(statCard("Top category", topCategory(byCategory), ""));

    renderCategoryBreakdown(root, byCategory, monthTotal);

    const listEl = root.querySelector("#expense-list");
    listEl.innerHTML = "";
    if (!monthExpenses.length) {
      listEl.appendChild(el("div", { class: "empty-state" }, "Nothing logged for this month and filter yet."));
      return;
    }
    monthExpenses.forEach((e) => listEl.appendChild(expenseRow(root, e)));
  }

  function renderCategoryBreakdown(root, byCategory, monthTotal) {
    const el2 = root.querySelector("#expense-breakdown");
    el2.innerHTML = "";
    const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      el2.appendChild(el("div", { class: "empty-state" }, "No expenses to break down yet this month."));
      return;
    }
    const wrap = el("div", { class: "category-breakdown" });
    entries.forEach(([cat, total]) => {
      const pct = monthTotal > 0 ? Math.round((total / monthTotal) * 100) : 0;
      wrap.appendChild(
        el("div", { class: "breakdown-row" }, [
          el("div", { class: "breakdown-row-top" }, [
            el("span", {}, cat),
            el("span", {}, `${fmtMoney(total)} (${pct}%)`)
          ]),
          el("div", { class: "breakdown-bar-track" }, [el("div", { class: "breakdown-bar-fill", style: `width:${pct}%` })])
        ])
      );
    });
    el2.appendChild(wrap);
  }

  function topCategory(byCategory) {
    const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return "—";
    return `${entries[0][0]} (${fmtMoney(entries[0][1])})`;
  }

  function statCard(label, value, sub) {
    return el("div", { class: "stat-card" }, [
      el("div", { class: "stat-label" }, label),
      el("div", { class: "stat-value" }, value),
      sub ? el("div", { class: "stat-sub" }, sub) : null
    ]);
  }

  function kindBadgeClass(kind) {
    return { expense: "badge-neutral", asset: "badge-success", purchase: "pri-med" }[kind] || "badge-neutral";
  }

  function expenseRow(root, e) {
    const kind = e.kind || "expense";
    return el("div", { class: "list-item" }, [
      el("div", { class: "list-item-main" }, [
        el("div", { class: "list-item-title" }, e.description || "(no description)"),
        el("div", { class: "list-item-sub" }, [
          el("span", { class: `badge ${kindBadgeClass(kind)}` }, KIND_LABELS[kind] || "Expense"),
          el("span", { class: "badge badge-cat" }, e.category || "Other"),
          el("span", { class: "badge badge-neutral" }, fmtDate(e.date))
        ])
      ]),
      el("div", { class: "amount-tag" }, fmtMoney(e.amount)),
      el("div", { class: "card-actions" }, [
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => openEditor(root, e) }, "Edit"),
        el("button", {
          class: "btn btn-ghost btn-sm btn-danger-text",
          onclick: async () => {
            const ok = await U.confirmDialog(`Delete this ${(KIND_LABELS[e.kind || "expense"] || "Expense").toLowerCase()} (${fmtMoney(e.amount)})?`);
            if (!ok) return;
            await CockpitDB.delete("expenses", e.id);
            await CockpitDB.logActivity("expense", `Deleted expense "${e.description || ""}"`, e.id);
            U.toast("Expense deleted");
            render(root);
          }
        }, "Delete")
      ])
    ]);
  }

  function openEditor(root, existing) {
    const isNew = !existing;
    const draft = existing
      ? { ...existing }
      : { id: CockpitDB.uuid(), description: "", amount: "", category: "", date: todayDateInputValue(), kind: "expense" };

    const overlay = el("div", { class: "modal-overlay" });
    const kindSelect = el(
      "select",
      { class: "input" },
      KINDS.map((k) => el("option", { value: k, selected: k === (draft.kind || "expense") || undefined }, KIND_LABELS[k]))
    );
    const descInput = el("input", { class: "input", value: draft.description, placeholder: "Description" });
    const amountInput = el("input", { class: "input", type: "number", step: "0.01", min: "0", value: draft.amount, placeholder: "Amount" });
    const categoryInput = el("input", { class: "input", value: draft.category, placeholder: "Category (e.g. Groceries, Transport)" });
    const dateInput = el("input", { class: "input", type: "date", value: draft.date });

    const box = el("div", { class: "modal-box" }, [
      el("h2", {}, isNew ? "Add Entry" : "Edit Entry"),
      el("label", { class: "field-label" }, "Kind"),
      kindSelect,
      el("label", { class: "field-label" }, "Description"),
      descInput,
      el("label", { class: "field-label" }, "Amount"),
      amountInput,
      el("label", { class: "field-label" }, "Category"),
      categoryInput,
      el("label", { class: "field-label" }, "Date"),
      dateInput,
      el("div", { class: "modal-actions" }, [
        el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Cancel"),
        el("button", {
          class: "btn btn-primary",
          onclick: async (ev) => {
            const amount = parseFloat(amountInput.value);
            let hasError = false;
            if (!descInput.value.trim()) {
              U.fieldError(descInput, "Add a short description.");
              hasError = true;
            } else {
              U.clearFieldError(descInput);
            }
            if (isNaN(amount) || amount < 0) {
              U.fieldError(amountInput, "Enter a valid amount of zero or more.");
              hasError = true;
            } else {
              U.clearFieldError(amountInput);
            }
            if (hasError) return;

            const btn = ev.currentTarget;
            await U.withButtonLoading(btn, "Saving…", async () => {
              draft.kind = kindSelect.value;
              draft.description = descInput.value.trim();
              draft.amount = amount;
              draft.category = categoryInput.value.trim() || "Other";
              draft.date = dateInput.value || todayDateInputValue();
              draft.monthKey = monthKey(draft.date);
              draft.updatedAt = new Date().toISOString();
              draft.createdAt = draft.createdAt || draft.updatedAt;
              await CockpitDB.put("expenses", draft);
              await CockpitDB.logActivity(
                "expense",
                `${isNew ? "Added" : "Updated"} ${KIND_LABELS[draft.kind].toLowerCase()} "${draft.description}"`,
                draft.id
              );
              overlay.remove();
              state.month = draft.monthKey;
              U.toast(isNew ? "Entry added" : "Entry saved");
              render(root);
            })();
          }
        }, "Save Expense")
      ])
    ]);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    descInput.addEventListener("input", () => U.clearFieldError(descInput));
    amountInput.addEventListener("input", () => U.clearFieldError(amountInput));
    descInput.focus();
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.expenses = { render, openNew: (root) => openEditor(root) };
})(window);
