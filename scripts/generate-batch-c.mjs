/* MTI6-GTADWIY-COCKPIT — Batch C generator (owner freeze:
 * Option A, full Action layer, 2026-11-24).
 *
 * Derives ACTION records for every Batch B STRATEGY record by
 * lifecycle decomposition of the strategy itself:
 *   - "— Initiate"        for all 404 strategies
 *   - "— Monitor & Adjust" for all 404 strategies
 *   - "— Exit & Settle"    only for position-bearing strategies
 *     (title/definition names a position, pool, stake, lend,
 *     borrow, lock, deposit, vault, farm or liquidity)
 * Definitions are composed from the parent strategy's own
 * recorded definition — no external facts are introduced.
 * Every record is UNVERIFIED, ownerApprovalStatus PENDING,
 * importBatch import1-batch-c, source batch-c-generation.
 *
 * The output is a FROZEN CANDIDATE artifact in the Batch B
 * staging style: it is NOT wired into the vanilla loader and
 * NOT imported into the canonical index. Owner review pass
 * and the import are separate owner actions (the EntityGate
 * pattern). Gate assertions run before anything is written:
 * exactly 404 strategy parents, every parentRef resolves,
 * ids unique, total inside the Option A band (800–1,200),
 * no forbidden return-bearing fields. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const BATCH_B_PATH = new URL('../js/data/encyclopedia-batch-b.js', import.meta.url);
const OUT_PATH = new URL('../js/data/encyclopedia-batch-c.js', import.meta.url);

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(BATCH_B_PATH, 'utf8'), ctx);
const batchB = ctx.window.EncyclopediaBatchB?.records;
if (!Array.isArray(batchB)) throw new Error('Batch B records not found');

const strategies = batchB.filter((r) => r.level === 'STRATEGY');
if (strategies.length !== 404) {
  throw new Error(`Expected 404 STRATEGY records, found ${strategies.length}`);
}
const strategyIds = new Set(strategies.map((s) => s.id));

const POSITION_BEARING =
  /(position|pool|stake|staking|lend|lending|borrow|lock|deposit|vault|farm|liquidity|lp\b)/i;

const lowerFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

const actions = [];
for (const s of strategies) {
  const slug = s.id.replace(/^strategy-/, '');
  const base = {
    activityNumber: s.activityNumber,
    activityTitle: s.activityTitle,
    parentRef: s.id,
    strategyKind: null,
    aliases: [],
    strategySources: [],
    relatedActivities: [],
    source: 'batch-c-generation',
    wave: 1,
    registry: 'activities',
    importBatch: 'import1-batch-c',
    verificationStatus: 'UNVERIFIED',
    ownerApprovalStatus: 'PENDING',
    workspace: s.workspace,
    globeView: s.globeView,
    level: 'ACTION',
  };
  actions.push({
    id: `action-${slug}-initiate`,
    title: `${s.title} — Initiate`,
    ...base,
    definition: `Initiate the "${s.title}" strategy: ${lowerFirst(s.definition)}`,
  });
  actions.push({
    id: `action-${slug}-monitor-adjust`,
    title: `${s.title} — Monitor & Adjust`,
    ...base,
    definition: `Monitor the open "${s.title}" position and adjust its parameters as market and protocol conditions change, staying within the bounds the parent strategy describes.`,
  });
  if (POSITION_BEARING.test(`${s.title} ${s.definition}`)) {
    actions.push({
      id: `action-${slug}-exit-settle`,
      title: `${s.title} — Exit & Settle`,
      ...base,
      definition: `Exit the "${s.title}" position in an orderly way and settle what it holds back under the owner's control, completing the lifecycle the parent strategy describes.`,
    });
  }
}

/* ---- Gate ---- */
const ids = new Set();
for (const a of actions) {
  if (ids.has(a.id)) throw new Error(`Duplicate action id: ${a.id}`);
  ids.add(a.id);
  if (!strategyIds.has(a.parentRef)) {
    throw new Error(`Unresolved parentRef: ${a.parentRef}`);
  }
  for (const key of Object.keys(a)) {
    if (/return|apy|profit|yield/i.test(key)) {
      throw new Error(`Forbidden field on ${a.id}: ${key}`);
    }
  }
}
if (actions.length < 800 || actions.length > 1200) {
  throw new Error(`Option A band violated: ${actions.length} actions`);
}
const exits = actions.filter((a) => a.id.endsWith('-exit-settle')).length;
console.log(
  `Batch C gate PASS: ${actions.length} ACTION records (404 initiate + 404 monitor-adjust + ${exits} exit-settle) · all parents resolve · ids unique`,
);

const header = `/* MTI6-GTADWIY-COCKPIT — Encyclopedia Batch C data (frozen candidate, Nov 24, 2026)
 * Owner freeze: Batch C scope Option A (full Action layer), decided
 * by the owner 2026-11-24. ${actions.length} ACTION records derived by
 * lifecycle decomposition of the 404 Batch B strategies (Initiate /
 * Monitor & Adjust for every strategy; Exit & Settle where the
 * strategy is position-bearing), generated mechanically by
 * scripts/generate-batch-c.mjs from the frozen Batch B artifact —
 * Batch B itself is untouched. Definitions are composed from each
 * parent strategy's own recorded definition; no external facts are
 * introduced. Every record is UNVERIFIED with ownerApprovalStatus
 * PENDING. STAGING ONLY — not wired into the vanilla loader and
 * NOT imported into the canonical index; the owner review pass
 * and the import are separate owner actions.
 */
`;

const body = `(function (global) {
  "use strict";

  var RECORDS = ${JSON.stringify(actions, null, 2)};

  global.EncyclopediaBatchC = {
    kind: "batch-c",
    label: "Batch C — Actions (Option A, frozen candidate)",
    records: RECORDS
  };
})(window);
`;

writeFileSync(OUT_PATH, header + body);
const sha = createHash('sha256').update(header + body).digest('hex');
console.log(`Wrote js/data/encyclopedia-batch-c.js · SHA-256 ${sha}`);
