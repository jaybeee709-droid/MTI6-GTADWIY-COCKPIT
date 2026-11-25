/**
 * Angel Registry (v247, owner direction #7, 2026-11-25) — the
 * Angels' OWN registry, separate from the Tribe. Angels are
 * NEVER Tribe members and NEVER appear in TRIBE_PRINCIPALS.
 *
 * Only four Angels are approved for security/alert work:
 * MICHAEL and GABRIEL (KJV), RAPHAEL and URIEL (Apocrypha).
 * RAGUEL, SARIEL and REMIEL require verification before use:
 * they are listed here ONLY so they read UNVERIFIED /
 * NOT ACTIVATED — they cannot be assigned work, and
 * isApprovedAngel() returns false for them.
 *
 * An Angel's live status is DERIVED, never asserted: ACTIVE
 * only while it holds open alert work (an alert assigned to it
 * in a state before RESOLVED), STANDBY otherwise. The registry
 * holds no live state of its own — angelStatus() derives it
 * from the AngelSecurity store's alerts, passed in by the
 * caller, so this module never imports the store and can never
 * form a cycle with angel-security.ts.
 */

export type AngelApproval = 'APPROVED' | 'UNVERIFIED';
export type AngelLiveStatus = 'ACTIVE' | 'STANDBY' | 'NOT ACTIVATED';

export interface AngelEntry {
  id: string;
  name: string;
  approval: AngelApproval;
  /** Where the approval comes from: KJV, Apocrypha, or UNVERIFIED (no source). */
  source: 'KJV' | 'Apocrypha' | 'UNVERIFIED';
  /** The Angel's security/alert work: verification, remediation, holds. */
  role: string;
  canBeAssigned: boolean;
}

export const ANGEL_REGISTRY: AngelEntry[] = [
  {
    id: 'angel-michael',
    name: 'MICHAEL',
    approval: 'APPROVED',
    source: 'KJV',
    role: 'Alert verification — checks the evidence on DETECTED alerts and carries them toward CONFIRMED.',
    canBeAssigned: true,
  },
  {
    id: 'angel-gabriel',
    name: 'GABRIEL',
    approval: 'APPROVED',
    source: 'KJV',
    role: 'Remediation — carries the fix work on ACTIVE alerts through MITIGATING toward RESOLVED.',
    canBeAssigned: true,
  },
  {
    id: 'angel-raphael',
    name: 'RAPHAEL',
    approval: 'APPROVED',
    source: 'Apocrypha',
    role: 'Holds — places and watches holds on alerts that must not move while evidence is gathered.',
    canBeAssigned: true,
  },
  {
    id: 'angel-uriel',
    name: 'URIEL',
    approval: 'APPROVED',
    source: 'Apocrypha',
    role: 'Post-incident review — reviews RESOLVED alerts into POST_INCIDENT_REVIEW and records what was learned.',
    canBeAssigned: true,
  },
  {
    id: 'angel-raguel',
    name: 'RAGUEL',
    approval: 'UNVERIFIED',
    source: 'UNVERIFIED',
    role: 'NOT ACTIVATED — requires verification before any security/alert work.',
    canBeAssigned: false,
  },
  {
    id: 'angel-sariel',
    name: 'SARIEL',
    approval: 'UNVERIFIED',
    source: 'UNVERIFIED',
    role: 'NOT ACTIVATED — requires verification before any security/alert work.',
    canBeAssigned: false,
  },
  {
    id: 'angel-remiel',
    name: 'REMIEL',
    approval: 'UNVERIFIED',
    source: 'UNVERIFIED',
    role: 'NOT ACTIVATED — requires verification before any security/alert work.',
    canBeAssigned: false,
  },
];

export const APPROVED_ANGEL_IDS: string[] = ANGEL_REGISTRY.filter((a) => a.approval === 'APPROVED').map(
  (a) => a.id,
);

export const UNVERIFIED_ANGEL_IDS: string[] = ANGEL_REGISTRY.filter((a) => a.approval === 'UNVERIFIED').map(
  (a) => a.id,
);

export function getAngel(id: string): AngelEntry | null {
  return ANGEL_REGISTRY.find((a) => a.id === id) ?? null;
}

/** True only for the four approved Angels. RAGUEL, SARIEL and
 *  REMIEL always return false — they cannot be assigned work. */
export function isApprovedAngel(id: string): boolean {
  const angel = getAngel(id);
  return angel !== null && angel.approval === 'APPROVED' && angel.canBeAssigned;
}

/** Minimal alert shape the registry needs to derive live status:
 *  id, state, and which Angel (if any) holds it. The caller
 *  passes the AngelSecurity store's alerts; this module never
 *  reads the store itself. */
export interface AngelAlertLike {
  id: string;
  state: string;
  assignedAngelId: string | null;
}

/** Alert states that count as open work for the holding Angel. */
export const OPEN_ALERT_STATES: string[] = ['DETECTED', 'VERIFYING', 'CONFIRMED', 'ACTIVE', 'MITIGATING'];

export function isOpenAlertWork(state: string): boolean {
  return OPEN_ALERT_STATES.includes(state);
}

export interface AngelStatusView {
  id: string;
  name: string;
  approval: AngelApproval;
  source: AngelEntry['source'];
  role: string;
  canBeAssigned: boolean;
  status: AngelLiveStatus;
  openAlertIds: string[];
  openAlertCount: number;
  totalAssignedAlertIds: string[];
}

/** Derive one Angel's honest live status from the alerts that
 *  name it. UNVERIFIED Angels always read NOT ACTIVATED. An
 *  approved Angel reads ACTIVE only while it holds open alert
 *  work, STANDBY otherwise — never claimed working on nothing. */
export function angelStatusFor(angel: AngelEntry, alerts: AngelAlertLike[]): AngelStatusView {
  const assigned = alerts.filter((a) => a.assignedAngelId === angel.id);
  const open = assigned.filter((a) => isOpenAlertWork(a.state));
  const status: AngelLiveStatus =
    angel.approval !== 'APPROVED'
      ? 'NOT ACTIVATED'
      : open.length > 0
        ? 'ACTIVE'
        : 'STANDBY';
  return {
    id: angel.id,
    name: angel.name,
    approval: angel.approval,
    source: angel.source,
    role: angel.role,
    canBeAssigned: angel.canBeAssigned,
    status,
    openAlertIds: open.map((a) => a.id),
    openAlertCount: open.length,
    totalAssignedAlertIds: assigned.map((a) => a.id),
  };
}

/** Counts + per-Angel states for the whole registry, derived
 *  from the alerts passed in. */
export function angelStatus(alerts: AngelAlertLike[]): {
  active: number;
  standby: number;
  notActivated: number;
  angels: AngelStatusView[];
} {
  const angels = ANGEL_REGISTRY.map((a) => angelStatusFor(a, alerts));
  return {
    active: angels.filter((a) => a.status === 'ACTIVE').length,
    standby: angels.filter((a) => a.status === 'STANDBY').length,
    notActivated: angels.filter((a) => a.status === 'NOT ACTIVATED').length,
    angels,
  };
}
