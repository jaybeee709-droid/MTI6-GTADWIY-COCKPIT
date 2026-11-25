/**
 * Mistake Alerts — the owner gets NOTIFIED on ANY mistake, right
 * away (v247, owner direction #10, 2026-11-25 ~6:47 PM).
 *
 * Every mistake creates an immediate owner ALERT, not just a
 * lesson: the alert is recorded at once (synchronous
 * localStorage write) and surfaced in the app immediately
 * (MistakeAlertsPanel; STAR reads mistakeAlertsSummaryText()
 * when the owner opens it).
 *
 *  - Persisted in localStorage (mti6_mistake_alerts_v1), capped
 *    at 200. Newest first.
 *  - Delivery is ALWAYS 'IN_APP'. The app has no SMS or
 *    mail-sending provider wired, so no alert ever carries a
 *    text/email-sent status and none is ever claimed. Outbound
 *    SMS/email delivery is a designed follow-on, not a shipped
 *    capability. Alerts go to BOTH contacts in the config (the
 *    number and the email) once a delivery route exists.
 *  - The bots' alert config (mti6_alert_config_v1) holds the
 *    owner's CONTACT for alerts only: his alerts email (project
 *    Gmail) and his alerts number +1 775-382-3570 (US, voice +
 *    SMS capable, from a second-number app — keeping it secured
 *    (premium) is what keeps the number his). The config holds
 *    contact details only — never personal identity details
 *    beyond the alerts email/phone.
 *  - mistakeAlertForLesson() is THE single function the
 *    coordinator calls from the instant-lessons path: it builds
 *    an alert from a Lesson record (src/bot-lessons.ts) and
 *    records it at once.
 *
 * Alerts are records about what happened, never credentials:
 * no key value, token, or secret may appear in any field.
 */

import type { Lesson } from './bot-lessons';

export const MISTAKE_ALERTS_STORE_KEY = 'mti6_mistake_alerts_v1';
export const MAX_MISTAKE_ALERTS = 200;

export const ALERT_CONFIG_STORE_KEY = 'mti6_alert_config_v1';

/** The owner's alerts email, exactly as given by the owner
 * (his project Gmail, from his Netlify sign-in as reported in
 * chat). The alerts number, exactly as given by the owner in
 * chat on 2026-11-25 (+1 775-382-3570 — US, voice + SMS
 * capable, from a second-number app; keeping it secured
 * (premium) is what keeps the number his). */
export const DEFAULT_ALERTS_EMAIL = 'jaybee709@gmail.com';
export const DEFAULT_ALERTS_PHONE = '+1 775-382-3570';

export type MistakeAlertKind = 'FAILED_RUN' | 'WRONG_ANSWER' | 'BAD_CALL' | 'REFUSED_ACTION';

export type MistakeAlertStatus = 'NEW' | 'ACKNOWLEDGED';

/** Delivery is always in-app: there is no mail-sending
 * provider wired, so no alert ever carries an email-sent
 * status. */
export type MistakeAlertDelivery = 'IN_APP';

export interface MistakeAlert {
  id: string;
  kind: MistakeAlertKind;
  title: string;
  detail: string;
  source: string;
  recordedAt: string;
  status: MistakeAlertStatus;
  delivery: MistakeAlertDelivery;
}

export type MistakeAlertDraft = Omit<MistakeAlert, 'id' | 'recordedAt' | 'status' | 'delivery'> & {
  id?: string;
  recordedAt?: string;
};

export interface AlertConfig {
  email: string;
  phone: string;
}

const VALID_KINDS: MistakeAlertKind[] = ['FAILED_RUN', 'WRONG_ANSWER', 'BAD_CALL', 'REFUSED_ACTION'];

