/**
 * STAR's local brain — deterministic answers computed from the
 * platform's own records, used while no AI provider key is
 * configured on the server. This follows the Copilot-era design
 * (js/star-world.js): STAR answers from the records first. Every
 * answer is rendered with the DEMO label in the panel — it is a
 * local, rule-based answerer, not an AI model — and it invents
 * nothing: counts come from the generated canonical data modules,
 * session facts from the provenance log, opportunities from the
 * owner's own local records. When the provider key lands, real
 * model replies replace these through the same panel.
 */
import { CANONICAL_60, ENCYCLOPEDIA_COUNTS, ENCYCLOPEDIA_FAMILIES, ENCYCLOPEDIA_INDEX } from './encyclopedia-data';
import { ENTITY_COUNTS, ENTITY_UNIVERSE } from './entity-data';
import { WORKSPACE_COVERAGE } from './workspace-coverage-data';
import { CRYPTO_WORLD_CONTENTS, EARNINGS_CATEGORIES, TRIBE_PRINCIPALS } from './worlds-data';
import { getProvenanceLog } from './live-data';
import { memorySummary } from './bot-memory';
import { contractRegistrySummary } from './contract-registry';
import { EXECUTORS, runtimeStoreSummary } from './worker-runtime';
import { dexRegistrySummary } from './dex-registry';
import { bridgeRegistrySummary } from './bridge-registry';
import { assetUniverseSummary } from './asset-universe';
import { moneyRadarSummaryText } from './money-radar';
import { CRYPTO_WORKSPACES } from './crypto-workspaces-data';

// §69 WHY? for a named workspace: the recorded chain behind what
// the workspace shows, from the registry + coverage records only.
function workspaceWhy(q: string): string | null {
  if (!/(why|shown|showing|see this)/.test(q)) return null;
  const hit = CRYPTO_WORKSPACES.find((w) => q.includes(w.title.toLowerCase()));
  if (!hit) return null;
  const cov = WORKSPACE_COVERAGE[hit.id];
  if (!cov) return null;
  return `${FROM_RECORDS}${hit.title} is shown because the CW-2 registry records it with status ${hit.status}${hit.gated ? ' (an owner-gated seat)' : ''}. Its content derives one way only: registry record \u2192 CW-1 resolver coverage \u2192 ${cov.majors.length} primary and ${cov.secondaryMajors.length} secondary backbone majors \u2192 their recorded types and strategies. Its ladder tops out at ${cov.ladderTop || hit.ladderTop} and execution is disabled. If a section of it reads empty, that is the record's true state — nothing is filled in.`;
}

const FROM_RECORDS = 'From the platform\u2019s own records: ';

function opportunitySummary(): string {
  let records: { pipelineState?: string }[] = [];
  try {
    const raw = localStorage.getItem('mti6_opportunities_v1');
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) records = parsed;
  } catch {
    records = [];
  }
  if (records.length === 0)
    return `${FROM_RECORDS}there are 0 opportunity records. The discovery feed is NOT_CONNECTED; the owner can record one on the Opportunities screen. The pipeline runs DISCOVERED \u2192 PREPARED and never executes.`;
  const byStage = new Map<string, number>();
  for (const r of records) byStage.set(r.pipelineState ?? 'DISCOVERED', (byStage.get(r.pipelineState ?? 'DISCOVERED') ?? 0) + 1);
  const stages = [...byStage.entries()].map(([s, n]) => `${n} at ${s}`).join(', ');
  return `${FROM_RECORDS}${records.length} owner-entered opportunit${records.length === 1 ? 'y' : 'ies'} (${stages}). All UNVERIFIED; the pipeline terminal is PREPARED and execution is disabled.`;
}

function gapSummary(): string {
  const childrenOf = (pid: string) => ENCYCLOPEDIA_INDEX.filter((e) => e.parent === pid);
  const zeroStrategy = CANONICAL_60.filter((m) => {
    const types = childrenOf(m.id).filter((c) => c.level === 'TYPE');
    const direct = childrenOf(m.id).filter((c) => c.level === 'STRATEGY').length;
    const under = types.reduce((n, t) => n + childrenOf(t.id).filter((c) => c.level === 'STRATEGY').length, 0);
    return direct + under === 0;
  });
  const famsWith = new Set(CANONICAL_60.map((m) => m.family));
  const emptyFams = ENCYCLOPEDIA_FAMILIES.filter((f) => !famsWith.has(f.id)).map((f) => f.title);
  return `${FROM_RECORDS}the recorded knowledge gaps are: ${zeroStrategy.map((m) => `${m.title} (types recorded, 0 strategies)`).join('; ')}; ${emptyFams.length} families hold no backbone major (${emptyFams.join(', ')}); the Action level holds ${ENCYCLOPEDIA_COUNTS.actions} records (Batch C — frozen by the owner 2026-11-24 and imported, all UNVERIFIED); the Sub-Action level holds 0 records — the next frontier, whose freeze decision has not been taken. Gaps are surfaced, never filled.`;
}

