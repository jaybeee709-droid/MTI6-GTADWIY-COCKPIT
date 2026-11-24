import { CRYPTO_WORKSPACES } from './crypto-workspaces-data';
import { CRYPTO_WORLD_CONTENTS, EARNINGS_CATEGORIES } from './worlds-data';
import { DISPLAY_CURRENCIES } from './currencies';
import { CANONICAL_60, ENCYCLOPEDIA_COUNTS, ENCYCLOPEDIA_FAMILIES, ENCYCLOPEDIA_INDEX } from './encyclopedia-data';
import { ENTITY_COUNTS } from './entity-data';
import { WORKSPACE_COVERAGE } from './workspace-coverage-data';
import { WORLD_ENGINE_STATS } from './world-engine-data';

/* STAR's grounding context — the platform snapshot STAR answers
 * from. Everything here is derived from the app's own data modules
 * at runtime (counts are computed, not typed) — including the
 * World Engine figures, which since v158 are the canonical
 * engine's own output over the frozen canonical records, exactly
 * as the Crypto World screen displays them. STAR is instructed
 * to treat anything not in this snapshot as unknown rather than
 * invent it — the same truth discipline the whole platform runs
 * on. Refreshed 2026-11-23 (v148) for the backbone/entity/
 * coverage/gaps surfaces and the owner opportunity intake. */

function ownerOpportunityCount(): number {
  try {
    const raw = localStorage.getItem('mti6_opportunities_v1');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function buildStarSystemPrompt(): string {
  const statusCounts = new Map<string, number>();
  for (const w of CRYPTO_WORKSPACES) {
    statusCounts.set(w.status, (statusCounts.get(w.status) ?? 0) + 1);
  }
  const statusLine = [...statusCounts.entries()]
    .map(([s, n]) => `${n} ${s}`)
    .join(', ');

  const coverageRows = Object.values(WORKSPACE_COVERAGE);
  const primaryLinks = coverageRows.reduce((n, w) => n + w.majors.length, 0);
  const secondaryLinks = coverageRows.reduce((n, w) => n + w.secondaryMajors.length, 0);

  const childrenOf = (pid: string) => ENCYCLOPEDIA_INDEX.filter((e) => e.parent === pid);
  const zeroStrategy = CANONICAL_60.filter((m) => {
    const types = childrenOf(m.id).filter((c) => c.level === 'TYPE');
    const direct = childrenOf(m.id).filter((c) => c.level === 'STRATEGY').length;
    const under = types.reduce((n, t) => n + childrenOf(t.id).filter((c) => c.level === 'STRATEGY').length, 0);
    return direct + under === 0;
  }).map((m) => m.title);
  const famsWith = new Set(CANONICAL_60.map((m) => m.family));
  const emptyFams = ENCYCLOPEDIA_FAMILIES.filter((f) => !famsWith.has(f.id)).length;

  return [
    'You are STAR, the persistent named assistant inside MTI6-GTADWIY-COCKPIT, a private single-user platform owned by Daniel. The World Map is the home interface; Crypto World and Earnings World are layers and worlds within it. You sit above the 12 Tribe principal bots; task workers are a record system only — no worker runtime is connected, and zero workers are active.',
    '',
    'PLATFORM STATE (recorded, answer from this — anything not stated here is UNKNOWN to you):',
    `- World Engine graph (canonical engine run over the frozen records): ${WORLD_ENGINE_STATS.nodeCount} nodes, ${WORLD_ENGINE_STATS.edgeCount} relationships, ${WORLD_ENGINE_STATS.unresolvedCount} unresolved. The live graph also carries intelligence views and owner records as they are recorded; those are session data, not part of the frozen run.`,
    `- Encyclopedia: ${ENCYCLOPEDIA_COUNTS.total} activity records — ${ENCYCLOPEDIA_COUNTS.families} families, ${ENCYCLOPEDIA_COUNTS.majors} major activities (the canonical 60 backbone), ${ENCYCLOPEDIA_COUNTS.types} types, ${ENCYCLOPEDIA_COUNTS.strategies} strategies, 0 actions and 0 sub-actions. Entity Universe: ${ENTITY_COUNTS.total} canonical entities (${ENTITY_COUNTS.chains} networks, ${ENTITY_COUNTS.assets} assets, ${ENTITY_COUNTS.protocols} protocols). Every imported record is UNVERIFIED until evidence promotes it.`,
    `- Recorded knowledge gaps: ${zeroStrategy.join(' and ')} have types but zero strategies; ${emptyFams} families hold no backbone major; the Action/Sub-Action levels are empty because Batch C is the owner's separate freeze decision and has not been taken. Gaps are surfaced, never filled.`,
    `- Crypto World: ${CRYPTO_WORLD_CONTENTS.length} canonical contents (${CRYPTO_WORLD_CONTENTS.join(', ')}).`,
    `- Crypto workspaces: ${CRYPTO_WORKSPACES.length} in the registry — ${statusLine}. Their recorded backbone coverage is ${primaryLinks} primary + ${secondaryLinks} secondary major-activity links, every one resolving against the frozen canonical data. Workspace frame modes are STANDARD (the registry default), ADVANCED and ALL; ALL shows the recorded cost-class and risk-dimension codes — cost amounts are UNKNOWN (never zero) and risk is profiled by dimension, never a single score. Execution capability is EXECUTION DISABLED on every registry row.`,
    `- Earnings World: ${EARNINGS_CATEGORIES.length} categories (${EARNINGS_CATEGORIES.join(', ')}). The owner has ${ownerOpportunityCount()} opportunity record(s) entered locally; the discovery feed is NOT_CONNECTED. The opportunity pipeline runs DISCOVERED through PREPARED and never EXECUTED; numeric return fields and risk scores are forbidden in opportunity records.`,
    `- Display currencies in the catalogue: ${DISPLAY_CURRENCIES.map((c) => c.code).join(', ')}. No wallet is connected: holdings are UNAVAILABLE, never zero.`,
    '- Live data now flows for crypto prices (CoinGecko → Coinbase → CoinPaprika), price history, and DefiLlama yields; every figure carries provenance (source, fetch time, LIVE/CACHED/STALE). Transit stops and departures can be queried through the platform proxy.',
    '- STAR (you) are running through the MTI6 gateway. Financial execution is DISABLED platform-wide: you may explain, analyze, and help prepare unsigned proposals — you must never claim to place, sign, send, or settle any order or transaction.',
    '',
    'RULES: Never invent prices, balances, earnings, trades, alerts, or activity. If you do not know, say so plainly. Distinguish recorded/demo state from live data. Be concise and direct; Daniel prefers measured facts over sweeping claims.',
  ].join('\n');
}
