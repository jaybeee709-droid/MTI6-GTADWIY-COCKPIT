/* Generates src/workspace-coverage-data.ts MECHANICALLY from the
 * canonical js/crypto-workspace-registry.js (CW-1/CW-2, Master
 * Directive §89) joined against js/data/encyclopedia-canonical-60.js.
 *
 * The registry is the ONE canonical declaration of which backbone
 * Major Activities feed which workspace (its resolveMajor() is the
 * CW-1 resolver). This script carries that recorded coverage into
 * the React app — primary + secondary major ids, family ids, entity
 * kinds and bot-role codes, exactly as recorded. Nothing is mapped
 * or invented here: every major id must resolve against the frozen
 * canonical-60 or the script fails. Canonical sources are never
 * edited. Run: node scripts/generate-workspace-coverage.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

function load(file) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(file, 'utf8'), sandbox);
  return sandbox.window;
}

const registry = load('js/crypto-workspace-registry.js').CryptoWorkspaceRegistry;
const canonical60 = load('js/data/encyclopedia-canonical-60.js').EncyclopediaCanonical60;
const batchA = load('js/data/encyclopedia-batch-a.js').EncyclopediaBatchA;

if (!registry?.WORKSPACES) throw new Error('CryptoWorkspaceRegistry.WORKSPACES missing');
const majorIds = new Set((canonical60?.records ?? []).map((r) => r.id));
const familyIds = new Set((batchA?.records ?? []).map((r) => r.id));
if (majorIds.size !== 60) throw new Error(`canonical-60 holds ${majorIds.size} majors, expected 60`);

let primaryLinks = 0;
let secondaryLinks = 0;
let familiesResolved = 0;
let familiesTotal = 0;
const coverage = {};
for (const w of registry.WORKSPACES) {
  const majors = w.majorIds ?? [];
  const secondary = w.secondaryMajorIds ?? [];
  for (const id of [...majors, ...secondary]) {
    if (!majorIds.has(id)) throw new Error(`workspace ${w.workspaceId} references unresolved major ${id}`);
  }
  primaryLinks += majors.length;
  secondaryLinks += secondary.length;
  const families = (w.families ?? []).map((id) => {
    familiesTotal += 1;
    if (familyIds.has(id)) familiesResolved += 1;
    return id;
  });
  coverage[w.workspaceId] = {
    majors,
    secondaryMajors: secondary,
    families,
    entityKinds: w.entityKinds ?? [],
    botRoles: w.botRoles ?? [],
    status: w.status111 ?? 'UNKNOWN',
    worldLayer: w.worldLayer ?? '',
    defaultView: w.defaultView ?? 'STANDARD',
    frame: w.frame ?? '',
    ladderTop: w.ladderTop ?? '',
    gated: w.gated === true,
    costClasses: w.costClasses ?? [],
    riskDimensions: w.riskDimensions ?? [],
    actions: w.actions ?? [],
    panelsNote: w.panelsNote ?? '',
    simulatorTemplate: w.simulatorTemplate ?? 'NONE',
  };
}
console.log(
  `workspaces=${registry.WORKSPACES.length} primaryLinks=${primaryLinks} secondaryLinks=${secondaryLinks} families=${familiesResolved}/${familiesTotal} resolved`,
);

const body = `/* GENERATED 2026-11-23 by scripts/generate-workspace-coverage.mjs
 * from js/crypto-workspace-registry.js joined to the frozen
 * canonical-60. The registry's recorded workspace coverage:
 * which backbone Major Activities (primary + secondary), families,
 * entity kinds and bot-role codes each workspace carries — exactly
 * as recorded in the canonical registry (CW-1 resolver data).
 * DO NOT HAND-EDIT — regenerate instead. */

export interface WorkspaceCoverage {
  majors: string[];
  secondaryMajors: string[];
  families: string[];
  entityKinds: string[];
  botRoles: string[];
  status: string;
  worldLayer: string;
  defaultView: string;
  frame: string;
  ladderTop: string;
  gated: boolean;
  costClasses: string[];
  riskDimensions: string[];
  actions: string[];
  panelsNote: string;
  simulatorTemplate: string;
}

export const WORKSPACE_COVERAGE: Record<string, WorkspaceCoverage> = ${JSON.stringify(coverage, null, 1)};
`;
writeFileSync('src/workspace-coverage-data.ts', body);
console.log(`wrote src/workspace-coverage-data.ts (${body.length} bytes)`);
