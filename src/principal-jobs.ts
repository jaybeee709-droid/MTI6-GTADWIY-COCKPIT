/**
 * Tribe Principal Job Cards (v247) — one card per Tribe principal,
 * in Revelation-7 order, describing the job each principal
 * ACTUALLY does in the app.
 *
 * HONESTY NOTE (read before believing a card): the code assigns
 * NO fixed role to any principal. All 12 start UNASSIGNED
 * (src/worlds-data.ts); roles come from the closed list in
 * src/principal-assignments.ts (Research, Risk, Yield, Routing,
 * Security, Builder, Analysis, Monitoring) and are OWNER-assigned
 * at runtime. Money Radar routes work orders to whichever
 * principal currently HOLDS a role (src/money-radar.ts
 * principalForRole), or to the UNASSIGNED POOL when nobody holds
 * it. The Builder track assigns role 'Builder' to a principal
 * when a build-queue item is assigned to them
 * (src/worlds/BotOperations.tsx). So every card's `role` is null
 * (UNASSIGNED by default) with a note — inventing a fixed role
 * per principal would be fabrication.
 *
 * What IS fixed per principal is the seeded Scout assignment in
 * src/web-harvest.ts (v229/v232/v236): one CORS-verified keyless
 * source each (plus four camera-discovery Scouts). That is the
 * job each card describes, with the APIs named from the registry
 * data (API names only — never keys, URLs with keys, or values).
 *
 * Limits are the platform's own law: workers are record systems
 * only (0 active / NOT_CONNECTED); the in-page runtime runs only
 * while the page is open; the pipeline ends at PREPARED; nothing
 * here executes, signs, broadcasts, or moves money.
 */
import { TRIBE_PRINCIPALS } from './worlds-data';

export interface PrincipalJob {
  /** Canonical principal id, e.g. 'tribe-judah'. */
  principalId: string;
  /** Display name, e.g. 'JUDAH'. */
  principal: string;
  /** Assigned role from the closed role list, or null: no
   * principal carries a fixed role in code — roles are
   * owner-assigned at runtime. */
  role: string | null;
  /** Why role is what it is. */
  roleNote: string;
  /** One-line job. */
  job: string;
  /** What the principal actually does in the app. */
  whatItDoes: string[];
  /** What it never does — the boundaries. */
  neverDoes: string[];
  /** Provider/source APIs the work uses, by name only. */
  apis: string[];
  /** Hard limits on the job. */
  limits: string[];
}

const NEVER_DOES: string[] = [
  'Never executes, trades, signs, broadcasts, or moves money — the pipeline ends at PREPARED and the owner acts.',
  'Never auto-trusts what it harvests: harvest excerpts are RAW discovery, candidates stay UNVERIFIED until the owner\'s gate.',
  'Never writes VERIFIED — verification is a separate owner process; Bot Memory refuses VERIFIED at the write path.',
  'Never runs when the page is closed — there is no remote/always-on runtime; workers stay 0 active / NOT_CONNECTED.',
];

const SCOUT_LIMITS: string[] = [
  'In-page only, while Bot Operations stays open; harvest runs on a 15-minute cadence at most.',
  'Browser reads only — a source that does not send Access-Control-Allow-Origin: * records FAILED, never silently.',
  'Excerpts capped at 1,500 chars; the RAW store is bounded at 200 records.',
  'Recorded work only: a principal is never displayed as "live" — only its recorded, executed work is shown.',
];

const ROUTED_WORK: string =
  'Receives role-routed Bot Work Queue orders when the owner assigns it a role — Money Radar verification orders route to the Yield role, decline reviews to Risk, capital-flow reviews to Analysis, and build-queue items assign the Builder role.';