/* Per-entity intent (v161; CW-9 — STAR shares structured World
 * Engine context): a question naming a canonical entity is
 * answered from that entity's frozen record — definition,
 * registry, and its recorded references resolved to titles —
 * never from general knowledge. Matching is by recorded title
 * (or its base name before a parenthetical) or recorded symbol;
 * the longest matching title wins. */
function entityAnswer(q: string): string | null {
  const titleOf = (id: string) =>
    ENTITY_UNIVERSE.find((e) => e.id === id)?.title ??
    CANONICAL_60.find((m) => m.id === id)?.title ??
    id;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordIn = (phrase: string) => new RegExp(`\\b${esc(phrase)}\\b`).test(q);
  const matches = ENTITY_UNIVERSE.filter((e) => {
    const title = e.title.toLowerCase();
    const base = title.replace(/\(.*?\)/g, '').trim();
    if (q.includes(title)) return true;
    if (base.length >= 3 && wordIn(base)) return true;
    if (e.symbol && wordIn(e.symbol.toLowerCase())) return true;
    return false;
  });
  if (matches.length === 0) return null;
  const e = [...matches].sort((a, b) => b.title.length - a.title.length)[0];
  const kind =
    e.registry === 'chains' ? 'network' : e.registry === 'assets' ? 'asset' : 'protocol';
  const parts = [`${FROM_RECORDS}${e.title} is a recorded ${kind} in the Entity Universe (UNVERIFIED). ${e.definition}`];
  if (e.formerName) parts.push(`Formerly named ${e.formerName}; the canonical name is ${e.title}.`);
  if (e.symbol) parts.push(`Recorded symbol: ${e.symbol}.`);
  if (e.registry === 'chains') {
    parts.push(`Chain ID: ${e.chainId ?? 'NOT RECORDED'}.`);
    if (e.nativeAssetRef) parts.push(`Native asset: ${titleOf(e.nativeAssetRef)}.`);
  }
  if (e.networkRef) parts.push(`Recorded network: ${titleOf(e.networkRef)}.`);
  if (e.activityRefs && e.activityRefs.length > 0)
    parts.push(`Backbone activities it is recorded against: ${e.activityRefs.map(titleOf).join(', ')}.`);
  if (e.networkRefs && e.networkRefs.length > 0)
    parts.push(`Recorded networks: ${e.networkRefs.map(titleOf).join(', ')}.`);
  parts.push('Anything beyond this record — prices, yields, live state — is not in the record and I will not invent it.');
  return parts.join(' ');
}

