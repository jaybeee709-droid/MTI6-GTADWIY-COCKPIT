/**
 * Project Knowledge — the DISTILLED Gmail / Drive feed for Bot
 * Memory and STAR (v247, owner direction 2026-11-25 ~6:32 PM EST).
 *
 * The owner directed that the bots get ALL the project
 * information, including what lives in his Gmail and Google
 * Drive, so they can see more there. This module is the honest
 * form of that direction:
 *
 *  - The app has NO Gmail/Drive API access and NO Google OAuth.
 *    There is NO live inbox or Drive connection here, and this
 *    module builds none and claims none.
 *  - The feed is a DISTILLED store: curated project-knowledge
 *    records (backup handoffs and manifests, provider/key
 *    notices, deploy notifications, project papers and
 *    directives), added by the owner — or by Muse during builds
 *    — through a governed form. STAR and Bot Memory read the
 *    distilled records, never a raw inbox or drive.
 *
 *  - Persisted in localStorage (mti6_project_knowledge_v1),
 *    capped at 200 records. Seeded with REAL distilled project
 *    knowledge from the project's own records only
 *    (seedProjectKnowledge is idempotent — it seeds only when
 *    the store is empty). Every seed cites its real sourceRef
 *    (a daily-log date or a paper filename). Nothing is invented.
 *  - addProjectKnowledge() duplicate-guards by normalized title.
 *  - A record's summary is distilled text, max 500 chars, and
 *    its sourceRef is a REFERENCE only (a message subject, a
 *    file name, a commit) — never raw content, never a key value.
 *
 * HARD EXCLUSIONS — enforced in code at the write path, not just
 * in comments. addProjectKnowledge() REFUSES (returns
 * {ok:false, reason}) and records a skipped-source entry for:
 *   (a) the personal-details archive — matched by the filename
 *       `personal-details-archive` and its Drive file id. That
 *       file and any personal identity/contact details were
 *       deleted from Muse's memory at the owner's request on
 *       Nov 25, 2026 and must NEVER be re-ingested into bot
 *       memory;
 *   (b) personal mail unrelated to the project;
 *   (c) anything from phone messages / SMS / text threads.
 * The guard matches on the archive filename/id and on those
 * source categories ONLY. It never contains, matches on, or logs
 * any personal identity/contact detail (no name, date of birth,
 * address, or email address). If a source is ambiguous, it is
 * left OUT and recorded as skipped.
 *
 * No key value, token, or secret may appear in any field: key
 * NAMES only, never values.
 */

export const PROJECT_KNOWLEDGE_STORE_KEY = 'mti6_project_knowledge_v1';
export const PROJECT_KNOWLEDGE_SKIPPED_KEY = 'mti6_project_knowledge_skipped_v1';
export const MAX_PROJECT_KNOWLEDGE = 200;
export const MAX_SKIPPED_SOURCES = 200;
export const MAX_SUMMARY_CHARS = 500;

export const PROJECT_KNOWLEDGE_KINDS = [
  'HANDOFF',
  'MANIFEST',
  'KEY_NOTICE',
  'DEPLOY_NOTICE',
  'PAPER',
  'DIRECTIVE',
] as const;
export type ProjectKnowledgeKind = (typeof PROJECT_KNOWLEDGE_KINDS)[number];

export const PROJECT_KNOWLEDGE_SOURCES = ['gmail', 'drive', 'repo', 'build'] as const;
export type ProjectKnowledgeSource = (typeof PROJECT_KNOWLEDGE_SOURCES)[number];

export type ProjectKnowledgeStatus = 'ACTIVE' | 'SUPERSEDED';

export interface ProjectKnowledgeRecord {
  id: string;
  kind: ProjectKnowledgeKind;
  title: string;
  /** Distilled summary, max 500 chars. Never raw content, never a key value. */
  summary: string;
  source: ProjectKnowledgeSource;
  /** A REFERENCE only — message subject / file name / commit. Never raw content. */
  sourceRef: string;
  recordedAt: string;
  status: ProjectKnowledgeStatus;
}

export type ProjectKnowledgeDraft = Omit<ProjectKnowledgeRecord, 'id' | 'recordedAt' | 'status'> & {
  recordedAt?: string;
};

export interface SkippedSource {
  id: string;
  /** The reference that was left out (sourceRef or title). Never a personal detail. */
  ref: string;
  reason: string;
  recordedAt: string;
}

/* --- Exclusion guard -------------------------------------------------- */

