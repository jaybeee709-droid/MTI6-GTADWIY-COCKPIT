/* MTI6-GTADWIY-COCKPIT — Contract Discovery Registry.
 *
 * The React-layer registry for the Contract Intelligence Bot
 * (canonical logic: js/discovery-bots.js over
 * js/entity-candidates.js). Every entry is a keyless Blockscout
 * read recorded as EVIDENCE: the contract's explorer
 * source-verification state, name, compiler, and proxy
 * implementation at check time. An entry is NOT a canonical
 * entity, NOT a truth promotion, and carries NO execution
 * authority — it is the discovery layer's notebook, feeding
 * candidates to the owner's gate.
 *
 * Store: localStorage mti6_contract_registry_v1, upserted by
 * network + address, newest check wins for the evidence fields.
 */

export const CONTRACT_ROLES = [
  'TOKEN',
  'FACTORY',
  'ROUTER',
  'POOL',
  'VAULT',
  'STAKING',
  'RESTAKING',
  'LENDING_MARKET',
  'BRIDGE',
  'ORACLE',
  'GOVERNANCE',
  'TIMELOCK',
  'MULTISIG',
  'UNKNOWN',
] as const;

export const BLOCKSCOUT_NETWORKS: { id: string; label: string; host: string }[] = [
  { id: 'ethereum', label: 'Ethereum', host: 'eth.blockscout.com' },
  { id: 'base', label: 'Base', host: 'base.blockscout.com' },
  { id: 'arbitrum', label: 'Arbitrum', host: 'arbitrum.blockscout.com' },
  { id: 'optimism', label: 'Optimism', host: 'optimism.blockscout.com' },
  { id: 'polygon', label: 'Polygon', host: 'polygon.blockscout.com' },
  /* Scroll added v188: its Blockscout answered 200 on probe
   * (2026-11-24, via redirect to its canonical host; browser
   * fetch follows). Gnosis was tested the same day and excluded —
   * bot-walled from the build environment, unverified. */
  { id: 'scroll', label: 'Scroll', host: 'scroll.blockscout.com' },
];

export interface ContractEntry {
  id: string; // network:address
  address: string;
  network: string;
  role: string;
  name: string | null;
  isVerified: boolean;
  compilerVersion: string | null;
  implementationAddress: string | null;
  sourceUrl: string;
  checkedAt: number;
  checkedBy: string; // 'explorer-check' (runtime) or 'registry-panel'
}

const KEY = 'mti6_contract_registry_v1';
export const MAX_CONTRACT_ENTRIES = 100;

export function loadContractEntries(): ContractEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveContractEntries(entries: ContractEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_CONTRACT_ENTRIES)));
  } catch {
    /* storage full/blocked — the registry is a notebook, not a ledger */
  }
}

export function normalizeEvmAddress(addr: string): string | null {
  const t = (addr ?? '').trim();
  return /^0x[a-fA-F0-9]{40}$/.test(t) ? t.toLowerCase() : null;
}

export interface ContractCheckResult {
  name: string | null;
  isVerified: boolean;
  compilerVersion: string | null;
  implementationAddress: string | null;
  sourceUrl: string;
}

/* One keyless Blockscout REST v2 read. Throws on transport or
 * HTTP failure — callers record nothing on failure. */
export async function checkContractOnExplorer(
  network: string,
  address: string,
): Promise<ContractCheckResult> {
  const net = BLOCKSCOUT_NETWORKS.find((n) => n.id === network);
  if (!net) throw new Error(`No keyless Blockscout host is catalogued for ${network}`);
  const addr = normalizeEvmAddress(address);
  if (!addr) throw new Error('UNCERTAINANCHOR: a valid EVM contract address is required; never guessed.');
  const sourceUrl = `https://${net.host}/api/v2/smart-contracts/${addr}`;
  const res = await fetch(sourceUrl, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Blockscout answered HTTP ${res.status}`);
  const body = (await res.json()) as {
    is_verified?: boolean;
    name?: string;
    compiler_version?: string;
    implementations?: { address_hash?: string }[];
  };
  const impl = body.implementations?.[0]?.address_hash;
  return {
    name: typeof body.name === 'string' ? body.name : null,
    isVerified: body.is_verified === true,
    compilerVersion: typeof body.compiler_version === 'string' ? body.compiler_version : null,
    implementationAddress: impl ? normalizeEvmAddress(impl) : null,
    sourceUrl,
  };
}

/* Upsert a check result as registry evidence. Role is only set
 * from an explicit label (panel choice); a re-check without one
 * keeps the recorded role. */
export function recordContractCheck(
  network: string,
  address: string,
  role: string | undefined,
  result: ContractCheckResult,
  checkedBy: string,
): ContractEntry {
  const addr = normalizeEvmAddress(address) ?? address.toLowerCase();
  const id = `${network}:${addr}`;
  const entries = loadContractEntries();
  const existing = entries.find((e) => e.id === id);
  const entry: ContractEntry = {
    id,
    address: addr,
    network,
    role: role && CONTRACT_ROLES.includes(role as (typeof CONTRACT_ROLES)[number])
      ? role
      : existing?.role ?? 'UNKNOWN',
    name: result.name,
    isVerified: result.isVerified,
    compilerVersion: result.compilerVersion,
    implementationAddress: result.implementationAddress,
    sourceUrl: result.sourceUrl,
    checkedAt: Date.now(),
    checkedBy,
  };
  saveContractEntries([entry, ...entries.filter((e) => e.id !== id)]);
  return entry;
}

export function contractRegistrySummary(): { total: number; verified: number; latest: ContractEntry | null } {
  const entries = loadContractEntries();
  return {
    total: entries.length,
    verified: entries.filter((e) => e.isVerified).length,
    latest: entries[0] ?? null,
  };
}
