/**
 * Angel Security — the React surface of the canonical alert store
 * in js/angel-security.js: the SAME localStorage key
 * (mti6_angel_security_v1) and store shape
 * ({angels, alerts, remediations, holds} — the other collections
 * are preserved untouched), the SAME lifecycle allowlist:
 *
 *   DETECTED → VERIFYING → CONFIRMED → ACTIVE → MITIGATING →
 *   RESOLVED → POST_INCIDENT_REVIEW (VERIFYING → DETECTED is the
 *   only backward step: "needs more evidence", never a dismissal —
 *   there is no dismissed state).
 *
 * Owner intake mirrors the canonical createAlert contract: domain
 * + title + description + affectedSystem + source + detectedAt are
 * all required provenance; a new alert ALWAYS starts at DETECTED;
 * severity is one of INFORMATIONAL / CAUTION / HIGH / CRITICAL /
 * UNKNOWN. Transitions record {from, to, at, by, note} history with
 * the owner as the recorded actor.
 *
 * Truth boundary: there are NO detectors behind this surface. An
 * alert exists only because the owner recorded it. Nothing here
 * scans, monitors, or claims a live security feed.
 */

import { getAngel, isApprovedAngel } from './angel-registry';

export const ANGEL_STORE_KEY = 'mti6_angel_security_v1';
const MAX_ALERTS = 100;

export const SECURITY_DOMAINS = [
  { id: 'CYBER_IDENTITY', label: 'Cyber Identity' },
  { id: 'BLOCKCHAIN_CONTRACT', label: 'Blockchain Contract' },
  { id: 'FINANCIAL_WALLET', label: 'Financial Wallet' },
  { id: 'SYSTEM_PROVIDER_INFRASTRUCTURE', label: 'System & Provider Infrastructure' },
] as const;

export const ALERT_SEVERITIES = ['INFORMATIONAL', 'CAUTION', 'HIGH', 'CRITICAL', 'UNKNOWN'] as const;

export const ALERT_STATES = [
  'DETECTED',
  'VERIFYING',
  'CONFIRMED',
  'ACTIVE',
  'MITIGATING',
  'RESOLVED',
  'POST_INCIDENT_REVIEW',
] as const;
export type AlertState = (typeof ALERT_STATES)[number];

export const ALERT_TRANSITIONS: Record<AlertState, AlertState[]> = {
  DETECTED: ['VERIFYING'],
  VERIFYING: ['CONFIRMED', 'DETECTED'],
  CONFIRMED: ['ACTIVE'],
  ACTIVE: ['MITIGATING'],
  MITIGATING: ['RESOLVED'],
  RESOLVED: ['POST_INCIDENT_REVIEW'],
  POST_INCIDENT_REVIEW: [],
};

export interface AlertHistoryEntry {
  from: string | null;
  to: string;
  at: string;
  by: string;
  note: string;
}

export interface SecurityAlert {
  id: string;
  domain: string;
  title: string;
  description: string;
  severity: string;
  state: AlertState;
  detectedAt: string;
  source: string;
  evidence: unknown[];
  history: AlertHistoryEntry[];
  relatedAssets: string[];
  relatedNetworks: string[];
  assignedAngelId: string | null;
  assignedWorkerId: string | null;
  alertClass: string | null;
  affectedSystem: string;
  area: unknown;
  lastUpdated: string;
  mitigation: unknown;
  resolution: unknown;
  starNotification: unknown;
  flowTrail: unknown[];
  createdAt: string;
  updatedAt: string;
}

interface AngelStore {
  angels: unknown[];
  alerts: SecurityAlert[];
  remediations: unknown[];
  holds: unknown[];
}

function emptyStore(): AngelStore {
  return { angels: [], alerts: [], remediations: [], holds: [] };
}

