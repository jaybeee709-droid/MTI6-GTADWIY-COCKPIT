/* MTI6-GTADWIY-COCKPIT — Bot Profiles data layer (Bot Profiles +
 * Big Screen Build, owner direction 2026-11-16)
 *
 * Pure derivations over the REAL bot records — TribePrincipals
 * (canonical roster + persisted assignments), WorkerEngine (worker
 * records), BotOpsModel (worker tasks), CryptoBotAssignments
 * (crypto role assignments) and EntityGate (the entity candidate
 * pipeline). This module owns NO state and writes NOTHING: it reads
 * the same records Bot Operations renders, so a profile can never
 * disagree with the operations screen.
 *
 * Workers under a principal are derived from the worker records
 * themselves: a WorkerEngine record carries parentPrincipalId (===
 * parentTribeId, one of the 12 canonical Tribe ids), and a worker
 * belongs to exactly the principal that field names. WorkerEngine
 * records are session records (the engine persists nothing), so a
 * fresh session honestly has no workers under anyone — the profile
 * says "no workers recorded", never an invented roster. STAR has
 * no workers under it by construction: a worker's parent must be a
 * Tribe principal, and STAR sits above the workforce.
 *
 * Truth rules (do not weaken them):
 * - No fabricated workers, activity, or charts. Every graph is a
 *   count of recorded history/task/assignment entries, carries its
 *   source line, and renders an honest empty state when the bot
 *   has no recorded activity — never a synthetic curve.
 * - UNKNOWN is not zero: absent records read "no recorded …". A
 *   count is shown only where records were actually counted.
 * - The entity pipeline is SHARED: pipelineSummary() counts every
 *   candidate in the store, whoever discovered it. A principal's
 *   profile shows the pipeline graph only when records tie that
 *   principal to discovery work (candidates recorded with
 *   discoveredBy.ref === the principal id, a crypto assignment in
 *   a discovery role, or a worker task carrying discovery
 *   provenance), and the graph is always labelled as the shared
 *   pipeline — never as one principal's personal output. Where a
 *   personal discovered-by count exists, it is stated separately.
 * - Intelligence is not authority (World OS §18): a profile is a
 *   readout. Nothing here assigns, executes, or approves anything.
 *
 * Load order: after tribe-principals / worker-engine /
 * bot-ops-model / crypto-bot-assignments / entity-gate. Every
 * access is typeof-guarded: a missing model degrades to honest
 * "not loaded" lines, never a crash and never an invented value.
 */
