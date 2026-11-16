/* MTI6-GTADWIY-COCKPIT — Tribe principals (master shell, Build 1)
 *
 * The 12 persistent Tribe principal slots. A Tribe principal is a named
 * principal agent; names arrive ONLY by owner approval. In this build
 * every slot is UNASSIGNED — no names are invented, no principal is
 * shown as active, and no worker count is fabricated.
 *
 * Functional labels (Research, Risk, Yield, Routing, Security, Builder,
 * Analysis, Monitoring) are assignment/role labels, NOT permanent bot
 * names. A bot is never renamed after its current assignment.
 */
(function (global) {
  "use strict";

  var TRIBE_COUNT = 12;

  // Assignment/role labels only. These are what a worker DOES on a task,
  // never the worker's name.
  var ROLE_LABELS = [
    "Research",
    "Risk",
    "Yield",
    "Routing",
    "Security",
    "Builder",
    "Analysis",
    "Monitoring"
  ];

  var slots = [];
  for (var i = 1; i <= TRIBE_COUNT; i++) {
    var n = String(i).padStart(2, "0");
    slots.push({
      id: "tribe-" + n,
      number: i,
      label: "Tribe " + n,
      name: null, // assigned only by owner approval — never invented
      status: "UNASSIGNED",
      role: null,
      assignment: null
    });
  }

  function copySlot(s) {
    return {
      id: s.id,
      number: s.number,
      label: s.label,
      name: s.name,
      status: s.status,
      role: s.role,
      assignment: s.assignment
    };
  }

  function getSlots() {
    return slots.map(copySlot);
  }

  function getSlot(id) {
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].id === id) return copySlot(slots[i]);
    }
    return null;
  }

  // Real connected worker count. No worker orchestration exists yet, so
  // the honest answer is zero / not connected — never a made-up number.
  function getWorkersActive() {
    return {
      count: 0,
      state: "NOT_CONNECTED",
      note: "No worker orchestration is connected. Workers appear here only when a real worker system reports them."
    };
  }

  global.Tribes = {
    COUNT: TRIBE_COUNT,
    ROLE_LABELS: ROLE_LABELS.slice(),
    getSlots: getSlots,
    getSlot: getSlot,
    getWorkersActive: getWorkersActive
  };
})(window);
