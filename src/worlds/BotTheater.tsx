/* Bot Theater — the lab floor (v230).
 *
 * Every working bot posted in a scene, its work screen
 * visible, with a TAKE OVER button. STAR narrates the
 * floor from the real state. The scenes are illustrations
 * of the work, not cameras; the work screen shows the
 * work itself, never a rendered copy of a website. */

import React, { useEffect, useState } from 'react';
import { Boxes, FlaskConical, Monitor, Radar } from 'lucide-react';
import { SPACE_BG } from './CryptoWorld';
import { narrateTheater, SCENE_META, sceneForTask, type TakeoverRecord, type TheaterScene } from '../bot-theater';
import type { HarvestAssignment, HarvestRecord } from '../web-harvest';
import type { WorkerTask } from '../worker-tasks';
import type { RunRecord, RuntimeKindMap } from '../worker-runtime';
import { executorById } from '../worker-runtime';
import { CastPicker } from './PinnedPanels';

const SCENE_ICON: Record<TheaterScene, React.ReactNode> = {
  LAB: <FlaskConical className="h-5 w-5 text-[#8B5CFF]" />,
  DESK: <Monitor className="h-5 w-5 text-[#00B7FF]" />,
  WAREHOUSE: <Boxes className="h-5 w-5 text-[#FFB020]" />,
  COMMAND: <Radar className="h-5 w-5 text-[#32D74B]" />,
};

const SCENE_TINT: Record<TheaterScene, string> = {
  LAB: 'rgba(139,92,255,0.12)',
  DESK: 'rgba(0,183,255,0.12)',
  WAREHOUSE: 'rgba(255,176,32,0.10)',
  COMMAND: 'rgba(50,215,75,0.10)',
};

export interface BotTheaterProps {
  tasks: WorkerTask[];
  kinds: RuntimeKindMap;
  runningIds: string[];
  runStarts: Record<string, number>;
  runLog: RunRecord[];
  harvestAssignments: HarvestAssignment[];
  harvestRecords: HarvestRecord[];
  harvestBusy: boolean;
  harvestCurrentId: string | null;
  takeovers: TakeoverRecord[];
  principalName: (id: string | null) => string;
  onTakeOverTask: (task: WorkerTask) => void;
  onTakeOverHarvest: (a: HarvestAssignment) => void;
}