/** The personal-details archive, matched by filename and Drive file
 * id ONLY. No personal identity/contact detail appears here. */
const ARCHIVE_FILENAME = 'personal-details-archive';
const ARCHIVE_DRIVE_FILE_ID = '1-CJpQfkTI5ayQByfJBaALtw-U-78lLkc';

/** Personal mail with no project link, by category wording only. */
const PERSONAL_MAIL_RE =
  /\bpersonal (mail|email|message|inbox)\b|\bnot project[- ]related\b|\bunrelated to (the )?project\b/i;

/** Phone / SMS / text-thread sources, by category wording only.
 * "text" alone is NOT matched — it would catch ordinary words
 * like "the text of the paper". Only phone-message categories. */
const PHONE_MESSAGE_RE =
  /\bphone\b|\bsms\b|\btext messages?\b|\btext threads?\b|\bmessage threads?\b|\btexting\b/i;

function combinedText(draft: { title: string; summary: string; sourceRef: string }): string {
  return `${draft.title}\n${draft.summary}\n${draft.sourceRef}`;
}

/**
 * Returns the refusal reason when a record must NOT enter bot
 * memory, or null when it passes the guard. Matches on the
 * archive filename/id and on the excluded source categories only.
 */
export function checkProjectKnowledgeExclusion(draft: {
  title: string;
  summary: string;
  sourceRef: string;
}): string | null {
  const text = combinedText(draft);
  const lower = text.toLowerCase();
  if (
    lower.includes(ARCHIVE_FILENAME) ||
    text.includes(ARCHIVE_DRIVE_FILE_ID)
  ) {
    return (
      'Refused: the personal-details archive must never be re-ingested into bot memory. ' +
      'It was deleted from Muse memory at the owner\u2019s request on Nov 25, 2026.'
    );
  }
  if (PERSONAL_MAIL_RE.test(text)) {
    return 'Refused: personal mail unrelated to the project is excluded from bot memory.';
  }
  if (PHONE_MESSAGE_RE.test(text)) {
    return 'Refused: phone messages / SMS / text threads are excluded from bot memory entirely.';
  }
  return null;
}

/* --- Store ------------------------------------------------------------ */

const normTitle = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');