export const PRINCIPAL_JOBS: PrincipalJob[] = [
  {
    principalId: 'tribe-judah',
    principal: 'JUDAH',
    role: null,
    roleNote:
      'No fixed role in code — all principals start UNASSIGNED; roles are owner-assigned from the closed list (principal-assignments.ts).',
    job: 'Scouts CoinGecko market prices and hunts Texas traffic-camera services.',
    whatItDoes: [
      'Harvests the seeded CoinGecko Markets source (PRICES) into the bounded RAW store via the governed web-harvest.',
      'Runs the v236 camera-discovery Scout: searches the ArcGIS portal for Texas "traffic cameras" Feature Services and brings back RAW discovery for hand-probing.',
      ROUTED_WORK,
    ],
    neverDoes: NEVER_DOES,
    apis: ['CoinGecko', 'ArcGIS portal search'],
    limits: SCOUT_LIMITS,
  },
  {
    principalId: 'tribe-reuben',
    principal: 'REUBEN',
    role: null,
    roleNote:
      'No fixed role in code — all principals start UNASSIGNED; roles are owner-assigned from the closed list (principal-assignments.ts).',
    job: 'Scouts the Coinbase ETH spot price and hunts Arizona traffic-camera services.',
    whatItDoes: [
      'Harvests the seeded Coinbase ETH Spot source (PRICES) into the bounded RAW store via the governed web-harvest.',
      'Runs the v236 camera-discovery Scout: searches the ArcGIS portal for Arizona "traffic cameras" Feature Services and brings back RAW discovery for hand-probing.',
      ROUTED_WORK,
    ],
    neverDoes: NEVER_DOES,
    apis: ['Coinbase', 'ArcGIS portal search'],
    limits: SCOUT_LIMITS,
  },
  {
    principalId: 'tribe-gad',
    principal: 'GAD',
    role: null,
    roleNote:
      'No fixed role in code — all principals start UNASSIGNED; roles are owner-assigned from the closed list (principal-assignments.ts).',
    job: 'Scouts the DefiLlama protocol index and hunts Pennsylvania traffic-camera services.',
    whatItDoes: [
      'Harvests the seeded DefiLlama Protocols source into the bounded RAW store via the governed web-harvest — the same index the DEX/Bridge/Pool/Vault scans classify.',
      'Runs the v236 camera-discovery Scout: searches the ArcGIS portal for Pennsylvania "traffic cameras" Feature Services and brings back RAW discovery for hand-probing.',
      ROUTED_WORK,
    ],
    neverDoes: NEVER_DOES,
    apis: ['DefiLlama', 'ArcGIS portal search'],
    limits: SCOUT_LIMITS,
  },
  {
    principalId: 'tribe-asher',
    principal: 'ASHER',
    role: null,
    roleNote:
      'No fixed role in code — all principals start UNASSIGNED; roles are owner-assigned from the closed list (principal-assignments.ts).',
    job: 'Scouts DefiLlama chain data and hunts Colorado traffic-camera services.',
    whatItDoes: [
      'Harvests the seeded DefiLlama Chains source into the bounded RAW store via the governed web-harvest.',
      'Runs the v236 camera-discovery Scout: searches the ArcGIS portal for Colorado "traffic cameras" Feature Services and brings back RAW discovery for hand-probing.',
      ROUTED_WORK,
    ],
    neverDoes: NEVER_DOES,
    apis: ['DefiLlama', 'ArcGIS portal search'],
    limits: SCOUT_LIMITS,
  },
  {
    principalId: 'tribe-naphtali',
    principal: 'NAPHTALI',
    role: null,
    roleNote:
      'No fixed role in code — all principals start UNASSIGNED; roles are owner-assigned from the closed list (principal-assignments.ts).',
    job: 'Scouts DefiLlama stablecoin data.',
    whatItDoes: [
      'Harvests the seeded DefiLlama Stablecoins source (PRICES) into the bounded RAW store via the governed web-harvest.',
      ROUTED_WORK,
    ],
    neverDoes: NEVER_DOES,
    apis: ['DefiLlama'],
    limits: SCOUT_LIMITS,
  },
  {
    principalId: 'tribe-manasseh',
    principal: 'MANASSEH',
    role: null,
    roleNote:
      'No fixed role in code — all principals start UNASSIGNED; roles are owner-assigned from the closed list (principal-assignments.ts).',
    job: 'Scouts DefiLlama fee data.',
    whatItDoes: [
      'Harvests the seeded DefiLlama Fees source into the bounded RAW store via the governed web-harvest.',
      ROUTED_WORK,
    ],
    neverDoes: NEVER_DOES,
    apis: ['DefiLlama'],
    limits: SCOUT_LIMITS,
  },
  {
    principalId: 'tribe-simeon',
    principal: 'SIMEON',
    role: null,
    roleNote:
      'No fixed role in code — all principals start UNASSIGNED; roles are owner-assigned from the closed list (principal-assignments.ts).',
    job: 'Scouts Pendle fixed-yield markets on Ethereum.',
    whatItDoes: [
      'Harvests the seeded Pendle Markets ETH source (YIELDS) into the bounded RAW store via the governed web-harvest.',
      ROUTED_WORK,
    ],
    neverDoes: NEVER_DOES,
    apis: ['Pendle'],
    limits: SCOUT_LIMITS,
  },
  {
    principalId: 'tribe-levi',
    principal: 'LEVI',
    role: null,
    roleNote:
      'No fixed role in code — all principals start UNASSIGNED; roles are owner-assigned from the closed list (principal-assignments.ts).',
    job: 'Scouts Hacker News top stories.',
    whatItDoes: [
      'Harvests the seeded Hacker News Top Stories source (NEWS) into the bounded RAW store via the governed web-harvest.',
      ROUTED_WORK,
    ],
    neverDoes: NEVER_DOES,
    apis: ['Hacker News'],
    limits: SCOUT_LIMITS,
  },
  {
    principalId: 'tribe-issachar',
    principal: 'ISSACHAR',
    role: null,
    roleNote:
      'No fixed role in code — all principals start UNASSIGNED; roles are owner-assigned from the closed list (principal-assignments.ts).',
    job: 'Scouts DefiLlama yield pools.',
    whatItDoes: [
      'Harvests the seeded DefiLlama Pools source (YIELDS) into the bounded RAW store via the governed web-harvest — the same yields feed Money Radar diffs against its baseline.',
      ROUTED_WORK,
    ],
    neverDoes: NEVER_DOES,
    apis: ['DefiLlama'],
    limits: SCOUT_LIMITS,
  },
  {
    principalId: 'tribe-zebulun',
    principal: 'ZEBULUN',
    role: null,
    roleNote:
      'No fixed role in code — all principals start UNASSIGNED; roles are owner-assigned from the closed list (principal-assignments.ts).',
    job: 'Scouts DexScreener pair data for ETH.',
    whatItDoes: [
      'Harvests the seeded DexScreener Search ETH source (PAIRS) into the bounded RAW store via the governed web-harvest.',
      ROUTED_WORK,
    ],
    neverDoes: NEVER_DOES,
    apis: ['DexScreener'],
    limits: SCOUT_LIMITS,
  },
  {
    principalId: 'tribe-joseph',
    principal: 'JOSEPH',
    role: null,
    roleNote:
      'No fixed role in code — all principals start UNASSIGNED; roles are owner-assigned from the closed list (principal-assignments.ts).',
    job: 'Scouts the Fear & Greed Index.',
    whatItDoes: [
      'Harvests the seeded Fear & Greed Index source into the bounded RAW store via the governed web-harvest.',
      ROUTED_WORK,
    ],
    neverDoes: NEVER_DOES,
    apis: ['Alternative.me'],
    limits: SCOUT_LIMITS,
  },
  {
    principalId: 'tribe-benjamin',
    principal: 'BENJAMIN',
    role: null,
    roleNote:
      'No fixed role in code — all principals start UNASSIGNED; roles are owner-assigned from the closed list (principal-assignments.ts).',
    job: 'Scouts the Honeypot.is check for WETH.',
    whatItDoes: [
      'Harvests the seeded Honeypot.is WETH Check source into the bounded RAW store via the governed web-harvest — the same honeypot check that gates every Swap Desk handoff.',
      ROUTED_WORK,
    ],
    neverDoes: NEVER_DOES,
    apis: ['Honeypot.is'],
    limits: SCOUT_LIMITS,
  },
];

/** One card per principal, in the canonical Revelation-7 order
 * (TRIBE_PRINCIPALS). The array above is written in that order;
 * this lookup accepts either the canonical id ('tribe-judah')
 * or the display name ('JUDAH'). */
export function getJobForPrincipal(principalId: string): PrincipalJob | null {
  const key = principalId.trim().toLowerCase();
  const found =
    PRINCIPAL_JOBS.find((j) => j.principalId.toLowerCase() === key) ??
    PRINCIPAL_JOBS.find((j) => j.principal.toLowerCase() === key);
  return found ?? null;
}

/** The canonical principal order, for any surface that renders
 * the cards in roster order. */
export const PRINCIPAL_JOB_ORDER: string[] = TRIBE_PRINCIPALS.map((p) => p.id);
