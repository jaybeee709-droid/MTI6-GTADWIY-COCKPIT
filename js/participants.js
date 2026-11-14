/* MTI6-GTADWIY-COCKPIT — summonable bot participant architecture (Build 1)
 *
 * State model only. STAR can later summon a Tribe principal or worker
 * into a conversation as a separate resizable participant window; the
 * main session (you + STAR) stays where it is. Multiple participants
 * are supported by the window manager, one window each.
 *
 * In this build every Tribe slot is unassigned, so summoning one opens
 * an honest unassigned window — no fake participant, no fabricated
 * conversation, no AI output. A principal appears here only once it has
 * been named by owner approval.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  var active = {}; // slotId -> windowId

  // ---- Multi-participant runtime integration (§44 item 15) ------------
  // Opens a named Tribe principal in its own movable/resizable
  // participant window through the EXISTING window manager — no second
  // window system is built here. The window is a conversation window
  // for the principal: it carries the principal's canonical identity
  // record and an empty message list. Nothing is fabricated: no
  // invented messages, activity, or live state. Status "ACTIVE" means
  // the identity is active, never that the principal is live; while
  // no real runtime exists the window always says NOT_CONNECTED.
  //
  // STAR is the main identity and is never a participant; Angels are
  // not Tribe members either. Both are rejected here.
  var openPrincipals = {}; // principalId -> windowId
  var conversations = {}; // principalId -> [messages]; always empty in this build

  function normalizeIdentity(value) {
    if (typeof value !== "string") return "";
    return value.toLowerCase().replace(/[\s._\-]+/g, "");
  }

  function looksLikeStarId(value) {
    if (global.TribePrincipals && typeof global.TribePrincipals.isStarId === "function") {
      try { return !!global.TribePrincipals.isStarId(value); } catch (e) {}
    }
    var n = normalizeIdentity(value);
    return n === "star" || n === "star30";
  }

  function looksLikeAngelId(value) {
    if (global.TribePrincipals && typeof global.TribePrincipals.isAngelId === "function") {
      try { return !!global.TribePrincipals.isAngelId(value); } catch (e) {}
    }
    return normalizeIdentity(value).indexOf("angel") === 0;
  }

  // Snapshot of what a participant window shows for one principal:
  // canonical identity (displayName, stable id, parent STAR 3.0),
  // current role/task/status from BotOpsModel (UNKNOWN when not
  // known), a truthful NOT_CONNECTED note, and the message list
  // (empty — no conversation has taken place). Returns null for an
  // unknown principal id, or when the principal registry is absent.
  function describeParticipant(principalId) {
    if (!global.TribePrincipals || typeof global.TribePrincipals.getPrincipal !== "function") return null;
    var identity = null;
    if (global.BotOpsModel && typeof global.BotOpsModel.describeIdentity === "function") {
      try { identity = global.BotOpsModel.describeIdentity("principal", principalId); } catch (e) { identity = null; }
    }
    var p = null;
    try { p = global.TribePrincipals.getPrincipal(principalId); } catch (e) { p = null; }
    if (!p && (!identity || !identity.displayName)) return null;
    var displayName = (identity && identity.displayName) || (p && p.displayName) || null;
    if (!displayName) return null;
    var role = (identity && identity.role) || (p && p.currentRole) || null;
    var task = (identity && identity.currentTask) || (p && p.currentTask) || null;
    var status = (identity && identity.status) || (p && p.status) || "UNKNOWN";
    var parent = (identity && identity.organizationalParent) || "STAR 3.0";
    var messages = conversations[principalId] ? conversations[principalId].slice() : [];
    return {
      id: principalId,
      displayName: displayName,
      canonicalName: displayName,
      organizationalParent: parent,
      status: status,
      role: role || "UNKNOWN",
      currentTask: task || "UNKNOWN",
      liveStatus: "NOT_CONNECTED",
      messages: messages
    };
  }

  // The principal's message list (a copy). Always empty in this
  // build — no conversation has taken place. Returns null for an
  // unknown principal id.
  function getMessages(principalId) {
    var view = describeParticipant(principalId);
    return view ? view.messages : null;
  }

  // Opens the named Tribe principal in a separate movable/resizable
  // participant window. "Bring Judah" = openPrincipal("tribe-judah").
  // Returns {opened: true, alreadyOpen, principalId, windowId} on
  // success, or {opened: false, reason} on rejection — never throws,
  // and never crashes when a registry is absent.
  // Reasons: NOT_AVAILABLE (TribePrincipals or the window manager is
  // absent), INVALID_ID, STAR_NOT_A_PRINCIPAL, ANGEL_NOT_A_PRINCIPAL,
  // UNKNOWN_PRINCIPAL.
  function openPrincipal(principalId) {
    if (!global.TribePrincipals || !global.WindowManager) {
      return { opened: false, reason: "NOT_AVAILABLE" };
    }
    if (typeof principalId !== "string" || !principalId.trim()) {
      return { opened: false, reason: "INVALID_ID" };
    }
    var id = principalId.trim();
    if (looksLikeStarId(id)) {
      return { opened: false, reason: "STAR_NOT_A_PRINCIPAL" };
    }
    if (looksLikeAngelId(id)) {
      return { opened: false, reason: "ANGEL_NOT_A_PRINCIPAL" };
    }
    var view = describeParticipant(id);
    if (!view) {
      return { opened: false, reason: "UNKNOWN_PRINCIPAL" };
    }
    // Idempotent: opening the same principal twice focuses the
    // existing window instead of duplicating it.
    var existingWid = openPrincipals[id];
    if (existingWid) {
      if (global.WindowManager.isOpen && global.WindowManager.isOpen(existingWid)) {
        global.WindowManager.focus(existingWid);
        return { opened: true, alreadyOpen: true, principalId: id, windowId: existingWid };
      }
      delete openPrincipals[id];
      delete conversations[id];
    }
    conversations[id] = [];
    var wid = global.WindowManager.open({
      id: "participant-principal-" + id,
      title: view.displayName + " — Tribe principal",
      subtitle: "Participant window · " + id,
      onClose: function () {
        delete openPrincipals[id];
        delete conversations[id];
      },
      build: function (body) {
        body.appendChild(U.el("p", { class: "api-meta" },
          view.displayName + " · " + view.id + " · Parent: " + view.organizationalParent));
        body.appendChild(U.el("div", { class: "api-meta" },
          "Identity status: " + view.status + " (identity active — not live activity) · Role: " + view.role +
          " · Current task: " + view.currentTask));
        body.appendChild(U.el("p", { class: "api-meta" },
          "Connection: NOT_CONNECTED — no real runtime exists. Nothing here is live activity."));
        var list = U.el("div", { class: "participant-messages" });
        list.appendChild(U.el("p", { class: "api-meta" },
          "No messages yet — no conversation has taken place with " + view.displayName + "."));
        body.appendChild(list);
      }
    });
    if (!wid) {
      delete conversations[id];
      return { opened: false, reason: "NOT_AVAILABLE" };
    }
    openPrincipals[id] = wid;
    return { opened: true, alreadyOpen: false, principalId: id, windowId: wid };
  }

  // Principal ids with a participant window currently open. Stale
  // entries (window closed outside onClose) are pruned first.
  function listParticipants() {
    Object.keys(openPrincipals).forEach(function (pid) {
      var wid = openPrincipals[pid];
      if (global.WindowManager && global.WindowManager.isOpen && !global.WindowManager.isOpen(wid)) {
        delete openPrincipals[pid];
        delete conversations[pid];
      }
    });
    return Object.keys(openPrincipals);
  }

  // Closes one participant window. Returns true when a window was
  // open for that principal, false otherwise.
  function closeParticipant(principalId) {
    var wid = openPrincipals[principalId];
    if (!wid) return false;
    if (global.WindowManager) global.WindowManager.close(wid);
    delete openPrincipals[principalId];
    delete conversations[principalId];
    return true;
  }

  function summon(slotId) {
    var slot = global.Tribes ? global.Tribes.getSlot(slotId) : null;
    if (!slot) {
      U.toast("Unknown Tribe slot.");
      return null;
    }
    if (!global.WindowManager) {
      U.toast("The window manager did not load — reload and try again.");
      return null;
    }
    var title = slot.name
      ? slot.name + " — " + slot.label
      : "Tribe " + slot.label.replace("Tribe ", "") + " — unassigned";
    var wid = global.WindowManager.open({
      id: "participant-" + slot.id,
      title: title,
      subtitle: "Summoned participant — separate window",
      build: function (body) {
        if (!slot.name) {
          body.appendChild(U.el("p", { class: "api-meta" },
            "This Tribe principal slot is unassigned. No bot is summoned here — a principal is named only by owner approval. Nothing in this window is a live conversation."));
        } else {
          body.appendChild(U.el("p", { class: "api-meta" },
            "Summoned participant. This window shows this principal's live state when a real worker system is connected."));
        }
        body.appendChild(U.el("div", { class: "api-meta" },
          "Origin Tribe: " + slot.label + " · Status: " + slot.status +
          " · Role: " + (slot.role || "—") + " · Assignment: " + (slot.assignment || "none")));
      }
    });
    if (wid) active[slot.id] = wid;
    return wid;
  }

  function list() {
    return Object.keys(active);
  }

  function close(slotId) {
    var wid = active[slotId];
    if (!wid) return;
    if (global.WindowManager) global.WindowManager.close(wid);
    delete active[slotId];
  }

  global.Participants = {
    summon: summon,
    list: list,
    close: close,
    openPrincipal: openPrincipal,
    listParticipants: listParticipants,
    closeParticipant: closeParticipant,
    describeParticipant: describeParticipant,
    getMessages: getMessages
  };
})(window);
