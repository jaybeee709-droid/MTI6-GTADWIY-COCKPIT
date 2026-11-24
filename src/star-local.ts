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
  return `${FROM_RECORDS}the recorded knowledge gaps are: ${zeroStrategy.map((m) => `${m.title} (types recorded, 0 strategies)`).join('; ')}; ${emptyFams.length} families hold no backbone major (${emptyFams.join(', ')}); Action and Sub-Action levels hold 0 records — Batch C is the owner's separate freeze decision and has not been taken. Gaps are surfaced, never filled.`;
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

  if (/opportunit/.test(q)) return opportunitySummary();

  if (/(gap|missing|incomplete|not built|what's missing|what is missing)/.test(q)) return gapSummary();

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
    return `${FROM_RECORDS}the encyclopedia holds ${ENCYCLOPEDIA_COUNTS.total} activity records — ${ENCYCLOPEDIA_COUNTS.families} families, ${ENCYCLOPEDIA_COUNTS.majors} major activities (the canonical 60 backbone), ${ENCYCLOPEDIA_COUNTS.types} types, ${ENCYCLOPEDIA_COUNTS.strategies} strategies, and 0 actions / 0 sub-actions. Crypto World has ${CRYPTO_WORLD_CONTENTS.length} canonical contents and Earnings World ${EARNINGS_CATEGORIES.length} categories. All records are UNVERIFIED.`;

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
