/**
 * Local Hands — the command channel between STAR (the web brain)
 * and the on-device local agent (v248 part 2, 2026-11-25).
 *
 * ARCHITECTURE — WEB BRAIN + LOCAL HANDS:
 * - The web brain (STAR, cloud models via the gateway) thinks,
 *   plans, and issues commands. It cannot touch anything outside
 *   the browser sandbox — a web page cannot tap a phone screen,
 *   type into another app, or change a device setting.
 * - The LOCAL HANDS are a small companion agent that runs ON the
 *   device (the mobile companion under mobile/src/hands/, and a
 *   designed-only PC companion — see LOCAL-HANDS-DESIGN-2026-11-25.md).
 *   The companion receives commands from this channel, executes
 *   them through the platform's legitimate APIs, and reports
 *   results + evidence back.
 *
 * GOVERNANCE — mirrors src/bot-browser.ts exactly:
 * - A command exists only because STAR (or the owner) issued it.
 * - A command executes ONLY after the owner's explicit per-action
 *   approval tap. There is no auto-approve, no standing approval,
 *   no "approve all". Approving one command approves that one
 *   command only.
 * - The target must be in the owner's SCOPE ALLOWLIST (Settings >
 *   Devices > Local Hands). The allowlist starts EMPTY — STAR can
 *   touch nothing until the owner adds it. A command outside the
 *   allowlist is recorded as REFUSED_OUT_OF_SCOPE, never queued.
 * - The target device must be READY (companion installed AND the
 *   owner granted its permissions on that device) before an
 *   approved command is handed off. Otherwise the execution
 *   records REFUSED_NOT_READY with the exact reason.
 * - Every state change is recorded with what happened and when.
 *   A refusal records exactly why — never a fake success.
 *
 * WHAT "EXECUTED" MEANS HERE (honesty):
 * - The web app cannot perform a device action itself. When an
 *   approved command is handed to the companion channel, this
 *   module records EXECUTED with evidence "Handed off to the
 *   companion on <device> at <time> — awaiting the companion's
 *   execution report". That is a HANDOFF record, not proof the
 *   device acted. The companion's own report (its result +
 *   evidence) is recorded separately when it arrives, and only
 *   then does the command carry device-side evidence. Until a
 *   real companion on a real device executes a real command,
 *   nothing here claims a device was controlled.
 * - Device READY state is OWNER-ATTESTED in this build: the owner
 *   taps "companion installed + permissions granted" in the panel
 *   after doing it on the device. The web page cannot verify a
 *   companion installation itself, and the panel labels the state
 *   as owner-attested. A companion heartbeat transport (the
 *   companion reporting in by itself) is designed, not built.
 *
 * STORAGE: localStorage keys `mti6_local_hands_devices_v1`,
 * `mti6_local_hands_scope_v1`, `mti6_local_hands_commands_v1`
 * (cap 100 commands). No secrets are ever stored here — a command
 * target is an app/screen/setting name, never a credential.
 */

export type LocalHandsCommandKind =
  | 'tap'
  | 'type'
  | 'open-app'
  | 'open-screen'
  | 'change-setting';

export const LOCAL_HANDS_KINDS: { kind: LocalHandsCommandKind; label: string; what: string }[] = [
  { kind: 'tap', label: 'Tap', what: 'Tap a point or element on the device screen' },
  { kind: 'type', label: 'Type', what: 'Type text into the focused field on the device' },
  { kind: 'open-app', label: 'Open app', what: 'Open an app on the device' },
  { kind: 'open-screen', label: 'Open screen', what: 'Open a screen inside the MTI6 app on the device' },
  { kind: 'change-setting', label: 'Change setting', what: 'Change a device setting (within the allowed scope only)' },
];

export type LocalHandsApprovalState = 'PENDING' | 'APPROVED' | 'EXECUTED' | 'REFUSED';

export type LocalHandsRefusalReason =
  | 'REFUSED_OUT_OF_SCOPE'
  | 'REFUSED_BY_OWNER'
  | 'REFUSED_NOT_READY'
  | 'REFUSED_INVALID'
  | 'REFUSED_NO_DEVICE';

