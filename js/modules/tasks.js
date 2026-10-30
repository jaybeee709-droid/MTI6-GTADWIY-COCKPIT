/* MTI6-GTADWIY-COCKPIT — Task Manager module */
(function (global) {
  "use strict";
  const { el, fmtDate } = U;

  const STATUSES = ["Not Started", "In Progress", "Blocked", "Done"];
  const PRIORITIES = ["Low", "Medium", "High", "Critical"];

  let state = { filterStatus: "all", filterPriority: "all", tasks: [] };

  async function render(root) {
    const tasks = await CockpitDB.getAll("tasks");
    state.tasks = tasks;

    root.innerHTML = "";
    const doneCount = tasks.filter((t) => t.status === "Done").length;
    root.appendChild(
      el("div", { class: "view-header" }, [
        el("h1", {}, "Mission Control — Tasks"),
        el("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, [
          doneCount
            ? el("button", {
                class: "btn btn-ghost btn-sm",
                onclick: async (ev) => {
                  const ok = await U.confirmDialog(`Clear ${doneCount} completed task${doneCount === 1 ? "" : "s"}? This can't be undone.`);
                  if (!ok) return;
                  const btn = ev.currentTarget;
                  await U.withButtonLoading(btn, "Clearing…", async () => {
                    const done = state.tasks.filter((t) => t.status === "Done");
                    for (const t of done) {
                      await CockpitDB.delete("tasks", t.id);
                    }
                    await CockpitDB.logActivity("task", `Cleared ${done.length} completed task${done.length === 1 ? "" : "s"}`);
                    U.toast("Completed tasks cleared");
                    render(root);
                  })();
                }
              }, `Clear Completed (${doneCount})`)
            : null,
          el("button", { class: "btn btn-primary", onclick: () => openEditor(root) }, "+ New Task")
        ])
      ])
    );

    root.appendChild(
      el("div", { class: "toolbar" }, [
        el(
          "select",
          { class: "input", onchange: (e) => { state.filterStatus = e.target.value; renderList(root); } },
          [
            el("option", { value: "all", selected: state.filterStatus === "all" || undefined }, "All statuses"),
            ...STATUSES.map((s) => el("option", { value: s, selected: s === state.filterStatus || undefined }, s))
          ]
        ),
        el(
          "select",
          { class: "input", onchange: (e) => { state.filterPriority = e.target.value; renderList(root); } },
          [
            el("option", { value: "all", selected: state.filterPriority === "all" || undefined }, "All priorities"),
            ...PRIORITIES.map((p) => el("option", { value: p, selected: p === state.filterPriority || undefined }, p))
          ]
        )
      ])
    );

    root.appendChild(el("div", { id: "task-list", class: "list-stack" }));
    renderList(root);
  }

  function filterTasks() {
    return state.tasks
      .filter((t) => (state.filterStatus === "all" ? true : t.status === state.filterStatus))
      .filter((t) => (state.filterPriority === "all" ? true : t.priority === state.filterPriority))
      .sort((a, b) => {
        const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        const p = (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
        if (p !== 0) return p;
        const da = U.parseLocalDate(a.dueDate) || new Date(8640000000000000);
        const db = U.parseLocalDate(b.dueDate) || new Date(8640000000000000);
        return da - db;
      });
  }

  function renderList(root) {
    const list = root.querySelector("#task-list");
    const tasks = filterTasks();
    list.innerHTML = "";
    if (!tasks.length) {
      list.appendChild(el("div", { class: "empty-state" }, "No tasks match. Create a task to start tracking work."));
      return;
    }
    tasks.forEach((t) => list.appendChild(taskRow(root, t)));
  }

  function priorityClass(p) {
    return { Low: "pri-low", Medium: "pri-med", High: "pri-high", Critical: "pri-crit" }[p] || "pri-med";
  }

  function taskRow(root, t) {
    const dueDate = U.parseLocalDate(t.dueDate);
    const overdue = !!dueDate && t.status !== "Done" && dueDate < U.todayLocal();
    return el("div", { class: `list-item ${t.status === "Done" ? "done" : ""}` }, [
      el("input", {
        type: "checkbox",
        class: "task-check",
        checked: t.status === "Done" || undefined,
        onchange: async (e) => {
          t.status = e.target.checked ? "Done" : "In Progress";
          t.updatedAt = new Date().toISOString();
          await CockpitDB.put("tasks", t);
          await CockpitDB.logActivity("task", `Marked task "${t.title}" as ${t.status}`, t.id);
          render(root);
        }
      }),
      el("div", { class: "list-item-main" }, [
        el("div", { class: "list-item-title" }, t.title),
        el("div", { class: "list-item-sub" }, [
          el("span", { class: `badge ${priorityClass(t.priority)}` }, t.priority),
          el("span", { class: "badge badge-neutral" }, t.status),
          t.dueDate ? el("span", { class: `badge ${overdue ? "badge-danger" : "badge-neutral"}` }, `Due ${fmtDate(t.dueDate)}`) : null
        ])
      ]),
      el("div", { class: "card-actions" }, [
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => openEditor(root, t) }, "Edit"),
        el("button", {
          class: "btn btn-ghost btn-sm btn-danger-text",
          onclick: async () => {
            const ok = await U.confirmDialog(`Delete task "${t.title}"?`);
            if (!ok) return;
            await CockpitDB.delete("tasks", t.id);
            await CockpitDB.logActivity("task", `Deleted task "${t.title}"`, t.id);
            U.toast("Task deleted");
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
      : { id: CockpitDB.uuid(), title: "", notes: "", priority: "Medium", status: "Not Started", dueDate: "" };

    const overlay = el("div", { class: "modal-overlay" });
    const titleInput = el("input", { class: "input", value: draft.title, placeholder: "Task title" });
    const notesInput = el("textarea", { class: "input textarea", rows: 4, placeholder: "Notes (optional)" }, draft.notes);
    const prioritySelect = el("select", { class: "input" }, PRIORITIES.map((p) => el("option", { value: p, selected: p === draft.priority || undefined }, p)));
    const statusSelect = el("select", { class: "input" }, STATUSES.map((s) => el("option", { value: s, selected: s === draft.status || undefined }, s)));
    const dueInput = el("input", { class: "input", type: "date", value: draft.dueDate || "" });

    const box = el("div", { class: "modal-box" }, [
      el("h2", {}, isNew ? "New Task" : "Edit Task"),
      el("label", { class: "field-label" }, "Title"),
      titleInput,
      el("label", { class: "field-label" }, "Priority"),
      prioritySelect,
      el("label", { class: "field-label" }, "Status"),
      statusSelect,
      el("label", { class: "field-label" }, "Due date"),
      dueInput,
      el("label", { class: "field-label" }, "Notes"),
      notesInput,
      el("div", { class: "modal-actions" }, [
        el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Cancel"),
        el("button", {
          class: "btn btn-primary",
          onclick: async (ev) => {
            const title = titleInput.value.trim();
            if (!title) {
              U.fieldError(titleInput, "Give the task a title before saving.");
              titleInput.focus();
              return;
            }
            U.clearFieldError(titleInput);
            const btn = ev.currentTarget;
            await U.withButtonLoading(btn, "Saving…", async () => {
              draft.title = title;
              draft.notes = notesInput.value;
              draft.priority = prioritySelect.value;
              draft.status = statusSelect.value;
              draft.dueDate = dueInput.value || "";
              draft.updatedAt = new Date().toISOString();
              draft.createdAt = draft.createdAt || draft.updatedAt;
              await CockpitDB.put("tasks", draft);
              await CockpitDB.logActivity("task", `${isNew ? "Created" : "Updated"} task "${draft.title}"`, draft.id);
              overlay.remove();
              U.toast(isNew ? "Task created" : "Task saved");
              render(root);
            })();
          }
        }, "Save Task")
      ])
    ]);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    titleInput.addEventListener("input", () => U.clearFieldError(titleInput));
    titleInput.focus();
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.tasks = { render, STATUSES, PRIORITIES, openNew: (root) => openEditor(root) };
})(window);
