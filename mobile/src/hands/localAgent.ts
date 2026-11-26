/**
 * Local Hands — on-device companion agent (mobile foundation,
 * v248 part 2, 2026-11-25).
 *
 * This module is the HANDS. The web brain (STAR) thinks and issues
 * commands; this module runs ON the device, receives a command from
 * the channel (src/local-hands.ts on the web side), executes it
 * through the platform's legitimate APIs, and reports the result +
 * evidence back.
 *
 * WHAT THIS MODULE IS IN THIS BUILD: a foundation, not a wired
 * agent. It settles the command envelope, the honest capability
 * table for the Expo managed workflow, and the execution +
 * reporting shape. It is NOT yet wired to the mobile shell's
 * navigation, NOT yet connected to any command transport (no
 * channel delivers commands to the phone yet), and it performs NO
 * device action on its own. Wiring (transport + navigation hook +
 * Settings row) is the next step, designed in
 * LOCAL-HANDS-DESIGN-2026-11-25.md.
 *
 * HONESTY RULE — the same as the web side: if an action is not
 * possible on this platform (no permission, no API, managed
 * workflow limit), the module reports NOT_POSSIBLE with the exact
 * reason. It NEVER reports a fake success, and it NEVER claims an
 * action the OS did not perform.
 *
 * CAPABILITY TRUTH, Expo SDK 58 managed workflow (Expo Go):
 * - tap / type on the device screen: NOT POSSIBLE here. Driving
 *   another app's UI needs an Android AccessibilityService (a
 *   native service the user enables in system settings) or iOS
 *   Switch Control / Voice Control — neither is reachable from
 *   the Expo managed workflow. It needs a development build with
 *   a native module, plus the owner's explicit enablement of the
 *   accessibility service on the device. This module does not
 *   pretend otherwise.
 * - open-app: POSSIBLE only for apps that expose a URL scheme
 *   (or an Android intent the OS will resolve), via Linking. An
 *   app with no public scheme cannot be opened by package name
 *   from here — that reports NOT_POSSIBLE, not a silent failure.
 * - open-screen (an MTI6 screen): POSSIBLE once the shell injects
 *   its navigation function. Until then NOT_POSSIBLE ("navigation
 *   not wired"). Opening our own screens is the one action this
 *   module can genuinely do today, once wired.
 * - change-setting: NOT POSSIBLE as a silent change. The OS does
 *   not let an app flip system settings. The legitimate path is
 *   opening the system settings page for the owner (Linking to
 *   the settings app / expo-intent-launcher on Android, dev build
 *   only) — the OWNER changes the setting; the module records
 *   OPENED_SETTINGS_FOR_OWNER, never "setting changed".
 *
 * No dependency on react-native here on purpose: this file is
 * pure TypeScript so the envelope and capability table can be
 * read, tested, and reviewed without a native toolchain. The
 * shell injects the platform functions (linking, navigation)
 * through LocalAgentContext.
 */

// ---------------------------------------------------------------------------
// Envelope — mirrors src/local-hands.ts on the web side.
// ---------------------------------------------------------------------------

export type HandsCommandKind =
  | 'tap'
  | 'type'
  | 'open-app'
  | 'open-screen'
  | 'change-setting';

/** A command as the companion receives it. Identical shape to
 * the web channel's LocalHandsCommand (id, principal, kind,
 * target, detail) — the transport carries the web record as-is. */
export interface HandsCommandEnvelope {
  id: string;
  issuedAt: string;
  principal: string;
  targetDeviceId: string;
  targetDeviceLabel: string;
  kind: HandsCommandKind;
  target: string;
  detail: string;
  approvedAt: string | null;
}

export type HandsExecutionOutcome =
  | 'EXECUTED'
  | 'NOT_POSSIBLE'
  | 'REFUSED'
  | 'OPENED_SETTINGS_FOR_OWNER';

/** The companion's report back to the channel. `evidence` is
 * what happened, when, and what the platform said — the web side
 * appends it verbatim to the command's evidence trail. */
export interface HandsExecutionReport {
  commandId: string;
  outcome: HandsExecutionOutcome;
  /** Human-readable, exact: what was done, or why it could not
   * be done. Never a fake success. */
  evidence: string;
  reportedAt: string;
  /** Platform the report comes from. */
  platform: 'android' | 'ios' | 'unknown';
}

