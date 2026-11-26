import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Bot,
  Compass,
  Cpu,
  Network,
  Send,
  Shield,
  Sliders,
  Sparkles,
  Terminal,
  TrendingUp,
} from 'lucide-react';
import { TRIBE_PRINCIPALS } from '../worlds-data';
import { SPACE_BG } from './CryptoWorld';
import {
  ROLE_LABELS,
  assignRole,
  assignTask,
  loadAssignments,
  unassign,
  type AssignmentMap,
} from '../principal-assignments';
import {
  TASK_TRANSITIONS,
  createTask,
  loadTasks,
  removeTask,
  transitionTask,
  type TaskState,
  type WorkerTask,
} from '../worker-tasks';
import { RESOURCE_COUNTS, RESOURCE_GAPS, RESOURCE_PROVIDERS } from '../resource-catalog-data';
import { MEMORY_KINDS, memorySummary } from '../bot-memory';
import { LessonsPanel } from './LessonsPanel';
import { JobCardsPanel } from './JobCardsPanel';
import { ApiRegistryPanel } from './ApiRegistryPanel';
import { ProjectKnowledgePanel } from './ProjectKnowledgePanel';
import { AngelsPanel } from './AngelsPanel';
import { BotIntelligencePanel } from './BotIntelligencePanel';
import { MistakeAlertsPanel } from './MistakeAlertsPanel';
import { ExtensionSearchPanel } from './ExtensionSearchPanel';
import { learnFromHarvest } from '../bot-learning';
import {
  EXECUTORS,
  CONTINUOUS_DISCOVERY_ROTATION,
  decideExecutionMode,
  executorById,
  loadKinds,
  runAdHocTask,
  runRuntimeTask,
  runtimeStoreSummary,
  saveKinds,
  type ParallelBatchTask,
  type RunRecord,
  type RuntimeKindMap,
} from '../worker-runtime';
import {
  addBuildEvidence,
  addBuildItem,
  buildQueueSummary,
  ensureBuildQueueSeeded,
  loadBuildQueue,
  setBuildItemPrincipal,
  setBuildItemStatus,
  type BuildItem,
  type BuildItemKind,
  type BuildItemStatus,
} from '../build-queue';
import {
  BOT_BROWSER_REPO_URL,
  BOT_BROWSER_SCOPE_LINE,
  approveBuildForBrowser,
  botBrowserSummary,
  endBotBrowserSession,
  loadBotBrowserSession,
  loadBrowserLog,
  markBotBrowserSignedIn,
  requestBrowserAction,
  revokeBuildForBrowser,
  type BotBrowserAction,
  type BotBrowserSession,
} from '../bot-browser';
import { listRadarCandidates, RADAR_CATEGORY_STATES, moneyRadarSummary } from '../money-radar';
import { swapDeskSummary } from '../swap-desk';
import { loadExecutorRuns, runDryRunCycle } from '../executor';
import { fetchStarStatus } from '../star-client';
import { BotTheater } from './BotTheater';
import { loadTakeovers, recordTakeover, type TakeoverRecord } from '../bot-theater';
import {
  HARVEST_EXCERPT_CHARS,
  HARVEST_INTERVAL_MS,
  HARVEST_KINDS,
  HARVEST_MAX_RECORDS,
  loadHarvestAssignments,
  loadHarvestAuto,
  loadHarvestRecords,
  runHarvestAssignments,
  safeHarvestUrl,
  saveHarvestAssignments,
  saveHarvestAuto,
  type HarvestAssignment,
  type HarvestKind,
  type HarvestRecord,
} from '../web-harvest';
import {
  BLOCKSCOUT_NETWORKS,
  CONTRACT_ROLES,
  checkContractOnExplorer,
  loadContractEntries,
  normalizeEvmAddress,
  recordContractCheck,
} from '../contract-registry';
import { CATALOGUED_CONTRACTS } from '../contract-catalog';
import { DEX_CHECKLIST, dexCoverage } from '../classification';
import { loadDexCandidates, loadRelationshipCandidates } from '../dex-registry';
import { loadBridgeCandidates } from '../bridge-registry';
import { loadPoolCandidates, loadVaultCandidates } from '../pool-vault-registry';
import { loadApprovalPackage } from '../approval-packages';
import { ASSET_FAMILIES_NOT_SYMBOLS, assetUniverse, assetUniverseSummary } from '../asset-universe';

type ConsoleTab =
  | 'Overview'
  | 'Tasks'
  | 'Dependencies'
  | 'Resources'
  | 'Outputs'
  | 'Logs'
  | 'Knowledge'
  | 'Settings'
  | 'Performance'
  | 'History';

const CONSOLE_TABS: ConsoleTab[] = [
  'Overview',
  'Tasks',
  'Dependencies',
  'Resources',
  'Outputs',
  'Logs',
  'Knowledge',
  'Settings',
  'Performance',
  'History',
];

// No scanner feed is connected: no opportunity names, sectors, or scores
// are shown. The scanner panel renders an honest empty state.
// No earnings feed is connected either: no weekly trend bars are shown.