const slugify = (s: string): string =>
  normTitle(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'knowledge';

function isProjectKnowledgeRecord(r: unknown): r is ProjectKnowledgeRecord {
  if (!r || typeof r !== 'object') return false;
  const rec = r as ProjectKnowledgeRecord;
  return (
    typeof rec.id === 'string' &&
    (PROJECT_KNOWLEDGE_KINDS as readonly string[]).includes(rec.kind) &&
    typeof rec.title === 'string' &&
    typeof rec.summary === 'string' &&
    (PROJECT_KNOWLEDGE_SOURCES as readonly string[]).includes(rec.source) &&
    typeof rec.sourceRef === 'string' &&
    typeof rec.recordedAt === 'string' &&
    (rec.status === 'ACTIVE' || rec.status === 'SUPERSEDED')
  );
}

export function loadProjectKnowledge(): ProjectKnowledgeRecord[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(PROJECT_KNOWLEDGE_STORE_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter(isProjectKnowledgeRecord);
  } catch {
    return [];
  }
}

function saveProjectKnowledge(records: ProjectKnowledgeRecord[]): void {
  try {
    localStorage.setItem(
      PROJECT_KNOWLEDGE_STORE_KEY,
      JSON.stringify(records.slice(0, MAX_PROJECT_KNOWLEDGE)),
    );
  } catch {
    /* storage full/blocked — the in-memory result still returns */
  }
}

export function getActiveProjectKnowledge(): ProjectKnowledgeRecord[] {
  return loadProjectKnowledge().filter((r) => r.status === 'ACTIVE');
}

/* --- Skip log --------------------------------------------------------- */

function isSkippedSource(r: unknown): r is SkippedSource {
  if (!r || typeof r !== 'object') return false;
  const s = r as SkippedSource;
  return (
    typeof s.id === 'string' &&
    typeof s.ref === 'string' &&
    typeof s.reason === 'string' &&
    typeof s.recordedAt === 'string'
  );
}

export function loadSkippedSources(): SkippedSource[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(PROJECT_KNOWLEDGE_SKIPPED_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter(isSkippedSource);
  } catch {
    return [];
  }
}

function saveSkippedSources(entries: SkippedSource[]): void {
  try {
    localStorage.setItem(
      PROJECT_KNOWLEDGE_SKIPPED_KEY,
      JSON.stringify(entries.slice(0, MAX_SKIPPED_SOURCES)),
    );
  } catch {
    /* storage full/blocked */
  }
}

/**
 * Records that a source was left OUT of bot memory, and why.
 * Ambiguous sources are left out this way rather than ingested.
 * The ref is a source reference only — never a personal detail.
 */
export function recordSkippedSource(reason: string, ref: string): SkippedSource {
  const entry: SkippedSource = {
    id: `skipped-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffff).toString(16)}`,
    ref: (ref || 'unknown source').trim().slice(0, 200),
    reason: (reason || 'Left out — ambiguous source.').trim().slice(0, 500),
    recordedAt: new Date().toISOString(),
  };
  saveSkippedSources([entry, ...loadSkippedSources()]);
  return entry;
}

/* --- Write path ------------------------------------------------------- */

export type AddProjectKnowledgeResult =
  | { ok: true; record: ProjectKnowledgeRecord; deduped?: boolean }
  | { ok: false; reason: string };

export function addProjectKnowledge(draft: ProjectKnowledgeDraft): AddProjectKnowledgeResult {
  const title = (draft.title ?? '').trim();
  const summary = (draft.summary ?? '').trim();
  const sourceRef = (draft.sourceRef ?? '').trim();

  if (!(PROJECT_KNOWLEDGE_KINDS as readonly string[]).includes(draft.kind)) {
    return { ok: false, reason: `Kind must be one of: ${PROJECT_KNOWLEDGE_KINDS.join(', ')}.` };
  }
  if (!(PROJECT_KNOWLEDGE_SOURCES as readonly string[]).includes(draft.source)) {
    return { ok: false, reason: `Source must be one of: ${PROJECT_KNOWLEDGE_SOURCES.join(', ')}.` };
  }
  if (!title) return { ok: false, reason: 'A title is required — what the record is about.' };
  if (!summary) return { ok: false, reason: 'A distilled summary is required — never raw content.' };
  if (summary.length > MAX_SUMMARY_CHARS) {
    return {
      ok: false,
      reason: `Summary is ${summary.length} chars — distilled summaries are capped at ${MAX_SUMMARY_CHARS} chars. Shorten it and try again.`,
    };
  }
  if (!sourceRef) {
    return { ok: false, reason: 'A source reference is required — message subject, file name, or commit.' };
  }

  // HARD EXCLUSIONS first: a refused record is recorded in the
  // skip log and never enters the store.
  const exclusion = checkProjectKnowledgeExclusion({ title, summary, sourceRef });
  if (exclusion) {
    recordSkippedSource(exclusion, sourceRef || title);
    return { ok: false, reason: exclusion };
  }

  const records = loadProjectKnowledge();
  const existing = records.find((r) => normTitle(r.title) === normTitle(title));
  if (existing) return { ok: true, record: existing, deduped: true };

  const at = draft.recordedAt ?? new Date().toISOString();
  const record: ProjectKnowledgeRecord = {
    id: `pk-${slugify(title)}-${Date.now().toString(36)}`,
    kind: draft.kind,
    title,
    summary,
    source: draft.source,
    sourceRef,
    recordedAt: at,
    status: 'ACTIVE',
  };
  saveProjectKnowledge([record, ...records]);
  return { ok: true, record };
}

/** Owner act: mark a record SUPERSEDED. It stays readable as history. */
export function supersedeProjectKnowledge(id: string): boolean {
  const records = loadProjectKnowledge();
  const target = records.find((r) => r.id === id);
  if (!target || target.status !== 'ACTIVE') return false;
  saveProjectKnowledge(
    records.map((r) => (r.id === id ? { ...r, status: 'SUPERSEDED' as const } : r)),
  );
  return true;
}

/* --- Summary (the read STAR and Bot Memory use) ----------------------- */

export interface ProjectKnowledgeSummary {
  total: number;
  active: number;
  supersededCount: number;
  byKind: Record<string, number>;
  bySource: Record<string, number>;
  skippedCount: number;
  recent: { id: string; kind: string; title: string; source: string; sourceRef: string }[];
}

export function projectKnowledgeSummary(): ProjectKnowledgeSummary {
  const list = loadProjectKnowledge();
  const byKind: Record<string, number> = {};
  PROJECT_KNOWLEDGE_KINDS.forEach((k) => {
    byKind[k] = 0;
  });
  const bySource: Record<string, number> = {};
  PROJECT_KNOWLEDGE_SOURCES.forEach((s) => {
    bySource[s] = 0;
  });
  let active = 0;
  let supersededCount = 0;
  for (const r of list) {
    if (r.status === 'SUPERSEDED') {
      supersededCount += 1;
      continue;
    }
    active += 1;
    if (byKind[r.kind] !== undefined) byKind[r.kind] += 1;
    if (bySource[r.source] !== undefined) bySource[r.source] += 1;
  }
  const recent = list
    .filter((r) => r.status === 'ACTIVE')
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))
    .slice(0, 5)
    .map((r) => ({ id: r.id, kind: r.kind, title: r.title, source: r.source, sourceRef: r.sourceRef }));
  return {
    total: list.length,
    active,
    supersededCount,
    byKind,
    bySource,
    skippedCount: loadSkippedSources().length,
    recent,
  };
}

