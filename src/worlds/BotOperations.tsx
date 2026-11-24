import React, { useState } from 'react';
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
  const [taskMsg, setTaskMsg] = useState('');
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
          <span className="font-semibold text-[#8B5CFF]">STAR</span> — DEMO ·
          NO AI BACKEND CONNECTED · SITS ABOVE THE 12 PRINCIPALS
        </span>
        <span className="text-[#B8B8B8]">
          <span className="font-semibold text-[#8B5CFF]">TASK WORKERS</span> —
          ACTIVE: 0 · RUNTIME: NOT_CONNECTED · RECORD SYSTEM ONLY, NO
          WORKER RUNTIME EXISTS
        </span>
      </div>

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
              NEVER IDENTITY, AND THEY DO NOT MAKE A PRINCIPAL LIVE: WORKERS STAY 0 ACTIVE /
              NOT_CONNECTED UNTIL A REAL RUNTIME EXISTS.
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
            TASKS RECORDED: {tasks.length} · WORKER RUNTIME: NOT_CONNECTED · WORKERS ACTIVE: 0
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
          <button
            type="button"
            onClick={() => {
              if (!taskTitle.trim()) return setTaskMsg('A task title is required.');
              setTasks((prev) =>
                createTask(prev, {
                  title: taskTitle,
                  role: taskRole,
                  principal: taskPrincipal || null,
                }),
              );
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
          STATES ARE OWNER-RECORDED WORKFLOW STATES UNDER THE CANONICAL TRANSITION ALLOWLIST —
          A TASK MARKED ACTIVE IS A RECORD, NOT A LIVE WORKER. COMPLETING REQUIRES EVIDENCE.
          EXECUTION IS NOT A TASK STATE AND DOES NOT EXIST HERE.
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