export type LocalHandsDeviceState =
  | 'NOT_INSTALLED'
  | 'INSTALLED_NO_PERMISSION'
  | 'READY'
  | 'UNREACHABLE';

export const LOCAL_HANDS_DEVICE_STATE_LABELS: Record<LocalHandsDeviceState, string> = {
  NOT_INSTALLED: 'NOT_INSTALLED — no companion on this device yet',
  INSTALLED_NO_PERMISSION: 'INSTALLED, NO PERMISSION — companion installed but its permissions are not granted',
  READY: 'READY — companion installed and permissions granted (owner-attested)',
  UNREACHABLE: 'UNREACHABLE — companion was ready before, but has not reported in',
};

export type LocalHandsPlatform = 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'unknown';

export interface LocalHandsDevice {
  id: string;
  /** Owner-chosen label, e.g. "Daniel's Galaxy A14". */
  label: string;
  platform: LocalHandsPlatform;
  state: LocalHandsDeviceState;
  /** Permissions the owner says the companion holds on that
   * device (names only, e.g. "Accessibility", "Draw over other
   * apps"). Owner-attested — the web page cannot verify them. */
  permissionsGranted: string[];
  /** Companion version the owner reports, if known. */
  companionVersion: string | null;
  registeredAt: string;
  updatedAt: string;
  /** Last companion heartbeat, if any ever arrived (none in
   * this build — the heartbeat transport is designed, not built). */
  lastSeenAt: string | null;
  /** True while the state rests on the owner's word rather than
   * a companion report. Always true in this build. */
  ownerAttested: boolean;
}

export type LocalHandsScopeKind = 'app' | 'screen' | 'setting' | 'action';

export interface LocalHandsScopeEntry {
  id: string;
  kind: LocalHandsScopeKind;
  /** What STAR may touch: an app name/package, an MTI6 screen
   * name, a setting key, or an action name. Owner-chosen. */
  target: string;
  addedAt: string;
}

export interface LocalHandsCommand {
  id: string;
  issuedAt: string;
  /** Who issued it: 'STAR', or a Tribe principal id. */
  principal: string;
  targetDeviceId: string;
  targetDeviceLabel: string;
  kind: LocalHandsCommandKind;
  /** What to act on: app name / screen name / setting key /
   * tap target description. Never a secret. */
  target: string;
  /** Free-text detail, e.g. the text to type. Never a secret,
   * password, or key. */
  detail: string;
  state: LocalHandsApprovalState;
  approvedAt: string | null;
  executedAt: string | null;
  refusedAt: string | null;
  refusalReason: LocalHandsRefusalReason | null;
  refusalDetail: string | null;
  /** Evidence trail: one line per state change / report, each
   * with a timestamp. Device-side evidence is appended only
   * when a companion report arrives. */
  evidence: string[];
}

export const LOCAL_HANDS_DEVICES_KEY = 'mti6_local_hands_devices_v1';
export const LOCAL_HANDS_SCOPE_KEY = 'mti6_local_hands_scope_v1';
export const LOCAL_HANDS_COMMANDS_KEY = 'mti6_local_hands_commands_v1';
const MAX_COMMANDS = 100;
/** Storage event + in-tab event name for live panel refresh. */
export const LOCAL_HANDS_CHANGED_EVENT = 'mti6-local-hands-changed';