export function answerLocally(raw: string): string | null {
  const q = raw.toLowerCase();

  if (/(execut|buy|sell|trade|swap|withdraw|send money|place an order)/.test(q))
    return 'I cannot do that, by design. Work in this platform ends at PREPARED on the capability ladder (MONITOR \u2192 ANALYZE \u2192 RECOMMEND \u2192 PREPARE \u2192 OWNER APPROVAL \u2192 EXECUTE), and EXECUTE is disabled. Nothing was acted on.';

  if (/(money radar|capital flow|money move|what's happening|what is happening|radar)/.test(q))
    return moneyRadarSummaryText();

  if (/opportunit/.test(q)) return opportunitySummary();

  if (/(gap|missing|incomplete|not built|what's missing|what is missing)/.test(q)) return gapSummary();

  if (/(contract registry|discovered contracts|contract discovery)/.test(q)) {
    const reg = contractRegistrySummary();
    if (reg.total === 0) {
      return `${FROM_RECORDS}the Contract Discovery Registry is empty — no contracts recorded yet. Check one in Bot Operations (keyless Blockscout read) or say "run an explorer check" and the EIGEN anchor lands there with its evidence. Entries are discovery evidence for the owner's gate: not canonical entities, not verified truth, never execution authority.`;
    }
    return `${FROM_RECORDS}the Contract Discovery Registry holds ${reg.total} contract(s), ${reg.verified} with explorer-verified source. Latest: ${reg.latest?.name ?? 'unnamed'} on ${reg.latest?.network} (${reg.latest?.role}), checked ${reg.latest ? new Date(reg.latest.checkedAt).toLocaleString() : ''} via ${reg.latest?.checkedBy}. Entries are evidence for the owner's gate — verification is evidence, not a truth promotion.`;
  }
  if (/(dex registry|dexes|relationship cand|classification|classified)/.test(q)) {
    const s = dexRegistrySummary();
    if (s.dexCount === 0) {
      return `${FROM_RECORDS}the DEX Registry is empty — no DEX scan has run yet. Say "run a dex scan" and the runtime classifies the DefiLlama protocol index, places every DEX-class entry here as an UNVERIFIED candidate, and derives deployed_on / native-token relationship candidates. Classification is deterministic from the source's own category; placement follows the universal class matrix; only the owner's gate promotes a candidate.`;
    }
    return `${FROM_RECORDS}the DEX Registry holds ${s.dexCount} DEX candidate(s) across ${s.chainsCovered} chains, with ${s.relCount} relationship candidate(s) (deployed_on, has_native_token). All are UNVERIFIED candidates from DefiLlama Protocols — coverage is counted only from evidence each record carries (website, GitHub, chains, token contract), and the remaining checklist dimensions read ABSENT. Only the owner's gate promotes.`;
  }
  if (/(bridge registry|bridges|bridge scan)/.test(q)) {
    const s = bridgeRegistrySummary();
    if (s.bridgeCount === 0) {
      return `${FROM_RECORDS}the Bridge Registry is empty — no bridge scan has run yet. Say "run a bridge scan" and the runtime classifies the DefiLlama protocol index and places every BRIDGE-class entry here as an UNVERIFIED candidate with its chain span. Only the owner's gate promotes a candidate.`;
    }
    return `${FROM_RECORDS}the Bridge Registry holds ${s.bridgeCount} bridge candidate(s) spanning ${s.chainsCovered} chains in total. All are UNVERIFIED candidates from DefiLlama Protocols — a bridge's placement evidence is its chain span, carried by deployed_on relationship candidates. Only the owner's gate promotes.`;
  }

  if (/(asset universe|tier 1|tier one|which assets|asset tiers)/.test(q)) {
    const s = assetUniverseSummary();
    return `${FROM_RECORDS}the Asset Universe holds ${s.total} tiered candidate assets across ${s.tierCounts.length} tier families (Tiers 1–10: natives, stablecoins, wrapped, DEX governance, lending, liquid staking, restaking, yield trading, infrastructure, RWA, AI, DePIN). ${s.withContract} carry verified contract evidence from the catalogue (2+ independent sources); ${s.awaitingContract} read CONTRACT UNKNOWN — discovery tasks, never guesses. It is a curated candidate set by design, not an ingestion of every listed coin.`;
  }

  if (/(bot memory|bots remember|bot-memory|memory engine)/.test(q)) {
    const mem = memorySummary();
    if (mem.totalRetained === 0)
      return `${FROM_RECORDS}the Bot Memory layer is built and governed — provenance on every record, truth states kept for life, corrections and owner-only deletion — and it is EMPTY. It ships empty by design: no seeding, no automatic capture. Its first producer is the worker runtime — one record per completed run — and no run has completed yet.`;
    return `${FROM_RECORDS}Bot Memory holds ${mem.total} active records (${mem.totalRetained} retained including ${mem.supersededCount} superseded and ${mem.deletedCount} deleted tombstones). Active truth states: ${mem.byTruthState.UNVERIFIED ?? 0} UNVERIFIED, ${mem.byTruthState.REJECTED ?? 0} REJECTED, ${mem.staleCount} stale by their review dates. Nothing in it is VERIFIED — this layer cannot write VERIFIED at all.`;
  }

  if (/(what have the bots run|completed runs|runs completed|what did the runtime|what has the runtime|bot work done|runs done)/.test(q)) {
    const s = runtimeStoreSummary();
    if (s.recorded === 0)
      return `${FROM_RECORDS}the worker runtime has no recorded runs yet. Record a task with a runtime executor in Bot Operations and press RUN — or tell me "run a price check" and I will record and run it myself.`;
    const latest = s.latestCompleted
      .map((r) => `"${r.title}" — ${r.evidence.slice(0, 160)}`)
      .join(' · ');
    return `${FROM_RECORDS}the runtime has ${s.recorded} recorded run(s): ${s.completed} completed, ${s.failed} failed.${latest ? ` Latest completed: ${latest}.` : ''} Every completed run also wrote its Bot Memory record. The full record lives in Bot Operations.`;
  }

  if (/(worker runtime|the runtime|executors|what can the bots do|bots do for real|are the bots active|bots working)/.test(q)) {
    const s = runtimeStoreSummary();
    return `${FROM_RECORDS}the worker runtime is an in-page engine: it executes recorded tasks for real, but only while this app page is open — a closed page runs nothing, and a remote always-on runtime does not exist (NOT_CONNECTED). It has ${EXECUTORS.length} executors: ${EXECUTORS.map((e) => e.label).join(', ')}. Runs start from Bot Operations (RUN, RUN ALL, or auto-dispatch) or from me — say "run a price check". All-time: ${s.completed} completed of ${s.recorded} recorded. It does research and checks only: it signs nothing, sends nothing, and moves no funds.`;
  }

  const why = workspaceWhy(q);
  if (why) return why;

  if (/(workspace)/.test(q)) {
    const rows = Object.values(WORKSPACE_COVERAGE);
    const primary = rows.reduce((n, w) => n + w.majors.length, 0);
    const secondary = rows.reduce((n, w) => n + w.secondaryMajors.length, 0);
    return `${FROM_RECORDS}${rows.length} crypto workspaces are registered, carrying ${primary} primary and ${secondary} secondary links into the 60-major backbone — every link resolves against the frozen canonical data. Workspaces with no recorded majors are gated seats; no activity is invented for them.`;
  }

  const perEntity = entityAnswer(q);
  if (perEntity) return perEntity;

  if (/(entit|protocol|network|chain|asset)/.test(q)) {
    const names = ENTITY_UNIVERSE.slice(0, 6).map((e) => e.title).join(', ');
    return `${FROM_RECORDS}the Entity Universe holds ${ENTITY_COUNTS.total} entities — ${ENTITY_COUNTS.chains} networks, ${ENTITY_COUNTS.assets} assets, ${ENTITY_COUNTS.protocols} protocols (for example ${names}). Every one is UNVERIFIED: import and freeze are not verification.`;
  }

  if (/(encyclopedia|backbone|canonical|activit|how many|records)/.test(q))
    return `${FROM_RECORDS}the encyclopedia holds ${ENCYCLOPEDIA_COUNTS.total} activity records — ${ENCYCLOPEDIA_COUNTS.families} families, ${ENCYCLOPEDIA_COUNTS.majors} major activities (the canonical 60 backbone), ${ENCYCLOPEDIA_COUNTS.types} types, ${ENCYCLOPEDIA_COUNTS.strategies} strategies, ${ENCYCLOPEDIA_COUNTS.actions} actions, and ${ENCYCLOPEDIA_COUNTS.subActions} sub-actions. Crypto World has ${CRYPTO_WORLD_CONTENTS.length} canonical contents and Earnings World ${EARNINGS_CATEGORIES.length} categories. All records are UNVERIFIED.`;

  if (/(bot|tribe|worker|principal)/.test(q))
    return `${FROM_RECORDS}the bot system is STAR above 12 persistent Tribe principals (${TRIBE_PRINCIPALS.map((p) => p.displayName).join(', ')}) with task workers beneath them. Workers active: 0 — NOT_CONNECTED; no worker runtime exists yet, and work ends at PREPARED.`;

  if (/(live|price|provenance|source|fresh)/.test(q)) {
    const log = getProvenanceLog();
    if (log.length === 0)
      return 'No live observations have been served this session yet — open the Crypto Market or Crypto World screens and the governed feeds (CoinGecko \u2192 Coinbase \u2192 CoinPaprika for prices; DefiLlama for yields) record their provenance here. Nothing is claimed before it is observed.';
    const latest = log.slice(0, 3).map((r) => `${r.label} via ${r.source} (${r.status})`).join('; ');
    return `${FROM_RECORDS}${log.length} governed observations this session. Latest: ${latest}. Every figure carries its source, status and fetch time — stale data is labelled STALE, never passed off as current.`;
  }

  if (/(who are you|your name|what are you|star)/.test(q))
    return 'I am STAR, the platform\u2019s persistent assistant, sitting above the 12 Tribe principals. Right now you are hearing my local brain — deterministic answers from the platform\u2019s own records, labelled DEMO. When the owner adds the provider key in Netlify (MTI6_STAR_API_KEY), my full model replies come online in this same panel. Either way, I execute nothing: execution is disabled by design.';

  if (/(status|health|how is|overview)/.test(q)) {
    const log = getProvenanceLog();
    return `${FROM_RECORDS}${ENCYCLOPEDIA_COUNTS.total} encyclopedia records, ${ENTITY_COUNTS.total} entities (all UNVERIFIED), ${Object.keys(WORKSPACE_COVERAGE).length} workspaces, ${log.length} live observations this session, workers 0 active / NOT_CONNECTED, execution DISABLED. Health is never claimed beyond what was actually observed.`;
  }

  if (/(help|what can you|topics)/.test(q))
    return 'Ask me about: the encyclopedia and the 60 backbone, entities and protocols, workspaces, opportunities, knowledge gaps, the bots and Tribes, live data and provenance, or platform status. I answer from the records; anything else waits for my full brain (the Netlify key step).';

  return null;
}
