/* MTI6-GTADWIY-COCKPIT — Knowledge Vault module */
(function (global) {
  "use strict";
  const { el, esc, fmtDateTime, debounce } = U;

  // view: "active" (default — hides archived), "archive" (Research Archive —
  // archived records only), "all" (everything, for search across both).
  let state = { search: "", category: "all", view: "active", notes: [] };

  async function render(root) {
    const notes = await CockpitDB.getAll("notes");
    state.notes = notes;
    const categories = Array.from(new Set(notes.map((n) => n.category).filter(Boolean))).sort();
    const archivedCount = notes.filter((n) => n.archived).length;

    root.innerHTML = "";
    root.appendChild(
      el("div", { class: "view-header" }, [
        el("h1", {}, "Knowledge Vault"),
        el("button", { class: "btn btn-primary", onclick: () => openEditor(root) }, "+ New Note")
      ])
    );

    root.appendChild(
      el("div", { class: "segmented-control" }, [
        segmentButton(root, "Active", "active"),
        segmentButton(root, `Research Archive${archivedCount ? ` (${archivedCount})` : ""}`, "archive"),
        segmentButton(root, "All", "all")
      ])
    );

    const toolbar = el("div", { class: "toolbar" }, [
      el("input", {
        class: "input search-input",
        type: "search",
        placeholder: "Search notes…",
        value: state.search,
        oninput: debounce((e) => {
          state.search = e.target.value;
          renderList(root);
        }, 200)
      }),
      el(
        "select",
        {
          class: "input",
          onchange: (e) => {
            state.category = e.target.value;
            renderList(root);
          }
        },
        [
          el("option", { value: "all", selected: state.category === "all" || undefined }, "All categories"),
          ...categories.map((c) => el("option", { value: c, selected: c === state.category || undefined }, c))
        ]
      )
    ]);
    root.appendChild(toolbar);
    root.appendChild(el("div", { id: "vault-list", class: "card-grid" }));
    renderList(root);
  }

  function segmentButton(root, label, view) {
    return el("button", {
      class: `segment-btn ${state.view === view ? "active" : ""}`,
      onclick: () => {
        state.view = view;
        render(root);
      }
    }, label);
  }

  function filterNotes() {
    const q = state.search.trim().toLowerCase();
    return state.notes
      .filter((n) => {
        if (state.view === "active") return !n.archived;
        if (state.view === "archive") return !!n.archived;
        return true; // "all"
      })
      .filter((n) => (state.category === "all" ? true : n.category === state.category))
      .filter((n) =>
        q
          ? (n.title || "").toLowerCase().includes(q) ||
            (n.body || "").toLowerCase().includes(q) ||
            (n.tags || []).join(" ").toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => (b.pinned === a.pinned ? new Date(b.updatedAt) - new Date(a.updatedAt) : b.pinned ? 1 : -1));
  }

  function renderList(root) {
    const list = root.querySelector("#vault-list");
    const notes = filterNotes();
    list.innerHTML = "";
    if (!notes.length) {
      const msg =
        state.view === "archive"
          ? "The Research Archive is empty. Archive a note from the Active view to send it here."
          : "No notes yet. Create your first note to get started.";
      list.appendChild(el("div", { class: "empty-state" }, msg));
      return;
    }
    notes.forEach((n) => list.appendChild(noteCard(root, n)));
  }

  function noteCard(root, n) {
    return el("div", { class: `card note-card ${n.archived ? "note-archived" : ""}` }, [
      el("div", { class: "card-top" }, [
        el("div", { style: "display:flex;gap:6px;align-items:center;flex-wrap:wrap" }, [
          el("span", { class: "badge badge-cat" }, n.category || "Uncategorized"),
          n.archived ? el("span", { class: "badge badge-neutral" }, "Archived") : null
        ]),
        el("button", {
          class: `pin-btn ${n.pinned ? "pinned" : ""}`,
          title: n.pinned ? "Unpin" : "Pin",
          onclick: async () => {
            n.pinned = !n.pinned;
            n.updatedAt = new Date().toISOString();
            await CockpitDB.put("notes", n);
            render(root);
          }
        }, n.pinned ? "★" : "☆")
      ]),
      el("h3", { class: "card-title" }, n.title || "(untitled)"),
      el("p", { class: "card-body" }, (n.body || "").slice(0, 160) + ((n.body || "").length > 160 ? "…" : "")),
      n.tags && n.tags.length
        ? el("div", { class: "tag-row" }, n.tags.map((t) => el("span", { class: "tag" }, `#${t}`)))
        : null,
      el("div", { class: "card-meta" }, `Updated ${fmtDateTime(n.updatedAt)}`),
      el("div", { class: "card-actions" }, [
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => openEditor(root, n) }, "Edit"),
        el("button", {
          class: "btn btn-ghost btn-sm",
          onclick: async () => {
            n.archived = !n.archived;
            n.updatedAt = new Date().toISOString();
            await CockpitDB.put("notes", n);
            await CockpitDB.logActivity(
              "vault",
              `${n.archived ? "Archived" : "Restored"} note "${n.title || "(untitled)"}"`,
              n.id
            );
            U.toast(n.archived ? "Moved to Research Archive" : "Restored to Active notes");
            render(root);
          }
        }, n.archived ? "Restore" : "Archive"),
        el("button", {
          class: "btn btn-ghost btn-sm btn-danger-text",
          onclick: async () => {
            const ok = await U.confirmDialog(`Delete note "${n.title || "(untitled)"}"? This cannot be undone.`);
            if (!ok) return;
            await CockpitDB.delete("notes", n.id);
            await CockpitDB.logActivity("vault", `Deleted note "${n.title || "(untitled)"}"`, n.id);
            U.toast("Note deleted");
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
      : { id: CockpitDB.uuid(), title: "", body: "", category: "", tags: [], pinned: false, archived: false };

    const overlay = el("div", { class: "modal-overlay" });
    const titleInput = el("input", { class: "input", value: draft.title, placeholder: "Note title" });
    const categoryInput = el("input", { class: "input", value: draft.category, placeholder: "Category (e.g. Work, Personal)" });
    const tagsInput = el("input", { class: "input", value: (draft.tags || []).join(", "), placeholder: "Tags, comma separated" });
    const bodyInput = el("textarea", { class: "input textarea", rows: 8, placeholder: "Write your note…" }, draft.body);

    const box = el("div", { class: "modal-box modal-box-lg" }, [
      el("h2", {}, isNew ? "New Note" : "Edit Note"),
      el("label", { class: "field-label" }, "Title"),
      titleInput,
      el("label", { class: "field-label" }, "Category"),
      categoryInput,
      el("label", { class: "field-label" }, "Tags"),
      tagsInput,
      el("label", { class: "field-label" }, "Content"),
      bodyInput,
      el("div", { class: "modal-actions" }, [
        el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "Cancel"),
        el("button", {
          class: "btn btn-primary",
          onclick: async (ev) => {
            const title = titleInput.value.trim();
            if (!title && !bodyInput.value.trim()) {
              U.fieldError(titleInput, "Add a title or some content before saving.");
              titleInput.focus();
              return;
            }
            U.clearFieldError(titleInput);
            const btn = ev.currentTarget;
            await U.withButtonLoading(btn, "Saving…", async () => {
              draft.title = title;
              draft.body = bodyInput.value;
              draft.category = categoryInput.value.trim();
              draft.tags = tagsInput.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
              draft.updatedAt = new Date().toISOString();
              draft.createdAt = draft.createdAt || draft.updatedAt;
              await CockpitDB.put("notes", draft);
              await CockpitDB.logActivity("vault", `${isNew ? "Created" : "Updated"} note "${draft.title}"`, draft.id);
              overlay.remove();
              U.toast(isNew ? "Note created" : "Note saved");
              render(root);
            })();
          }
        }, "Save Note")
      ])
    ]);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    titleInput.addEventListener("input", () => U.clearFieldError(titleInput));
    titleInput.focus();
  }

  global.CockpitModules = global.CockpitModules || {};
  global.CockpitModules.vault = { render, openNew: (root) => openEditor(root) };
})(window);