export const BotTheater: React.FC<BotTheaterProps> = ({
  tasks,
  kinds,
  runningIds,
  runStarts,
  runLog,
  harvestAssignments,
  harvestRecords,
  harvestBusy,
  harvestCurrentId,
  takeovers,
  principalName,
  onTakeOverTask,
  onTakeOverHarvest,
}) => {
  // A 1 s tick so elapsed seconds on running work stay live.
  const [, setNow] = useState(Date.now());
  // Big Screen cast picker (v247): the COMMAND view can target a
  // chosen monitor via the generic CAST control.
  const [castPickerOpen, setCastPickerOpen] = useState(false);
  useEffect(() => {
    if (runningIds.length === 0 && !harvestBusy) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [runningIds.length, harvestBusy]);

  const lines = narrateTheater({
    tasks,
    runningIds,
    runStarts,
    executorLabelFor: (taskId) => executorById(kinds[taskId] ?? '')?.label ?? null,
    principalName,
    harvestAssignments,
    harvestRecords,
    harvestBusy,
    harvestCurrentId,
    takeovers,
  });

  const postedTasks = tasks.filter(
    (t) => t.state === 'ACTIVE' || t.state === 'QUEUED' || t.state === 'WAITING' || runningIds.includes(t.id),
  );
  const activeHarvest = harvestAssignments.filter((a) => a.active);
  const lastRecordFor = (assignmentId: string) =>
    harvestRecords.find((r) => r.assignmentId === assignmentId) ?? null;
  const elapsed = (id: string) =>
    runStarts[id] ? Math.max(0, Math.round((Date.now() - runStarts[id]) / 1000)) : 0;

  return (
    <div className="rounded-xl border border-white/10 p-4 space-y-3" style={SPACE_BG}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-[#8B5CFF]">BOT THEATER — THE LAB FLOOR</span>
        <span className="font-mono text-[10px] text-[#B8B8B8]">
          POSTED NOW: {postedTasks.length} TASK{postedTasks.length === 1 ? '' : 'S'} · {activeHarvest.length} SCOUT
          {activeHarvest.length === 1 ? '' : 'S'} · WORKING NOW: {runningIds.length + (harvestBusy ? 1 : 0)}
        </span>
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
        THE SCENES ARE ILLUSTRATIONS OF THE WORK — A LAB, A COMPUTER DESK, A WAREHOUSE, A COMMAND
        CENTER — NOT CAMERAS. THE BOTS ARE SOFTWARE RUNNING IN THIS PAGE. THE WORK SCREEN SHOWS
        THE WORK ITSELF: THE FETCH, THE RESPONSE, THE SAVED EXCERPT, THE RUN'S EVIDENCE.
      </p>

      {/* STAR narrates the floor, from the real state. */}
      <div className="rounded-lg border border-[#8B5CFF]/40 bg-[#050505] p-3 space-y-1">
        <p className="font-mono text-[10px] text-[#8B5CFF]">STAR NARRATES — WHAT'S HAPPENING NOW</p>
        {lines.map((l, i) => (
          <p key={i} className="font-mono text-[11px] leading-relaxed text-white">
            {l}
          </p>
        ))}
      </div>
      <p className="font-mono text-[9px] text-[#B8B8B8]">
        SCENES: LAB · DESK · WAREHOUSE · COMMAND — THE SETTING FOLLOWS THE WORK. RESEARCH AND
        CHECKS WORK IN THE LAB · WEB WORK SITS AT A DESK · BUILDING STACKS BOXES IN THE WAREHOUSE
        · RADAR AND MONITORING WATCH FROM COMMAND.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-[#B8B8B8]">
          BIG SCREEN — CAST THE COMMAND VIEW TO A MONITOR:
        </span>
        <button
          type="button"
          onClick={() => setCastPickerOpen((v) => !v)}
          aria-label="Cast Big Screen to a monitor"
          className="flex min-h-[36px] items-center rounded border border-[#8B5CFF]/60 px-3 font-mono text-[10px] text-white"
        >
          {castPickerOpen ? 'HIDE CAST PICKER' : 'CAST BIG SCREEN'}
        </button>
      </div>
      {castPickerOpen && <CastPicker panelId="big-screen" title="Big Screen — Bot Theater" />}

      {postedTasks.length === 0 && activeHarvest.length === 0 ? (
        <p className="font-mono text-[10px] text-[#B8B8B8]">
          NOBODY IS POSTED — NO TASKS ARE QUEUED OR ACTIVE AND NO SCOUT IS ASSIGNED. RECORD A TASK
          ABOVE OR ADD A HARVEST ASSIGNMENT AND THE FLOOR FILLS. NOTHING IS INVENTED TO FILL IT.
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {postedTasks.map((t) => {
            const scene = sceneForTask(t.role, kinds[t.id] ?? null);
            const running = runningIds.includes(t.id);
            const canTakeOver = t.state === 'ACTIVE' || t.state === 'WAITING';
            const latestRun = runLog.find((r) => r.taskId === t.id);
            return (
              <div key={t.id} className="overflow-hidden rounded-lg border border-white/10 bg-[#050505]">
                <div
                  className="flex items-center gap-2 px-3 py-2"
                  style={{ background: SCENE_TINT[scene] }}
                >
                  {SCENE_ICON[scene]}
                  <span className="font-mono text-[10px] text-white">
                    {SCENE_META[scene].label} — {SCENE_META[scene].line.toUpperCase()}
                  </span>
                  <span className="ml-auto font-mono text-[9px] text-[#B8B8B8]">{t.state}</span>
                </div>
                <div className="space-y-1.5 p-3">
                  <p className="text-xs font-semibold text-white">
                    {principalName(t.principal)} — {t.title}
                  </p>
                  <p className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                    {running
                      ? `WORKING NOW — ${executorById(kinds[t.id] ?? '')?.label ?? 'RUNTIME'} · ${elapsed(t.id)}s IN · ${executorById(kinds[t.id] ?? '')?.does ?? ''}`
                      : t.state === 'QUEUED' || t.state === 'WAITING'
                        ? 'POSTED — WAITING FOR DISPATCH. NOTHING HAS STARTED YET.'
                        : `LAST RUN: ${latestRun ? `${latestRun.outcome} — ${latestRun.evidence.slice(0, 140)}${latestRun.evidence.length > 140 ? '…' : ''}` : 'NO RUN RECORDED YET.'}`}
                  </p>
                  {canTakeOver && (
                    <button
                      type="button"
                      onClick={() => onTakeOverTask(t)}
                      className="flex min-h-[44px] items-center rounded border border-[#FFB020]/60 px-3 font-mono text-[10px] text-white"
                    >
                      ⏸ TAKE OVER — I WILL DO THIS STEP MYSELF
                    </button>
                  )}
                  {t.state === 'BLOCKED' && (
                    <p className="font-mono text-[9px] text-[#FFB020]">
                      BLOCKED — {t.blockerReason ?? 'TAKEN OVER BY DANIEL.'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {activeHarvest.map((a) => {
            const rec = lastRecordFor(a.id);
            const fetching = harvestBusy && harvestCurrentId === a.id;
            return (
              <div key={a.id} className="overflow-hidden rounded-lg border border-white/10 bg-[#050505]">
                <div className="flex items-center gap-2 px-3 py-2" style={{ background: SCENE_TINT.DESK }}>
                  {SCENE_ICON.DESK}
                  <span className="font-mono text-[10px] text-white">
                    {SCENE_META.DESK.label} — {SCENE_META.DESK.line.toUpperCase()}
                  </span>
                  <span className="ml-auto font-mono text-[9px] text-[#B8B8B8]">
                    {fetching ? 'FETCHING NOW' : 'SCOUT — ACTIVE'}
                  </span>
                </div>
                <div className="space-y-1.5 p-3">
                  <p className="text-xs font-semibold text-white">
                    {a.principalName} — SCOUT · {a.sourceName} · {a.kind}
                  </p>
                  <p className="break-all font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
                    {fetching
                      ? `FETCHING ${a.url} — THE RESPONSE AND THE SAVED EXCERPT WILL APPEAR HERE WHEN IT LANDS.`
                      : rec
                        ? `${rec.status === 'OK' ? `SAVED ${rec.bytes.toLocaleString()} BYTES` : 'FAILED'} — ${new Date(rec.fetchedAt).toLocaleTimeString('en-US', { hour12: false })} · ${rec.status === 'OK' ? rec.excerpt.slice(0, 120) + (rec.excerpt.length > 120 ? '…' : '') : rec.error}`
                        : 'NO FETCH RECORDED YET FOR THIS SOURCE.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => onTakeOverHarvest(a)}
                    className="flex min-h-[44px] items-center rounded border border-[#FFB020]/60 px-3 font-mono text-[10px] text-white"
                  >
                    ⏸ TAKE OVER — PAUSE THIS SCOUT, I WILL FETCH IT MYSELF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Takeover records — every handover is kept. */}
      <div className="space-y-1.5">
        <p className="font-mono text-[10px] text-[#8B5CFF]">TAKEOVERS — {takeovers.length}</p>
        {takeovers.length === 0 ? (
          <p className="font-mono text-[10px] text-[#B8B8B8]">
            NO TAKEOVERS YET — NOBODY HAS TAKEN THE CONTROLS. WHEN YOU DO, IT IS RECORDED HERE
            WITH THE TIME AND THE TASK.
          </p>
        ) : (
          takeovers.slice(0, 10).map((tk) => (
            <p key={tk.id} className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
              {new Date(tk.at).toLocaleTimeString('en-US', { hour12: false })} — DANIEL TOOK OVER{' '}
              <span className="text-white">{tk.title}</span> ({tk.principal}) · {tk.reason}
            </p>
          ))
        )}
      </div>

      {/* Work history, this session. */}
      <div className="space-y-1.5">
        <p className="font-mono text-[10px] text-[#8B5CFF]">WORK HISTORY — THIS SESSION ({runLog.length})</p>
        {runLog.length === 0 ? (
          <p className="font-mono text-[10px] text-[#B8B8B8]">NO RUNS YET THIS SESSION.</p>
        ) : (
          runLog.slice(0, 5).map((r, i) => (
            <p key={i} className="font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
              {r.outcome === 'COMPLETE' ? '✓' : '✗'} {r.title} · {executorById(r.executor)?.label ?? r.executor} ·{' '}
              {new Date(r.finishedAt).toLocaleTimeString('en-US', { hour12: false })} — {r.evidence.slice(0, 120)}
              {r.evidence.length > 120 ? '…' : ''}
            </p>
          ))
        )}
      </div>
    </div>
  );
};
