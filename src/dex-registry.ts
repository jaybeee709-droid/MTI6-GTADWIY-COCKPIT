/* MTI6 DEX Registry + Relationship Candidates (v190) — the
 * candidate stores of the auto-placement pipeline. Both stores
 * hold CANDIDATES ONLY: born UNVERIFIED, deduped, bounded, and
 * promotable only through the owner's gate (the EntityGate /
 * approval flow), never by the scan that created them.
 * Freshness follows the platform rule: a candidate's age is
 * derived from its timestamps, never guessed. */

import type { DexCandidate } from './classification';

export const DEX_REGISTRY_KEY = 'mti6_dex_registry_v1';
export const REL_CANDIDATES_KEY = 'mti6_relationship_candidates_v1';
/* Bounds (v205 deepening): the DEX registry holds the full
 * measured DEX class (2,405 at the v190 classification run),
 * so the cap sits above it at 3,000; the shared relationship
 * store holds the derived head at 1,200. Bounds are stated in
 * the scan evidence, never silent. */
export const DEX_REGISTRY_MAX = 3000;
export const REL_CANDIDATES_MAX = 1200;

export function loadDexCandidates(): DexCandidate[] {
  try {
    const raw = localStorage.getItem(DEX_REGISTRY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as DexCandidate[]) : [];
  } catch {
    return [];
  }
}

export function upsertDexCandidates(fresh: DexCandidate[]): { created: number; updated: number; total: number } {
  const existing = loadDexCandidates();
  const byId = new Map(existing.map((c) => [c.id, c]));
  let created = 0;
  let updated = 0;
  for (const c of fresh) {
    const prior = byId.get(c.id);
    if (prior) {
      byId.set(c.id, { ...c, discoveredAt: prior.discoveredAt });
      updated += 1;
    } else {
      byId.set(c.id, c);
      created += 1;
    }
  }
  const all = [...byId.values()].slice(0, DEX_REGISTRY_MAX);
  try {
    localStorage.setItem(DEX_REGISTRY_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable — counts still reported honestly */
  }
  return { created, updated, total: all.length };
}

export interface RelationshipCandidate {
  id: string;
  from: string;
  relation: 'deployed_on' | 'has_native_token';
  to: string;
  source: string;
  status: 'CANDIDATE';
  at: number;
}

export function loadRelationshipCandidates(): RelationshipCandidate[] {
  try {
    const raw = localStorage.getItem(REL_CANDIDATES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as RelationshipCandidate[]) : [];
  } catch {
    return [];
  }
}

export function addRelationshipCandidates(fresh: RelationshipCandidate[]): { created: number; total: number } {
  const existing = loadRelationshipCandidates();
  const seen = new Set(existing.map((r) => r.id));
  let created = 0;
  const added: RelationshipCandidate[] = [];
  for (const r of fresh) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    added.push(r);
    created += 1;
  }
  const all = [...added, ...existing].slice(0, REL_CANDIDATES_MAX);
  try {
    localStorage.setItem(REL_CANDIDATES_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
  return { created, total: all.length };
}

export function dexRegistrySummary(): { dexCount: number; relCount: number; chainsCovered: number } {
  const dex = loadDexCandidates();
  const rels = loadRelationshipCandidates();
  const chains = new Set<string>();
  for (const d of dex) for (const c of d.chains) chains.add(c);
  return { dexCount: dex.length, relCount: rels.length, chainsCovered: chains.size };
}