(function (global) {
  "use strict";

  var STAR_REF = "star";
  var READOUT_LABEL = "Record readout — not live speech";
  var CONVERGENCE_LINE = "Findings converge into the World Engine — one context, not separate reports.";

  var FALLBACK_PRINCIPAL_IDS = [
    "tribe-judah", "tribe-reuben", "tribe-gad", "tribe-asher",
    "tribe-naphtali", "tribe-manasseh", "tribe-simeon", "tribe-levi",
    "tribe-issachar", "tribe-zebulun", "tribe-joseph", "tribe-benjamin"
  ];

  function isStr(v) { return typeof v === "string" && v.length > 0; }
  function arr(v) { return Array.isArray(v) ? v : []; }

  // ---- Record accessors (guarded; absence degrades honestly) -----------

  function principalRecord(id) {
    var tp = global.TribePrincipals;
    if (tp && typeof tp.getPrincipal === "function") {
      try { return tp.getPrincipal(id); } catch (e) { return null; }
    }
    return null;
  }

  function isPrincipalRef(ref) {
    if (!isStr(ref)) return false;
    var tp = global.TribePrincipals;
    if (tp && typeof tp.isCanonicalId === "function") {
      try { return tp.isCanonicalId(ref); } catch (e) {}
    }
    return FALLBACK_PRINCIPAL_IDS.indexOf(ref) !== -1;
  }

  function principalName(id) {
    var p = principalRecord(id);
    return p && isStr(p.displayName) ? p.displayName : String(id || "UNKNOWN");
  }

  function allWorkers() {
    var we = global.WorkerEngine;
    if (!we || typeof we.listWorkers !== "function") return [];
    try { return arr(we.listWorkers()); } catch (e) { return []; }
  }

  function workerRecord(id) {
    var we = global.WorkerEngine;
    if (!we || typeof we.getWorker !== "function") return null;
    try { return we.getWorker(id); } catch (e) { return null; }
  }

  // THE workers-under-principal derivation: a worker record belongs
  // to the principal its parentPrincipalId / parentTribeId names.
  function workersUnder(principalId) {
    return allWorkers().filter(function (w) {
      return w && (w.parentPrincipalId === principalId || w.parentTribeId === principalId);
    });
  }

  function allTasks() {
    var bom = global.BotOpsModel;
    if (!bom || typeof bom.listTasks !== "function") return [];
    try { return arr(bom.listTasks()); } catch (e) { return []; }
  }

  function taskById(id) {
    if (!isStr(id)) return null;
    var bom = global.BotOpsModel;
    if (bom && typeof bom.getTask === "function") {
      try { var t = bom.getTask(id); if (t) return t; } catch (e) {}
    }
    var list = allTasks();
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i];
    return null;
  }

  // Tasks tied to a principal: the task record names the principal
  // (task.principal), or the principal's own record names the task
  // (principal.currentTask) — both are recorded ties, either counts.
  function tasksForPrincipal(p) {
    if (!p) return [];
    return allTasks().filter(function (t) {
      return t && (t.principal === p.id || (isStr(p.currentTask) && t.id === p.currentTask));
    });
  }

  // Tasks tied to a worker: the task record names the worker
  // (task.worker), or the worker's record names the task.
  function tasksForWorker(w) {
    if (!w) return [];
    var cur = isStr(w.currentTaskId) ? w.currentTaskId : (isStr(w.currentTask) ? w.currentTask : null);
    return allTasks().filter(function (t) {
      return t && (t.worker === w.workerId || (cur && t.id === cur));
    });
  }

  function cryptoAssignmentsFor(principalId) {
    var cba = global.CryptoBotAssignments;
    if (!cba || typeof cba.listAssignments !== "function") return [];
    try { return arr(cba.listAssignments({ principalId: principalId })); } catch (e) { return []; }
  }

  function cryptoRoleLabel(roleId) {
    var cba = global.CryptoBotAssignments;
    if (cba && typeof cba.getRole === "function") {
      try {
        var r = cba.getRole(roleId);
        if (r && isStr(r.label)) return r.label;
      } catch (e) {}
    }
    return String(roleId || "UNKNOWN");
  }

  // ---- Recorded events (the raw material of every graph) ----------------

  // Normalizes the three history shapes in the records into one
  // event list: principal / crypto-assignment entries carry
  // {at, change}; worker / task entries carry {at, from, to, note}.
  function eventsFromHistory(history, sourceLabel) {
    return arr(history).filter(function (h) {
      return h && typeof h === "object" && isStr(h.at);
    }).map(function (h) {
      return {
        at: h.at,
        source: sourceLabel,
        text: isStr(h.change) ? h.change
          : ((h.from || "—") + " -> " + (h.to || "—") + (isStr(h.note) && h.note ? " — " + h.note : ""))
      };
    });
  }

  function bucketByDay(events) {
    var byDay = {};
    events.forEach(function (e) {
      var day = String(e.at).slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    });
    return Object.keys(byDay).sort().map(function (day) {
      return { label: day, value: byDay[day] };
    });
  }

  function countBy(items, keyFn) {
    var counts = {};
    var order = [];
    items.forEach(function (it) {
      var k = keyFn(it);
      if (!isStr(k)) return;
      if (!counts.hasOwnProperty(k)) { counts[k] = 0; order.push(k); }
      counts[k] += 1;
    });
    return order.map(function (k) { return { label: k, value: counts[k] }; })
      .filter(function (row) { return row.value > 0; });
  }

  function latestAt(events) {
    var latest = null;
    events.forEach(function (e) { if (!latest || e.at > latest) latest = e.at; });
    return latest;
  }

  function activityGraph(events, recordCount, sourceDetail) {
    var total = events.length;
    return {
      key: "activity",
      title: "Recorded activity over time",
      items: bucketByDay(events),
      total: total,
      sourceLine: "Source: recorded history entries · " + total + " event" + (total === 1 ? "" : "s") +
        " across " + recordCount + " record" + (recordCount === 1 ? "" : "s") + " (" + sourceDetail + ")",
      emptyText: "No recorded activity yet — nothing to chart",
      why: {
        source: "The history arrays on the bot's own records (" + sourceDetail + ") — BotOpsModel / TribePrincipals / WorkerEngine / CryptoBotAssignments stores on this device.",
        derivation: "Each recorded history entry counts once, bucketed by the calendar day of its recorded timestamp. Nothing is interpolated: a day with no entries does not appear.",
        freshness: total ? ("Latest recorded entry: " + latestAt(events) + ". History is append-only; entries are never backdated by this view.")
          : "No timestamps exist — no history has been recorded for this bot."
      }
    };
  }

  function taskStatesGraph(tasks) {
    var items = countBy(tasks, function (t) { return t.state; });
    return {
      key: "task-states",
      title: "Worker tasks by recorded state",
      items: items,
      total: tasks.length,
      sourceLine: "Source: recorded worker tasks (BotOpsModel store) · " + tasks.length + " task" + (tasks.length === 1 ? "" : "s"),
      emptyText: "No worker tasks recorded — nothing to chart",
      why: {
        source: "BotOpsModel worker-task store (mti6_worker_tasks_v1) — only tasks whose record names this bot, or that this bot's record names as its current task.",
        derivation: "Tasks are counted once each, under the state their record currently carries. A task's state is a record state, not live activity: no worker runtime is connected.",
        freshness: tasks.length ? "Task states are read at profile time from the stored records."
          : "No task records exist to read."
      }
    };
  }

  // ---- Entity pipeline tie (shared graph, honestly labelled) ------------

  var DISCOVERY_CRYPTO_ROLES = ["opportunity-discovery", "opportunity-verification"];

  // Records that tie a principal to discovery work. Personal count =
  // candidates whose record names this principal as discoverer
  // (discoveredBy.ref), read from the candidate store when loaded;
  // null when the store cannot be read (unknown, not zero).
  async function pipelineTie(principalId) {
    var personal = null;
    var ec = global.EntityCandidates;
    if (ec && typeof ec.listCandidates === "function") {
      try {
        var list = arr(await ec.listCandidates());
        personal = list.filter(function (c) {
          return c && c.discoveredBy && c.discoveredBy.ref === principalId;
        }).length;
      } catch (e) { personal = null; }
    }
    var crypto = cryptoAssignmentsFor(principalId);
    var cryptoTie = crypto.some(function (a) {
      return a && DISCOVERY_CRYPTO_ROLES.indexOf(a.roleId) !== -1;
    });
    var p = principalRecord(principalId);
    var taskTie = tasksForPrincipal(p).some(function (t) {
      return t && isStr(t.dataProvenance) &&
        DISCOVERY_CRYPTO_ROLES.indexOf(t.dataProvenance.replace("crypto-bot-assignments:", "")) !== -1;
    });
    return {
      tied: (personal !== null && personal > 0) || cryptoTie || taskTie,
      personal: personal,
      cryptoTie: cryptoTie,
      taskTie: taskTie
    };
  }

  // The SHARED pipeline as a graph, for a tied principal's profile.
  // Returns null when the principal has no recorded discovery tie
  // (the profile then shows no pipeline graph at all — the pipeline
  // is not every principal's work) or {unavailable:true} when tied
  // but the pipeline cannot be read.
  async function pipelineGraphFor(principalId, name) {
    var tie = await pipelineTie(principalId);
    if (!tie.tied) return null;
    var eg = global.EntityGate;
    var s = null;
    if (eg && typeof eg.pipelineSummary === "function") {
      try { s = await eg.pipelineSummary(); } catch (e) { s = null; }
    }
    if (!s) {
      return {
        key: "pipeline", title: "Entity candidate pipeline — by stage",
        items: [], total: 0, unavailable: true,
        sourceLine: "Source: EntityGate.pipelineSummary() — the pipeline state could not be read, so no pipeline counts are claimed.",
        emptyText: "Pipeline state unavailable — nothing is claimed.",
        why: {
          source: "EntityGate.pipelineSummary() over the recorded candidate store — the same derivation STAR and the Bot Operations panel answer from.",
          derivation: "Not computed: the summary could not be read, so this graph reports unavailable rather than guessing counts.",
          freshness: "UNKNOWN — the pipeline could not be read at profile time."
        }
      };
    }
    var items = arr(s.stageOrder).map(function (stage) {
      return { label: stage, value: (s.counts && s.counts[stage]) || 0 };
    }).filter(function (row) { return row.value > 0; });
    var personalLine = tie.personal !== null && tie.personal > 0
      ? " Includes " + tie.personal + " candidate" + (tie.personal === 1 ? "" : "s") +
        " recorded as discovered by " + name + "."
      : "";
    return {
      key: "pipeline",
      title: "Entity candidate pipeline — by stage (shared)",
      items: items,
      total: s.total,
      sharedLabel: "Shared Entity Pipeline — all discovery work combined, not " + name + "'s alone." + personalLine,
      sourceLine: "Source: EntityGate.pipelineSummary() over the recorded candidate store · " + s.total +
        " candidate" + (s.total === 1 ? "" : "s") + ", all UNVERIFIED until the owner gate registers them",
      emptyText: "The shared Entity Pipeline currently holds 0 candidates — nothing to chart",
      why: {
        source: "EntityGate.pipelineSummary() — candidate records in the CryptoWorld store (recordKind ENTITY_CANDIDATE), the single derivation STAR and Bot Operations share.",
        derivation: "Every candidate in the store counts once, under its current pipeline stage. The counts are the whole pipeline's: this principal is tied to discovery work by recorded assignments" +
          (tie.personal !== null && tie.personal > 0 ? ", and " + tie.personal + " candidate(s) name " + name + " as discoverer in discoveredBy" : "") +
          ", but stage counts are never re-attributed to one bot.",
        freshness: "Read at profile time. Stale candidates (working stage, unreviewed over the staleness window): " + s.staleCount + "."
      }
    };
  }

  // ---- Portraits ---------------------------------------------------------

  function portraitFor(kind, id) {
    if (kind === "star") {
      return isStr(global.STAR_AVATAR_SRC) ? global.STAR_AVATAR_SRC : null;
    }
    if (kind === "principal") {
      var portraits = global.TRIBE_PORTRAITS;
      return portraits && isStr(portraits[id]) ? portraits[id] : null;
    }
    return null; // workers have no portraits — the fallback mark is the honest figure
  }

  // ---- Profile assembly ----------------------------------------------------

  function resolveTaskLine(taskId) {
    if (!isStr(taskId)) return null;
    var t = taskById(taskId);
    if (t) return (isStr(t.title) ? t.title : t.id) + " (" + (t.state || "UNKNOWN") + ")";
    return taskId + " (task record not in the worker-task store)";
  }

  function buildStarProfile() {
    var backendLabel = "Demo mode — no AI backend connected";
    var sb = global.StarBackend;
    if (sb && typeof sb.getStatusLabel === "function") {
      try { backendLabel = sb.getStatusLabel() || backendLabel; } catch (e) {}
    }
    var tpSummary = null;
    var tp = global.TribePrincipals;
    if (tp && typeof tp.summary === "function") {
      try { tpSummary = tp.summary(); } catch (e) { tpSummary = null; }
    }
    var taskSummary = null;
    var bom = global.BotOpsModel;
    if (bom && typeof bom.summary === "function") {
      try { taskSummary = bom.summary(); } catch (e) { taskSummary = null; }
    }
    var graphs = [];
    if (tpSummary) {
      graphs.push({
        key: "star-principals",
        title: "Tribe principals by assignment state (cockpit-wide)",
        items: [
          { label: "ASSIGNED", value: tpSummary.assigned },
          { label: "UNASSIGNED", value: tpSummary.unassigned }
        ],
        total: tpSummary.total,
        sourceLine: "Source: TribePrincipals.summary() over the 12 canonical principal records · " + tpSummary.total + " principals",
        emptyText: "No principal records — nothing to chart",
        why: {
          source: "TribePrincipals registry — the 12 canonical principal records and their recorded assignment state.",
          derivation: "A principal counts as ASSIGNED when its record carries a role or a task; otherwise UNASSIGNED. STAR coordinates the workforce, so STAR's profile charts the workforce it coordinates — labelled cockpit-wide, never as STAR's personal output.",
          freshness: "Read at profile time from the registry's current records."
        }
      });
    }
    if (taskSummary) {
      var stateItems = Object.keys(taskSummary.byState || {})
        .filter(function (st) { return taskSummary.byState[st] > 0; })
        .map(function (st) { return { label: st, value: taskSummary.byState[st] }; });
      graphs.push({
        key: "star-tasks",
        title: "Worker tasks by recorded state (cockpit-wide)",
        items: stateItems,
        total: taskSummary.total,
        sourceLine: "Source: BotOpsModel.summary() over the recorded worker-task store · " + taskSummary.total + " task" + (taskSummary.total === 1 ? "" : "s"),
        emptyText: "No worker tasks recorded anywhere yet — nothing to chart",
        why: {
          source: "BotOpsModel worker-task store (mti6_worker_tasks_v1) — every recorded worker task, across all principals.",
          derivation: "Tasks count once each under their recorded state. No task is live: BotOpsModel reports active 0 because no worker runtime is connected.",
          freshness: "Read at profile time from the stored records."
        }
      });
    }
    return {
      kind: "star",
      ref: STAR_REF,
      id: STAR_REF,
      name: "STAR",
      displayTitle: "STAR 3.0",
      kindLabel: "Main persistent assistant",
      parentLine: "Sits above the Tribe workforce — coordinates the 12 principals; answers to Daniel",
      roleLine: "Coordinator of the bot workforce; the cockpit's query interface",
      taskLine: "Presenting the cockpit's recorded state (see the cockpit status below)",
      statusLine: backendLabel,
      liveLine: "NOT_CONNECTED — no AI backend is connected; STAR answers locally in demo mode from the cockpit's real records",
      portraitSrc: portraitFor("star"),
      fallbackMark: "✨",
      presenterLabel: "STAR presents the cockpit's recorded state — local demo derivation, no AI backend connected",
      activityLines: [
        "Backend: " + backendLabel,
        "Workers active: 0 — NOT_CONNECTED (no worker runtime exists)",
        tpSummary ? ("Principals: " + tpSummary.assigned + " of " + tpSummary.total + " hold a recorded assignment") : "Principal summary unavailable — TribePrincipals is not loaded",
        taskSummary ? ("Worker tasks recorded: " + taskSummary.total) : "Worker-task summary unavailable — BotOpsModel is not loaded"
      ],
      workers: [],
      workersNote: "No workers are recorded under STAR — worker records name a Tribe principal as their parent; STAR coordinates the principals.",
      graphs: graphs,
      identityWhy: {
        source: "STAR's identity is the cockpit's own shell definition (js/modules/star.js) — the main persistent named assistant, above the Tribe roster by owner ruling.",
        derivation: "STAR is not read from the principal registry: TribePrincipals rejects STAR as a principal by design. Status comes from StarBackend.getStatusLabel() at profile time.",
        freshness: "Backend state is session state, read at profile time: " + backendLabel + "."
      },
      activityWhy: {
        source: "TribePrincipals.summary(), BotOpsModel.summary() and StarBackend — the same derivations the Bot Operations screen renders.",
        derivation: "Counts are the registries' own summaries over their records; nothing is re-derived or rounded into a claim the records do not make.",
        freshness: "Read at profile time."
      }
    };
  }

  function buildPrincipalProfile(p) {
    var tasks = tasksForPrincipal(p);
    var crypto = cryptoAssignmentsFor(p.id);
    var workers = workersUnder(p.id);
    var events = eventsFromHistory(p.history, "principal record")
      .concat(tasks.reduce(function (acc, t) {
        return acc.concat(eventsFromHistory(t.history, "worker task " + t.id));
      }, []))
      .concat(crypto.reduce(function (acc, a) {
        return acc.concat(eventsFromHistory(a.history, "crypto assignment " + a.assignmentId));
      }, []));
    var recordCount = 1 + tasks.length + crypto.length;
    var graphs = [
      activityGraph(events, recordCount, "principal record, tied worker tasks, crypto assignments"),
      taskStatesGraph(tasks)
    ];
    var activityLines = [];
    if (isStr(p.currentTask)) {
      activityLines.push("Current task: " + resolveTaskLine(p.currentTask));
    } else {
      activityLines.push("No task recorded for " + p.displayName + " — assignment state " + (p.assignmentState || "UNASSIGNED"));
    }
    if (isStr(p.currentRole)) activityLines.push("Assignment role: " + p.currentRole);
    crypto.forEach(function (a) {
      activityLines.push("Crypto assignment: " + cryptoRoleLabel(a.roleId) + " — subject " +
        (a.subjectId || "UNKNOWN") + " (" + (a.subjectType || "subject") + ") · status " + (a.status || "UNKNOWN"));
    });
    activityLines.push(workers.length
      ? "Worker records under " + p.displayName + ": " + workers.length + " (records only — no worker is live)"
      : "No workers recorded under " + p.displayName + " yet");
    activityLines.push(tasks.length
      ? "Worker tasks tied to " + p.displayName + ": " + tasks.length
      : "No worker tasks recorded for " + p.displayName);
    var lastEvent = latestAt(events);
    return {
      kind: "principal",
      ref: p.id,
      id: p.id,
      name: p.displayName,
      displayTitle: p.displayName,
      kindLabel: "Tribe principal",
      parentLine: "Tribe principal · Revelation 7 order " + (p.order || "UNKNOWN") + " of 12 · organizational parent: STAR 3.0",
      roleLine: isStr(p.currentRole) ? p.currentRole : "No role recorded",
      taskLine: isStr(p.currentTask) ? resolveTaskLine(p.currentTask) : "No task recorded",
      statusLine: "Identity status: " + (p.status || "UNKNOWN") + " (identity active — not a claim of live activity) · Assignment: " + (p.assignmentState || "UNASSIGNED"),
      liveLine: "NOT_CONNECTED — no worker runtime is connected; this profile is a record readout",
      portraitSrc: portraitFor("principal", p.id),
      fallbackMark: (p.order ? String(p.order) + " " : "") + p.displayName.charAt(0),
      presenterLabel: READOUT_LABEL,
      activityLines: activityLines,
      workers: workers.map(function (w) {
        return {
          ref: w.workerId,
          name: isStr(w.canonicalName) ? w.canonicalName : w.workerId,
          line: (isStr(w.currentRole) ? w.currentRole : "UNKNOWN") + " · " + (w.status || "UNKNOWN")
        };
      }),
      workersNote: workers.length ? null : "No workers recorded under " + p.displayName + " yet",
      graphs: graphs,
      identityWhy: {
        source: "TribePrincipals canonical roster (owner ruling 2026-11-14) — id, name and order are roster constants; assignments persist in mti6_principal_assignments_v1.",
        derivation: "Name and order are read from the roster record; role and task are the record's current assignment fields. An assignment change never renames a principal.",
        freshness: lastEvent ? ("Latest recorded change: " + lastEvent + " (from the principal's append-only history).")
          : "No history recorded — the principal carries no assignment history yet."
      },
      activityWhy: {
        source: "The principal's TribePrincipals record, the BotOpsModel worker-task store, CryptoBotAssignments (mti6_crypto_assignments_v1) and WorkerEngine records — the same records Bot Operations renders.",
        derivation: "Lines are read directly off those records: current task/role from the principal record, crypto assignments filtered by principalId, workers filtered by parentPrincipalId, tasks by their recorded principal tie.",
        freshness: lastEvent ? ("Most recent recorded event across those records: " + lastEvent + ".") : "No recorded events — freshness is unknown, not current."
      }
    };
  }

  function buildWorkerProfile(w) {
    var tasks = tasksForWorker(w);
    var events = eventsFromHistory(w.history, "worker record")
      .concat(tasks.reduce(function (acc, t) {
        return acc.concat(eventsFromHistory(t.history, "worker task " + t.id));
      }, []));
    // Lifecycle distribution: the recorded `to` states of this
    // worker's own history entries (SPAWNED, ASSIGNED, ...).
    var lifecycleCounts = {};
    arr(w.history).forEach(function (h) {
      if (h && isStr(h.to)) lifecycleCounts[h.to] = (lifecycleCounts[h.to] || 0) + 1;
    });
    var lifecycleItems = Object.keys(lifecycleCounts).map(function (st) {
      return { label: st, value: lifecycleCounts[st] };
    });
    var graphs = [
      activityGraph(events, 1 + tasks.length, "worker record, tied worker tasks"),
      {
        key: "lifecycle",
        title: "Recorded lifecycle states",
        items: lifecycleItems,
        total: arr(w.history).length,
        sourceLine: "Source: this worker's recorded lifecycle history · " + arr(w.history).length + " entr" + (arr(w.history).length === 1 ? "y" : "ies"),
        emptyText: "No lifecycle history recorded — nothing to chart",
        why: {
          source: "WorkerEngine worker record " + w.workerId + " — its append-only history array.",
          derivation: "Each history entry counts once under the state it transitioned TO. A recorded state is not live activity: WorkerEngine.isLiveActive() is false for every record.",
          freshness: w.lastHeartbeatAt || w.lastHeartbeat
            ? "Last recorded heartbeat: " + new Date(w.lastHeartbeatAt || w.lastHeartbeat).toISOString() + " (a heartbeat is a record, not liveness)."
            : "No heartbeat recorded — the worker's freshness is UNKNOWN, never assumed current."
        }
      }
    ];
    if (tasks.length) graphs.push(taskStatesGraph(tasks));
    var parentId = isStr(w.parentPrincipalId) ? w.parentPrincipalId
      : (isStr(w.parentTribeId) ? w.parentTribeId : null);
    var cur = isStr(w.currentTaskId) ? w.currentTaskId : (isStr(w.currentTask) ? w.currentTask : null);
    var activityLines = [
      "Recorded status: " + (w.status || "UNKNOWN") + " — a record state, not live activity",
      "Role: " + (isStr(w.currentRole) ? w.currentRole : "UNKNOWN"),
      cur ? ("Current task: " + resolveTaskLine(cur)) : "No current task recorded",
      tasks.length ? ("Worker tasks tied to this worker: " + tasks.length) : "No worker tasks recorded for this worker",
      (w.lastHeartbeatAt || w.lastHeartbeat)
        ? "Last heartbeat recorded: " + new Date(w.lastHeartbeatAt || w.lastHeartbeat).toISOString()
        : "No heartbeat recorded — freshness UNKNOWN"
    ];
    arr(w.warnings).forEach(function (x) {
      activityLines.push("Warning: " + (typeof x === "string" ? x : (x && x.message) || "recorded warning"));
    });
    arr(w.errors).forEach(function (x) {
      activityLines.push("Error: " + (typeof x === "string" ? x : (x && x.message) || "recorded error"));
    });
    return {
      kind: "worker",
      ref: w.workerId,
      id: w.workerId,
      name: isStr(w.canonicalName) ? w.canonicalName : w.workerId,
      displayTitle: isStr(w.canonicalName) ? w.canonicalName : w.workerId,
      kindLabel: "Task worker (record)",
      parentLine: parentId
        ? "Worker under " + principalName(parentId) + " (" + parentId + ")"
        : "Parent principal UNKNOWN — no parent recorded",
      parentRef: parentId,
      roleLine: isStr(w.currentRole) ? w.currentRole : "UNKNOWN",
      taskLine: cur ? resolveTaskLine(cur) : "No task recorded",
      statusLine: "Recorded status: " + (w.status || "UNKNOWN") + " · Health: " + (w.health || "UNKNOWN") + " · Autonomy: " + (w.autonomyLevel || "UNKNOWN"),
      liveLine: "NOT_CONNECTED — a worker record is not a live worker; no worker runtime exists",
      portraitSrc: null,
      fallbackMark: "⚙",
      presenterLabel: READOUT_LABEL,
      activityLines: activityLines,
      workers: [],
      workersNote: null,
      graphs: graphs,
      identityWhy: {
        source: "WorkerEngine worker record " + w.workerId + " — spawned " + (w.createdAt || "at an unrecorded time") +
          ", origin " + (isStr(w.origin) ? w.origin : "UNKNOWN") + ". WorkerEngine records are session records; the engine persists nothing.",
        derivation: "Name, parent, role and status are read from the record itself. The name is permanent on the record; role changes never rename a worker.",
        freshness: (w.lastHeartbeatAt || w.lastHeartbeat)
          ? "Last recorded heartbeat: " + new Date(w.lastHeartbeatAt || w.lastHeartbeat).toISOString() + "."
          : "No heartbeat recorded — freshness UNKNOWN."
      },
      activityWhy: {
        source: "The worker's WorkerEngine record plus BotOpsModel tasks whose record names this worker (or that this worker's record names as its current task).",
        derivation: "Lines are read directly off those records at profile time; warnings and errors are the record's own append-only lists.",
        freshness: latestAt(events) ? ("Most recent recorded event: " + latestAt(events) + ".") : "No recorded events — freshness is unknown, not current."
      }
    };
  }

  // Resolves a profile ref: "star", a canonical principal id, or a
  // worker id. Returns the profile object or null (an unknown ref
  // is an honest not-found, never a guessed bot).
  function buildProfile(ref) {
    if (!isStr(ref)) return null;
    if (ref === STAR_REF) return buildStarProfile();
    if (isPrincipalRef(ref)) {
      var p = principalRecord(ref);
      if (p) return buildPrincipalProfile(p);
      return null;
    }
    var w = workerRecord(ref);
    if (w) return buildWorkerProfile(w);
    return null;
  }

  // The selectable bot list (sidebar accordion + profile index):
  // STAR, the 12 principals, and every recorded worker.
  function profileIndex() {
    var out = [{ ref: STAR_REF, kind: "star", name: "STAR", line: "Main persistent assistant" }];
    var tp = global.TribePrincipals;
    var roster = tp && Array.isArray(tp.ROSTER) ? tp.ROSTER : FALLBACK_PRINCIPAL_IDS.map(function (id, i) {
      return { id: id, displayName: id.replace("tribe-", "").toUpperCase(), order: i + 1 };
    });
    roster.forEach(function (entry) {
      var p = principalRecord(entry.id);
      out.push({
        ref: entry.id,
        kind: "principal",
        name: entry.displayName,
        line: p && isStr(p.currentRole) ? p.currentRole : "Principal"
      });
    });
    allWorkers().forEach(function (w) {
      out.push({
        ref: w.workerId,
        kind: "worker",
        name: isStr(w.canonicalName) ? w.canonicalName : w.workerId,
        line: (isStr(w.currentRole) ? w.currentRole : "UNKNOWN") + " · " + (w.status || "UNKNOWN"),
        parentRef: isStr(w.parentPrincipalId) ? w.parentPrincipalId : w.parentTribeId
      });
    });
    return out;
  }

  // STAR's cockpit-status lines, from StarWorld's own deterministic
  // responder (the honest counts) — the presenter card's chart text
  // for STAR. Falls back to an honest unavailable line.
  async function starStatusLines() {
    var sw = global.StarWorld;
    if (sw && typeof sw.answer === "function") {
      try {
        var text = await sw.answer("cockpit status");
        if (isStr(text)) return text.split("\n").filter(function (l) { return l.trim().length > 0; });
      } catch (e) {}
    }
    return ["Cockpit status unavailable — StarWorld is not loaded, so no counts are claimed."];
  }

  global.BotProfiles = {
    STAR_REF: STAR_REF,
    READOUT_LABEL: READOUT_LABEL,
    CONVERGENCE_LINE: CONVERGENCE_LINE,
    isPrincipalRef: isPrincipalRef,
    workersUnder: workersUnder,
    tasksForPrincipal: function (id) {
      var p = principalRecord(id);
      return p ? tasksForPrincipal(p) : [];
    },
    tasksForWorker: function (id) {
      var w = workerRecord(id);
      return w ? tasksForWorker(w) : [];
    },
    cryptoAssignmentsFor: cryptoAssignmentsFor,
    buildProfile: buildProfile,
    profileIndex: profileIndex,
    pipelineGraphFor: pipelineGraphFor,
    starStatusLines: starStatusLines
  };
})(window);