const stamp = (): string => new Date().toISOString();
const uid = (): string =>
  `lh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function notifyChanged(): void {
  try {
    window.dispatchEvent(new Event(LOCAL_HANDS_CHANGED_EVENT));
  } catch {
    /* no window (tests) — storage still holds the record */
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the record stays in memory this run */
  }
  notifyChanged();
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export function loadHandsDevices(): LocalHandsDevice[] {
  const raw = readJson<unknown>(LOCAL_HANDS_DEVICES_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (d): d is LocalHandsDevice =>
      !!d && typeof d === 'object' && typeof (d as LocalHandsDevice).id === 'string',
  );
}

function saveHandsDevices(devices: LocalHandsDevice[]): LocalHandsDevice[] {
  writeJson(LOCAL_HANDS_DEVICES_KEY, devices);
  return devices;
}

/** Guess the platform of the device this browser runs on, from
 * the user agent — a label for the record only, never a claim
 * about a companion. */
export function guessThisDevicePlatform(): LocalHandsPlatform {
  try {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) return 'android';
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/windows/.test(ua)) return 'windows';
    if (/mac os/.test(ua)) return 'macos';
    if (/linux/.test(ua)) return 'linux';
  } catch {
    /* no navigator — unknown */
  }
  return 'unknown';
}

export function thisDeviceLabel(): string {
  try {
    const platform = navigator.platform || 'this device';
    return `This device (${platform})`;
  } catch {
    return 'This device';
  }
}

/** Register a device record. The record starts NOT_INSTALLED:
 * registering a device claims nothing about a companion — it
 * only names the device so its hands state can be tracked. */
export function registerHandsDevice(label: string, platform: LocalHandsPlatform): LocalHandsDevice {
  const now = stamp();
  const device: LocalHandsDevice = {
    id: uid(),
    label: label.trim().slice(0, 80) || 'Unnamed device',
    platform,
    state: 'NOT_INSTALLED',
    permissionsGranted: [],
    companionVersion: null,
    registeredAt: now,
    updatedAt: now,
    lastSeenAt: null,
    ownerAttested: true,
  };
  saveHandsDevices([...loadHandsDevices(), device]);
  return device;
}

export function removeHandsDevice(deviceId: string): LocalHandsDevice[] {
  return saveHandsDevices(loadHandsDevices().filter((d) => d.id !== deviceId));
}

/**
 * Owner-attested companion state: the owner taps this in the
 * panel AFTER installing the companion on the device and granting
 * its permissions there. The web page cannot verify either step,
 * so the record stays ownerAttested: true and the panel labels
 * it as such. Passing no permissions records INSTALLED_NO_PERMISSION.
 */
export function markCompanionState(
  deviceId: string,
  permissionsGranted: string[],
  companionVersion: string | null,
): LocalHandsDevice | null {
  const devices = loadHandsDevices();
  const device = devices.find((d) => d.id === deviceId);
  if (!device) return null;
  device.permissionsGranted = permissionsGranted
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 20);
  device.companionVersion = companionVersion ? companionVersion.trim().slice(0, 40) : null;
  device.state =
    device.permissionsGranted.length > 0 ? 'READY' : 'INSTALLED_NO_PERMISSION';
  device.updatedAt = stamp();
  device.ownerAttested = true;
  saveHandsDevices(devices);
  return device;
}

/** Mark a READY device UNREACHABLE (no companion report lately).
 * Only ever set from a real absence of reports — never assumed. */
export function markDeviceUnreachable(deviceId: string): LocalHandsDevice | null {
  const devices = loadHandsDevices();
  const device = devices.find((d) => d.id === deviceId);
  if (!device || device.state !== 'READY') return device ?? null;
  device.state = 'UNREACHABLE';
  device.updatedAt = stamp();
  saveHandsDevices(devices);
  return device;
}

// ---------------------------------------------------------------------------
// Scope allowlist — starts EMPTY. The owner adds what STAR may touch.
// ---------------------------------------------------------------------------

export function loadHandsScope(): LocalHandsScopeEntry[] {
  const raw = readJson<unknown>(LOCAL_HANDS_SCOPE_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is LocalHandsScopeEntry =>
      !!e && typeof e === 'object' && typeof (e as LocalHandsScopeEntry).id === 'string',
  );
}

function saveHandsScope(entries: LocalHandsScopeEntry[]): LocalHandsScopeEntry[] {
  writeJson(LOCAL_HANDS_SCOPE_KEY, entries);
  return entries;
}

export function addScopeEntry(
  kind: LocalHandsScopeKind,
  target: string,
): LocalHandsScopeEntry | null {
  const clean = target.trim().slice(0, 120);
  if (!clean) return null;
  const entries = loadHandsScope();
  const existing = entries.find(
    (e) => e.kind === kind && e.target.toLowerCase() === clean.toLowerCase(),
  );
  if (existing) return existing;
  const entry: LocalHandsScopeEntry = { id: uid(), kind, target: clean, addedAt: stamp() };
  saveHandsScope([...entries, entry]);
  return entry;
}

export function removeScopeEntry(entryId: string): LocalHandsScopeEntry[] {
  return saveHandsScope(loadHandsScope().filter((e) => e.id !== entryId));
}

/** Is this command target inside the owner's allowlist? A scope
 * entry matches by kind + target (case-insensitive). A 'tap' or
 * 'type' command is matched against 'action' entries named for
 * the screen/field it targets, plus any 'screen' entry for that
 * screen — the owner allows places, not arbitrary taps. */
export function isInScope(kind: LocalHandsCommandKind, target: string): boolean {
  const entries = loadHandsScope();
  const t = target.trim().toLowerCase();
  if (t === '') return false;
  if (kind === 'open-app') return entries.some((e) => e.kind === 'app' && e.target.toLowerCase() === t);
  if (kind === 'open-screen') return entries.some((e) => e.kind === 'screen' && e.target.toLowerCase() === t);
  if (kind === 'change-setting') return entries.some((e) => e.kind === 'setting' && e.target.toLowerCase() === t);
  // tap / type: allowed only where the owner allowed the screen
  // or an action naming the target.
  return entries.some(
    (e) =>
      (e.kind === 'action' && e.target.toLowerCase() === t) ||
      (e.kind === 'screen' && e.target.toLowerCase() === t),
  );
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export function loadHandsCommands(): LocalHandsCommand[] {
  const raw = readJson<unknown>(LOCAL_HANDS_COMMANDS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is LocalHandsCommand =>
      !!c && typeof c === 'object' && typeof (c as LocalHandsCommand).id === 'string',
  );
}

function saveHandsCommands(commands: LocalHandsCommand[]): LocalHandsCommand[] {
  writeJson(LOCAL_HANDS_COMMANDS_KEY, commands.slice(0, MAX_COMMANDS));
  return commands;
}

export interface HandsCommandRequest {
  principal: string;
  targetDeviceId: string;
  kind: LocalHandsCommandKind;
  target: string;
  detail?: string;
}

export type HandsIssueResult =
  | { ok: true; command: LocalHandsCommand }
  | { ok: false; command: LocalHandsCommand; reason: LocalHandsRefusalReason; detail: string };

function recordRefusedCommand(
  req: HandsCommandRequest,
  deviceLabel: string,
  reason: LocalHandsRefusalReason,
  detail: string,
): LocalHandsCommand {
  const now = stamp();
  const command: LocalHandsCommand = {
    id: uid(),
    issuedAt: now,
    principal: req.principal,
    targetDeviceId: req.targetDeviceId,
    targetDeviceLabel: deviceLabel,
    kind: req.kind,
    target: req.target.trim().slice(0, 200),
    detail: (req.detail ?? '').trim().slice(0, 500),
    state: 'REFUSED',
    approvedAt: null,
    executedAt: null,
    refusedAt: now,
    refusalReason: reason,
    refusalDetail: detail,
    evidence: [`${now} — REFUSED (${reason}): ${detail}`],
  };
  saveHandsCommands([command, ...loadHandsCommands()]);
  return command;
}

/* Issue a command. Governance order, mirroring bot-browser:
 * valid request → target device exists → target in the scope
 * allowlist. A failure records a REFUSED command with the exact
 * reason — the queue never silently drops a request, and nothing
 * is queued that the owner has not allowed. A valid request lands
 * PENDING and waits for the owner's approval tap; nothing
 * executes here. */
export function issueHandsCommand(req: HandsCommandRequest): HandsIssueResult {
  const device = loadHandsDevices().find((d) => d.id === req.targetDeviceId);
  const deviceLabel = device ? device.label : '(unknown device)';
  if (!req.target || !req.target.trim()) {
    const detail = 'No target — a command needs an app, screen, setting, or tap target to act on.';
    return {
      ok: false,
      command: recordRefusedCommand(req, deviceLabel, 'REFUSED_INVALID', detail),
      reason: 'REFUSED_INVALID',
      detail,
    };
  }
  if (!device) {
    const detail = 'No such device is registered for local hands — register the device in Settings > Devices first.';
    return {
      ok: false,
      command: recordRefusedCommand(req, deviceLabel, 'REFUSED_NO_DEVICE', detail),
      reason: 'REFUSED_NO_DEVICE',
      detail,
    };
  }
  if (!isInScope(req.kind, req.target)) {
    const detail = `Target "${req.target.trim()}" is not in the scope allowlist — the owner adds what STAR may touch in Settings > Devices > Local Hands. The allowlist starts empty.`;
    return {
      ok: false,
      command: recordRefusedCommand(req, deviceLabel, 'REFUSED_OUT_OF_SCOPE', detail),
      reason: 'REFUSED_OUT_OF_SCOPE',
      detail,
    };
  }
  const now = stamp();
  const command: LocalHandsCommand = {
    id: uid(),
    issuedAt: now,
    principal: req.principal,
    targetDeviceId: req.targetDeviceId,
    targetDeviceLabel: device.label,
    kind: req.kind,
    target: req.target.trim().slice(0, 200),
    detail: (req.detail ?? '').trim().slice(0, 500),
    state: 'PENDING',
    approvedAt: null,
    executedAt: null,
    refusedAt: null,
    refusalReason: null,
    refusalDetail: null,
    evidence: [
      `${now} — Issued by ${req.principal} for ${device.label}; PENDING owner approval. Nothing has executed.`,
    ],
  };
  saveHandsCommands([command, ...loadHandsCommands()]);
  return { ok: true, command };
}

/** Owner approves a PENDING command. Approval alone executes
 * nothing — it only moves the command to APPROVED, ready for
 * the handoff step. */
export function approveHandsCommand(commandId: string): LocalHandsCommand | null {
  const commands = loadHandsCommands();
  const command = commands.find((c) => c.id === commandId);
  if (!command || command.state !== 'PENDING') return command ?? null;
  const now = stamp();
  command.state = 'APPROVED';
  command.approvedAt = now;
  command.evidence.push(`${now} — APPROVED by the owner. Not yet handed off; nothing has executed.`);
  saveHandsCommands(commands);
  return command;
}

/** Owner refuses a PENDING (or APPROVED, not yet handed off)
 * command. The reason is recorded verbatim. */
export function refuseHandsCommand(
  commandId: string,
  reason: string,
): LocalHandsCommand | null {
  const commands = loadHandsCommands();
  const command = commands.find((c) => c.id === commandId);
  if (!command || (command.state !== 'PENDING' && command.state !== 'APPROVED'))
    return command ?? null;
  const now = stamp();
  command.state = 'REFUSED';
  command.refusedAt = now;
  command.refusalReason = 'REFUSED_BY_OWNER';
  command.refusalDetail = reason.trim().slice(0, 300) || 'Refused by the owner (no reason given).';
  command.evidence.push(`${now} — REFUSED by the owner: ${command.refusalDetail}`);
  saveHandsCommands(commands);
  return command;
}

export type HandsExecuteResult =
  | { ok: true; command: LocalHandsCommand }
  | { ok: false; command: LocalHandsCommand | null; reason: LocalHandsRefusalReason; detail: string };

/* Hand an APPROVED command to the companion channel. This is the
 * only place a command moves toward execution, and it runs only
 * on an APPROVED command whose device is READY. The web app
 * cannot perform the device action itself, so EXECUTED here
 * records the HANDOFF — "handed to the companion on <device> at
 * <time>, awaiting the companion's execution report" — never a
 * claim that the device acted. The companion's own result is
 * recorded separately by recordCompanionReport() when it arrives.
 * A device that is not READY refuses with the exact reason. */
export function executeApprovedHandsCommand(commandId: string): HandsExecuteResult {
  const commands = loadHandsCommands();
  const command = commands.find((c) => c.id === commandId);
  if (!command) {
    // No record to refuse against — nothing was recorded, and
    // nothing is invented. Callers treat null as "no such command".
    return {
      ok: false,
      command: null,
      reason: 'REFUSED_INVALID',
      detail: 'No such command.',
    };
  }
  if (command.state !== 'APPROVED') {
    const detail =
      command.state === 'PENDING'
        ? 'Command is still PENDING — the owner approves it first; nothing executes without approval.'
        : `Command is ${command.state} — only an APPROVED command can be handed off.`;
    return { ok: false, command, reason: 'REFUSED_INVALID', detail };
  }
  const device = loadHandsDevices().find((d) => d.id === command.targetDeviceId);
  if (!device || device.state !== 'READY') {
    const now = stamp();
    const stateLabel = device ? device.state : 'NOT REGISTERED';
    const detail =
      device && device.state === 'INSTALLED_NO_PERMISSION'
        ? `Device ${device.label} is INSTALLED_NO_PERMISSION — the companion is installed but its permissions are not granted on the device. Grant them on the device first.`
        : device && device.state === 'UNREACHABLE'
          ? `Device ${device.label} is UNREACHABLE — its companion has not reported in. Check the device and the companion.`
          : device
            ? `Device ${device.label} is ${stateLabel} — install the companion on the device and grant its permissions first.`
            : 'Target device is no longer registered — register it in Settings > Devices first.';
    command.state = 'REFUSED';
    command.refusedAt = now;
    command.refusalReason = 'REFUSED_NOT_READY';
    command.refusalDetail = detail;
    command.evidence.push(`${now} — REFUSED (REFUSED_NOT_READY): ${detail}`);
    saveHandsCommands(commands);
    return { ok: false, command, reason: 'REFUSED_NOT_READY', detail };
  }
  const now = stamp();
  command.state = 'EXECUTED';
  command.executedAt = now;
  command.evidence.push(
    `${now} — Handed off to the companion on ${device.label} (handoff record — the web page cannot act on the device itself). Awaiting the companion's execution report; until it arrives, this is a handoff, not proof the device acted.`,
  );
  saveHandsCommands(commands);
  return { ok: true, command };
}