export function loadAngelStore(): AngelStore {
  try {
    const raw = localStorage.getItem(ANGEL_STORE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyStore();
    return {
      angels: Array.isArray(parsed.angels) ? parsed.angels : [],
      alerts: (Array.isArray(parsed.alerts) ? parsed.alerts : []).filter(
        (a: unknown): a is SecurityAlert =>
          !!a &&
          typeof a === 'object' &&
          typeof (a as SecurityAlert).id === 'string' &&
          (ALERT_STATES as readonly string[]).includes((a as SecurityAlert).state),
      ),
      remediations: Array.isArray(parsed.remediations) ? parsed.remediations : [],
      holds: Array.isArray(parsed.holds) ? parsed.holds : [],
    };
  } catch {
    return emptyStore();
  }
}

function saveAngelStore(store: AngelStore): AngelStore {
  const bounded: AngelStore = { ...store, alerts: store.alerts.slice(0, MAX_ALERTS) };
  try {
    localStorage.setItem(ANGEL_STORE_KEY, JSON.stringify(bounded));
  } catch {
    /* storage unavailable — records stay in memory for this session */
  }
  return bounded;
}

export interface NewAlertInput {
  domain: string;
  title: string;
  description: string;
  affectedSystem: string;
  severity: string;
}

/** Canonical createAlert contract: all provenance fields required,
 *  the alert starts at DETECTED, the owner is the recorded source. */
export function createAlert(
  store: AngelStore,
  input: NewAlertInput,
): { store: AngelStore; error: string | null } {
  const domainOk = SECURITY_DOMAINS.some((d) => d.id === input.domain);
  if (!domainOk) return { store, error: 'Domain must be one of the four recorded security domains.' };
  if (!input.title.trim()) return { store, error: 'Title is required.' };
  if (!input.description.trim()) return { store, error: 'Description is required.' };
  if (!input.affectedSystem.trim()) return { store, error: 'Affected system is required (provenance).' };
  if (!(ALERT_SEVERITIES as readonly string[]).includes(input.severity))
    return { store, error: 'Severity must be one of the recorded severities.' };
  const stamp = new Date().toISOString();
  const base = `alert-${stamp.replace(/[^0-9]/g, '').slice(0, 14)}`;
  let id = base;
  let n = 2;
  while (store.alerts.some((a) => a.id === id)) id = `${base}-${n++}`;
  const alert: SecurityAlert = {
    id,
    domain: input.domain,
    title: input.title.trim(),
    description: input.description.trim(),
    severity: input.severity,
    state: 'DETECTED',
    detectedAt: stamp,
    source: 'owner',
    evidence: [],
    history: [
      {
        from: null,
        to: 'DETECTED',
        at: stamp,
        by: 'owner',
        note: 'Alert created at DETECTED with provenance (source + detectedAt + evidence).',
      },
    ],
    relatedAssets: [],
    relatedNetworks: [],
    assignedAngelId: null,
    assignedWorkerId: null,
    alertClass: null,
    affectedSystem: input.affectedSystem.trim(),
    area: null,
    lastUpdated: stamp,
    mitigation: null,
    resolution: null,
    starNotification: null,
    flowTrail: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
  return { store: saveAngelStore({ ...store, alerts: [alert, ...store.alerts] }), error: null };
}

/** Canonical transitionAlert: allowlist only, owner as actor. */
export function transitionAlert(
  store: AngelStore,
  id: string,
  to: AlertState,
  note = '',
): { store: AngelStore; error: string | null } {
  const alert = store.alerts.find((a) => a.id === id);
  if (!alert) return { store, error: 'Alert not found.' };
  if (!ALERT_TRANSITIONS[alert.state].includes(to))
    return { store, error: `${alert.state} → ${to} is not an allowed transition.` };
  const stamp = new Date().toISOString();
  const updated: SecurityAlert = {
    ...alert,
    state: to,
    updatedAt: stamp,
    lastUpdated: stamp,
    history: [...alert.history, { from: alert.state, to, at: stamp, by: 'owner', note: note.trim() }],
  };
  return {
    store: saveAngelStore({ ...store, alerts: store.alerts.map((a) => (a.id === id ? updated : a)) }),
    error: null,
  };
}

/** Counts by state — the single derivation for this surface. An
 *  alert counts toward the map's red state only when CONFIRMED
 *  and ACTIVE-or-beyond per the owner's globe rule; this surface
 *  reports counts, it never inflates them. */
export function alertCounts(alerts: SecurityAlert[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of alerts) counts[a.state] = (counts[a.state] ?? 0) + 1;
  return counts;
}

/* Angel assignment (v247, owner direction #7, 2026-11-25) —
 * the four approved Angels (MICHAEL, GABRIEL, RAPHAEL, URIEL)
 * take security/alert work alongside the Tribe: alert
 * verification, remediation, and holds. Assignment is recorded
 * on the alert's assignedAngelId and in its history — it is
 * NOT a lifecycle transition, it changes NO state, and it never
 * auto-verifies anything: the Angel acts only through the
 * existing allowed transitions (transitionAlert), and the owner
 * remains the recorded actor for owner actions. The lifecycle
 * needed no change to support this: assignedAngelId already
 * exists on the alert record. RAGUEL, SARIEL and REMIEL are
 * refused here — isApprovedAngel() is false for them. */

/** Assign an approved Angel to an alert. The assignment is an
 *  owner action (by: 'owner' in history); the alert's state
 *  does not move. */
export function assignAngelToAlert(
  store: AngelStore,
  id: string,
  angelId: string,
  note = '',
): { store: AngelStore; error: string | null } {
  const angel = getAngel(angelId);
  if (!angel || !isApprovedAngel(angelId)) {
    return {
      store,
      error: `${angel ? angel.name : angelId} is not an approved Angel and cannot be assigned alert work (RAGUEL, SARIEL and REMIEL are UNVERIFIED / NOT ACTIVATED).`,
    };
  }
  const alert = store.alerts.find((a) => a.id === id);
  if (!alert) return { store, error: 'Alert not found.' };
  const stamp = new Date().toISOString();
  const updated: SecurityAlert = {
    ...alert,
    assignedAngelId: angelId,
    updatedAt: stamp,
    lastUpdated: stamp,
    history: [
      ...alert.history,
      {
        from: alert.state,
        to: alert.state,
        at: stamp,
        by: 'owner',
        note: `Angel ${angel.name} assigned to this alert (${angel.role})${note.trim() ? ` — ${note.trim()}` : ''}. Assignment only; the alert state did not move.`,
      },
    ],
  };
  return {
    store: saveAngelStore({ ...store, alerts: store.alerts.map((a) => (a.id === id ? updated : a)) }),
    error: null,
  };
}

/** Remove whichever Angel holds an alert. State does not move. */
export function unassignAngelFromAlert(
  store: AngelStore,
  id: string,
  note = '',
): { store: AngelStore; error: string | null } {
  const alert = store.alerts.find((a) => a.id === id);
  if (!alert) return { store, error: 'Alert not found.' };
  if (!alert.assignedAngelId) return { store, error: 'No Angel is assigned to this alert.' };
  const stamp = new Date().toISOString();
  const updated: SecurityAlert = {
    ...alert,
    assignedAngelId: null,
    updatedAt: stamp,
    lastUpdated: stamp,
    history: [
      ...alert.history,
      {
        from: alert.state,
        to: alert.state,
        at: stamp,
        by: 'owner',
        note: `Angel assignment removed${note.trim() ? ` — ${note.trim()}` : ''}. The alert state did not move.`,
      },
    ],
  };
  return {
    store: saveAngelStore({ ...store, alerts: store.alerts.map((a) => (a.id === id ? updated : a)) }),
    error: null,
  };
}

/** Every alert an Angel holds (any state). */
export function alertsForAngel(store: AngelStore, angelId: string): SecurityAlert[] {
  return store.alerts.filter((a) => a.assignedAngelId === angelId);
}

/** The open alert work an Angel holds — assigned and not yet
 *  RESOLVED / POST_INCIDENT_REVIEW. This is what makes an
 *  Angel ACTIVE; an Angel holding nothing here is STANDBY. */
export function openAlertsForAngel(store: AngelStore, angelId: string): SecurityAlert[] {
  return alertsForAngel(store, angelId).filter(
    (a) => a.state !== 'RESOLVED' && a.state !== 'POST_INCIDENT_REVIEW',
  );
}

/** Per-Angel work counts for the panel: open vs total assigned. */
export function angelWorkSummary(store: AngelStore): Record<string, { open: number; total: number }> {
  const summary: Record<string, { open: number; total: number }> = {};
  for (const alert of store.alerts) {
    if (!alert.assignedAngelId) continue;
    const entry = summary[alert.assignedAngelId] ?? { open: 0, total: 0 };
    entry.total += 1;
    if (alert.state !== 'RESOLVED' && alert.state !== 'POST_INCIDENT_REVIEW') entry.open += 1;
    summary[alert.assignedAngelId] = entry;
  }
  return summary;
}
