/* COMMAND DECISION BOARD (v219) — the living checklist of
 * everything that is NOT code: decisions, authorizations,
 * inputs, and activations. The bottleneck stopped being
 * engineering; this board is where the queue is visible.
 *
 * Each row names its owner, its status, and what it blocks.
 * Live values (STAR key, executor runs, desk state) are read
 * from the platform's own records at render time; the rest
 * are dated records, updated when a decision lands. Nothing
 * here is a wish: a row moves only on evidence. */
export interface BoardRow {
  item: string;
  owner: string;
  status: string;
  blocking: string;
  evidence: string;
}

export const DECISION_BOARD_ROWS: BoardRow[] = [
  {
    item: 'D6 Autonomous Executor',
    owner: 'Daniel',
    status: 'ACCEPTED WITH CONSTRAINTS — dry-run live; live pilot gated',
    blocking: 'Live pilot only',
    evidence: 'D6 decision 2026-11-24 (Daniel: "Build d6 now"). Dry-run stage authorized; the live flip needs his separate decision after he reviews the dry-run log, plus a hot wallet he creates/funds and a key he places in Netlify himself.',
  },
  {
    item: 'STAR Provider Key',
    owner: 'Daniel',
    status: 'IN PROGRESS — not configured (live gateway check)',
    blocking: 'Yes — provider-backed STAR',
    evidence: 'Gateway gateway.status, last verified 2026-11-24 ~11:36 PM EST: star false. Daniel is fixing the Netlify variable name/scope himself.',
  },
  {
    item: 'Wallet Validation',
    owner: 'Daniel',
    status: 'OPEN — watch address not added; $50 not funded; no swap signed',
    blocking: 'Partial — the desk works; the first live swap is unproven',
    evidence: 'Swap Desk summary (live): 0 prepared, 0 approved, 0 handed off. These are Daniel\'s moves in the preview.',
  },
  {
    item: 'A1–A4 Documents',
    owner: 'External / input',
    status: 'MISSING — never provided',
    blocking: 'Yes — authenticated-API planning',
    evidence: 'Labels only, relayed 2026-11-23; the audit text was never delivered. The board cannot plan what it cannot read.',
  },
  {
    item: 'Sub-Action Freeze',
    owner: 'Daniel',
    status: 'OPEN — no freeze scope',
    blocking: 'Yes — Sub-Action import',
    evidence: 'Zero Sub-action records exist. The freeze scope question goes to Daniel before any import work.',
  },
  {
    item: 'Authenticated API Phase',
    owner: 'Build',
    status: 'WAITING — after the STAR key is live',
    blocking: 'Yes — deeper authenticated services',
    evidence: 'Direction given 2026-11-24 ~1:24 PM: after the keyless phase. The keyless phase still has keys 2–4 outstanding (CoinGecko Demo, Geoapify, LocationIQ) — Daniel\'s Netlify steps.',
  },
  {
    item: 'WalletConnect Project ID',
    owner: 'Daniel',
    status: 'OPEN — free registration, no KYC, but a project ID is required',
    blocking: 'WalletConnect-based connections only (injected-wallet detection already live, no key)',
    evidence: 'Probed 2026-11-25: WalletConnect v2 is a connection protocol, not a data API — it needs a project ID from cloud.walletconnect.com. The desk detects installed wallets (MetaMask, Coinbase Wallet, …) keyless via EIP-6963; that path needs nothing from Daniel.',
  },
];