/** Distilled text block for STAR / Bot Memory context. Active records only. */
export function projectKnowledgeText(): string {
  const active = getActiveProjectKnowledge();
  if (active.length === 0) {
    return 'Project knowledge: no distilled records yet. This is a curated store, not a live inbox or Drive connection.';
  }
  const lines = active.map(
    (r) => `- [${r.kind}] ${r.title}: ${r.summary} (source: ${r.source} — ${r.sourceRef})`,
  );
  return (
    'Distilled project knowledge (curated records, not a live inbox or Drive connection):\n' +
    lines.join('\n')
  );
}

/* --- Seed: REAL distilled project knowledge only ---------------------- */

type SeedDraft = ProjectKnowledgeDraft & { recordedAt: string };

const SEEDS: SeedDraft[] = [
  {
    kind: 'HANDOFF',
    title: 'v242 — Bot team loop',
    summary:
      'TEAM LOOP panel on Bot Operations: Radar finds candidates and dispatches Tribe work orders, tasks run with evidence recorded, the dry-run evaluates the strongest candidate on paper, STAR coordinates, and the Swap Desk still only prepares — every action still needs the owner\u2019s approval. STAR default model fixed to google/gemma-4-31b-it:free after the old Meta model vanished from OpenRouter.',
    source: 'build',
    sourceRef: 'memory/2026-11-25.md — v242, remote 0886d9df',
    recordedAt: '2026-11-25T22:14:00.000Z',
  },
  {
    kind: 'HANDOFF',
    title: 'v243 — Builder track / build queue',
    summary:
      'BUILD QUEUE panel on Bot Operations seeded with four prepared build items (F2 Desk radar strip, F3 dry-run rotation, F4 STAR task creation, F6 Windy + Twitch wiring), each with spec and evidence; STAR answers what is ready to build. In-app bots do NOT write code or run builds — their build-help leg is research, spec, checks, and verification recorded as evidence.',
    source: 'build',
    sourceRef: 'memory/2026-11-25.md — v243, remote 65a9ea8c',
    recordedAt: '2026-11-25T22:32:00.000Z',
  },
  {
    kind: 'HANDOFF',
    title: 'STAR live check 2026-11-25 17:27 EST — configured, rate-limited',
    summary:
      'One-off live check on Deploy Preview #1: gateway.status ok, star.configured true, model google/gemma-4-31b-it:free. One star.chat call plus one retry both returned RATE_LIMITED (upstream 429, no retry-after). STAR is configured but was not answering live yet — rate-limited at the provider, not a config or dead-model failure.',
    source: 'build',
    sourceRef: 'memory/2026-11-25.md — v242 STAR live verification, 17:29 EST',
    recordedAt: '2026-11-25T22:29:00.000Z',
  },
  {
    kind: 'HANDOFF',
    title: 'v244 — STAR model fallback',
    summary:
      'STAR_DEFAULT_MODEL switched to nvidia/nemotron-3.5-lightning:free after Gemma 4 31B rate-limited (429); the new model was verified live on OpenRouter\u2019s public models list the same day. MTI6_STAR_MODEL env override still wins; no key or env changes.',
    source: 'build',
    sourceRef: 'memory/2026-11-25.md — v244, remote 47a2ecac',
    recordedAt: '2026-11-25T22:38:00.000Z',
  },
  {
    kind: 'HANDOFF',
    title: 'v245 — Bot browser session',
    summary:
      'BOT BROWSER panel on Bot Operations: session state (NOT SIGNED IN / SIGNED IN — OWNER CONFIRMED), scope github.com + this repo + development branch only. The bot never acts inside GitHub — an approved in-scope page opens in a new tab FOR THE OWNER to perform and verify. Sign-in is the owner\u2019s step; the app never asks for or stores a password, token, or cookie.',
    source: 'build',
    sourceRef: 'memory/2026-11-25.md — v245, remote 7980468f',
    recordedAt: '2026-11-25T22:43:00.000Z',
  },
  {
    kind: 'HANDOFF',
    title: 'v246 — STAR fallback chain (Claude first, then Gemini)',
    summary:
      'STAR answers via OpenRouter first, then Claude (ANTHROPIC_API_KEY) as first fallback, then Gemini (GEMINI_API_KEY) as second fallback. star.chat replies carry a provider field (openrouter | anthropic | gemini); new star.providers diagnostic reports booleans only. All-fail returns honest UPSTREAM_ERROR and the client falls back to the local DEMO brain.',
    source: 'build',
    sourceRef: 'memory/2026-11-25.md — v246, remote 095edf1a',
    recordedAt: '2026-11-25T23:24:00.000Z',
  },
  {
    kind: 'KEY_NOTICE',
    title: 'Keys-needed inventory — Netlify dashboard check 2026-11-25 5:37 PM EST',
    summary:
      'Present in Netlify by NAME ONLY: MTI6_STAR_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, MTI6_WINDY_API_KEY, MTI6_TWITCH_CLIENT_ID/SECRET, OPENROUTER_API_KEY, ALCHEMY_API_KEY, ETHERSCAN_API_KEY, COINGECKO_API_KEY, TRANSITLAND_API_KEY. Absent: MTI6_COINGECKO_API_KEY, MTI6_GEOAPIFY_KEY, MTI6_LOCATIONIQ_KEY. Gateway reports coingecko false — the proxy expects MTI6_COINGECKO_API_KEY but Netlify holds COINGECKO_API_KEY (name mismatch).',
    source: 'drive',
    sourceRef: 'KEYS-NEEDED-2026-11-25.md (goal papers)',
    recordedAt: '2026-11-25T22:37:00.000Z',
  },
  {
    kind: 'DIRECTIVE',
    title: 'D1 — Execution enabled (YES)',
    summary:
      'Owner decision 2026-11-24: "Go. We want to start trading and swapping." D1\u2019s YES opens the execution track; it does not skip D2–D5 or any per-action approval.',
    source: 'drive',
    sourceRef: 'EXECUTION-DECISION-PAPER-2026-11-24.md (goal papers)',
    recordedAt: '2026-11-24T05:00:00.000Z',
  },
  {
    kind: 'DIRECTIVE',
    title: 'D2 FINAL — DEX only, no KYC, account-free',
    summary:
      'Owner re-decision 2026-11-24, superseding "do both": DEX only — the owner signs swaps in his own wallet, account-free, no exchange leg, no KYC. The exchange leg is closed unless the owner names it again. DEX activity is pseudonymous on a public ledger, not anonymous.',
    source: 'drive',
    sourceRef: 'EXECUTION-DECISION-PAPER-2026-11-24.md (goal papers)',
    recordedAt: '2026-11-24T06:00:00.000Z',
  },
  {
    kind: 'DIRECTIVE',
    title: 'D3 — Starting capital $50',
    summary:
      'Owner: "i got 50 to start with." Starting trading capital is $50, funded by the owner into his own wallet himself; any increase is a new owner statement. The Swap Desk enforces the $50 boundary — a stablecoin preparation over $50 is refused at the desk.',
    source: 'drive',
    sourceRef: 'EXECUTION-DECISION-PAPER-2026-11-24.md (goal papers)',
    recordedAt: '2026-11-24T06:00:00.000Z',
  },
  {
    kind: 'DIRECTIVE',
    title: 'D4 — Per-action owner approval for every swap',
    summary:
      'Every swap needs per-action owner approval plus the owner\u2019s own signature. Bots find, prepare, and queue; the owner approves and signs. "Start earning and reinvesting" is a prepared swap the owner signs, not an autonomous act — the platform holds no keys and nothing can sign for him.',
    source: 'drive',
    sourceRef: 'EXECUTION-DECISION-PAPER-2026-11-24.md (goal papers)',
    recordedAt: '2026-11-24T06:00:00.000Z',
  },
  {
    kind: 'DIRECTIVE',
    title: 'D5 — Gated execution build series (accepted)',
    summary:
      'Accepted as presented: wallet leg built as a gated series — (1) read-only watch + balances, (2) quote + preparation desk, (3) owner-sign handoff, (4) first live swap only as a specific per-action approval. Steps 1–2 shipped as the Swap Desk (v210); step 3 as the sign handoff (v211).',
    source: 'drive',
    sourceRef: 'EXECUTION-DECISION-PAPER-2026-11-24.md (goal papers)',
    recordedAt: '2026-11-24T06:00:00.000Z',
  },
  {
    kind: 'DIRECTIVE',
    title: 'D6 — Dry-run gate only (accepted with constraints)',
    summary:
      'Owner decision 2026-11-24 ~11:40 PM ("Build d6 now"): ACCEPTED WITH CONSTRAINTS — dry-run stage only. The executor decides and logs and signs nothing. Caps: $10/trade, $25/day, one open position, 20% loss stop, Base only, DEX only, catalogue only. Live pilot, wallet creation, key placement, and the scheduled function are NOT built and NOT authorized.',
    source: 'drive',
    sourceRef: 'D6-DECISION-2026-11-24.md (goal papers)',
    recordedAt: '2026-11-25T04:40:00.000Z',
  },
  {
    kind: 'DEPLOY_NOTICE',
    title: 'Netlify — one site, preview vs production',
    summary:
      'One site: mti6-gtadwiy-cockpit (project 9349ce19-1fb5-4f2e-a08e-cf9603b45727, team "Jay Beee\u2019s team", created Oct 19, 2026). Production is main @ f785c45 (Nov 3, 2026) — the initial PWA shell only, 0 functions. Development is live only as Deploy Preview #1 (PR #1), redeployed automatically on every push. The gateway proxy lives on the preview only; production calls 404.',
    source: 'repo',
    sourceRef: 'src/netlify-knowledge.ts (owner-verified Netlify facts, 2026-11-25)',
    recordedAt: '2026-11-25T22:00:00.000Z',
  },
  {
    kind: 'MANIFEST',
    title: 'Backup v230 set — Drive Current, email sent, no new bounce',
    summary:
      'Backup v230 set completed 2026-11-25 (covers v229 + v230): full-history bundle, source tarball, papers zip, START-HERE handoff, manifest. v230\u2019s 5 files uploaded into Drive Current; v228\u2019s 5 moved Current to Recovery Points. Backup email sent with only the two .md files attached, per the Gmail attachment rule; bounce check clean.',
    source: 'gmail',
    sourceRef: 'memory/2026-11-25.md — v230 backup set',
    recordedAt: '2026-11-25T08:00:00.000Z',
  },
  {
    kind: 'PAPER',
    title: 'Batch C freeze (Option A) + import — 1,014 Action records',
    summary:
      'Owner chose Batch C freeze Option A (full Action layer) 2026-11-24; imported the same morning. Encyclopedia now holds 1,840 records (28 families + 60 majors + 738 Types/Strategies + 1,014 Actions), 0 unresolved parent links. The frozen artifact is byte-identical; all imported records stay UNVERIFIED. Sub-Actions remain zero — a future batch, a future freeze.',
    source: 'drive',
    sourceRef: 'BATCH-C-FREEZE-2026-11-24.md (goal papers)',
    recordedAt: '2026-11-24T14:00:00.000Z',
  },
  {
    kind: 'PAPER',
    title: 'Entity Batches 1 and 2 — frozen, all UNVERIFIED',
    summary:
      'Batch 1 frozen: 26 entities, owner review pass approved as FOUNDATION SEED (not a limit), 0 errors, all UNVERIFIED. Batch 2 frozen: 22 records (3 networks, 8 assets, 11 protocols), all UNVERIFIED. Frozen datasets are never silently edited — any data change returns for a new owner freeze.',
    source: 'drive',
    sourceRef: 'entity-batch-1-artifact.md + entity-batch-2-artifact.md (goal papers)',
    recordedAt: '2026-11-16T05:00:00.000Z',
  },
];

/**
 * Seeds the store with the real distilled records above — only
 * when the store is empty. Each seed still passes the exclusion
 * guard; a seed that failed it would be recorded as skipped
 * instead of ingested (none of the verified seeds does).
 */
export function seedProjectKnowledge(): ProjectKnowledgeRecord[] {
  const existing = loadProjectKnowledge();
  if (existing.length > 0) return existing;
  const seeded: ProjectKnowledgeRecord[] = [];
  for (const seed of SEEDS) {
    const exclusion = checkProjectKnowledgeExclusion(seed);
    if (exclusion) {
      recordSkippedSource(exclusion, seed.sourceRef || seed.title);
      continue;
    }
    const result = addProjectKnowledge(seed);
    if (result.ok && result.record) seeded.push(result.record);
  }
  return loadProjectKnowledge();
}