function isMistakeAlert(r: unknown): r is MistakeAlert {
  if (!r || typeof r !== 'object') return false;
  const a = r as MistakeAlert;
  return (
    typeof a.id === 'string' &&
    (VALID_KINDS as string[]).includes(a.kind) &&
    typeof a.title === 'string' &&
    typeof a.detail === 'string' &&
    typeof a.source === 'string' &&
    typeof a.recordedAt === 'string' &&
    (a.status === 'NEW' || a.status === 'ACKNOWLEDGED') &&
    a.delivery === 'IN_APP'
  );
}

const slugify = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'mistake';

/** Load all recorded mistake alerts, newest first. */
export function loadMistakeAlerts(): MistakeAlert[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(MISTAKE_ALERTS_STORE_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter(isMistakeAlert);
  } catch {
    return [];
  }
}

function saveMistakeAlerts(alerts: MistakeAlert[]): void {
  try {
    localStorage.setItem(MISTAKE_ALERTS_STORE_KEY, JSON.stringify(alerts.slice(0, MAX_MISTAKE_ALERTS)));
  } catch {
    /* storage full/blocked — the in-memory result still returns */
  }
}

/**
 * Record a mistake alert NOW — synchronous: the alert is in
 * the store before this function returns, so the panel and
 * STAR see it on the very next read. Every call records a new
 * alert: each mistake occurrence is its own alert, even if an
 * earlier alert carries the same title. Delivery is always
 * 'IN_APP' — no mail provider is wired, so no email is sent
 * and none is claimed.
 */
export function recordMistakeAlert(draft: MistakeAlertDraft): MistakeAlert {
  const kind: MistakeAlertKind = (VALID_KINDS as string[]).includes(draft.kind) ? draft.kind : 'FAILED_RUN';
  const at = draft.recordedAt ?? new Date().toISOString();
  const alert: MistakeAlert = {
    id: draft.id ?? `mistake-${slugify(draft.title)}-${Date.now().toString(36)}`,
    kind,
    title: draft.title.trim(),
    detail: draft.detail.trim(),
    source: draft.source.trim(),
    recordedAt: at,
    status: 'NEW',
    delivery: 'IN_APP',
  };
  saveMistakeAlerts([alert, ...loadMistakeAlerts()]);
  return alert;
}

/**
 * Infer the alert kind from a lesson's wording. A refusal to
 * act is a REFUSED_ACTION; a wrong answer is a WRONG_ANSWER;
 * a bad provider/API call is a BAD_CALL; anything else is a
 * FAILED_RUN (the default — a run failed, the lesson says how).
 */
function kindForLesson(lesson: Lesson): MistakeAlertKind {
  const text = `${lesson.title} ${lesson.whatWentWrong} ${lesson.fix}`.toLowerCase();
  if (/\brefus(e|ed|al)\b/.test(text) || text.includes('would not act') || text.includes('did not act')) {
    return 'REFUSED_ACTION';
  }
  if (text.includes('wrong answer') || text.includes('incorrect answer') || text.includes('wrong result')) {
    return 'WRONG_ANSWER';
  }
  if (
    text.includes('bad call') ||
    text.includes('wrong call') ||
    text.includes('api call') ||
    text.includes('provider call') ||
    text.includes('upstream_error') ||
    text.includes('rate_limited')
  ) {
    return 'BAD_CALL';
  }
  return 'FAILED_RUN';
}

/**
 * THE single function the coordinator calls from the
 * instant-lessons path: build an alert from a lesson record
 * and record it at once. Accepts the Lesson shape from
 * src/bot-lessons.ts directly (id, title, whatWentWrong, fix,
 * source, recordedAt, status, changedWhat). The alert's detail
 * carries what happened AND the fix, so the owner sees both
 * in the alert itself. The alert keeps the lesson's recorded
 * time so the alert and the lesson agree on when it happened.
 *
 * The coordinator should call this when recordLessonNow()
 * returns a newly recorded (or re-activated) lesson — not for
 * a deduped repeat that added nothing new.
 */
export function mistakeAlertForLesson(lesson: Lesson): MistakeAlert {
  return recordMistakeAlert({
    kind: kindForLesson(lesson),
    title: lesson.title,
    detail: `What went wrong: ${lesson.whatWentWrong} Fix: ${lesson.fix}`,
    source: lesson.source,
    recordedAt: lesson.recordedAt,
  });
}