// ---------------------------------------------------------------------------
// Capability table — what this platform can actually do.
// ---------------------------------------------------------------------------

export type HandsCapability = 'POSSIBLE' | 'POSSIBLE_WITH_OWNER_STEP' | 'NOT_POSSIBLE';

export interface HandsCapabilityEntry {
  kind: HandsCommandKind;
  capability: HandsCapability;
  /** Why, in plain words — including what would have to change
   * for a NOT_POSSIBLE action to become possible. */
  reason: string;
}

/**
 * The honest capability table for the Expo SDK 58 managed
 * workflow. This is a statement of platform fact, not a
 * configuration — no flag in this module can upgrade a
 * NOT_POSSIBLE entry.
 */
export function describePlatformCapabilities(): HandsCapabilityEntry[] {
  return [
    {
      kind: 'tap',
      capability: 'NOT_POSSIBLE',
      reason:
        'Tapping another app\'s UI needs an Android AccessibilityService or iOS Switch Control — a native service the owner enables in system settings. The Expo managed workflow cannot provide one; it needs a development build with a native module plus the owner enabling the service on the device.',
    },
    {
      kind: 'type',
      capability: 'NOT_POSSIBLE',
      reason:
        'Typing into another app needs the same accessibility service as tap (Android AccessibilityService / iOS Switch Control). Not available in the Expo managed workflow; needs a development build with a native module plus the owner enabling the service.',
    },
    {
      kind: 'open-app',
      capability: 'POSSIBLE_WITH_OWNER_STEP',
      reason:
        'Apps that expose a URL scheme can be opened via Linking.openURL. An app with no public scheme cannot be opened by package name from here — that reports NOT_POSSIBLE. The OS decides; the module never claims an app opened when the OS refused.',
    },
    {
      kind: 'open-screen',
      capability: 'POSSIBLE',
      reason:
        'Opening an MTI6 screen inside this app is genuine in-app navigation — possible once the shell injects its navigation function. Until the shell wires it, this reports NOT_POSSIBLE ("navigation not wired").',
    },
    {
      kind: 'change-setting',
      capability: 'POSSIBLE_WITH_OWNER_STEP',
      reason:
        'No app may silently flip a system setting. The legitimate path is opening the system settings page for the owner (the owner changes the setting); the module records OPENED_SETTINGS_FOR_OWNER, never "setting changed". On Android the intent launcher needs a development build.',
    },
  ];
}

export function capabilityFor(kind: HandsCommandKind): HandsCapabilityEntry {
  const entry = describePlatformCapabilities().find((e) => e.kind === kind);
  if (!entry) throw new Error(`Unknown hands command kind: ${kind}`);
  return entry;
}

// ---------------------------------------------------------------------------
// Execution — pure, injectable, honest.
// ---------------------------------------------------------------------------

/** Platform functions the shell injects. Every one is optional:
 * an absent function means the action reports NOT_POSSIBLE with
 * the reason "not wired", never a crash and never a fake success. */
export interface LocalAgentContext {
  platform: 'android' | 'ios' | 'unknown';
  /** Open a URL / app scheme. Returns true only if the OS
   * accepted the open. Mirrors Linking.openURL / canOpenURL. */
  openUrl?: (url: string) => Promise<boolean>;
  /** Can this URL / scheme be opened on this device? */
  canOpenUrl?: (url: string) => Promise<boolean>;
  /** Navigate inside the MTI6 app to a screen id. Injected by
   * the shell once wired; absent until then. */
  navigateToScreen?: (screenId: string) => void;
  /** Open the OS settings page for a setting key. Returns true
   * only if the OS opened it. */
  openSystemSettings?: (settingKey: string) => Promise<boolean>;
}

const stamp = (): string => new Date().toISOString();

function report(
  command: HandsCommandEnvelope,
  platform: LocalAgentContext['platform'],
  outcome: HandsExecutionOutcome,
  evidence: string,
): HandsExecutionReport {
  return { commandId: command.id, outcome, evidence, reportedAt: stamp(), platform };
}

/**
 * Execute one approved command. The caller (the transport, once
 * built) guarantees the command arrived APPROVED — this module
 * still refuses anything that is not approved, because a command
 * that reaches the device without the owner's tap must never run.
 *
 * Every branch returns a report; no branch throws for a
 * capability gap — a gap is a NOT_POSSIBLE report with the reason.
 */
