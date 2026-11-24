/* MTI6 Bridge Registry (v200) — auto-placement slice 2: the
 * BRIDGE-class candidate store, sibling to the DEX Registry
 * (v190). Same law: CANDIDATES ONLY — born UNVERIFIED, deduped,
 * bounded, promotable only through the owner's gate, never by
 * the scan that created them. Bridges matter to the placement
 * matrix because a bridge's evidence is its chain span: the
 * deployed_on relationship candidates carry it. */

export interface BridgeCandidate {
  id: string;
  name: string;
  cls: 'BRIDGE';
  subclass: string;
  chains: string[];
  url: string | null;
  github: string | null;
  tokenSymbol: string | null;
  tokenAddress: string | null;
  source: string;
  status: 'CANDIDATE';
  truthState: 'UNVERIFIED';
  discoveredAt: number;
  updatedAt: number;
}

export const BRIDGE_REGISTRY_KEY = 'mti6_bridge_registry_v1';
export const BRIDGE_REGISTRY_MAX = 200;

export function loadBridgeCandidates(): BridgeCandidate[] {
  try {
    const raw = localStorage.getItem(BRIDGE_REGISTRY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as BridgeCandidate[]) : [];
  } catch {
    return [];
  }
}

export function upsertBridgeCandidates(fresh: BridgeCandidate[]): { created: number; updated: number; total: number } {
  const existing = loadBridgeCandidates();
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
  const all = [...byId.values()].slice(0, BRIDGE_REGISTRY_MAX);
  try {
    localStorage.setItem(BRIDGE_REGISTRY_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable — counts still reported honestly */
  }
  return { created, updated, total: all.length };
}

export function bridgeRegistrySummary(): { bridgeCount: number; chainsCovered: number } {
  const bridges = loadBridgeCandidates();
  const chains = new Set<string>();
  for (const b of bridges) for (const c of b.chains) chains.add(c);
  return { bridgeCount: bridges.length, chainsCovered: chains.size };
}