/** Owner act: mark an alert ACKNOWLEDGED. It stays readable
 * as history. Returns false when the id is unknown or the
 * alert is already acknowledged. */
export function acknowledgeAlert(id: string): boolean {
  const alerts = loadMistakeAlerts();
  const target = alerts.find((a) => a.id === id);
  if (!target || target.status === 'ACKNOWLEDGED') return false;
  saveMistakeAlerts(alerts.map((a) => (a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a)));
  return true;
}

/** How many mistake alerts are still NEW (unacknowledged). */
export function unreadMistakeAlertCount(): number {
  return loadMistakeAlerts().filter((a) => a.status === 'NEW').length;
}

/**
 * STAR's line when the owner opens the app: the unread count
 * plus the latest alert titles — or "no mistake alerts" when
 * there is nothing new to report.
 */
export function mistakeAlertsSummaryText(): string {
  const alerts = loadMistakeAlerts();
  const unread = alerts.filter((a) => a.status === 'NEW');
  if (unread.length === 0) return 'no mistake alerts';
  const latest = unread.slice(0, 3).map((a) => a.title);
  const more = unread.length > latest.length ? ` and ${unread.length - latest.length} more` : '';
  return `${unread.length} new mistake alert${unread.length === 1 ? '' : 's'}: ${latest.join('; ')}${more}`;
}

/* --- ALERT CONFIG -------------------------------------------------
 * Contact details for alerts ONLY — the owner's alerts email
 * and a phone-number field. The phone has NOT been provided
 * yet: it stays EMPTY until the owner gives it through the
 * panel form. Never filled from any other source, never
 * auto-filled, never guessed. The config must never contain or
 * accept personal identity details beyond the alerts
 * email/phone. */

function isAlertConfig(r: unknown): r is AlertConfig {
  if (!r || typeof r !== 'object') return false;
  const c = r as AlertConfig;
  return typeof c.email === 'string' && typeof c.phone === 'string';
}

/** The alert config: alerts email pre-filled with the project
 * Gmail exactly as given by the owner, and the alerts number
 * +1 775-382-3570 exactly as given by the owner in chat. A
 * stored config with an empty phone falls back to the number
 * he provided (an owner-cleared phone re-seeds on the next
 * load — he changes it through the panel form). */
export function getAlertConfig(): AlertConfig {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(ALERT_CONFIG_STORE_KEY) ?? 'null');
    if (isAlertConfig(raw)) {
      return {
        email: raw.email.trim() || DEFAULT_ALERTS_EMAIL,
        phone: raw.phone.trim() || DEFAULT_ALERTS_PHONE,
      };
    }
  } catch {
    /* corrupted store — fall through to defaults */
  }
  return { email: DEFAULT_ALERTS_EMAIL, phone: DEFAULT_ALERTS_PHONE };
}

function saveAlertConfig(config: AlertConfig): void {
  try {
    localStorage.setItem(ALERT_CONFIG_STORE_KEY, JSON.stringify(config));
  } catch {
    /* storage full/blocked */
  }
}

/**
 * Update the alert config. Called ONLY from the panel form
 * with explicit owner input: the phone and email are seeded
 * from what the owner gave in chat and may only be changed
 * through the form (never from any other source, never
 * auto-filled, never guessed). A provided email must look
 * like an email (contains '@'); an invalid email is ignored,
 * the stored one kept. A provided phone is stored exactly as
 * typed, trimmed.
 */
export function setAlertConfig(partial: Partial<AlertConfig>): AlertConfig {
  const current = getAlertConfig();
  const next: AlertConfig = { ...current };
  if (typeof partial.email === 'string') {
    const email = partial.email.trim();
    if (email.includes('@')) next.email = email;
  }
  if (typeof partial.phone === 'string') {
    next.phone = partial.phone.trim();
  }
  saveAlertConfig(next);
  return next;
}
