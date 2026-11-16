/* MTI6-GTADWIY-COCKPIT — Project Manager module */
(function (global) {
  "use strict";
  const { el, fmtDate } = U;

  let state = { projects: [], milestones: [] };

  async function render(root) {
    state.projects = await CockpitDB.getAll("projects");
    state.milestones = await CockpitDB.getAll("milestones");

    root.innerHTML = "";
    root.appendChild(
      el("div", { class: "view-header" }, [
        el("h1", {}, "Mission Control — Projects"),
        el("button", { class: "btn btn-primary", onclick: () => openProjectEditor(root) }, "+ New Project")
      ])
    );
    root.appendChild(el("div", { id: "project-list", class: "card-grid" }));
    renderList(root);
  }

  function renderList(root) {
    const list = root.querySelector("#project-list");
    list.innerHTML = "";
    if (!state.projects.length) {
      list.appendChild(el("div", { class: "empty-state" }, "No projects yet. Create one to start tracking milestones."));
      return;
    }
    state.projects
      .slice()
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .forEach((p) => list.appendChild(projectCard(root, p)));
  }

  function progressFor(projectId) {
    const ms = state.milestones.filter((m) => m.projectId === projectId);
    if (!ms.length) return 0;
    const done = ms.filter((m) => m.done).length;
    return Math.round((done / ms.length) * 100);
  }

  function projectCard(root, p) {
    const progress = progressFor(p.id);
    const ms = state.milestones.filter((m) => m.projectId === p.id).sort((a, b) => (a.order || 0) - (b.order || 0));

    const card = el("div", { class: "card project-card" }, [
      el("div", { class: "card-top" }, [
        el("span", { class: `badge ${statusClass(p.status)}` }, p.status || "Active"),
        el("span", { class: "progress-pct" }, `${progress}%`)
      ]),
      el("h3", { class: "card-title" }, p.name),
      el("div", { class: "progress-bar" }, [el("div", { class: "progress-fill", style: `width:${progress}%` })]),
      p.notes ? el("p", { class: "card-body" }, p.notes) : null,
      el("div", { class: "milestone-list" }, ms.map((m) => milestoneRow(root, p, m))),
      el("button", {
        class: "btn btn-ghost btn-sm",
        onclick: () => openMilestoneEditor(root, p)
      }, "+ Add Milestone"),
      el("div", { class: "card-actions" }, [
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => openProjectEditor(root, p) }, "Edit Project"),
        el("button", {
          class: "btn btn-ghost btn-sm btn-danger-text",
          onclick: async () => {
            const ok = await U.confirmDialog(`Delete project "${p.name}" and all its milestones?`);
            if (!ok) return;
            await CockpitDB.delete("projects", p.id);
            for (const m of state.milestones.filter((x) => x.projectId === p.id)) {
              await CockpitDB.delete("milestones", m.id);
            }
            await CockpitDB.logActivity("project", `Deleted project "${p.name}"`, p.id);
            U.toast("Project deleted");
            render(root);
          }
        }, "Delete Project")
      ])
    ]);
    return card;
  }

  function statusClass(status) {
    return { Active: "badge-neutral", "On Hold": "pri-med", Completed: "badge-success", Cancelled: "badge-danger" }[status] || "badge-neutral";
  }

  function milestoneRow(root, p, m) {
    return el("div", { class: `milestone-item ${m.done ? "done" : ""}` }, [
      el("input", {
        type: "checkbox",
        checked: m.done || undefined,
        onchange: async (e) => {
          m.done = e.target.checked;
          await CockpitDB.put("milestones", m);
          await CockpitDB.logActivity("project", `Milestone "${m.title}" marked ${m.done ? "done" : "pending"}`, p.id);
          render(root);
        }
      }),
      el("span", { class: "milestone-title" }, m.title),
      m.dueDate ? el("span", { class: "badge badge-neutral" }, fmtDate(m.dueDate)) : null,
      el("button", {
        class: "btn btn-ghost btn-sm btn-danger-text",
        onclick: async () => {
          await CockpitDB.delete("milestones", m.id);
          U.toast("Milestone removed");
          render(root);
        }
      }, "✕")
    ]);
  }

  function openProjectEditor(root, existing) {
    const isNew = !existing;
    const draft = existing ? { ...existing } : { id: CockpitDB.uuid(), name: "", status: "Active", notes: "" };

    const overlay = el("div", { class: "modal-overlay" });
    const nameInput = el("input", { class: "input", value: draft.name, placeholder: "Project name" });
    const statusSelect = el(
      "select",
      { class: "input" },
      ["Active", "On Hold", "Completed", "Cancelled"].map((s) => el("option", { value: s, selected: s === draft.status || undefined }, s))
    );
    const notesInput = el("textarea", { class: "input textarea", rows: 4, placeholder: "Project notes" }, draft.notes);

    const box = el("div", { class: "modal-box" }, [
      el("h2", {}, isNew ? "New Project" : "Edit Project"),
      el("label", { class: "field-label" }, "Name"),
      nameInput,
      el("label", { class: "field-label" }, "Status"),
      statusSelect,
      el("label", { class: "field-label" }, "Notes"),
      notesInput,
      el("div", { class: "modal-actions" }, [
        el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Cancel"),
        el("button", {
          class: "btn btn-primary",
          onclick: async (ev) => {
            if (!nameInput.value.trim()) {
              U.fieldError(nameInput, "Give the project a name before saving.");
              nameInput.focus();
              return;
            }
            U.clearFieldError(nameInput);
            const btn = ev.currentTarget;
            await U.withButtonLoading(btn, "Saving…", async () => {
              draft.name = nameInput.value.trim();
              draft.status = statusSelect.value;
              draft.notes = notesInput.value;
              draft.updatedAt = new Date().toISOString();
              draft.createdAt = draft.createdAt || draft.updatedAt;
              await CockpitDB.put("projects", draft);
              await CockpitDB.logActivity("project", `${isNew ? "Created" : "Updated"} project "${draft.name}"`, draft.id);
              overlay.remove();
              U.toast(isNew ? "Project created" : "Project saved");
              render(root);
            })();
          }
        }, "Save Project")
      ])
    ]);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    nameInput.addEventListener("input", () => U.clearFieldError(nameInput));
    nameInput.focus();
  }

  function openMilestoneEditor(root, project) {
    const overlay = el("div", { class: "modal-overlay" });
    const titleInput = el("input", { class: "input", placeholder: "Milestone title" });
    const dueInput = el("input", { class: "input", type: "date" });

    const box = el("div", { class: "modal-box" }, [
      el("h2", {}, `New Milestone — ${project.name}`),
      el("label", { class: "field-label" }, "Title"),
      titleInput,
      el("label", { class: "field-label" }, "Due date"),
      dueInput,
      el("div", { class: "modal-actions" }, [
        el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Cancel"),
        el("button", {
          class: "btn btn-primary",
          onclick: async () => {
            if (!titleInput.value.trim()) {
              U.toast("Give the milestone a title", "error");
              return;
            }
            const milestone = {
              id: CockpitDB.uuid(),
              projectId: project.id,
              title: titleInput.value.trim(),
              dueDate: dueInput.value || "",
              done: false,
              order: Date.now()
            };
            await CockpitDB.put("milestones", milestone);
            await CockpitDB.logActivity("project", `Added milestone "${milestone.title}" to "${project.name}"`, project.id);
            overlay.remove();
            U.toast("Milestone added");
            render(root);
          }
        }, "Add Milestone")
      ])
    ]);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    titleInput.focus();
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.projects = { render, openNew: (root) => openProjectEditor(root) };
})(window);
