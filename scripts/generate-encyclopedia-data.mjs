/* Generates src/encyclopedia-data.ts MECHANICALLY from the frozen
 * canonical data files (js/data/encyclopedia-batch-a.js,
 * encyclopedia-canonical-60.js, encyclopedia-batch-b.js).
 *
 * The frozen datasets are never edited — this script only reads them.
 * Nothing is retyped: every title, definition, family link and parent
 * link in the output is copied from the frozen records. Run:
 *   node scripts/generate-encyclopedia-data.mjs
 * It asserts the recorded counts (28 families / 60 major activities /
 * 334 types / 404 strategies = 826) and reports link resolution. */
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

const familiesRaw = loadRecords('js/data/encyclopedia-batch-a.js', 'EncyclopediaBatchA');
const majorsRaw = loadRecords('js/data/encyclopedia-canonical-60.js', 'EncyclopediaCanonical60');
const batchBRaw = loadRecords('js/data/encyclopedia-batch-b.js', 'EncyclopediaBatchB');

const families = familiesRaw.map((r) => ({ id: r.id, title: r.title }));
const familyIds = new Set(families.map((f) => f.id));

const majors = majorsRaw.map((r) => ({
  id: r.id,
  title: r.title,
  definition: r.definition ?? '',
  family: r.primaryFamily,
  workspace: r.workspace ?? '',
}));
const majorIds = new Set(majors.map((m) => m.id));

const types = batchBRaw.filter((r) => r.level === 'TYPE');
const strategies = batchBRaw.filter((r) => r.level === 'STRATEGY');

const index = [
  ...families.map((f) => ({ id: f.id, title: f.title, level: 'FAMILY', parent: '' })),
  ...majors.map((m) => ({ id: m.id, title: m.title, level: 'MAJOR_ACTIVITY', parent: m.family })),
  ...batchBRaw.map((r) => ({
    id: r.id,
    title: r.title,
    level: r.level,
    parent: r.parentRef ?? '',
  })),
];

// --- Assertions + audit report (printed, never silently waived) ---
const problems = [];
if (families.length !== 28) problems.push(`families ${families.length} != 28`);
if (majors.length !== 60) problems.push(`majors ${majors.length} != 60`);
if (types.length !== 334) problems.push(`types ${types.length} != 334`);
if (strategies.length !== 404) problems.push(`strategies ${strategies.length} != 404`);
if (index.length !== 826) problems.push(`index ${index.length} != 826`);
const badFamilyLinks = majors.filter((m) => !familyIds.has(m.family));
if (badFamilyLinks.length) problems.push(`majors with unresolved family: ${badFamilyLinks.length}`);
const allIds = new Set(index.map((e) => e.id));
const unresolvedParents = batchBRaw.filter((r) => r.parentRef && !allIds.has(r.parentRef));
console.log(`families=${families.length} majors=${majors.length} types=${types.length} strategies=${strategies.length} index=${index.length}`);
console.log(`batch B parentRef unresolved: ${unresolvedParents.length}`);
if (problems.length) {
  console.error('PROBLEMS:', problems.join('; '));
  process.exit(1);
}

const header = `/* GENERATED 2026-11-23 by scripts/generate-encyclopedia-data.mjs from
 * the frozen canonical data files js/data/encyclopedia-batch-a.js,
 * js/data/encyclopedia-canonical-60.js and js/data/encyclopedia-batch-b.js.
 * DO NOT HAND-EDIT — regenerate instead. The frozen sources are
 * unchanged. Every record is UNVERIFIED with canonical-import
 * provenance (owner approval = approval for inclusion, not external
 * verification). TAXONOMY_IMPORTED is an import status. */
`;

const body = `${header}
export interface EncyclopediaFamily { id: string; title: string }
export interface CanonicalMajor {
  id: string; title: string; definition: string; family: string; workspace: string;
}
export interface EncyclopediaIndexEntry { id: string; title: string; level: string; parent: string }

export const ENCYCLOPEDIA_FAMILIES: EncyclopediaFamily[] = ${JSON.stringify(families, null, 1)};

export const CANONICAL_60: CanonicalMajor[] = ${JSON.stringify(majors, null, 1)};

export const ENCYCLOPEDIA_INDEX: EncyclopediaIndexEntry[] = ${JSON.stringify(index, null, 1)};

export const ENCYCLOPEDIA_COUNTS = {
  families: ${families.length},
  majors: ${majors.length},
  types: ${types.length},
  strategies: ${strategies.length},
  actions: 0,
  subActions: 0,
  total: ${index.length},
} as const;
`;

writeFileSync('src/encyclopedia-data.ts', body);
console.log(`wrote src/encyclopedia-data.ts (${body.length} bytes)`);