export async function executeHandsCommand(
  command: HandsCommandEnvelope,
  ctx: LocalAgentContext,
): Promise<HandsExecutionReport> {
  if (!command.approvedAt) {
    return report(
      command,
      ctx.platform,
      'REFUSED',
      'Refused on-device: command arrived without an owner approval timestamp. Nothing executes without the owner\'s explicit per-action approval.',
    );
  }
  const cap = capabilityFor(command.kind);

  switch (command.kind) {
    case 'open-screen': {
      if (!ctx.navigateToScreen) {
        return report(
          command,
          ctx.platform,
          'NOT_POSSIBLE',
          `Could not open screen "${command.target}": in-app navigation is not wired into the local agent yet (the shell has not injected its navigation function). ${cap.reason}`,
        );
      }
      try {
        ctx.navigateToScreen(command.target);
        return report(
          command,
          ctx.platform,
          'EXECUTED',
          `Opened MTI6 screen "${command.target}" inside the app via the shell navigation.`,
        );
      } catch (e) {
        return report(
          command,
          ctx.platform,
          'NOT_POSSIBLE',
          `Could not open screen "${command.target}": navigation failed — ${e instanceof Error ? e.message : 'unknown error'}.`,
        );
      }
    }

    case 'open-app': {
      // The target is an app name or URL scheme, e.g. "settings"
      // or a scheme the owner allowed. A bare app name with no
      // scheme is not openable — report it, do not guess a scheme.
      const target = command.target.trim();
      if (!ctx.openUrl || !ctx.canOpenUrl) {
        return report(
          command,
          ctx.platform,
          'NOT_POSSIBLE',
          `Could not open app "${target}": Linking is not wired into the local agent yet.`,
        );
      }
      const url = target.includes('://') ? target : `${target}://`;
      let canOpen = false;
      try {
        canOpen = await ctx.canOpenUrl(url);
      } catch {
        canOpen = false;
      }
      if (!canOpen) {
        return report(
          command,
          ctx.platform,
          'NOT_POSSIBLE',
          `Could not open app "${target}": the OS reports no app handles "${url}" (no public URL scheme). The app cannot be opened by package name from here.`,
        );
      }
      let opened = false;
      try {
        opened = await ctx.openUrl(url);
      } catch {
        opened = false;
      }
      return opened
        ? report(command, ctx.platform, 'EXECUTED', `Opened "${target}" via ${url} — the OS accepted the open.`)
        : report(
            command,
            ctx.platform,
            'NOT_POSSIBLE',
            `Could not open app "${target}": the OS refused the open of ${url}.`,
          );
    }

    case 'change-setting': {
      if (!ctx.openSystemSettings) {
        return report(
          command,
          ctx.platform,
          'NOT_POSSIBLE',
          `Could not change setting "${command.target}": the system-settings opener is not wired into the local agent yet. No app may silently flip a system setting.`,
        );
      }
      let opened = false;
      try {
        opened = await ctx.openSystemSettings(command.target);
      } catch {
        opened = false;
      }
      return opened
        ? report(
            command,
            ctx.platform,
            'OPENED_SETTINGS_FOR_OWNER',
            `Opened the system settings page for "${command.target}" for the owner to change. The setting itself was NOT changed by the agent — only the owner can change it there.`,
          )
        : report(
            command,
            ctx.platform,
            'NOT_POSSIBLE',
            `Could not open the system settings page for "${command.target}" on this device.`,
          );
    }

    case 'tap':
    case 'type': {
      // No legitimate API in the managed workflow. This branch is
      // deliberately a report, not an attempt: attempting a tap
      // through an API that does not exist would be a fake action.
      return report(command, ctx.platform, 'NOT_POSSIBLE', `${cap.reason}`);
    }

    default: {
      return report(
        command,
        ctx.platform,
        'REFUSED',
        `Refused on-device: unknown command kind "${(command as HandsCommandEnvelope).kind}".`,
      );
    }
  }
}

/** Serialize a report for the channel transport (designed, not
 * built — see LOCAL-HANDS-DESIGN-2026-11-25.md §5). The transport
 * carries this JSON back to the web channel, which appends it to
 * the command's evidence via recordCompanionReport(). */
export function serializeReport(r: HandsExecutionReport): string {
  return JSON.stringify(r);
}