/**
 * Record a companion's execution report for a handed-off
 * command. In this build no transport exists, so this is called
 * only from the design's future heartbeat path — it is here so
 * the record shape is settled before any transport is built.
 * `outcome` is the companion's own word: what it did, or why it
 * could not (NOT_POSSIBLE with the reason — never a fake success).
 */
export function recordCompanionReport(
  commandId: string,
  outcome: string,
  evidence: string,
): LocalHandsCommand | null {
  const commands = loadHandsCommands();
  const command = commands.find((c) => c.id === commandId);
  if (!command) return null;
  command.evidence.push(
    `${stamp()} — Companion report (${outcome}): ${evidence.slice(0, 500)}`,
  );
  saveHandsCommands(commands);
  return command;
}

export function handsSummary(): {
  devices: number;
  ready: number;
  scopeEntries: number;
  pending: number;
  executed: number;
  refused: number;
} {
  const devices = loadHandsDevices();
  const commands = loadHandsCommands();
  return {
    devices: devices.length,
    ready: devices.filter((d) => d.state === 'READY').length,
    scopeEntries: loadHandsScope().length,
    pending: commands.filter((c) => c.state === 'PENDING').length,
    executed: commands.filter((c) => c.state === 'EXECUTED').length,
    refused: commands.filter((c) => c.state === 'REFUSED').length,
  };
}

