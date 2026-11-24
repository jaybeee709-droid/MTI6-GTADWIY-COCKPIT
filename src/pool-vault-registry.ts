/* MTI6 Pool + Vault Registries (v201) — auto-placement slice 3:
 * the POOL-class and VAULT-class candidate stores, siblings to
 * the DEX (v190) and Bridge (v200) registries. Same law:
 * CANDIDATES ONLY — born UNVERIFIED, deduped, bounded,
 * promotable only through the owner's gate. One shared record
 * shape, two separate stores — a pool is not a vault, and the
 * stores never mix. */

export interface PlacementCandidate {
  id: string;
  name: string;
  cls: 'POOL' | 'VAULT';
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

export const POOL_REGISTRY_KEY = 'mti6_pool_registry_v1';
export const VAULT_REGISTRY_KEY = 'mti6_vault_registry_v1';
export const PLACEMENT_REGISTRY_MAX = 200;

function loadFrom(key: string): PlacementCandidate[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PlacementCandidate[]) : [];
  } catch {
    return [];
  }
}

function upsertInto(key: string, fresh: PlacementCandidate[]): { created: number; updated: number; total: number } {
  const existing = loadFrom(key);
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
  const all = [...byId.values()].slice(0, PLACEMENT_REGISTRY_MAX);
  try {
    localStorage.setItem(key, JSON.stringify(all));
  } catch {
    /* storage unavailable — counts still reported honestly */
  }
  return { created, updated, total: all.length };
}

export const loadPoolCandidates = (): PlacementCandidate[] => loadFrom(POOL_REGISTRY_KEY);
export const loadVaultCandidates = (): PlacementCandidate[] => loadFrom(VAULT_REGISTRY_KEY);
export const upsertPoolCandidates = (fresh: PlacementCandidate[]) => upsertInto(POOL_REGISTRY_KEY, fresh);
export const upsertVaultCandidates = (fresh: PlacementCandidate[]) => upsertInto(VAULT_REGISTRY_KEY, fresh);

export function poolVaultSummary(): { poolCount: number; vaultCount: number; chainsCovered: number } {
  const pools = loadPoolCandidates();
  const vaults = loadVaultCandidates();
  const chains = new Set<string>();
  for (const c of [...pools, ...vaults]) for (const ch of c.chains) chains.add(ch);
  return { poolCount: pools.length, vaultCount: vaults.length, chainsCovered: chains.size };
}
