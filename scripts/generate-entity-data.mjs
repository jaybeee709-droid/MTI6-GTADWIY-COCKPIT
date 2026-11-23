/* Generates src/entity-data.ts MECHANICALLY from the frozen entity
 * batch files (js/data/entity-batch-1.js, entity-batch-2.js).
 *
 * The frozen datasets are never edited — this script only reads them.
 * Nothing is retyped and no anchor is added: every field in the
 * output is copied from the frozen records, and a field a record
 * does not carry stays absent (STANDING ANCHOR RULE). Run:
 *   node scripts/generate-entity-data.mjs
 * It asserts the frozen counts (26 + 22 = 48; 11 chains / 18 assets /
 * 19 protocols) and that every record is UNVERIFIED. */
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

function loadRecords(path, globalName) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(path, 'utf8'), sandbox);
  const data = sandbox.window[globalName];
  if (!data || !Array.isArray(data.records)) {
    throw new Error(`${path}: ${globalName}.records not found`);
  }
  return data.records;
}

const batch1 = loadRecords('js/data/entity-batch-1.js', 'EncyclopediaEntityBatch1');
const batch2 = loadRecords('js/data/entity-batch-2.js', 'EncyclopediaEntityBatch2');
const raw = [...batch1, ...batch2];

const entities = raw.map((r) => {
  const e = {
    id: r.id,
    title: r.title,
    registry: r.registry,
    definition: r.definition ?? '',
    batch: r.importBatch ?? '',
  };
  if (typeof r.symbol === 'string') e.symbol = r.symbol;
  if (typeof r.chainId === 'number') e.chainId = r.chainId;
  if (typeof r.networkRef === 'string') e.networkRef = r.networkRef;
  if (typeof r.nativeAssetRef === 'string') e.nativeAssetRef = r.nativeAssetRef;
  if (typeof r.formerName === 'string') e.formerName = r.formerName;
  if (Array.isArray(r.activityRefs)) e.activityRefs = r.activityRefs;
  if (Array.isArray(r.networkRefs)) e.networkRefs = r.networkRefs;
  return e;
});

const byRegistry = { chains: 0, assets: 0, protocols: 0 };
for (const e of entities) byRegistry[e.registry] = (byRegistry[e.registry] ?? 0) + 1;
const notUnverified = raw.filter((r) => r.verificationStatus !== 'UNVERIFIED');

const problems = [];
if (batch1.length !== 26) problems.push(`batch1 ${batch1.length} != 26`);
if (batch2.length !== 22) problems.push(`batch2 ${batch2.length} != 22`);
if (entities.length !== 48) problems.push(`entities ${entities.length} != 48`);
if (byRegistry.chains !== 11) problems.push(`chains ${byRegistry.chains} != 11`);
if (byRegistry.assets !== 18) problems.push(`assets ${byRegistry.assets} != 18`);
if (byRegistry.protocols !== 19) problems.push(`protocols ${byRegistry.protocols} != 19`);
if (notUnverified.length) problems.push(`${notUnverified.length} records not UNVERIFIED`);
console.log(`entities=${entities.length} chains=${byRegistry.chains} assets=${byRegistry.assets} protocols=${byRegistry.protocols} unverified=${raw.length - notUnverified.length}`);
if (problems.length) {
  console.error('PROBLEMS:', problems.join('; '));
  process.exit(1);
}

const header = `/* GENERATED 2026-11-23 by scripts/generate-entity-data.mjs from the
 * frozen entity batch files js/data/entity-batch-1.js and
 * js/data/entity-batch-2.js. DO NOT HAND-EDIT — regenerate instead.
 * The frozen sources are unchanged. Every entity is UNVERIFIED;
 * identity fields are exactly what the frozen records carry — a
 * field a record does not carry is absent, never filled in. */
`;

const body = `${header}
export interface CanonicalEntity {
  id: string; title: string; registry: string; definition: string; batch: string;
  symbol?: string; chainId?: number; networkRef?: string; nativeAssetRef?: string;
  formerName?: string; activityRefs?: string[]; networkRefs?: string[];
}

export const ENTITY_UNIVERSE: CanonicalEntity[] = ${JSON.stringify(entities, null, 1)};

export const ENTITY_COUNTS = {
  total: ${entities.length},
  chains: ${byRegistry.chains},
  assets: ${byRegistry.assets},
  protocols: ${byRegistry.protocols},
} as const;
`;

writeFileSync('src/entity-data.ts', body);
console.log(`wrote src/entity-data.ts (${body.length} bytes)`);