/** STAR's honest answer about device control, from the real
 * state — used by star-local.ts and the system prompt. */
export function localHandsSummaryText(): string {
  const s = handsSummary();
  const devices = loadHandsDevices();
  const stateLine =
    s.devices === 0
      ? 'no device has a local-hands companion yet — every device reads NOT_INSTALLED until the companion is installed on it and its permissions are granted there'
      : devices
          .map(
            (d) =>
              `${d.label} (${d.platform}): ${d.state}${d.ownerAttested ? ' (owner-attested — the web page cannot verify a companion itself)' : ''}`,
          )
          .join('; ');
  return `From the platform's own records: local hands — the on-device piece that taps, types, opens apps, and changes settings — ${stateLine}. ${s.ready} of ${s.devices} device(s) READY. The scope allowlist holds ${s.scopeEntries} entr${s.scopeEntries === 1 ? 'y' : 'ies'} (it starts empty; STAR can touch nothing until the owner adds it). Command queue: ${s.pending} pending approval, ${s.executed} handed off to a companion, ${s.refused} refused. Every command needs the owner's explicit per-action approval — nothing executes on approval alone in the browser, and the web page cannot act on a device itself: an approved command is handed to the companion on the device, and only the companion's own report proves the device acted. A web page cannot reach outside the browser sandbox, which is why the hands must live on the device. See Settings > Devices > Local Hands.`;
}