export const BotOperations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ConsoleTab>('Overview');
  const [selectedTribe, setSelectedTribe] = useState<string>(TRIBE_PRINCIPALS[0]?.id ?? 'tribe-1');
  const [consoleInput, setConsoleInput] = useState('');
  // Principal assignments (v150) — the canonical assignment store
  // (mti6_principal_assignments_v1, same shape as js/tribe-principals.js).
  // Assignments are owner records: they change role/task only, never
  // identity, and they do not make a principal "live".
  const [assignments, setAssignments] = useState<AssignmentMap>(() => loadAssignments());
  const [rolePick, setRolePick] = useState<string>(ROLE_LABELS[0]);
  const [taskText, setTaskText] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const assignedCount = TRIBE_PRINCIPALS.filter((t) => assignments[t.id]?.currentRole || assignments[t.id]?.currentTask).length;
  const selectedAssignment = assignments[selectedTribe];
  // Bot work queue (v151) — canonical worker-task store
  // (mti6_worker_tasks_v1). Owner-recorded workflow states only.
  const [tasks, setTasks] = useState<WorkerTask[]>(() => loadTasks());
  // Source catalog (v152) — read-only view over the generated
  // governed catalog; search + stage filter are local UI state.
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogStage, setCatalogStage] = useState('');
  const catalogMatches = RESOURCE_PROVIDERS.filter((p) => {
    if (catalogStage && p.stage !== catalogStage) return false;
    const q = catalogQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.provider.toLowerCase().includes(q) ||
      p.domain.toLowerCase().includes(q) ||
      p.capabilities.some((c) => c.toLowerCase().includes(q))
    );
  });
  const [taskTitle, setTaskTitle] = useState('');
  const [taskRole, setTaskRole] = useState<string>(ROLE_LABELS[0]);
  const [taskPrincipal, setTaskPrincipal] = useState<string>('');
  // Worker runtime (v171) — the in-page engine. kinds maps a
  // queue task to its executor; runningIds is the REAL in-flight
  // set (the only honest "workers active" number); runLog is
  // this session's runs, newest first.
  const [taskExecutor, setTaskExecutor] = useState<string>('');
  const [kinds, setKinds] = useState<RuntimeKindMap>(() => loadKinds());
  const [runningIds, setRunningIds] = useState<string[]>([]);
  const [runLog, setRunLog] = useState<RunRecord[]>([]);
  // v230 — theater: when each in-flight run started, so the floor
  // can show live elapsed seconds.
  const [runStarts, setRunStarts] = useState<Record<string, number>>({});
  const doRun = async (task: WorkerTask) => {
    const ex = kinds[task.id];
    if (!ex || runningIds.includes(task.id)) return;
    setRunningIds((r) => [...r, task.id]);
    setRunStarts((m) => ({ ...m, [task.id]: Date.now() }));
    // Always run from the freshest store read — every transition
    // saves, so a run never overwrites a sibling run's result.
    const rec = await runRuntimeTask(loadTasks(), task.id, ex, (t) => setTasks(t));
    setRunningIds((r) => r.filter((x) => x !== task.id));
    setRunStarts((m) => {
      const n = { ...m };
      delete n[task.id];
      return n;
    });
    setRunLog((log) => [rec, ...log].slice(0, 10));
  };
  const doRunAll = async () => {
    const runnable = loadTasks().filter(
      (t) => kinds[t.id] && (t.state === 'UNASSIGNED' || t.state === 'QUEUED'),
    );
    for (const t of runnable) {
      await doRun(t);
    }
  };
  // All-time completed runtime runs, derived from the task
  // store itself (the session log below is only this page's).
  const completedRuns = tasks.filter((t) => kinds[t.id] && t.state === 'COMPLETE');
  // Auto-dispatch (v173) — a page-session switch, OFF by default
  // and never persisted: while ON and this page is open, queued
  // runtime tasks run on their own (checked every minute).
  // Closing the page stops it — the label says exactly that.
  const [autoDispatch, setAutoDispatch] = useState(false);
  /* Money Radar (v193) — STAR dispatch: one tap records and runs
   * the radar sweep through the runtime; the panel below reads
   * the radar stores directly. */
  const [radarBusy, setRadarBusy] = useState(false);
  const [radarMsg, setRadarMsg] = useState<string | null>(null);
  const doRadarRun = async () => {
    if (radarBusy) return;
    setRadarBusy(true);
    setRadarMsg(null);
    try {
      const rec = await runAdHocTask('money-radar', 'Money Radar sweep');
      setTasks(loadTasks());
      setRunLog((log) => [rec, ...log].slice(0, 10));
      setRadarMsg(rec.evidence);
    } finally {
      setRadarBusy(false);
    }
  };
  const radar = moneyRadarSummary();
  // v242 — TEAM LOOP: STAR's live/DEMO state for the truth band
  // and the loop panel. Same gateway read the Decision Board
  // already does; the panel says CHECKING until it answers.
  const [starConfigured, setStarConfigured] = useState<boolean | null>(null);
  const [starModel, setStarModel] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetchStarStatus()
      .then((s) => {
        if (live) {
          setStarConfigured(s.configured);
          setStarModel(s.model);
        }
      })
      .catch(() => {
        if (live) setStarConfigured(false);
      });
    return () => {
      live = false;
    };
  }, []);
  // v242 — TEAM LOOP: the D6 dry-run as a one-tap loop step.
  // It evaluates the strongest radar candidate and records what
  // WOULD have happened. DRY_RUN only — nothing is prepared,
  // signed, or moved.
  const [dryRunBusy, setDryRunBusy] = useState(false);
  const [dryRunMsg, setDryRunMsg] = useState<string | null>(null);
  const doLoopDryRun = async () => {
    if (dryRunBusy) return;
    setDryRunBusy(true);
    setDryRunMsg(null);
    try {
      const run = await runDryRunCycle();
      const d = run.decisions[0];
      setDryRunMsg(
        d
          ? `DRY-RUN ${d.decision} — ${d.fromSymbol} $${d.amountUsd} → ${d.toSymbol} on Base (${d.ruleFired}). ${d.reason}`
          : run.note,
      );
    } finally {
      setDryRunBusy(false);
    }
  };
  /* Approval Package (v203) — the placement pipeline's review
   * step: one tap assembles every placed candidate into the
   * package Daniel reviews at the gate. */
  const [pkgBusy, setPkgBusy] = useState(false);
  const [pkgVersion, setPkgVersion] = useState(0);
  const doPackageRun = async () => {
    if (pkgBusy) return;
    setPkgBusy(true);
    try {
      const rec = await runAdHocTask('approval-package', 'Approval package generation');
      setTasks(loadTasks());
      setRunLog((log) => [rec, ...log].slice(0, 10));
      setPkgVersion((v) => v + 1);
    } finally {
      setPkgBusy(false);
    }
  };
  void pkgVersion;
  /* Contract Discovery Registry (v185): a keyless explorer
   * checker over the registry store. */
  const [regNetwork, setRegNetwork] = useState('ethereum');
  const [regAddress, setRegAddress] = useState('');
  const [regRole, setRegRole] = useState('UNKNOWN');
  const [regBusy, setRegBusy] = useState(false);
  const [regMsg, setRegMsg] = useState<string | null>(null);
  const [regVersion, setRegVersion] = useState(0);
  const runContractCheck = async (network: string, rawAddress: string, role: string) => {
    if (regBusy) return;
    const addr = normalizeEvmAddress(rawAddress);
    if (!addr) {
      setRegMsg('UNCERTAINANCHOR: enter a valid EVM contract address (0x + 40 hex) — anchors are never guessed.');
      return;
    }
    setRegBusy(true);
    setRegMsg(null);
    try {
      const result = await checkContractOnExplorer(network, addr);
      recordContractCheck(network, addr, role, result, 'registry-panel');
      setRegMsg(
        `Recorded: ${result.name ?? 'unnamed contract'} · source verified: ${result.isVerified ? 'YES' : 'NO'} · compiler ${result.compilerVersion ?? 'not reported'}${result.implementationAddress ? ` · proxy → ${result.implementationAddress}` : ''}`,
      );
      setRegVersion((v) => v + 1);
    } catch (err) {
      setRegMsg(`Check failed, nothing recorded: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setRegBusy(false);
    }
  };
  const doContractCheck = () => {
    void runContractCheck(regNetwork, regAddress, regRole);
  };
  /* Continuous discovery (v202, Fabric Phase 4) — a second
   * page-session switch, OFF by default and never persisted:
   * while ON and this page is open, the discovery scans run in
   * a governed rotation — one scan every five minutes, each
   * recorded as a runtime task with evidence. Closing the page
   * stops it; an always-on remote runtime still does not exist
   * and this switch does not pretend otherwise. */
  const [continuousDiscovery, setContinuousDiscovery] = useState(false);
  const [discoveryMsg, setDiscoveryMsg] = useState<string | null>(null);
  const rotationRef = useRef(0);
  const discoveryBusy = useRef(false);
  // Rotation titles live here; the step order is the runtime's
  // exported CONTINUOUS_DISCOVERY_ROTATION (v243) so the
  // build-spec executor can verify membership — dry-run joined
  // as the 7th step in v251 (F3 in the Build Queue, now built).
  const ROTATION_TITLES: Record<string, string> = {
    'money-radar': 'Continuous discovery — Money Radar sweep',
    'dex-scan': 'Continuous discovery — DEX scan',
    'bridge-scan': 'Continuous discovery — Bridge scan',
    'pool-vault-scan': 'Continuous discovery — Pool + Vault scan',
    'opportunity-scan': 'Continuous discovery — Opportunity scan',
    'catalog-check': 'Continuous discovery — Catalogue check',
    'dry-run': 'Continuous discovery — Dry-run evaluation',
  };
  useEffect(() => {
    if (!continuousDiscovery) return;
    const ROTATION: { executor: string; title: string }[] = CONTINUOUS_DISCOVERY_ROTATION.map(
      (executor) => ({
        executor,
        title: ROTATION_TITLES[executor] ?? `Continuous discovery — ${executor}`,
      }),
    );
    const tick = async () => {
      if (discoveryBusy.current) return;
      discoveryBusy.current = true;
      try {
        const step = ROTATION[rotationRef.current % ROTATION.length];
        rotationRef.current += 1;
        const rec = await runAdHocTask(step.executor, step.title);
        setTasks(loadTasks());
        setRunLog((log) => [rec, ...log].slice(0, 10));
        setDiscoveryMsg(rec.evidence);
      } finally {
        discoveryBusy.current = false;
      }
    };
    const iv = setInterval(() => {
      void tick();
    }, 300000);
    void tick();
    return () => clearInterval(iv);
  }, [continuousDiscovery]);
  const dispatchBusy = useRef(false);
  useEffect(() => {
    if (!autoDispatch) return;
    const tick = async () => {
      if (dispatchBusy.current) return;
      const runnable = loadTasks().filter(
        (t) => kinds[t.id] && (t.state === 'UNASSIGNED' || t.state === 'QUEUED'),
      );
      if (runnable.length === 0) return;
      dispatchBusy.current = true;
      try {
        // v247 direction #7 — conditional parallel: consult the
        // policy before running the batch. Queue tasks carry no
        // needsParallel flag, so the work itself has not said it
        // needs parallel execution — the decision records ROTATION
        // with its reason and the loop runs one task at a time.
        // A batch only ever runs in parallel when every task in
        // it is marked needsParallel and independent.
        const batch: ParallelBatchTask[] = runnable.map((t) => ({
          task: t,
          executor: kinds[t.id] as string,
          needsParallel: false,
        }));
        decideExecutionMode(batch);
        for (const t of runnable) {
          await doRun(t);
        }
      } finally {
        dispatchBusy.current = false;
      }
    };
    const iv = setInterval(() => {
      void tick();
    }, 60000);
    void tick();
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDispatch, kinds]);
  const [taskMsg, setTaskMsg] = useState('');

  // v229 — Tribe Web Harvest: principals scraping every source
  // the owner adds, saving excerpts to a bounded RAW store.
  // Same page-open discipline as auto-dispatch: it runs when
  // this page is open and never while the app is closed.
  const [harvestAssignments, setHarvestAssignments] = useState<HarvestAssignment[]>(() => loadHarvestAssignments());
  const [harvestRecords, setHarvestRecords] = useState<HarvestRecord[]>(() => loadHarvestRecords());
  const [harvestAuto, setHarvestAutoState] = useState<boolean>(() => loadHarvestAuto());
  const [harvestBusy, setHarvestBusy] = useState(false);
  const [harvestCurrentId, setHarvestCurrentId] = useState<string | null>(null);
  const [harvestMsg, setHarvestMsg] = useState<string | null>(null);
  const [lastHarvestAt, setLastHarvestAt] = useState<number | null>(null);
  const [nextHarvestAt, setNextHarvestAt] = useState<number | null>(null);
  const harvestBusyRef = useRef(false);
  const [newPrincipal, setNewPrincipal] = useState('tribe-judah');
  const [newSource, setNewSource] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newKind, setNewKind] = useState<HarvestKind>('OTHER');
  const [harvestFormMsg, setHarvestFormMsg] = useState('');
  const runHarvestNow = async () => {
    if (harvestBusyRef.current) return;
    harvestBusyRef.current = true;
    setHarvestBusy(true);
    try {
      const made = await runHarvestAssignments(loadHarvestAssignments(), (a) => setHarvestCurrentId(a.id));
      setHarvestRecords(loadHarvestRecords());
      // v247 direction #8 — web-source learning: every harvest
      // run distills its new OK records into Bot Memory (as
      // UNVERIFIED research evidence) and, where project-relevant,
      // into the project-knowledge feed. Best-effort: a learning
      // failure never breaks the harvest record itself.
      try {
        learnFromHarvest();
      } catch {
        /* learning is best-effort; the harvest records stand */
      }
      setLastHarvestAt(Date.now());
      setNextHarvestAt(Date.now() + HARVEST_INTERVAL_MS);
      const ok = made.filter((r) => r.status === 'OK').length;
      setHarvestMsg(
        made.length === 0
          ? 'NO ACTIVE ASSIGNMENTS — add one below or switch an assignment on.'
          : `${made.length} SOURCE${made.length === 1 ? '' : 'S'} FETCHED — ${ok} OK, ${made.length - ok} FAILED. Failed sources leave a record, not silence.`,
      );
    } finally {
      harvestBusyRef.current = false;
      setHarvestBusy(false);
      setHarvestCurrentId(null);
    }
  };
  useEffect(() => {
    if (!harvestAuto) return;
    const iv = setInterval(() => {
      void runHarvestNow();
    }, HARVEST_INTERVAL_MS);
    void runHarvestNow();
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [harvestAuto]);
  const setHarvestAuto = (on: boolean) => {
    setHarvestAutoState(on);
    saveHarvestAuto(on);
  };
  const [evidenceText, setEvidenceText] = useState<Record<string, string>>({});
  const principalName = (id: string | null) =>
    id ? (TRIBE_PRINCIPALS.find((t) => t.id === id)?.displayName ?? id) : 'UNASSIGNED POOL';
  const doTransition = (task: WorkerTask, to: TaskState) => {
    const res = transitionTask(tasks, task.id, to, { evidence: evidenceText[task.id] ?? '' });
    if (res.error) setTaskMsg(res.error);
    else {
      setTasks(res.tasks);
      setTaskMsg('');
    }
  };
  // v242 — TEAM LOOP: live counts for the loop panel, read from
  // the real stores at render. Nothing here is a live claim —
  // the numbers are what the stores hold right now.
  const loopCandidates = listRadarCandidates();
  const loopDesk = swapDeskSummary();
  const loopRuns = runtimeStoreSummary();
  const loopOpenTasks = tasks.filter((t) => !['COMPLETE', 'FAILED', 'CANCELED'].includes(t.state)).length;
  const loopDryRuns = loadExecutorRuns().length;
  // v243 — BUILDER track: what the team prepared for Muse to
  // build. The bots do NOT write code — each item is research,
  // spec, and verification with evidence. Seeded once from the
  // v242 follow-ons (F2/F3/F4/F6), each verified still unbuilt
  // before it was listed. Muse implements; the owner marks
  // IMPLEMENTED when it lands.
  const [buildQueue, setBuildQueue] = useState<BuildItem[]>(() => ensureBuildQueueSeeded());
  const [buildSpecBusy, setBuildSpecBusy] = useState(false);
  const [buildSpecMsg, setBuildSpecMsg] = useState<string | null>(null);
  const [buildMsg, setBuildMsg] = useState('');
  const [newBuildTitle, setNewBuildTitle] = useState('');
  const [newBuildKind, setNewBuildKind] = useState<BuildItemKind>('SPEC');
  const [newBuildPrincipal, setNewBuildPrincipal] = useState('tribe-judah');
  const [newBuildSpec, setNewBuildSpec] = useState('');
  const [evItemId, setEvItemId] = useState('');
  const [evChecked, setEvChecked] = useState('');
  const [evFinding, setEvFinding] = useState('');
  const [evSource, setEvSource] = useState('');
  const buildSummary = buildQueueSummary();
  const doBuildSpecRun = async () => {
    if (buildSpecBusy) return;
    setBuildSpecBusy(true);
    setBuildSpecMsg(null);
    try {
      const rec = await runAdHocTask('build-spec', 'Build spec verification');
      setTasks(loadTasks());
      setRunLog((log) => [rec, ...log].slice(0, 10));
      setBuildQueue(loadBuildQueue());
      setBuildSpecMsg(rec.evidence);
    } finally {
      setBuildSpecBusy(false);
    }
  };
  const createBuildTaskFor = (item: BuildItem) => {
    const title = `BUILD: ${item.title}`;
    const existing = tasks.find((t) => t.title === title);
    if (existing) {
      setBuildMsg(`BUILD TASK ALREADY OPEN — "${title}" is ${existing.state}.`);
      return;
    }
    const next = createTask(tasks, { title, role: 'Builder', principal: item.principalId });
    setTasks(next);
    setBuildMsg(
      `BUILD TASK RECORDED — "${title}" (Builder${item.principalId ? ` · ${principalName(item.principalId)}` : ''}) · UNASSIGNED.`,
    );
  };
  const setBuilderRoleFor = (item: BuildItem) => {
    if (!item.principalId) {
      setBuildMsg('Pick a principal for this item first.');
      return;
    }
    setAssignments((m) =>
      assignRole(m, item.principalId as string, 'Builder', `BUILDER track — assigned to build work: ${item.title}`),
    );
    setBuildMsg(
      `${principalName(item.principalId)} now carries the BUILDER role for "${item.title}".`,
    );
  };
  const markBuildItem = (item: BuildItem, status: BuildItemStatus) => {
    setBuildQueue(setBuildItemStatus(loadBuildQueue(), item.id, status));
    setBuildMsg(`"${item.title}" marked ${status}.`);
  };
  const addEvidenceTo = () => {
    if (!evItemId) return setBuildMsg('Pick a build item for the evidence.');
    if (!evChecked.trim() || !evFinding.trim())
      return setBuildMsg('Evidence needs what was checked and what was found.');
    setBuildQueue(
      addBuildEvidence(loadBuildQueue(), evItemId, {
        checked: evChecked,
        finding: evFinding,
        source: evSource,
      }),
    );
    setEvChecked('');
    setEvFinding('');
    setEvSource('');
    setBuildMsg('EVIDENCE RECORDED on the build item.');
  };
  const addNewBuildItem = () => {
    if (!newBuildTitle.trim()) return setBuildMsg('A build item title is required.');
    setBuildQueue(
      addBuildItem(loadBuildQueue(), {
        title: newBuildTitle,
        kind: newBuildKind,
        principalId: newBuildPrincipal || null,
        spec: newBuildSpec,
      }),
    );
    setNewBuildTitle('');
    setNewBuildSpec('');
    setBuildMsg('BUILD ITEM ADDED — PREPARED, awaiting verification and Muse to implement.');
  };
  // v245 — BOT BROWSER: governed in-app browser session for GitHub
  // build work (Universal Search spec Phase 3). Daniel signs in
  // once in the browser; bots act only on build items he approves;
  // every action is requested, scope-checked, and logged —
  // including refusals. The bot never acts inside GitHub: an
  // approved in-scope page opens in a new tab for the owner to
  // perform and verify. No commit or push action exists here.
  const [browserSession, setBrowserSession] = useState<BotBrowserSession>(() =>
    loadBotBrowserSession(),
  );
  const [browserLog, setBrowserLog] = useState<BotBrowserAction[]>(() => loadBrowserLog());
  const [browserMsg, setBrowserMsg] = useState('');
  const [browserItemId, setBrowserItemId] = useState('');
  const [browserActionKind, setBrowserActionKind] = useState<'VIEW_REPO' | 'VIEW_PULLS' | 'CUSTOM'>(
    'VIEW_REPO',
  );
  const [browserCustomUrl, setBrowserCustomUrl] = useState('');
  const browserSummary = botBrowserSummary();
  const openGithubSignIn = () => {
    window.open(BOT_BROWSER_REPO_URL, '_blank', 'noopener,noreferrer');
    setBrowserMsg(
      'GITHUB OPENED IN A NEW TAB — SIGN IN THERE, THEN TAP "I SIGNED IN — CONFIRM SESSION". THE APP NEVER ASKS FOR YOUR PASSWORD.',
    );
  };
  const confirmBrowserSignIn = () => {
    setBrowserSession(markBotBrowserSignedIn());
    setBrowserMsg(
      'SESSION MARKED SIGNED IN — OWNER-CONFIRMED IN THIS BROWSER. THE APP CANNOT VERIFY A GITHUB SIGN-IN ITSELF; NO PASSWORD, TOKEN, OR COOKIE WAS STORED.',
    );
  };
  const endBrowserSession = () => {
    setBrowserSession(endBotBrowserSession());
    setBrowserMsg(
      'SESSION ENDED — NOT SIGNED IN. APPROVALS FOR BUILD ITEMS STAY (THEY ARE YOUR DECISIONS) UNTIL REVOKED.',
    );
  };
  const toggleBrowserApproval = (itemId: string) => {
    const s = loadBotBrowserSession();
    if (s.approvedBuildIds.includes(itemId)) {
      setBrowserSession(revokeBuildForBrowser(itemId));
      setBrowserMsg(`Browser approval revoked for "${itemId}".`);
    } else {
      setBrowserSession(approveBuildForBrowser(itemId));
      setBrowserMsg(
        `Approved for browser work: "${itemId}". The bot may request in-scope GitHub pages for this item only.`,
      );
    }
  };
  const doBrowserAction = () => {
    const item = buildQueue.find((b) => b.id === browserItemId) ?? null;
    const url =
      browserActionKind === 'VIEW_REPO'
        ? `${BOT_BROWSER_REPO_URL}/tree/development`
        : browserActionKind === 'VIEW_PULLS'
          ? `${BOT_BROWSER_REPO_URL}/pulls`
          : browserCustomUrl.trim();
    const action =
      browserActionKind === 'VIEW_REPO'
        ? 'View repo code at development'
        : browserActionKind === 'VIEW_PULLS'
          ? 'View open pull requests'
          : `Open custom page ${url}`;
    if (browserActionKind === 'CUSTOM' && !url) {
      setBrowserMsg('A custom page needs a GitHub URL.');
      return;
    }
    const verdict = requestBrowserAction({
      principalId: item?.principalId ?? null,
      buildItemId: browserItemId || null,
      action,
      url,
    });
    setBrowserLog(loadBrowserLog());
    if (verdict.openUrl) {
      window.open(verdict.openUrl, '_blank', 'noopener,noreferrer');
      setBrowserMsg(`OPENED FOR YOU — ${verdict.page}. ${verdict.detail}`);
    } else {
      setBrowserMsg(`REFUSED — ${verdict.detail}`);
    }
  };
  // v230 — TAKE OVER: Daniel takes a step himself (a sign-in, a
  // verification click, a password). The takeover is recorded
  // the moment it happens, and the task is BLOCKED until he
  // hands it back. A run already in flight finishes on its own
  // and its evidence is kept — the bot starts nothing new.
  const [takeovers, setTakeovers] = useState<TakeoverRecord[]>(() => loadTakeovers());
  const takeOverTask = (task: WorkerTask) => {
    const res = transitionTask(tasks, task.id, 'BLOCKED', {
      note: 'Daniel took over — he will do this step himself.',
      blockerReason: 'OWNER TAKEOVER — Daniel took the step himself (sign-in or human step).',
    });
    if (res.error) {
      setTaskMsg(res.error);
      return;
    }
    setTasks(res.tasks);
    setTakeovers(
      recordTakeover({
        kind: 'TASK',
        refId: task.id,
        title: task.title,
        principal: principalName(task.principal),
        reason: 'OWNER TAKEOVER — Daniel took the step himself (sign-in or human step).',
      }),
    );
    setTaskMsg('');
  };
  const takeOverHarvest = (a: HarvestAssignment) => {
    const next = harvestAssignments.map((x) => (x.id === a.id ? { ...x, active: false } : x));
    setHarvestAssignments(next);
    saveHarvestAssignments(next);
    setTakeovers(
      recordTakeover({
        kind: 'HARVEST',
        refId: a.id,
        title: `${a.sourceName} (${a.principalName} scout)`,
        principal: a.principalName,
        reason:
          'OWNER TAKEOVER — scout paused; Daniel will fetch this source himself. A fetch already in flight finishes and is recorded.',
      }),
    );
  };
  // Demo console only: no AI backend is connected. Entries are logged
  // locally and nothing is executed.
  const [consoleHistory, setConsoleHistory] = useState<string[]>([
    '[DEMO] Command console — no AI backend connected',
    '[POLICY] Strict Non-Crypto Operational Domain enforced',
    '[STATUS] Tribe Principals staged as UNASSIGNED · NOT CONNECTED',
  ]);

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = consoleInput.trim();
    if (!cmd) return;
    setConsoleHistory((prev) => [
      `> ${cmd}`,
      `[DEMO] Logged "${cmd}" locally only — no AI backend, nothing executed.`,
      ...prev.slice(0, 8),
    ]);
    setConsoleInput('');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6 space-y-5" style={SPACE_BG}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border border-[#00B7FF]/25 bg-[#101010] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#050505] border border-[#00B7FF]/50 flex items-center justify-center text-[#00B7FF]">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold tracking-wide">OPERATIONAL HUB · BOT OPERATIONS</h1>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#8B5CFF]/15 border border-[#8B5CFF]/40 text-[#8B5CFF]">
                NON-CRYPTO DOMAIN
              </span>
            </div>
            <p className="text-xs text-[#B8B8B8]">3-Pane Operational Hub · Scanner, Bot Management & Command Console (Demo)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-[#151515] border border-[#00B7FF]/40 text-[#00B7FF]">
            READ-ONLY
          </span>
          <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-[#151515] border border-white/20 text-[#B8B8B8]">
            NOT CONNECTED
          </span>
        </div>
      </div>

      {/* Runtime truth band (Phase 2, step 8): STAR above the
          principals, workers beneath them — all of it record-keeping
          until a runtime connects. Nothing here is live. */}
      <div className="flex flex-col gap-2 rounded-xl border border-[#8B5CFF]/30 bg-[#101010] p-3 font-mono text-[11px] md:flex-row md:items-center md:justify-between">
        <span className="text-[#B8B8B8]">
          <span className="font-semibold text-[#8B5CFF]">STAR</span> —{' '}
          {starConfigured === null
            ? 'CHECKING…'
            : starConfigured
              ? `LIVE · ${starModel ?? 'MODEL UNNAMED'}`
              : 'DEMO · NO AI BACKEND CONNECTED'}{' '}
          · SITS ABOVE THE 12 PRINCIPALS
        </span>
        <span className="text-[#B8B8B8]">
          <span className="font-semibold text-[#8B5CFF]">TASK WORKERS</span> —
          IN-PAGE RUNTIME ENGINE (PHASE 1) · ACTIVE NOW: {runningIds.length} · REMOTE
          RUNTIME: NOT_CONNECTED
        </span>
      </div>

      {/* TEAM LOOP (v242) — the bot team as ONE working loop:
          Radar finds → Tribe is assigned → runtime runs →
          evidence lands in Bot Memory → STAR sees it → dry-run
          evaluates → the owner approves. Every count is read
          from the real stores at render; nothing here is a live
          claim and nothing here executes. */}
      <div className="rounded-xl border border-[#8B5CFF]/40 bg-[#101010] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs text-[#8B5CFF]">
            TEAM LOOP — RADAR → TRIBE → RUNS → STAR → DRY-RUN → OWNER
          </span>
          <span className="font-mono text-[10px] text-[#B8B8B8]">ONE LOOP · PAGE-OPEN ONLY · NOTHING HERE EXECUTES</span>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-lg border border-white/10 bg-[#050505] p-3">
            <p className="font-mono text-[10px] text-[#8B5CFF]">1 · RADAR</p>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-white">
              {radar.totalSignals} signal(s) · {loopCandidates.length} candidate(s)
            </p>
            <p className="font-mono text-[9px] text-[#B8B8B8]">{radar.dispatchedOpen} work order(s) open</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#050505] p-3">
            <p className="font-mono text-[10px] text-[#8B5CFF]">2 · TRIBE TASKS</p>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-white">{loopOpenTasks} open task(s)</p>
            <p className="font-mono text-[9px] text-[#B8B8B8]">{assignedCount} principal(s) assigned</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#050505] p-3">
            <p className="font-mono text-[10px] text-[#8B5CFF]">3 · RUNS</p>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-white">
              {loopRuns.completed} completed / {loopRuns.recorded} recorded
            </p>
            <p className="font-mono text-[9px] text-[#B8B8B8]">evidence in Bot Memory</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#050505] p-3">
            <p className="font-mono text-[10px] text-[#8B5CFF]">4 · STAR</p>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-white">
              {starConfigured === null ? 'CHECKING…' : starConfigured ? 'LIVE' : 'DEMO'}
            </p>
            <p className="font-mono text-[9px] text-[#B8B8B8]">
              {starConfigured === true ? (starModel ?? 'model unnamed') : 'answers from the records'}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#050505] p-3">
            <p className="font-mono text-[10px] text-[#8B5CFF]">5 · DRY-RUN</p>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-white">{loopDryRuns} dry-run(s) recorded</p>
            <p className="font-mono text-[9px] text-[#B8B8B8]">paper only — never a trade</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#050505] p-3">
            <p className="font-mono text-[10px] text-[#8B5CFF]">6 · OWNER</p>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-white">
              {loopDesk.prepared} prepared · {loopDesk.approved} approved · {loopDesk.handedOff} handed off
            </p>
            <p className="font-mono text-[9px] text-[#B8B8B8]">
              {loopDesk.prepared > 0 ? 'AWAITING YOUR APPROVAL' : 'nothing awaiting approval'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void doRadarRun()}
            disabled={radarBusy}
            className="flex min-h-[44px] items-center rounded border border-[#8B5CFF]/60 px-3 font-mono text-[10px] text-white disabled:opacity-50"
          >
            {radarBusy ? 'RADAR RUNNING…' : '▶ RUN MONEY RADAR'}
          </button>
          <button
            type="button"
            onClick={() => void doLoopDryRun()}
            disabled={dryRunBusy}
            className="flex min-h-[44px] items-center rounded border border-[#8B5CFF]/60 px-3 font-mono text-[10px] text-white disabled:opacity-50"
          >
            {dryRunBusy ? 'DRY-RUNNING…' : '▶ RUN DRY-RUN'}
          </button>
          <span className="font-mono text-[9px] text-[#B8B8B8]">
            {loopCandidates.length > 0
              ? `STRONGEST CANDIDATE: ${loopCandidates[0].asset} · ${loopCandidates[0].boardState} · EVIDENCE ${loopCandidates[0].evidenceCount} · ${loopCandidates[0].freshness}`
              : 'NO RADAR CANDIDATES YET — RUN MONEY RADAR FIRST.'}
          </span>
        </div>
        {dryRunMsg && <p className="font-mono text-[10px] leading-relaxed text-white">{dryRunMsg}</p>}
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          THE LOOP, END TO END: MONEY RADAR FINDS WHAT IS CHANGING · THE TRIBE RESEARCHES AND
          VERIFIES IT · THE RUNTIME RUNS THE CHECKS WHILE THIS PAGE IS OPEN · EVIDENCE LANDS IN
          BOT MEMORY · STAR SAYS WHAT DESERVES ATTENTION · THE DRY-RUN SHOWS WHAT WOULD HAVE
          HAPPENED · DANIEL APPROVES EACH PREPARED ACTION HIMSELF. NOTHING IN THIS LOOP SIGNS,
          SENDS, OR MOVES FUNDS.
        </p>
      </div>

      {/* BUILD QUEUE (v243) — the BUILDER track: what the team
          prepared for Muse to build. The bots do NOT write code
          and never run builds — each item is research, spec, and
          verification with evidence (what was checked, what was
          found, source). Muse implements in the clone; the owner
          marks IMPLEMENTED when it lands. Every record here is
          UNVERIFIED preparation, never a build claim. */}
      <div className="rounded-xl border border-[#8B5CFF]/40 bg-[#101010] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs text-[#8B5CFF]">
            BUILD QUEUE — WHAT THE TEAM PREPARED FOR MUSE TO BUILD
          </span>
          <span className="font-mono text-[10px] text-[#B8B8B8]">
            {buildSummary.prepared} PREPARED · {buildSummary.implemented} IMPLEMENTED ·{' '}
            {buildSummary.superseded} SUPERSEDED
          </span>
        </div>
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          RESEARCH · SPEC · VERIFICATION ONLY — THE BOTS DO NOT WRITE CODE AND NEVER RUN BUILDS.
          CODE IS WRITTEN BY MUSE IN THE CLONE. EACH ITEM CARRIES ITS SPEC AND ITS EVIDENCE; ASK
          STAR “WHAT’S READY TO BUILD” FOR THE SUMMARY.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void doBuildSpecRun()}
            disabled={buildSpecBusy}
            className="flex min-h-[44px] items-center rounded border border-[#8B5CFF]/60 px-3 font-mono text-[10px] text-white disabled:opacity-50"
          >
            {buildSpecBusy ? 'VERIFYING…' : '▶ RUN BUILD SPEC'}
          </button>
          <span className="font-mono text-[9px] text-[#B8B8B8]">
            RE-VERIFIES EVERY PREPARED ITEM AGAINST THE LIVE PLATFORM STATE AND RECORDS EACH
            VERDICT AS EVIDENCE.
          </span>
        </div>
        {buildSpecMsg && (
          <p className="font-mono text-[10px] leading-relaxed text-white">{buildSpecMsg}</p>
        )}
        {buildQueue.length === 0 ? (
          <p className="font-mono text-[10px] text-[#B8B8B8]">
            QUEUE EMPTY — NO BUILD WORK PREPARED. NOTHING IS INVENTED TO FILL IT.
          </p>
        ) : (
          <div className="space-y-2">
            {buildQueue.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-white/10 bg-[#050505] p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white">{item.title}</span>
                  <span className="rounded border border-[#8B5CFF]/50 px-2 py-0.5 font-mono text-[9px] text-white">
                    {item.status} · {item.kind} · {principalName(item.principalId)}
                  </span>
                </div>
                <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">{item.spec}</p>
                {item.evidence.length > 0 && (
                  <div className="space-y-1">
                    {item.evidence.map((e, i) => (
                      <p key={i} className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
                        EVIDENCE — CHECKED: {e.checked} · FOUND: {e.finding} · SOURCE: {e.source} ·{' '}
                        {new Date(e.at).toLocaleString()}
                      </p>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={item.principalId ?? ''}
                    onChange={(e) =>
                      setBuildQueue(
                        setBuildItemPrincipal(
                          loadBuildQueue(),
                          item.id,
                          e.target.value || null,
                        ),
                      )
                    }
                    aria-label={`Build principal for ${item.id}`}
                    className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none focus:border-[#8B5CFF]"
                  >
                    <option value="">Unassigned pool</option>
                    {TRIBE_PRINCIPALS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.displayName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => createBuildTaskFor(item)}
                    aria-label={`Create build task for ${item.id}`}
                    className="flex min-h-[36px] items-center rounded border border-[#8B5CFF]/60 px-3 font-mono text-[10px] text-white"
                  >
                    CREATE BUILD TASK
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuilderRoleFor(item)}
                    className="flex min-h-[36px] items-center rounded border border-white/15 px-3 font-mono text-[10px] text-white"
                  >
                    SET BUILDER ROLE
                  </button>
                  <button
                    type="button"
                    onClick={() => markBuildItem(item, 'IMPLEMENTED')}
                    disabled={item.status === 'IMPLEMENTED'}
                    className="flex min-h-[36px] items-center rounded border border-[#32D74B]/60 px-3 font-mono text-[10px] text-white disabled:opacity-50"
                  >
                    MARK IMPLEMENTED
                  </button>
                  <button
                    type="button"
                    onClick={() => markBuildItem(item, 'SUPERSEDED')}
                    disabled={item.status === 'SUPERSEDED'}
                    className="flex min-h-[36px] items-center rounded border border-white/15 px-3 font-mono text-[10px] text-white disabled:opacity-50"
                  >
                    MARK SUPERSEDED
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={evItemId}
            onChange={(e) => setEvItemId(e.target.value)}
            aria-label="Evidence build item"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none focus:border-[#8B5CFF]"
          >
            <option value="">Evidence for…</option>
            {buildQueue.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
          <input
            value={evChecked}
            onChange={(e) => setEvChecked(e.target.value)}
            placeholder="What was checked"
            aria-label="Evidence checked"
            className="h-9 flex-1 min-w-[140px] rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none placeholder:text-[#666] focus:border-[#8B5CFF]"
          />
          <input
            value={evFinding}
            onChange={(e) => setEvFinding(e.target.value)}
            placeholder="What was found"
            aria-label="Evidence finding"
            className="h-9 flex-1 min-w-[140px] rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none placeholder:text-[#666] focus:border-[#8B5CFF]"
          />
          <input
            value={evSource}
            onChange={(e) => setEvSource(e.target.value)}
            placeholder="Source (file / screen / gateway)"
            aria-label="Evidence source"
            className="h-9 flex-1 min-w-[140px] rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none placeholder:text-[#666] focus:border-[#8B5CFF]"
          />
          <button
            type="button"
            onClick={() => addEvidenceTo()}
            className="flex min-h-[36px] items-center rounded border border-[#8B5CFF]/60 px-3 font-mono text-[10px] text-white"
          >
            ADD EVIDENCE
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newBuildTitle}
            onChange={(e) => setNewBuildTitle(e.target.value)}
            placeholder="New build item title"
            aria-label="New build item title"
            className="h-9 flex-1 min-w-[180px] rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none placeholder:text-[#666] focus:border-[#8B5CFF]"
          />
          <select
            value={newBuildKind}
            onChange={(e) => setNewBuildKind(e.target.value as BuildItemKind)}
            aria-label="New build item kind"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none focus:border-[#8B5CFF]"
          >
            <option value="SPEC">SPEC</option>
            <option value="RESEARCH">RESEARCH</option>
            <option value="VERIFICATION">VERIFICATION</option>
            <option value="BUILD_PREP">BUILD_PREP</option>
          </select>
          <select
            value={newBuildPrincipal}
            onChange={(e) => setNewBuildPrincipal(e.target.value)}
            aria-label="New build item principal"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none focus:border-[#8B5CFF]"
          >
            {TRIBE_PRINCIPALS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.displayName}
              </option>
            ))}
          </select>
          <input
            value={newBuildSpec}
            onChange={(e) => setNewBuildSpec(e.target.value)}
            placeholder="Spec — what Muse should build"
            aria-label="New build item spec"
            className="h-9 flex-1 min-w-[180px] rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none placeholder:text-[#666] focus:border-[#8B5CFF]"
          />
          <button
            type="button"
            onClick={() => addNewBuildItem()}
            className="flex min-h-[36px] items-center rounded bg-[#8B5CFF] px-4 font-mono text-[10px] font-semibold text-white"
          >
            ADD BUILD ITEM
          </button>
        </div>
        {buildMsg && <p className="font-mono text-[10px] text-[#FFB020]">{buildMsg}</p>}
      </div>

      {/* BOT BROWSER (v245) — Universal Search spec Phase 3,
          Browser/Computer Use: a governed in-app browser session
          the bots use to reach GitHub and do build work on the
          project repo, development branch only. Daniel signs in
          once in the browser (his step; the app never asks for or
          stores a password, token, or cookie). Bots act only on
          build items he approves from the Build Queue. Every
          action is requested, scope-checked, and logged —
          including refusals. The bot never acts inside GitHub:
          an approved in-scope page opens in a new tab for the
          owner to perform and verify. No commit or push action
          exists here; every push still needs his own tap. */}
      <div className="rounded-xl border border-[#8B5CFF]/40 bg-[#101010] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs text-[#8B5CFF]">
            BOT BROWSER — GITHUB THROUGH A BROWSER IN THE APP
          </span>
          <span className="font-mono text-[10px] text-[#B8B8B8]">
            SESSION:{' '}
            {browserSession.state === 'SIGNED_IN' ? 'SIGNED IN — OWNER CONFIRMED' : 'NOT SIGNED IN'}
          </span>
        </div>
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          SCOPE: {BOT_BROWSER_SCOPE_LINE}. THE BOTS ACT ONLY ON BUILD ITEMS YOU APPROVE BELOW.
          EVERY ACTION IS LOGGED — INCLUDING REFUSALS. THE BOT NEVER ACTS INSIDE GITHUB: AN
          APPROVED IN-SCOPE PAGE OPENS IN A NEW TAB FOR YOU TO PERFORM AND VERIFY. NO COMMIT OR
          PUSH ACTION EXISTS HERE — EVERY PUSH STILL NEEDS YOUR OWN TAP. NO AUTO-MERGE, NO MAIN,
          NO FORCE-PUSH. NO PASSWORD, TOKEN, OR COOKIE IS EVER ASKED FOR OR STORED.
        </p>
        <p className="font-mono text-[9px] leading-relaxed text-[#FFB020]">
          {browserSession.state === 'SIGNED_IN'
            ? `SIGNED IN — OWNER-CONFIRMED IN THIS BROWSER${browserSession.signedInAt ? ` SINCE ${new Date(browserSession.signedInAt).toLocaleString()}` : ''}. THE APP CANNOT VERIFY A GITHUB SIGN-IN ITSELF.`
            : 'NOT SIGNED IN — SIGN IN TO GITHUB IN THE BROWSER FIRST. UNTIL THEN EVERY BOT BROWSER ACTION IS REFUSED AND LOGGED AS SUCH.'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openGithubSignIn()}
            className="flex min-h-[44px] items-center rounded border border-[#8B5CFF]/60 px-3 font-mono text-[10px] text-white"
          >
            OPEN GITHUB TO SIGN IN
          </button>
          <button
            type="button"
            onClick={() => confirmBrowserSignIn()}
            disabled={browserSession.state === 'SIGNED_IN'}
            className="flex min-h-[44px] items-center rounded bg-[#8B5CFF] px-3 font-mono text-[10px] font-semibold text-white disabled:opacity-50"
          >
            I SIGNED IN — CONFIRM SESSION
          </button>
          <button
            type="button"
            onClick={() => endBrowserSession()}
            disabled={browserSession.state !== 'SIGNED_IN'}
            className="flex min-h-[44px] items-center rounded border border-white/15 px-3 font-mono text-[10px] text-white disabled:opacity-50"
          >
            END SESSION
          </button>
          <span className="font-mono text-[9px] text-[#B8B8B8]">
            {browserSummary.approved} APPROVED · {browserSummary.logCount} LOGGED ·{' '}
            {browserSummary.opened} OPENED FOR YOU · {browserSummary.refused} REFUSED
          </span>
        </div>
        {buildQueue.filter((b) => b.status === 'PREPARED').length === 0 ? (
          <p className="font-mono text-[10px] text-[#B8B8B8]">
            NO PREPARED BUILD ITEMS — NOTHING TO APPROVE. THE BUILD QUEUE ABOVE IS THE TASK LIST.
          </p>
        ) : (
          <div className="space-y-2">
            {buildQueue
              .filter((b) => b.status === 'PREPARED')
              .map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#050505] p-3"
                >
                  <span className="text-xs font-semibold text-white">{item.title}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[9px] text-[#B8B8B8]">
                      {principalName(item.principalId)} ·{' '}
                      {browserSession.approvedBuildIds.includes(item.id)
                        ? 'APPROVED FOR BROWSER'
                        : 'NOT APPROVED'}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBrowserApproval(item.id)}
                      aria-label={`Approve for browser ${item.id}`}
                      className="flex min-h-[36px] items-center rounded border border-[#8B5CFF]/60 px-3 font-mono text-[10px] text-white"
                    >
                      {browserSession.approvedBuildIds.includes(item.id)
                        ? 'REVOKE'
                        : 'APPROVE FOR BROWSER'}
                    </button>
                  </span>
                </div>
              ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={browserItemId}
            onChange={(e) => setBrowserItemId(e.target.value)}
            aria-label="Browser build item"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none focus:border-[#8B5CFF]"
          >
            <option value="">Build item for the browser…</option>
            {buildQueue
              .filter((b) => b.status === 'PREPARED')
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
          </select>
          <select
            value={browserActionKind}
            onChange={(e) =>
              setBrowserActionKind(e.target.value as 'VIEW_REPO' | 'VIEW_PULLS' | 'CUSTOM')
            }
            aria-label="Browser action"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none focus:border-[#8B5CFF]"
          >
            <option value="VIEW_REPO">VIEW REPO AT DEVELOPMENT</option>
            <option value="VIEW_PULLS">VIEW OPEN PULL REQUESTS</option>
            <option value="CUSTOM">CUSTOM PAGE (SCOPE-CHECKED)</option>
          </select>
          {browserActionKind === 'CUSTOM' && (
            <input
              value={browserCustomUrl}
              onChange={(e) => setBrowserCustomUrl(e.target.value)}
              placeholder="https://github.com/jaybeee709-droid/MTI6-GTADWIY-COCKPIT/…"
              aria-label="Browser custom URL"
              className="h-9 flex-1 min-w-[220px] rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none placeholder:text-[#666] focus:border-[#8B5CFF]"
            />
          )}
          <button
            type="button"
            onClick={() => doBrowserAction()}
            aria-label="Request browser action"
            className="flex min-h-[36px] items-center rounded border border-[#8B5CFF]/60 px-3 font-mono text-[10px] text-white"
          >
            REQUEST BROWSER ACTION
          </button>
        </div>
        {browserMsg && (
          <p className="font-mono text-[10px] leading-relaxed text-white">{browserMsg}</p>
        )}
        {browserLog.length > 0 && (
          <div className="space-y-1">
            <span className="font-mono text-[10px] text-[#B8B8B8]">
              ACTION LOG — EVERY REQUEST, INCLUDING REFUSALS:
            </span>
            {browserLog.slice(0, 10).map((a) => (
              <p key={a.id} className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
                {new Date(a.at).toLocaleString()} · {a.result} · {a.action} · PAGE: {a.page} ·{' '}
                {a.detail}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* EXTENSION SEARCH (v249 part 2) — search the real extension
          stores (Chrome Web Store / Firefox Add-ons) from the app.
          A search opens the real store in a new tab for the owner;
          install happens in desktop Chrome/Firefox, never in the
          app — the app's browser cannot install or run extensions.
          Separate from the governed Bot Browser session above;
          no store host is added to its scope. */}
      <ExtensionSearchPanel />

      {/* LESSONS (v247) — Bot Memory that learns from mistakes: failed
          runs, errors, and corrections recorded as lessons the runtime
          consults before every executor run. Seeded from real project
          history only, each with its evidence. */}
      <LessonsPanel />

      {/* JOB CARDS (v247) — one card per Tribe principal: the job each
          actually does in the app, what it never does, its APIs, its
          limits. Roles are owner-assigned at runtime — no principal
          carries a fixed role in code, and no card invents one. */}
      <JobCardsPanel />

      {/* API REGISTRY (v247) — every API the platform needs, per bot:
          provider, key status (name only), monthly limit, fallback
          order, usage (UNKNOWN unless measured), cost class. */}
      <ApiRegistryPanel />

      {/* PROJECT KNOWLEDGE (v247) — the distilled Gmail/Drive feed:
          backup handoffs, key notices, deploy notifications, papers,
          directives. Curated records with a source reference — never
          raw inbox or Drive access, never the personal-details
          archive, never phone messages. */}
      <ProjectKnowledgePanel />

      {/* ANGELS (v247) — the four approved Angels (MICHAEL, GABRIEL,
          RAPHAEL, URIEL) active on security/alert work alongside the
          Tribe. Separate registry, never Tribe members. RAGUEL,
          SARIEL, REMIEL are UNVERIFIED and NOT ACTIVATED. Status is
          derived from real alert work — ACTIVE only while holding
          open assigned alerts, otherwise STANDBY. */}
      <AngelsPanel />

      {/* BOT INTELLIGENCE (v247) — the super-intelligent bots: the
          web-source learning feed (harvest → Bot Memory, UNVERIFIED),
          relevance-ranked recall, and measured STAR response times.
          Recall is prioritized by relevance and bounded by storage
          and model context — never literally everything at once. */}
      <BotIntelligencePanel />

      {/* MISTAKE ALERTS (v247) — the owner is notified on ANY mistake,
          right away: every mistake records an immediate in-app alert
          alongside its lesson. Delivery is in-app only — no mail
          provider is wired, so no email is sent; email delivery is
          a designed follow-on. */}
      <MistakeAlertsPanel />

      {/* NETWORK EARNING OPS (Gemini family 11 adoption, 2026-11-23):
          the concept's Network Earnings columns — validators, nodes,
          mining, DePIN — as an ops surface. No infrastructure is
          connected: every count is NO DATA, never an invented fleet.
          Mining is an ops column only; no miner is run from here. */}
      <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
            <Network className="h-4 w-4" />
            <span>NETWORK EARNING OPS</span>
          </div>
          <span className="text-[10px] font-mono text-[#B8B8B8]">
            VALIDATORS · NODES · MINING · DePIN — ALL NOT CONNECTED
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          {[
            { name: 'VALIDATORS', icon: Shield, lines: ['ACTIVE: NO DATA', 'UPTIME: NO DATA'] },
            { name: 'NODES', icon: Network, lines: ['RUNNING: NO DATA', 'SYNCED: NO DATA'] },
            { name: 'MINING', icon: Cpu, lines: ['RIGS: NO DATA', 'HASHRATE: NO DATA'] },
            { name: 'DePIN', icon: Activity, lines: ['NODES ONLINE: NO DATA', 'REWARDS: NO DATA'] },
          ].map((c) => (
            <div key={c.name} className="space-y-1.5 rounded-lg border border-white/10 bg-[#151515] p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <c.icon className="h-3.5 w-3.5 text-[#00B7FF]" />
                  {c.name}
                </span>
                <span className="rounded border border-white/15 bg-[#050505] px-1.5 py-0.5 font-mono text-[9px] text-[#B8B8B8]">
                  NOT CONNECTED
                </span>
              </div>
              {c.lines.map((l) => (
                <p key={l} className="font-mono text-[10px] text-[#B8B8B8]">{l}</p>
              ))}
            </div>
          ))}
        </div>
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          CONCEPT FLEET COUNTS (VALIDATORS, ANTMINERS, DePIN REWARDS) ARE
          NOT CARRIED OVER — A COUNT APPEARS ONLY WHEN A CONNECTED SOURCE
          REPORTS IT.
        </p>
      </div>

      {/* 3-Pane Operational Hub */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Pane: Non-Crypto Opportunity Scanner + Operational Earnings Chart */}
        <div className="xl:col-span-4 space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
                <Compass className="h-4 w-4" />
                <span>NON-CRYPTO OPPORTUNITY SCANNER</span>
              </div>
              <span className="text-[10px] font-mono text-[#B8B8B8]">NO_DATA</span>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-[#151515] border border-white/10 space-y-1">
                <p className="text-xs text-[#B8B8B8]">No scanner feed is connected — no opportunities are shown.</p>
                <p className="text-[10px] font-mono text-white/40">OPPORTUNITIES: NO_DATA · FEED: NOT_CONNECTED</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-[#B8B8B8]">
                <TrendingUp className="h-4 w-4" />
                <span>OPERATIONAL EARNINGS</span>
              </div>
              <span className="text-[10px] font-mono text-[#B8B8B8]">NO_DATA</span>
            </div>
            <div className="rounded-lg bg-[#050505] border border-white/10 p-3 space-y-1">
              <p className="text-xs text-[#B8B8B8]">No earnings feed is connected — no trend is shown.</p>
              <p className="text-[11px] font-mono text-white/40">EARNINGS: NO_DATA · FEED: NOT_CONNECTED</p>
            </div>
          </div>
        </div>

        {/* Center Pane: Bot Operations Management */}
        <div className="xl:col-span-5 rounded-xl border border-white/10 bg-[#101010] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-[#8B5CFF]">
              <Sliders className="h-4 w-4" />
              <span>BOT OPERATIONS MANAGEMENT</span>
            </div>
            <span className="text-[10px] font-mono text-[#B8B8B8]">
              {TRIBE_PRINCIPALS.length} PRINCIPALS · {assignedCount} ASSIGNED · {TRIBE_PRINCIPALS.length - assignedCount} UNASSIGNED
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CONSOLE_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-1 rounded text-[10px] font-mono transition ${
                  activeTab === tab
                    ? 'bg-[#00B7FF] text-[#050505] font-semibold'
                    : 'bg-[#151515] text-[#B8B8B8] border border-white/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {TRIBE_PRINCIPALS.map((tribe) => {
              const isSelected = tribe.id === selectedTribe;
              return (
                <button
                  key={tribe.id}
                  type="button"
                  onClick={() => setSelectedTribe(tribe.id)}
                  className={`p-3 rounded-lg border text-left transition space-y-1 ${
                    isSelected
                      ? 'bg-[#151515] border-[#8B5CFF]'
                      : 'bg-[#050505] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{tribe.displayName}</span>
                    <Shield className="h-3.5 w-3.5 text-[#8B5CFF]" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#B8B8B8]">
                    <span>TAB: {activeTab.toUpperCase()}</span>
                    <span>
                      {assignments[tribe.id]?.currentRole ??
                        (assignments[tribe.id]?.currentTask ? 'TASK SET' : 'UNASSIGNED')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* OWNER ASSIGNMENT — selected principal (v150) */}
          <div className="p-3 rounded-lg bg-[#050505] border border-white/10 space-y-2.5">
            <p className="font-mono text-[10px] text-[#8B5CFF]">
              ASSIGNMENT — {TRIBE_PRINCIPALS.find((t) => t.id === selectedTribe)?.displayName ?? selectedTribe}
            </p>
            <p className="font-mono text-[10px] text-[#B8B8B8]">
              ROLE: {selectedAssignment?.currentRole ?? 'UNASSIGNED'} · TASK:{' '}
              {selectedAssignment?.currentTask ?? 'NONE RECORDED'} · HISTORY:{' '}
              {selectedAssignment?.history.length ?? 0} ENTRIES
            </p>
            <div className="flex flex-wrap gap-2">
              <select
                value={rolePick}
                onChange={(e) => setRolePick(e.target.value)}
                aria-label="Assignment role"
                className="h-9 rounded-lg border border-white/15 bg-[#101010] px-2 text-xs text-white outline-none focus:border-[#8B5CFF]"
              >
                {ROLE_LABELS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setAssignments((m) => assignRole(m, selectedTribe, rolePick, assignNote))}
                className="flex min-h-[44px] items-center rounded-lg bg-[#8B5CFF] px-3 text-xs font-semibold text-white"
              >
                ASSIGN ROLE
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                placeholder="Task — e.g. Watch Aave markets on Ethereum"
                aria-label="Assignment task"
                className="h-9 min-w-[180px] flex-1 rounded-lg border border-white/15 bg-[#101010] px-2.5 text-xs text-white outline-none placeholder:text-[#B8B8B8]/60 focus:border-[#8B5CFF]"
              />
              <button
                type="button"
                onClick={() => {
                  if (taskText.trim()) {
                    setAssignments((m) => assignTask(m, selectedTribe, taskText, assignNote));
                    setTaskText('');
                  }
                }}
                className="flex min-h-[44px] items-center rounded-lg border border-[#8B5CFF]/60 px-3 text-xs font-semibold text-white"
              >
                ASSIGN TASK
              </button>
              <button
                type="button"
                onClick={() => setAssignments((m) => unassign(m, selectedTribe, assignNote))}
                className="flex min-h-[44px] items-center rounded-lg border border-white/15 px-3 font-mono text-[10px] text-[#B8B8B8]"
              >
                UNASSIGN
              </button>
            </div>
            <input
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
              placeholder="Note for the history entry (optional)"
              aria-label="Assignment note"
              className="h-9 w-full rounded-lg border border-white/15 bg-[#101010] px-2.5 text-xs text-white outline-none placeholder:text-[#B8B8B8]/60 focus:border-[#8B5CFF]"
            />
            <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
              ASSIGNMENTS ARE OWNER RECORDS IN THE CANONICAL STORE — THEY SET ROLE AND TASK ONLY,
              NEVER IDENTITY. THE IN-PAGE RUNTIME (BELOW) EXECUTES RUNTIME TASKS FOR REAL WHILE
              THIS PAGE IS OPEN; A REMOTE ALWAYS-ON RUNTIME DOES NOT EXIST.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#050505] border border-white/10 text-xs font-mono text-[#B8B8B8] flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-[#8B5CFF]" />
            <span>Runtime: READ-ONLY · NOT CONNECTED · Zero autonomous trades or payouts executed.</span>
          </div>
        </div>

        {/* Right Pane: #8B5CFF Purple Command Console (Demo — no AI backend) */}
        <div className="xl:col-span-3 rounded-xl border border-[#8B5CFF]/50 bg-[#101010] p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#8B5CFF]/25 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-mono text-[#8B5CFF]">
                <Sparkles className="h-4 w-4" />
                <span>COMMAND CONSOLE — DEMO</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#8B5CFF]/15 border border-[#8B5CFF]/40 text-[#8B5CFF]">
                #8B5CFF
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto font-mono text-[11px]">
              {consoleHistory.map((entry, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded bg-[#151515] border-l-2 ${
                    entry.startsWith('>') ? 'border-white text-white' : 'border-[#8B5CFF] text-[#B8B8B8]'
                  }`}
                >
                  {entry}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendCommand} className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-[#8B5CFF] shrink-0" />
              <input
                type="text"
                value={consoleInput}
                onChange={(e) => setConsoleInput(e.target.value)}
                placeholder="Log a note — demo, local only..."
                className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-[#8B5CFF]/40 text-xs text-white placeholder-[#B8B8B8]/50 focus:outline-none focus:border-[#8B5CFF]"
              />
              <button
                type="submit"
                className="p-1.5 rounded bg-[#8B5CFF] text-white hover:opacity-90 transition"
                aria-label="Log note (demo)"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* BOT WORK QUEUE (v151) — canonical worker-task store. States
          are owner-recorded workflow states under the model's
          transition allowlist; the runtime line below the header
          keeps records distinct from live activity. */}
      <div className="rounded-xl border border-white/10 p-4 space-y-3" style={SPACE_BG}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs text-[#8B5CFF]">BOT WORK QUEUE</span>
          <span className="font-mono text-[10px] text-[#B8B8B8]">
            TASKS RECORDED: {tasks.length} · WORKER RUNTIME: IN-PAGE ENGINE · REMOTE RUNTIME:
            NOT_CONNECTED · WORKERS ACTIVE: {runningIds.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Task title — e.g. Research Lido stETH rate sources"
            aria-label="New task title"
            className="h-9 min-w-[220px] flex-1 rounded-lg border border-white/15 bg-[#050505] px-2.5 text-xs text-white outline-none placeholder:text-[#B8B8B8]/60 focus:border-[#8B5CFF]"
          />
          <select
            value={taskRole}
            onChange={(e) => setTaskRole(e.target.value)}
            aria-label="Task role"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none focus:border-[#8B5CFF]"
          >
            {ROLE_LABELS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={taskPrincipal}
            onChange={(e) => setTaskPrincipal(e.target.value)}
            aria-label="Task principal"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none focus:border-[#8B5CFF]"
          >
            <option value="">Unassigned pool</option>
            {TRIBE_PRINCIPALS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.displayName}
              </option>
            ))}
          </select>
          <select
            value={taskExecutor}
            onChange={(e) => setTaskExecutor(e.target.value)}
            aria-label="Runtime executor (optional)"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none focus:border-[#8B5CFF]"
          >
            <option value="">Owner-recorded (no runtime)</option>
            {EXECUTORS.map((e) => (
              <option key={e.id} value={e.id}>
                Runtime: {e.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (!taskTitle.trim()) return setTaskMsg('A task title is required.');
              const next = createTask(tasks, {
                title: taskTitle,
                role: taskRole,
                principal: taskPrincipal || null,
              });
              if (taskExecutor && next.length > tasks.length) {
                const nk = { ...kinds, [next[0].id]: taskExecutor };
                setKinds(nk);
                saveKinds(nk);
              }
              setTasks(next);
              setTaskTitle('');
              setTaskMsg('');
            }}
            className="flex min-h-[44px] items-center rounded-lg bg-[#8B5CFF] px-4 text-xs font-semibold text-white"
          >
            RECORD TASK
          </button>
        </div>
        {taskMsg && <p className="font-mono text-[10px] text-[#FFB020]">{taskMsg}</p>}

        {tasks.length === 0 ? (
          <p className="font-mono text-[10px] text-[#B8B8B8]">
            QUEUE EMPTY — NO TASKS RECORDED. NOTHING IS INVENTED TO FILL IT.
          </p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-white/10 bg-[#050505] p-3 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white">{task.title}</span>
                  <span className="rounded border border-[#8B5CFF]/50 px-2 py-0.5 font-mono text-[9px] text-white">
                    {task.state} · {task.role.toUpperCase()} · {principalName(task.principal)}
                  </span>
                </div>
                <p className="font-mono text-[9px] text-[#B8B8B8]">
                  {task.id} · APPROVAL: {task.approvalStatus}
                  {task.approvalRequired ? ' (REQUIRED)' : ''} · CREATED {task.createdAt.slice(0, 10)}
                  {kinds[task.id]
                    ? ` · RUNTIME: ${executorById(kinds[task.id])?.label ?? kinds[task.id]}`
                    : ''}
                  {task.completionEvidence ? ` · EVIDENCE: ${task.completionEvidence}` : ''}
                  {task.blockerReason ? ` · BLOCKER: ${task.blockerReason}` : ''}
                </p>
                {task.state === 'ACTIVE' && (
                  <input
                    value={evidenceText[task.id] ?? ''}
                    onChange={(e) => setEvidenceText((m) => ({ ...m, [task.id]: e.target.value }))}
                    placeholder="Completion evidence (required to mark COMPLETE) — what was produced, in words"
                    aria-label={`Completion evidence for ${task.title}`}
                    className="h-9 w-full rounded-lg border border-white/15 bg-[#101010] px-2.5 text-xs text-white outline-none placeholder:text-[#B8B8B8]/60 focus:border-[#8B5CFF]"
                  />
                )}
                <div className="flex flex-wrap gap-1.5">
                  {TASK_TRANSITIONS[task.state].map((to) => (
                    <button
                      key={to}
                      type="button"
                      onClick={() => doTransition(task, to)}
                      className="flex min-h-[44px] items-center rounded border border-white/15 px-2.5 font-mono text-[9px] text-[#B8B8B8] hover:text-white"
                    >
                      → {to}
                    </button>
                  ))}
                  {kinds[task.id] && (task.state === 'UNASSIGNED' || task.state === 'QUEUED') && (
                    <button
                      type="button"
                      onClick={() => void doRun(task)}
                      disabled={runningIds.includes(task.id)}
                      className="flex min-h-[44px] items-center rounded border border-[#8B5CFF]/60 px-2.5 font-mono text-[9px] text-white disabled:opacity-50"
                    >
                      {runningIds.includes(task.id) ? 'RUNNING…' : '▶ RUN (WORKER RUNTIME)'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTasks((prev) => removeTask(prev, task.id))}
                    className="flex min-h-[44px] items-center rounded border border-white/10 px-2.5 font-mono text-[9px] text-[#B8B8B8]"
                  >
                    REMOVE RECORD
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          OWNER-RECORDED TASKS MOVE UNDER THE CANONICAL TRANSITION ALLOWLIST AND COMPLETING
          REQUIRES EVIDENCE. RUNTIME TASKS ARE EXECUTED FOR REAL BY THE IN-PAGE ENGINE BELOW —
          THEIR EVIDENCE IS THE RUN'S OWN OUTPUT. FINANCIAL EXECUTION IS NOT A TASK STATE AND
          DOES NOT EXIST HERE.
        </p>
      </div>

      {/* WORKER RUNTIME (v171) — the in-page engine, phase 1.
          It executes the executor kinds below against the
          platform's own data and pipelines, in this page, only
          while the page is open. Runs are real: the evidence on
          a completed task is the run's own output, and each
          completed run writes one governed Bot Memory record. */}
      <div className="rounded-xl border border-white/10 p-4 space-y-3" style={SPACE_BG}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs text-[#8B5CFF]">WORKER RUNTIME — IN-PAGE ENGINE</span>
          <span className="font-mono text-[10px] text-[#B8B8B8]">
            ENGINE: LOADED · RUNS ONLY WHILE THIS PAGE IS OPEN · ACTIVE NOW: {runningIds.length} ·
            RUNS THIS SESSION: {runLog.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void doRunAll()}
            disabled={runningIds.length > 0}
            className="flex min-h-[44px] items-center rounded border border-[#8B5CFF]/60 px-3 font-mono text-[10px] text-white disabled:opacity-50"
          >
            ▶ RUN ALL QUEUED RUNTIME TASKS
          </button>
          <span className="font-mono text-[9px] text-[#B8B8B8]">
            OR ASK STAR: “RUN A PRICE CHECK” — HE RECORDS AND RUNS THE TASK HIMSELF.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoDispatch((v) => !v)}
            className="flex min-h-[44px] items-center rounded border px-3 font-mono text-[10px] text-white"
            style={{ borderColor: autoDispatch ? '#32D74B' : 'rgba(255,255,255,0.2)' }}
          >
            AUTO-DISPATCH: {autoDispatch ? 'ON' : 'OFF'}
          </button>
          <span className="font-mono text-[9px] text-[#B8B8B8]">
            WHILE ON AND THIS PAGE IS OPEN, QUEUED RUNTIME TASKS RUN ON THEIR OWN — CHECKED
            EVERY MINUTE. CLOSING THE PAGE STOPS IT. IT NEVER RUNS FINANCIAL ACTIONS.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setContinuousDiscovery((v) => !v)}
            className="flex min-h-[44px] items-center rounded border px-3 font-mono text-[10px] text-white"
            style={{ borderColor: continuousDiscovery ? '#32D74B' : 'rgba(255,255,255,0.2)' }}
          >
            CONTINUOUS DISCOVERY: {continuousDiscovery ? 'ON' : 'OFF'}
          </button>
          <span className="font-mono text-[9px] text-[#B8B8B8]">
            WHILE ON AND THIS PAGE IS OPEN, THE DISCOVERY SCANS ROTATE ON THEIR OWN — MONEY
            RADAR → DEX → BRIDGE → POOL+VAULT → OPPORTUNITY → CATALOGUE → DRY-RUN, ONE EVERY FIVE
            MINUTES, EACH RECORDED AS A TASK WITH EVIDENCE. CLOSING THE PAGE STOPS IT.
          </span>
        </div>
        {discoveryMsg && (
          <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
            LATEST ROTATION RUN: {discoveryMsg}
          </p>
        )}
        <div className="grid gap-2 md:grid-cols-2">
          {EXECUTORS.map((e) => (
            <div key={e.id} className="rounded border border-white/10 bg-[#050505] px-3 py-2">
              <p className="font-mono text-[11px] text-white">{e.label}</p>
              <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">{e.does}</p>
            </div>
          ))}
        </div>
        <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
          COMPLETED RUNS — ALL TIME, FROM THE TASK STORE: {completedRuns.length}
          {completedRuns.length > 0 && completedRuns[0].completionEvidence
            ? ` · LATEST: ${completedRuns[0].title} — ${completedRuns[0].completionEvidence}`
            : ''}
        </p>
        {runLog.length === 0 ? (
          <p className="font-mono text-[10px] text-[#B8B8B8]">
            NO RUNS YET THIS SESSION — record a task with a runtime executor above and press RUN.
            NOTHING RUNS ON ITS OWN, AND NOTHING RUNS WHILE THE PAGE IS CLOSED.
          </p>
        ) : (
          <div className="space-y-1.5">
            {runLog.map((r, i) => (
              <div key={i} className="rounded border border-white/10 bg-[#050505] px-3 py-2">
                <p className="font-mono text-[10px] text-white">
                  {r.outcome === 'COMPLETE' ? '✓' : '✗'} {r.title} ·{' '}
                  {executorById(r.executor)?.label ?? r.executor} · {r.outcome} ·{' '}
                  {new Date(r.finishedAt).toLocaleTimeString('en-US', { hour12: false })}
                </p>
                <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">{r.evidence}</p>
              </div>
            ))}
          </div>
        )}
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          EVERY COMPLETED RUN WRITES ONE BOT MEMORY RECORD (ASSIGNMENT_OUTCOME, UNVERIFIED,
          SOURCE: WORKER-RUNTIME) — THE MEMORY LAYER'S FIRST GOVERNED PRODUCER. THE ENGINE
          PERFORMS RESEARCH AND CHECKS ONLY; IT SIGNS NOTHING, SENDS NOTHING, AND MOVES NO
          FUNDS — THE LADDER STILL ENDS AT PREPARED.
        </p>
      </div>

      {/* WEB HARVEST (v229) — Tribe members scraping the web.
          Every source the owner adds, not a fixed list: a
          principal is assigned a source URL, the harvest
          fetches it from this page and saves the excerpt to
          a bounded RAW store. Page-open only — nothing
          scrapes while the app is closed. Harvested content
          is RAW, never canonical, never a price or a fact. */}
      <div className="rounded-xl border border-white/10 p-4 space-y-3" style={SPACE_BG}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs text-[#8B5CFF]">WEB HARVEST — TRIBE SCOUTS, EVERY SOURCE</span>
          <span className="font-mono text-[10px] text-[#B8B8B8]">
            ASSIGNMENTS: {harvestAssignments.filter((a) => a.active).length} ACTIVE / {harvestAssignments.length} · RECORDS:{' '}
            {harvestRecords.length} / {HARVEST_MAX_RECORDS} · STORE: RAW, UNVERIFIED
          </span>
        </div>
        <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
          SCOUTS FETCH THEIR SOURCES FROM THIS PAGE AND SAVE THE EXCERPT — UP TO{' '}
          {HARVEST_EXCERPT_CHARS.toLocaleString()} CHARACTERS PER RECORD — SO WHAT THE TRIBE
          GATHERS SURVIVES THE SESSION. A SOURCE THAT BLOCKS BROWSER READS FAILS HONESTLY
          (NETWORK OR CORS) AND IS NEVER BYPASSED. NOTHING HERE IS CANONICAL AND NOTHING IS
          SHOWN AS A PRICE OR A FACT. THE TWELVE SEEDED SCOUTS COVER THE PLATFORM'S
          REGISTERED KEYLESS SOURCES; COINPAPRIKA, GECKOTERMINAL AND BEEFY ANSWER WITHOUT
          CORS AND ARE NOT SEEDED. FOUR MORE SCOUTS HUNT CAMERA SOURCES — THE ARCGIS
          PORTAL SEARCH FOR TEXAS, ARIZONA, PENNSYLVANIA AND COLORADO — SO THE NEXT
          STATES GET FOUND THE SAME WAY THE LAST ELEVEN WERE.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void runHarvestNow()}
            disabled={harvestBusy}
            className="flex min-h-[44px] items-center rounded border border-[#8B5CFF]/60 px-3 font-mono text-[10px] text-white disabled:opacity-50"
          >
            {harvestBusy ? 'HARVESTING…' : '▶ RUN HARVEST NOW'}
          </button>
          <button
            type="button"
            onClick={() => setHarvestAuto(!harvestAuto)}
            className="flex min-h-[44px] items-center rounded border px-3 font-mono text-[10px] text-white"
            style={{ borderColor: harvestAuto ? '#32D74B' : 'rgba(255,255,255,0.2)' }}
          >
            AUTO-HARVEST: {harvestAuto ? 'ON' : 'OFF'}
          </button>
          <span className="font-mono text-[9px] text-[#B8B8B8]">
            {harvestAuto
              ? `WHILE ON AND THIS PAGE IS OPEN, ACTIVE ASSIGNMENTS RUN EVERY 15 MIN — CLOSING THE PAGE STOPS IT. ${lastHarvestAt ? `LAST RUN ${new Date(lastHarvestAt).toLocaleTimeString('en-US', { hour12: false })} · ` : ''}${nextHarvestAt ? `NEXT RUN ${new Date(nextHarvestAt).toLocaleTimeString('en-US', { hour12: false })}` : ''}`
              : 'WHILE OFF, HARVEST RUNS ONLY WHEN YOU TAP RUN HARVEST NOW.'}
          </span>
        </div>
        {harvestMsg && <p className="font-mono text-[10px] text-white">{harvestMsg}</p>}
        <div className="space-y-2">
          {harvestAssignments.map((a) => (
            <div key={a.id} className="rounded border border-white/10 bg-[#050505] px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-white">
                  {a.principalName} — SCOUT · {a.sourceName} · {a.kind}
                </span>
                <span className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = harvestAssignments.map((x) => (x.id === a.id ? { ...x, active: !x.active } : x));
                      setHarvestAssignments(next);
                      saveHarvestAssignments(next);
                    }}
                    className="rounded border border-white/15 px-2 py-1 font-mono text-[9px] text-[#B8B8B8] hover:text-white"
                  >
                    {a.active ? 'ACTIVE — TAP TO PAUSE' : 'PAUSED — TAP TO ACTIVATE'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = harvestAssignments.filter((x) => x.id !== a.id);
                      setHarvestAssignments(next);
                      saveHarvestAssignments(next);
                    }}
                    className="rounded border border-white/10 px-2 py-1 font-mono text-[9px] text-[#B8B8B8]"
                  >
                    REMOVE
                  </button>
                </span>
              </div>
              <p className="mt-1 break-all font-mono text-[9px] text-[#B8B8B8]">{a.url}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={newPrincipal}
            onChange={(e) => setNewPrincipal(e.target.value)}
            aria-label="Scout principal"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none focus:border-[#8B5CFF]"
          >
            {TRIBE_PRINCIPALS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.displayName}
              </option>
            ))}
          </select>
          <input
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder="Source name (e.g. Hacker News front page)"
            aria-label="Source name"
            className="h-9 min-w-[180px] flex-1 rounded-lg border border-white/15 bg-[#101010] px-2.5 text-xs text-white outline-none placeholder:text-[#B8B8B8]/60 focus:border-[#8B5CFF]"
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://… (any source — browser-readable ones fetch, the rest fail honestly)"
            aria-label="Source URL"
            className="h-9 min-w-[220px] flex-1 rounded-lg border border-white/15 bg-[#101010] px-2.5 text-xs text-white outline-none placeholder:text-[#B8B8B8]/60 focus:border-[#8B5CFF]"
          />
          <select
            value={newKind}
            onChange={(e) => setNewKind(e.target.value as HarvestKind)}
            aria-label="Harvest kind"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none focus:border-[#8B5CFF]"
          >
            {HARVEST_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              const principal = TRIBE_PRINCIPALS.find((t) => t.id === newPrincipal);
              const url = safeHarvestUrl(newUrl);
              if (!principal) return setHarvestFormMsg('Pick a Tribe principal.');
              if (!newSource.trim()) return setHarvestFormMsg('A source name is required.');
              if (!url) return setHarvestFormMsg('That is not a valid http(s) address — paste the full URL starting https://.');
              const next = [
                ...harvestAssignments,
                {
                  id: `harvest-${Date.now()}`,
                  principalId: principal.id,
                  principalName: principal.displayName,
                  sourceName: newSource.trim(),
                  url,
                  kind: newKind,
                  active: true,
                  createdAt: Date.now(),
                },
              ];
              setHarvestAssignments(next);
              saveHarvestAssignments(next);
              setNewSource('');
              setNewUrl('');
              setHarvestFormMsg('');
            }}
            className="flex min-h-[44px] items-center rounded-lg bg-[#8B5CFF] px-4 text-xs font-semibold text-white"
          >
            ADD ASSIGNMENT
          </button>
        </div>
        {harvestFormMsg && <p className="font-mono text-[10px] text-[#FFB020]">{harvestFormMsg}</p>}
        {harvestRecords.length === 0 ? (
          <p className="font-mono text-[10px] text-[#B8B8B8]">
            NO HARVEST RECORDS YET — RUN HARVEST NOW, OR LEAVE AUTO-HARVEST ON WHILE THIS PAGE
            STAYS OPEN. NOTHING IS INVENTED TO FILL THIS LIST.
          </p>
        ) : (
          <div className="space-y-1.5">
            {harvestRecords.slice(0, 10).map((r) => (
              <div key={r.id} className="rounded border border-white/10 bg-[#050505] px-3 py-2">
                <p className="font-mono text-[10px] text-white">
                  {r.status === 'OK' ? '✓' : '✗'} {r.principalName} · {r.sourceName} · {r.kind} ·{' '}
                  {new Date(r.fetchedAt).toLocaleTimeString('en-US', { hour12: false })} ·{' '}
                  {r.status === 'OK' ? `${r.bytes.toLocaleString()} BYTES SAVED` : 'FAILED'}
                </p>
                <p className="mt-0.5 break-words font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
                  {r.status === 'OK' ? r.excerpt.slice(0, 120) + (r.excerpt.length > 120 ? '…' : '') : r.error}
                </p>
                {r.status === 'OK' && (
                  <button
                    type="button"
                    onClick={() => {
                      const title = `Harvest review: ${r.sourceName} — ${r.principalName}`;
                      const open = tasks.find(
                        (t) => t.title === title && !['COMPLETE', 'FAILED', 'CANCELED'].includes(t.state),
                      );
                      if (open) {
                        setHarvestMsg(`TASK ALREADY OPEN — "${title}" is ${open.state} in the Bot Work Queue.`);
                        return;
                      }
                      const assignment = harvestAssignments.find((a) => a.id === r.assignmentId);
                      const principal =
                        assignment?.principalId ??
                        TRIBE_PRINCIPALS.find((t) => t.displayName === r.principalName)?.id ??
                        null;
                      const next = createTask(loadTasks(), { title, role: 'Research', principal });
                      setTasks(next);
                      setHarvestMsg(
                        `TASK RECORDED — "${title}" is UNASSIGNED in the Bot Work Queue for ${r.principalName}. Give it an executor and RUN it, or leave AUTO-DISPATCH on.`,
                      );
                    }}
                    className="mt-1.5 rounded border border-[#8B5CFF]/60 px-2 py-1 font-mono text-[9px] text-white"
                  >
                    MAKE TASK — RESEARCH FOR {r.principalName}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          HARVESTED EXCERPTS ARE RAW EVIDENCE FOR REVIEW — THEY DO NOT ENTER THE ENCYCLOPEDIA,
          THE ENTITY UNIVERSE, OR ANY LIVE FIGURE. A SOURCE THAT NEEDS A KEY, A SIGN-IN, OR A
          BROWSER THE APP CANNOT READ STAYS UNREAD UNTIL DANIEL OPENS THAT DOOR HIMSELF.
        </p>
      </div>

      {/* BOT THEATER (v230) — the lab floor: posted bots in
          task-matched scenes, live work screens, TAKE OVER,
          STAR narrating from the real state. */}
      <BotTheater
        tasks={tasks}
        kinds={kinds}
        runningIds={runningIds}
        runStarts={runStarts}
        runLog={runLog}
        harvestAssignments={harvestAssignments}
        harvestRecords={harvestRecords}
        harvestBusy={harvestBusy}
        harvestCurrentId={harvestCurrentId}
        takeovers={takeovers}
        principalName={principalName}
        onTakeOverTask={takeOverTask}
        onTakeOverHarvest={takeOverHarvest}
      />

      {/* MONEY RADAR (v193) — the Opportunity Intelligence layer
          (owner spec 2026-11-24). STAR's workers go out to the
          governed sources, the radar records what is changing,
          candidates land in the opportunity store, and the
          follow-up work is dispatched to the Tribe in the queue
          above. The radar observes and surfaces only. */}
      <div className="rounded-xl border border-white/10 p-4 space-y-3" style={SPACE_BG}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs text-[#8B5CFF]">MONEY RADAR — OPPORTUNITY INTELLIGENCE</span>
          <span className="font-mono text-[10px] text-[#B8B8B8]">
            SIGNALS: {radar.totalSignals} · TRACKED POOLS: {radar.poolsTracked} · RADAR CANDIDATES:{' '}
            {radar.radarCandidates} · WORK ORDERS OPEN: {radar.dispatchedOpen} · LAST SCAN:{' '}
            {radar.lastScanAt ? new Date(radar.lastScanAt).toLocaleString() : 'NEVER'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void doRadarRun()}
            disabled={radarBusy}
            className="flex min-h-[44px] items-center rounded border border-[#8B5CFF]/60 px-3 font-mono text-[10px] text-white disabled:opacity-50"
          >
            {radarBusy ? 'RADAR RUNNING…' : '▶ RUN MONEY RADAR (STAR DISPATCH)'}
          </button>
          <span className="font-mono text-[9px] text-[#B8B8B8]">
            OR ASK STAR: “RUN MONEY RADAR” — THE WORKER FETCHES, THE RADAR DIFFS, THE TRIBE GETS
            THE WORK.
          </span>
        </div>
        {radarMsg && <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">{radarMsg}</p>}
        <div className="flex flex-wrap gap-1.5">
          {(['NEW', 'HOT', 'GROWING', 'DECLINING', 'STALE', 'EXPIRED'] as const).map((b) => (
            <span
              key={b}
              className="rounded border border-white/15 px-2 py-1 font-mono text-[9px] text-white"
            >
              {b}: {radar.byBoard[b]}
            </span>
          ))}
        </div>
        {radar.latest.length === 0 ? (
          <p className="font-mono text-[10px] text-[#B8B8B8]">
            NO SIGNALS RECORDED — RUN THE RADAR AND THE FIRST OBSERVATION SETS THE BASELINE.
            NOTHING IS INVENTED TO FILL THIS BOARD.
          </p>
        ) : (
          <div className="space-y-1.5">
            {radar.latest.map((s) => (
              <div key={s.id} className="rounded border border-white/10 bg-[#050505] px-3 py-2">
                <p className="font-mono text-[10px] text-white">
                  {s.signalType} · {s.entity} · {s.radarType.toUpperCase()}
                </p>
                <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
                  {s.source} · {new Date(s.observedAt).toLocaleString()} · EVIDENCE {s.evidenceCount} ·
                  SOURCES {s.sourceCount} · {s.supportStatus} · FRESHNESS {s.freshness}
                </p>
                <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">{s.evidence[0]}</p>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded border border-white/10 bg-[#050505] px-3 py-2">
            <p className="font-mono text-[10px] text-white">ASSET RADAR</p>
            {radar.assetRadar.length === 0 ? (
              <p className="font-mono text-[9px] text-[#B8B8B8]">NO ASSETS TRACKED YET.</p>
            ) : (
              radar.assetRadar.map((a) => (
                <p key={a.asset} className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
                  {a.asset}: earns in {a.protocols.join(', ')} · networks {a.networks.join(', ')} ·{' '}
                  {a.pools} pool(s) · {a.opportunities} radar opportunit
                  {a.opportunities === 1 ? 'y' : 'ies'}
                </p>
              ))
            )}
          </div>
          <div className="rounded border border-white/10 bg-[#050505] px-3 py-2">
            <p className="font-mono text-[10px] text-white">PROTOCOL RADAR (WATCHED POOLS)</p>
            {radar.protocolRadar.length === 0 ? (
              <p className="font-mono text-[9px] text-[#B8B8B8]">NO PROTOCOLS TRACKED YET.</p>
            ) : (
              radar.protocolRadar.map((p) => (
                <p key={p.protocol} className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
                  {p.protocol}: {p.pools} watched pool(s) · watched TVL ${Math.round(p.watchedTvlUsd).toLocaleString()} ·{' '}
                  {p.signals} signal(s)
                </p>
              ))
            )}
          </div>
        </div>
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          RADAR COVERAGE — ACTIVE:{' '}
          {RADAR_CATEGORY_STATES.filter((c) => c.state === 'ACTIVE')
            .map((c) => c.name)
            .join(' · ')}{' '}
          — NO_DATA (NO SOURCE CONNECTED, NOTHING INVENTED):{' '}
          {RADAR_CATEGORY_STATES.filter((c) => c.state === 'NO_DATA')
            .map((c) => c.name)
            .join(' · ')}
          .
        </p>
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          THE SEPARATION IS PERMANENT: WORLD ENGINE ANSWERS “WHAT EXISTS?” · MONEY RADAR ANSWERS
          “WHAT IS CHANGING?” · STAR ANSWERS “WHAT SHOULD DANIEL LOOK AT NEXT?” · DANIEL DECIDES.
          THE RADAR CREATES SIGNALS, CANDIDATES, AND WORK ORDERS ONLY — IT NEVER MOVES MONEY AND
          NEVER WRITES CANONICAL TRUTH. SCORING IS EVIDENCE DIMENSIONS ONLY — NO CONFIDENCE
          PERCENTAGES.
        </p>
      </div>

      {/* SOURCE CATALOG (v152) — the governed provider catalog the
          bots draw from, generated mechanically from the frozen
          Resource Engine seeds (js/data/resource-seeds.js).
          Governance records only: this panel wires nothing, holds
          no credential values, and approves nothing — OWNER_APPROVED
          is an owner action in the canonical pipeline. */}
      <div className="rounded-xl border border-white/10 p-4 space-y-3" style={SPACE_BG}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs text-[#8B5CFF]">SOURCE CATALOG — WHAT THE BOTS DRAW FROM</span>
          <span className="font-mono text-[10px] text-[#B8B8B8]">
            {RESOURCE_COUNTS.total} GOVERNED SOURCES · CONNECTED {RESOURCE_COUNTS.byStage.CONNECTED ?? 0} ·
            TESTED {RESOURCE_COUNTS.byStage.TESTED ?? 0} · RESEARCHING {RESOURCE_COUNTS.byStage.RESEARCHING ?? 0} ·
            PREPARED {RESOURCE_COUNTS.byStage.PREPARED ?? 0} · DISCOVERED {RESOURCE_COUNTS.byStage.DISCOVERED ?? 0}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            value={catalogQuery}
            onChange={(e) => setCatalogQuery(e.target.value)}
            placeholder="Search sources — name, capability, domain…"
            aria-label="Search the source catalog"
            className="h-9 min-w-[220px] flex-1 rounded-lg border border-white/15 bg-[#050505] px-2.5 text-xs text-white outline-none placeholder:text-[#B8B8B8]/60 focus:border-[#8B5CFF]"
          />
          <select
            value={catalogStage}
            onChange={(e) => setCatalogStage(e.target.value)}
            aria-label="Filter by pipeline stage"
            className="h-9 rounded-lg border border-white/15 bg-[#050505] px-2 text-xs text-white outline-none focus:border-[#8B5CFF]"
          >
            <option value="">All stages</option>
            {Object.keys(RESOURCE_COUNTS.byStage).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {catalogMatches.length === 0 ? (
          <p className="font-mono text-[10px] text-[#B8B8B8]">NO SOURCES MATCH — THE CATALOG IS NOT EXTENDED TO FILL A SEARCH.</p>
        ) : (
          <div className="space-y-1.5">
            {catalogMatches.slice(0, 15).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#050505] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">{p.name}</p>
                  <p className="font-mono text-[9px] text-[#B8B8B8]">
                    {p.domain} · {p.capabilities.join(', ') || 'no capability recorded'} · COST {p.costState} · KEY {p.credentialState}
                  </p>
                </div>
                <span className="rounded border border-white/15 px-2 py-0.5 font-mono text-[9px] text-white">{p.stage}</span>
              </div>
            ))}
            {catalogMatches.length > 15 && (
              <p className="font-mono text-[9px] text-[#B8B8B8]">+ {catalogMatches.length - 15} MORE — REFINE THE SEARCH.</p>
            )}
          </div>
        )}

        <div className="space-y-1">
          <p className="font-mono text-[10px] text-[#B8B8B8]">RECORDED CAPABILITY GAPS ({RESOURCE_GAPS.length})</p>
          {RESOURCE_GAPS.map((g) => (
            <p key={g.id} className="font-mono text-[9px] text-[#B8B8B8]">
              {g.capability} — {g.title} · {g.status}
            </p>
          ))}
        </div>
        <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
          CATALOG SNAPSHOT: THE FROZEN 2026-11-16 GOVERNED CATALOG, SHOWN AS RECORDED. STAGES ARE
          GOVERNANCE STATES, NOT LIVE HEALTH — A SOURCE MARKED CONNECTED IS WIRED PER THE CONNECTION
          EVIDENCE IN THE CANONICAL STORE, AND LIVE FIGURES IN THIS APP CARRY THEIR OWN PROVENANCE
          CHIPS. NO CREDENTIAL VALUE EXISTS IN ANY CATALOG RECORD — EXISTENCE AND CUSTODY ONLY.
        </p>
      </div>

      {/* CONTRACT DISCOVERY REGISTRY (v185) — the Contract
          Intelligence Bot's notebook (canonical logic:
          js/discovery-bots.js). Keyless Blockscout checks are
          recorded as EVIDENCE entries: explorer verification
          state, name, compiler, proxy — never a canonical
          entity, never a truth promotion, never execution
          authority. */}
      {(() => {
        void regVersion;
        const entries = loadContractEntries();
        return (
          <div className="rounded-xl border border-white/10 p-4 space-y-3" style={SPACE_BG}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#8B5CFF]">CONTRACT DISCOVERY REGISTRY</span>
              <span className="font-mono text-[10px] text-[#B8B8B8]">
                {entries.length} RECORDED · {entries.filter((e) => e.isVerified).length} SOURCE-VERIFIED · EVIDENCE ONLY
              </span>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] text-[#B8B8B8]">NETWORK</span>
                <select
                  aria-label="Registry network"
                  value={regNetwork}
                  onChange={(e) => setRegNetwork(e.target.value)}
                  className="rounded border border-white/15 bg-[#0A0A0A] px-2 py-1.5 text-xs text-white"
                >
                  {BLOCKSCOUT_NETWORKS.map((n) => (
                    <option key={n.id} value={n.id}>{n.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex grow flex-col gap-1">
                <span className="font-mono text-[9px] text-[#B8B8B8]">CONTRACT ADDRESS</span>
                <input
                  aria-label="Registry contract address"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="0x…"
                  className="rounded border border-white/15 bg-[#0A0A0A] px-2 py-1.5 font-mono text-xs text-white placeholder-[#B8B8B8]/50"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] text-[#B8B8B8]">ROLE (LABEL)</span>
                <select
                  aria-label="Registry contract role"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="rounded border border-white/15 bg-[#0A0A0A] px-2 py-1.5 text-xs text-white"
                >
                  {CONTRACT_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={doContractCheck}
                disabled={regBusy}
                className="rounded border border-[#8B5CFF]/60 px-3 py-1.5 font-mono text-[10px] text-white disabled:opacity-50"
              >
                {regBusy ? 'CHECKING…' : 'CHECK ON EXPLORER'}
              </button>
            </div>
            {regMsg && <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">{regMsg}</p>}
            <div>
              <p className="font-mono text-[9px] text-[#B8B8B8]">
                CATALOGUED CONTRACTS — ONE-TAP CHECK · SUPPORT MODEL: 1 SOURCE = UNVERIFIED
                (NEVER CATALOGUED) · 2 = SUPPORTED · 3+ = STRONGLY SUPPORTED · ONLY THE GATE
                DECIDES CANONICAL (src/contract-catalog.ts)
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {CATALOGUED_CONTRACTS.map((c) => (
                  <button
                    key={c.address}
                    type="button"
                    disabled={regBusy}
                    onClick={() => {
                      setRegNetwork(c.network);
                      setRegAddress(c.address);
                      setRegRole(c.role);
                      void runContractCheck(c.network, c.address, c.role);
                    }}
                    title={`${c.name} · ${c.support} · ${c.provenance}`}
                    className="rounded border border-white/15 px-2 py-1 font-mono text-[10px] text-white disabled:opacity-50"
                  >
                    {c.symbol}
                  </button>
                ))}
              </div>
            </div>
            {entries.length === 0 ? (
              <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                NO CONTRACTS RECORDED YET. CHECK ONE ABOVE, OR RUN THE RUNTIME'S EXPLORER CHECK —
                EVERY CHECK LANDS HERE WITH ITS EXPLORER EVIDENCE.
              </p>
            ) : (
              <div className="space-y-1.5">
                {entries.slice(0, 10).map((e) => (
                  <p key={e.id} className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                    <span className="text-white">{e.name ?? 'unnamed'}</span> · {e.network} · {e.role} ·{' '}
                    {e.address.slice(0, 10)}…{e.address.slice(-6)} · source verified:{' '}
                    {e.isVerified ? 'YES' : 'NO'} · {new Date(e.checkedAt).toLocaleString()} · via {e.checkedBy}
                  </p>
                ))}
              </div>
            )}
            <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
              ENTRIES ARE DISCOVERY EVIDENCE FOR THE OWNER'S GATE — NOT CANONICAL ENTITIES, NOT
              VERIFIED TRUTH, AND NEVER EXECUTION AUTHORITY. EXECUTION STAYS DISABLED.
            </p>
          </div>
        );
      })()}

      {/* DEX REGISTRY + RELATIONSHIP CANDIDATES (v190) — the
          auto-placement pipeline: classification places DEX-class
          discoveries here as CANDIDATES (src/classification.ts,
          src/dex-registry.ts); relationships are candidates too.
          Nothing here is canonical or verified. */}
      {(() => {
        const dexes = loadDexCandidates();
        const rels = loadRelationshipCandidates();
        const chainSet = new Set<string>();
        for (const d of dexes) for (const c of d.chains) chainSet.add(c);
        const avgCov =
          dexes.length > 0
            ? (dexes.reduce((a, d) => a + dexCoverage(d).length, 0) / dexes.length).toFixed(1)
            : '0';
        return (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0A0A0A] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#8B5CFF]">DEX REGISTRY · AUTO-PLACEMENT CANDIDATES</span>
              <span className="font-mono text-[10px] text-white">
                {dexes.length} DEX · {rels.length} RELATIONSHIPS · {chainSet.size} CHAINS
              </span>
            </div>
            {dexes.length === 0 ? (
              <p className="mt-2 font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                NO DEX CANDIDATES YET. RUN THE DEX SCAN (RUNTIME PANEL ABOVE OR ASK STAR) — IT
                CLASSIFIES THE DEFILLAMA PROTOCOL INDEX AND PLACES EVERY DEX-CLASS ENTRY HERE AS
                AN UNVERIFIED CANDIDATE WITH ITS RELATIONSHIP CANDIDATES.
              </p>
            ) : (
              <div className="mt-2 space-y-1.5">
                <p className="font-mono text-[10px] text-[#B8B8B8]">
                  CHECKLIST EVIDENCE AVERAGES {avgCov}/{DEX_CHECKLIST.length} DIMENSIONS PER DEX —
                  ONLY WHAT EACH RECORD'S OWN EVIDENCE CARRIES; THE REST READ ABSENT.
                </p>
                {dexes.slice(0, 10).map((d) => (
                  <p key={d.id} className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                    <span className="text-white">{d.name}</span> · {d.subclass} ·{' '}
                    {d.chains.length} chain(s) · token {d.tokenSymbol ?? '—'} · evidence{' '}
                    {dexCoverage(d).length}/{DEX_CHECKLIST.length} · {d.source}
                  </p>
                ))}
                {rels.slice(0, 5).map((r) => (
                  <p key={r.id} className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                    REL · {r.from} —{r.relation}→ {r.to} · CANDIDATE
                  </p>
                ))}
              </div>
            )}
            <p className="mt-2 font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
              STAR CREATES CANDIDATES, NEVER TRUTH. PLACEMENT FOLLOWS THE UNIVERSAL CLASS MATRIX;
              PROMOTION BELONGS TO THE OWNER'S GATE ALONE. EXECUTION STAYS DISABLED.
            </p>
          </div>
        );
      })()}

      {/* BRIDGE REGISTRY (v200) — auto-placement slice 2:
          BRIDGE-class candidates with their chain spans. Same
          law as the DEX Registry: candidates, never truth. */}
      {(() => {
        const bridges = loadBridgeCandidates();
        const bChains = new Set<string>();
        for (const b of bridges) for (const c of b.chains) bChains.add(c);
        return (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0A0A0A] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#8B5CFF]">BRIDGE REGISTRY · AUTO-PLACEMENT CANDIDATES</span>
              <span className="font-mono text-[10px] text-white">
                {bridges.length} BRIDGES · {bChains.size} CHAINS SPANNED
              </span>
            </div>
            {bridges.length === 0 ? (
              <p className="mt-2 font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                NO BRIDGE CANDIDATES YET. RUN THE BRIDGE SCAN (RUNTIME PANEL ABOVE OR ASK STAR) —
                IT CLASSIFIES THE DEFILLAMA PROTOCOL INDEX AND PLACES EVERY BRIDGE-CLASS ENTRY
                HERE AS AN UNVERIFIED CANDIDATE WITH ITS CHAIN SPAN.
              </p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {bridges.slice(0, 10).map((b) => (
                  <p key={b.id} className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                    <span className="text-white">{b.name}</span> · {b.subclass} · spans{' '}
                    {b.chains.length} chain(s) · token {b.tokenSymbol ?? '—'} · {b.source}
                  </p>
                ))}
              </div>
            )}
            <p className="mt-2 font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
              STAR CREATES CANDIDATES, NEVER TRUTH. PROMOTION BELONGS TO THE OWNER'S GATE ALONE.
              EXECUTION STAYS DISABLED.
            </p>
          </div>
        );
      })()}

      {/* POOL + VAULT REGISTRIES (v201) — auto-placement slice 3:
          two stores, never mixed; candidates, never truth. */}
      {(() => {
        const pools = loadPoolCandidates();
        const vaults = loadVaultCandidates();
        return (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0A0A0A] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#8B5CFF]">POOL + VAULT REGISTRIES · AUTO-PLACEMENT CANDIDATES</span>
              <span className="font-mono text-[10px] text-white">
                {pools.length} POOLS · {vaults.length} VAULTS
              </span>
            </div>
            {pools.length === 0 && vaults.length === 0 ? (
              <p className="mt-2 font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                NO POOL OR VAULT CANDIDATES YET. RUN THE POOL + VAULT SCAN (RUNTIME PANEL ABOVE OR
                ASK STAR) — IT CLASSIFIES THE DEFILLAMA PROTOCOL INDEX AND PLACES POOL-CLASS AND
                VAULT-CLASS ENTRIES INTO THEIR OWN REGISTRIES AS UNVERIFIED CANDIDATES.
              </p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {pools.slice(0, 6).map((c) => (
                  <p key={c.id} className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                    POOL · <span className="text-white">{c.name}</span> · {c.subclass} ·{' '}
                    {c.chains.length} chain(s) · token {c.tokenSymbol ?? '—'} · {c.source}
                  </p>
                ))}
                {vaults.slice(0, 6).map((c) => (
                  <p key={c.id} className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                    VAULT · <span className="text-white">{c.name}</span> · {c.subclass} ·{' '}
                    {c.chains.length} chain(s) · token {c.tokenSymbol ?? '—'} · {c.source}
                  </p>
                ))}
              </div>
            )}
            <p className="mt-2 font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
              STAR CREATES CANDIDATES, NEVER TRUTH. PROMOTION BELONGS TO THE OWNER'S GATE ALONE.
              EXECUTION STAYS DISABLED.
            </p>
          </div>
        );
      })()}

      {/* APPROVAL PACKAGE (v203) — the placement pipeline's
          review step: everything placed, assembled for Daniel's
          review. Generating it promotes nothing. */}
      {(() => {
        const pkg = loadApprovalPackage();
        return (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0A0A0A] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#8B5CFF]">APPROVAL PACKAGE · FOR DANIEL'S REVIEW</span>
              <span className="font-mono text-[10px] text-white">
                {pkg ? `${pkg.totalCandidates} CANDIDATES · ${pkg.relationshipCount} RELATIONSHIPS` : 'NOT GENERATED'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void doPackageRun()}
                disabled={pkgBusy}
                className="flex min-h-[44px] items-center rounded border border-[#8B5CFF]/60 px-3 font-mono text-[10px] text-white disabled:opacity-50"
              >
                {pkgBusy ? 'ASSEMBLING…' : '▶ GENERATE APPROVAL PACKAGE'}
              </button>
              <span className="font-mono text-[9px] text-[#B8B8B8]">
                {pkg
                  ? `LATEST PACKAGE: ${new Date(pkg.generatedAt).toLocaleString()}`
                  : 'NO PACKAGE YET — GENERATE ONE AFTER THE PLACEMENT SCANS HAVE RUN.'}
              </span>
            </div>
            {pkg && (
              <div className="mt-2 space-y-1.5">
                {pkg.sections.map((s) => (
                  <p key={s.registry} className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                    <span className="text-white">{s.registry}</span> · {s.count} candidate(s) ·{' '}
                    {s.chainsCovered} chain(s)
                    {s.bySubclass.length > 0
                      ? ` · ${s.bySubclass.map((b) => `${b.subclass} ${b.count}`).join(', ')}`
                      : ''}
                    {s.candidates.length > 0
                      ? ` · first: ${s.candidates.slice(0, 4).map((c) => c.name).join(', ')}${s.count > 4 ? ', …' : ''}`
                      : ''}
                  </p>
                ))}
              </div>
            )}
            <p className="mt-2 font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
              A PACKAGE IS PAPERWORK FOR THE GATE, NOT A DECISION. EVERY CANDIDATE IN IT IS
              UNVERIFIED; ONLY DANIEL'S REVIEW MOVES A CANDIDATE TOWARD CANONICAL.
            </p>
          </div>
        );
      })()}

      {/* ASSET UNIVERSE (v191) — the owner's tiered seed universe:
          curated candidates, NOT an ingested coin list. Contract
          evidence attaches only from the verified catalogue;
          the rest read CONTRACT UNKNOWN — discovery tasks. */}
      {(() => {
        const s = assetUniverseSummary();
        const assets = assetUniverse();
        return (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0A0A0A] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#8B5CFF]">ASSET UNIVERSE · TIERED CANDIDATES</span>
              <span className="font-mono text-[10px] text-white">
                {s.total} ASSETS · {s.withContract} WITH VERIFIED CONTRACT · {s.awaitingContract} AWAITING
              </span>
            </div>
            <div className="mt-2 space-y-1.5">
              {s.tierCounts.map((t) => (
                <p key={`${t.tier}-${t.family}`} className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                  TIER {t.tier} · {t.family} · {t.count} SYMBOLS
                </p>
              ))}
              <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                WITH CONTRACT EVIDENCE:{' '}
                {assets
                  .filter((a) => a.contract)
                  .map((a) => a.symbol)
                  .join(', ')}
              </p>
              <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                FAMILIES, NOT SYMBOLS: {ASSET_FAMILIES_NOT_SYMBOLS.join(' · ')}
              </p>
            </div>
            <p className="mt-2 font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
              THE UNIVERSE IS A CURATED CANDIDATE SET, NOT AN INGESTED LIST OF EVERY LISTED COIN.
              CONTRACTS ATTACH ONLY FROM THE VERIFIED CATALOGUE (2+ INDEPENDENT SOURCES); A SYMBOL
              WITHOUT ONE READS CONTRACT UNKNOWN AND BECOMES A DISCOVERY TASK — NEVER A GUESS.
            </p>
          </div>
        );
      })()}

      {/* BOT MEMORY (v165) — the controlled memory layer, ported
          from the v102 package at the owner's word. Read-only
          summary derivation (src/bot-memory.ts, mirroring the
          canonical js/bot-memory.js): the engine ships EMPTY — no
          seeding, no automatic capture, no producers wired — so
          the honest state at zero records is what renders. */}
      {(() => {
        const mem = memorySummary();
        return (
          <div className="rounded-xl border border-white/10 p-4 space-y-3" style={SPACE_BG}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#8B5CFF]">BOT MEMORY — CONTROLLED MEMORY LAYER</span>
              <span className="font-mono text-[10px] text-[#B8B8B8]">
                RECORDS: {mem.total} ACTIVE · {mem.totalRetained} RETAINED
              </span>
            </div>
            {mem.total === 0 && mem.totalRetained === 0 ? (
              <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                THE MEMORY IS EMPTY — NOTHING HAS BEEN RECORDED INTO IT. IT SHIPS EMPTY BY DESIGN:
                NO SEEDING, NO AUTOMATIC CAPTURE. RECORDS ENTER ONLY THROUGH GOVERNED WRITES WITH
                PROVENANCE, AND NOTHING HAS WRITTEN YET.
              </p>
            ) : (
              <div className="space-y-1.5">
                <p className="font-mono text-[10px] text-[#B8B8B8]">
                  BY KIND: {MEMORY_KINDS.map((k) => `${k} ${mem.byKind[k] ?? 0}`).join(' · ')}
                </p>
                <p className="font-mono text-[10px] text-[#B8B8B8]">
                  TRUTH (ACTIVE ONLY): UNVERIFIED {mem.byTruthState.UNVERIFIED ?? 0} · REJECTED{' '}
                  {mem.byTruthState.REJECTED ?? 0} · STALE (DERIVED) {mem.staleCount} · SUPERSEDED{' '}
                  {mem.supersededCount} · DELETED TOMBSTONES {mem.deletedCount}
                </p>
                {mem.recent.map((r) => (
                  <p key={r.id} className="font-mono text-[10px] text-white">
                    · [{r.kind}] {r.subject} — {r.summary} ({r.truthState})
                  </p>
                ))}
              </div>
            )}
            <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
              CONTROLLED MEMORY, NOT REMEMBER-EVERYTHING-FOREVER: EVERY RECORD CARRIES PROVENANCE
              AND A TRUTH STATE IT KEEPS FOR LIFE; VERIFIED CANNOT BE WRITTEN BY THIS LAYER AT ALL;
              CORRECTIONS SUPERSEDE WITH THE ORIGINAL PRESERVED; DELETION IS AN OWNER ACT THAT
              LEAVES A TOMBSTONE WITH ITS REASON. SECRET-SHAPED KEYS ARE REFUSED AT THE WRITE PATH.
            </p>
          </div>
        );
      })()}
    </div>
  );
};
