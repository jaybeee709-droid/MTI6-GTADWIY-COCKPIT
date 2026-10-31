/* MTI6-GTADWIY-COCKPIT — Dashboard module */
(function (global) {
  "use strict";
  const { el, fmtMoney, fmtDate, fmtDateTime, monthKey, debounce, parseLocalDate, todayLocal } = U;

  // ---- Custom widgets -------------------------------------------------
  // Widget layout is user-configurable and persisted in the "widgets" store,
  // so the dashboard's widget set is real data, not a fixed hardcoded panel.
  const WIDGET_TYPES = {
    notes_count: { label: "Knowledge Vault count", route: "vault" },
    tasks_open: { label: "Open tasks", route: "tasks" },
    month_spend: { label: "This month's spend", route: "expenses" },
    active_projects: { label: "Active projects", route: "projects" },
    pinned_notes: { label: "Pinned notes list", route: "vault" },
    upcoming_tasks: { label: "Upcoming tasks list", route: "tasks" },
    recent_expenses: { label: "Recent expenses list", route: "expenses" },
    project_progress: { label: "Project progress list", route: "projects" },
    clock_date: { label: "Date & time", route: null },
    spend_chart: { label: "7-day spending chart", route: "expenses" }
  };

  const DEFAULT_WIDGETS = [
    { type: "notes_count", order: 0 },
    { type: "tasks_open", order: 1 },
    { type: "month_spend", order: 2 },
    { type: "active_projects", order: 3 },
    { type: "spend_chart", order: 4 }
  ];

  async function ensureDefaultWidgets() {
    const existing = await CockpitDB.getAll("widgets");
    if (existing.length) return existing;
    const seeded = [];
    for (const w of DEFAULT_WIDGETS) {
      const record = { id: CockpitDB.uuid(), type: w.type, order: w.order, title: "" };
      await CockpitDB.put("widgets", record);
      seeded.push(record);
    }
    return seeded;
  }

  async function render(root) {
    const [notes, tasks, expenses, projects, milestones, activity] = await Promise.all([
      CockpitDB.getAll("notes"),
      CockpitDB.getAll("tasks"),
      CockpitDB.getAll("expenses"),
      CockpitDB.getAll("projects"),
      CockpitDB.getAll("milestones"),
      CockpitDB.getAll("activity")
    ]);
    let widgets = await ensureDefaultWidgets();
    widgets = widgets.slice().sort((a, b) => (a.order || 0) - (b.order || 0));

    const data = { notes, tasks, expenses, projects, milestones };

    root.innerHTML = "";
    root.appendChild(
      el("div", { class: "view-header" }, [
        el("h1", {}, "MTI6 Cockpit Dashboard"),
        el("span", { class: "badge badge-cat cockpit-callsign" }, "COMMAND CENTER")
      ])
    );

    root.appendChild(
      el("input", {
        class: "input search-input dash-search",
        type: "search",
        placeholder: "Search notes, tasks, expenses, projects…",
        oninput: debounce((e) => runSearch(root, e.target.value, { notes, tasks, expenses, projects }), 200)
      })
    );
    root.appendChild(el("div", { id: "dash-search-results" }));

    // ---- Star 3.0 Command Chat (V1) ----------------------------------
    // Primary AI assistant panel, rendered on the dashboard only. It is
    // additive: if the Star layers fail to load, the dashboard still
    // renders everything else below, unchanged.
    if (global.StarChatUI && typeof global.StarChatUI.renderPanel === "function") {
      root.appendChild(el("h2", { class: "section-title" }, "Star 3.0 Command Chat"));
      root.appendChild(global.StarChatUI.renderPanel());
    }

    // ---- Price Scouts (V1) -------------------------------------------
    // Read-only price panel, rendered on the dashboard only. Same guard
    // as Star: if the price layers fail to load, the rest of the
    // dashboard still renders unchanged.
    if (global.PriceUI && typeof global.PriceUI.renderPanel === "function") {
      root.appendChild(el("h2", { class: "section-title" }, "Price Scouts"));
      root.appendChild(global.PriceUI.renderPanel());
    }

    // API health/usage panel, after Prices. Same guard: if the registry
    // or panel fails to load, the rest of the dashboard still renders.
    if (global.ApiHealthUI && typeof global.ApiHealthUI.renderPanel === "function") {
      root.appendChild(el("h2", { class: "section-title" }, "API Health & Usage"));
      root.appendChild(global.ApiHealthUI.renderPanel());
    }

    // ---- Quick Actions: jump straight into creating a new record, no
    // intermediate navigation step. Distinct from Quick Navigation below,
    // which only opens a screen without starting a new record.
    root.appendChild(el("h2", { class: "section-title" }, "Quick Actions"));
    root.appendChild(
      el("div", { class: "quicknav-grid quick-actions-grid" }, [
        quickActionButton("📝", "New Note", () => openQuickCreate(root, "vault")),
        quickActionButton("✅", "New Task", () => openQuickCreate(root, "tasks")),
        quickActionButton("💳", "Log Expense", () => openQuickCreate(root, "expenses")),
        quickActionButton("📁", "New Project", () => openQuickCreate(root, "projects"))
      ])
    );

    root.appendChild(
      el("div", { class: "view-header widgets-header" }, [
        el("h2", { class: "section-title", style: "margin:0" }, "System Widgets"),
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => openAddWidgetDialog(root) }, "+ Add Widget")
      ])
    );
    root.appendChild(
      el(
        "div",
        { class: "widget-grid" },
        widgets.map((w, i) => renderWidget(root, w, data, i, widgets))
      )
    );

    root.appendChild(el("h2", { class: "section-title" }, "Quick Navigation"));
    root.appendChild(
      el("div", { class: "quicknav-grid" }, [
        quickNavButton("📒", "Knowledge Vault", "vault"),
        quickNavButton("✅", "Mission Control", "tasks"),
        quickNavButton("💰", "Resource Tracker", "expenses"),
        quickNavButton("📁", "Projects", "projects"),
        quickNavButton("⚙️", "Settings", "settings")
      ])
    );

    root.appendChild(el("h2", { class: "section-title" }, "Recent Activity"));
    const activityList = el("div", { class: "activity-list" });
    const recent = activity.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 12);
    if (!recent.length) {
      activityList.appendChild(el("div", { class: "empty-state" }, "No activity yet — start by creating a note, task, or expense."));
    } else {
      recent.forEach((a) => {
        activityList.appendChild(
          el("div", { class: "activity-item" }, [
            el("span", { class: `activity-dot activity-${a.type}` }),
            el("span", { class: "activity-text" }, a.message),
            el("span", { class: "activity-time" }, fmtDateTime(a.timestamp))
          ])
        );
      });
    }
    root.appendChild(activityList);
  }

  function widgetStat(title, value, sub, route, controls) {
    return el("div", { class: "stat-card widget-card" }, [
      el("div", { class: "widget-card-body", onclick: route ? () => (location.hash = `#/${route}`) : null }, [
        el("div", { class: "stat-label" }, title),
        el("div", { class: "stat-value" }, value),
        el("div", { class: "stat-sub" }, sub)
      ]),
      controls
    ]);
  }

  function widgetList(title, route, items, emptyText, controls) {
    return el("div", { class: "stat-card widget-card widget-list-card" }, [
      el("div", { class: "widget-card-body", onclick: route ? () => (location.hash = `#/${route}`) : null }, [
        el("div", { class: "stat-label" }, title),
        items.length
          ? el("ul", { class: "widget-mini-list" }, items.map((t) => el("li", {}, t)))
          : el("div", { class: "stat-sub" }, emptyText)
      ]),
      controls
    ]);
  }

  // Simple CSS bar chart — no external chart library, no network needed.
  function widgetChart(title, route, days, controls) {
    const maxVal = Math.max(1, ...days.map((d) => d.total));
    return el("div", { class: "stat-card widget-card widget-chart-card" }, [
      el("div", { class: "widget-card-body", onclick: route ? () => (location.hash = `#/${route}`) : null }, [
        el("div", { class: "stat-label" }, title),
        el(
          "div",
          { class: "bar-chart" },
          days.map((d) =>
            el("div", { class: "bar-chart-col" }, [
              el("div", {
                class: "bar-chart-bar",
                style: `height:${Math.max(3, Math.round((d.total / maxVal) * 100))}%`,
                title: `${d.label}: ${fmtMoney(d.total)}`
              }),
              el("div", { class: "bar-chart-label" }, d.label)
            ])
          )
        )
      ]),
      controls
    ]);
  }

  function widgetControls(root, widgets, index) {
    const w = widgets[index];
    return el("div", { class: "widget-controls" }, [
      el("button", {
        class: "widget-ctrl-btn",
        title: "Move up",
        disabled: index === 0 || undefined,
        onclick: async (ev) => {
          ev.stopPropagation();
          await moveWidget(widgets, index, -1);
          render(root);
        }
      }, "▲"),
      el("button", {
        class: "widget-ctrl-btn",
        title: "Move down",
        disabled: index === widgets.length - 1 || undefined,
        onclick: async (ev) => {
          ev.stopPropagation();
          await moveWidget(widgets, index, 1);
          render(root);
        }
      }, "▼"),
      el("button", {
        class: "widget-ctrl-btn widget-ctrl-remove",
        title: "Remove widget",
        onclick: async (ev) => {
          ev.stopPropagation();
          await CockpitDB.delete("widgets", w.id);
          U.toast("Widget removed");
          render(root);
        }
      }, "✕")
    ]);
  }

  async function moveWidget(widgets, index, dir) {
    const target = index + dir;
    if (target < 0 || target >= widgets.length) return;
    const a = widgets[index];
    const b = widgets[target];
    const orderA = a.order;
    a.order = b.order;
    b.order = orderA;
    await CockpitDB.put("widgets", a);
    await CockpitDB.put("widgets", b);
  }

  function renderWidget(root, w, data, index, widgets) {
    const { notes, tasks, expenses, projects, milestones } = data;
    const controls = widgetControls(root, widgets, index);

    switch (w.type) {
      case "notes_count":
        return widgetStat(w.title || "Knowledge Vault", `${notes.length}`, "notes stored", "vault", controls);
      case "tasks_open": {
        const openTasks = tasks.filter((t) => t.status !== "Done").length;
        const overdueTasks = tasks.filter((t) => {
          const due = parseLocalDate(t.dueDate);
          return due && t.status !== "Done" && due < todayLocal();
        }).length;
        return widgetStat(
          w.title || "Open Tasks",
          `${openTasks}`,
          overdueTasks ? `${overdueTasks} overdue` : "all on track",
          "tasks",
          controls
        );
      }
      case "month_spend": {
        const thisMonthKey = monthKey();
        const monthSpend = expenses.filter((e) => e.monthKey === thisMonthKey).reduce((s, e) => s + Number(e.amount || 0), 0);
        return widgetStat(w.title || "This Month's Spend", fmtMoney(monthSpend), "Resource Tracker", "expenses", controls);
      }
      case "active_projects": {
        const activeProjects = projects.filter((p) => p.status === "Active").length;
        return widgetStat(w.title || "Active Projects", `${activeProjects}`, `${projects.length} total`, "projects", controls);
      }
      case "pinned_notes": {
        const pinned = notes.filter((n) => n.pinned).slice(0, 4).map((n) => n.title || "(untitled)");
        return widgetList(w.title || "Pinned Notes", "vault", pinned, "No pinned notes yet.", controls);
      }
      case "upcoming_tasks": {
        const upcoming = tasks
          .filter((t) => t.status !== "Done" && t.dueDate)
          .sort((a, b) => parseLocalDate(a.dueDate) - parseLocalDate(b.dueDate))
          .slice(0, 4)
          .map((t) => `${t.title} — ${fmtDate(t.dueDate)}`);
        return widgetList(w.title || "Upcoming Tasks", "tasks", upcoming, "Nothing due — you're clear.", controls);
      }
      case "recent_expenses": {
        const recentExp = expenses
          .slice()
          .sort((a, b) => (parseLocalDate(b.date) || 0) - (parseLocalDate(a.date) || 0))
          .slice(0, 4)
          .map((e) => `${e.description || e.category || "Expense"} — ${fmtMoney(e.amount)}`);
        return widgetList(w.title || "Recent Expenses", "expenses", recentExp, "No expenses logged yet.", controls);
      }
      case "project_progress": {
        const lines = projects
          .filter((p) => p.status === "Active")
          .slice(0, 4)
          .map((p) => {
            const ms = milestones.filter((m) => m.projectId === p.id);
            const pct = ms.length ? Math.round((ms.filter((m) => m.done).length / ms.length) * 100) : 0;
            return `${p.name} — ${pct}%`;
          });
        return widgetList(w.title || "Project Progress", "projects", lines, "No active projects yet.", controls);
      }
      case "clock_date": {
        const now = new Date();
        return widgetStat(
          w.title || "Today",
          now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
          now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
          null,
          controls
        );
      }
      case "spend_chart": {
        const days = last7DaysTotals(expenses);
        return widgetChart(w.title || "Last 7 Days Spending", "expenses", days, controls);
      }
      default:
        return widgetStat(w.title || "Widget", "—", "Unknown widget type", null, controls);
    }
  }

  function last7DaysTotals(expenses) {
    const today = todayLocal();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({ key, label: d.toLocaleDateString(undefined, { weekday: "narrow" }), total: 0 });
    }
    const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
    expenses.forEach((e) => {
      const d = parseLocalDate(e.date);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (byKey[key]) byKey[key].total += Number(e.amount || 0);
    });
    return days;
  }

  function openAddWidgetDialog(root) {
    const overlay = el("div", { class: "modal-overlay" });
    const typeSelect = el(
      "select",
      { class: "input" },
      Object.entries(WIDGET_TYPES).map(([key, info]) => el("option", { value: key }, info.label))
    );
    const titleInput = el("input", { class: "input", placeholder: "Custom title (optional)" });

    const box = el("div", { class: "modal-box" }, [
      el("h2", {}, "Add Widget"),
      el("label", { class: "field-label" }, "Widget type"),
      typeSelect,
      el("label", { class: "field-label" }, "Title"),
      titleInput,
      el("div", { class: "modal-actions" }, [
        el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Cancel"),
        el("button", {
          class: "btn btn-primary",
          onclick: async () => {
            const all = await CockpitDB.getAll("widgets");
            const maxOrder = all.reduce((m, w) => Math.max(m, w.order || 0), -1);
            const record = {
              id: CockpitDB.uuid(),
              type: typeSelect.value,
              title: titleInput.value.trim(),
              order: maxOrder + 1
            };
            await CockpitDB.put("widgets", record);
            await CockpitDB.logActivity("settings", `Added "${WIDGET_TYPES[typeSelect.value].label}" widget to dashboard`);
            overlay.remove();
            U.toast("Widget added");
            render(root);
          }
        }, "Add Widget")
      ])
    ]);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function quickActionButton(icon, label, onClick) {
    return el("button", { class: "quicknav-btn quick-action-btn", onclick: onClick }, [
      el("span", { class: "quicknav-icon" }, icon),
      el("span", {}, label)
    ]);
  }

  // Navigates to a module and immediately opens its "create new" editor, so a
  // Quick Action is a single tap from dashboard straight into a blank form —
  // not a two-step "go there, then tap + New" detour.
  function openQuickCreate(root, route) {
    function tryOpen() {
      const mod = global.CockpitModules && global.CockpitModules[route];
      if (mod && typeof mod.openNew === "function") {
        const viewRoot = document.getElementById("view-root");
        if (viewRoot) mod.openNew(viewRoot);
      }
    }
    if (currentHashRoute() === route) {
      tryOpen();
      return;
    }
    const handler = (ev) => {
      if (ev.detail && ev.detail.route === route) {
        window.removeEventListener("cockpit:route-rendered", handler);
        tryOpen();
      }
    };
    window.addEventListener("cockpit:route-rendered", handler);
    location.hash = `#/${route}`;
  }

  function currentHashRoute() {
    return (location.hash || "").replace(/^#\/?/, "");
  }

  function quickNavButton(icon, label, route) {
    return el("button", { class: "quicknav-btn", onclick: () => (location.hash = `#/${route}`) }, [
      el("span", { class: "quicknav-icon" }, icon),
      el("span", {}, label)
    ]);
  }

  function runSearch(root, query, { notes, tasks, expenses, projects }) {
    const resultsEl = root.querySelector("#dash-search-results");
    resultsEl.innerHTML = "";
    const q = query.trim().toLowerCase();
    if (!q) return;

    const results = [];
    notes.forEach((n) => {
      if ((n.title || "").toLowerCase().includes(q) || (n.body || "").toLowerCase().includes(q)) {
        results.push({ type: "Note", label: n.title || "(untitled)", route: "vault" });
      }
    });
    tasks.forEach((t) => {
      if ((t.title || "").toLowerCase().includes(q)) {
        results.push({ type: "Task", label: t.title, route: "tasks" });
      }
    });
    expenses.forEach((e) => {
      if ((e.description || "").toLowerCase().includes(q) || (e.category || "").toLowerCase().includes(q)) {
        results.push({ type: "Expense", label: e.description || e.category, route: "expenses" });
      }
    });
    projects.forEach((p) => {
      if ((p.name || "").toLowerCase().includes(q)) {
        results.push({ type: "Project", label: p.name, route: "projects" });
      }
    });

    if (!results.length) {
      resultsEl.appendChild(el("div", { class: "empty-state" }, `No matches for "${query}"`));
      return;
    }

    const list = el("div", { class: "list-stack search-results" });
    results.slice(0, 20).forEach((r) => {
      list.appendChild(
        el("div", { class: "list-item", onclick: () => (location.hash = `#/${r.route}`) }, [
          el("span", { class: "badge badge-neutral" }, r.type),
          el("span", { class: "list-item-title" }, r.label)
        ])
      );
    });
    resultsEl.appendChild(list);
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.dashboard = { render };
})(window);
