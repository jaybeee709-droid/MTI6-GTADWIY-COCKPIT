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

  global.Participants = { summon: summon, list: list, close: close };
})(window);
