/* Worker Runtime — the in-page execution engine (worker-runtime
 * phase, owner-called 2026-11-23). This is the platform's first
 * REAL worker activity, and its limits are stated on its face:
 *
 *  - It runs IN THIS PAGE, only while the page is open. A closed
 *    page runs nothing. There is still no remote/always-on
 *    runtime; that stays NOT_CONNECTED.
 *  - It executes only the executor kinds defined here — real
 *    computations and governed fetches against the platform's
 *    own data and pipelines. It cannot execute financial actions;
 *    the ladder still ends at PREPARED.
 *  - Every run moves its task through the canonical transitions
 *    (worker-tasks.ts) and completes it with the run's own
 *    evidence — the words the run actually produced. A failed
 *    run marks the task FAILED with the reason.
 *  - Every completed run writes ONE Bot Memory record
 *    (ASSIGNMENT_OUTCOME, UNVERIFIED, source 'worker-runtime') —
 *    the memory layer's first governed producer, the wiring the
 *    v165 port deliberately held for this phase.
 *
 * Which queue tasks are runtime-executable lives in a small
 * registry of its own (mti6_runtime_kinds_v1: taskId → executor
 * id), so the canonical task record keeps its exact shape.
 */
import { fetchHistory, fetchPrice, fetchProtocolIndex, fetchYields, fmtTime, fmtUsd } from './live-data';
import { classifyCategory, dexCoverage, DEX_CHECKLIST, type DexCandidate } from './classification';
import {
  addRelationshipCandidates,
  loadDexCandidates,
  loadRelationshipCandidates,
  upsertDexCandidates,
  type RelationshipCandidate,
} from './dex-registry';
import { CANONICAL_60, ENCYCLOPEDIA_COUNTS, ENCYCLOPEDIA_FAMILIES, ENCYCLOPEDIA_INDEX } from './encyclopedia-data';
import { ENTITY_UNIVERSE } from './entity-data';
import { WORKSPACE_COVERAGE } from './workspace-coverage-data';
import { CRYPTO_WORKSPACES } from './crypto-workspaces-data';
import { memorySummary, recordMemory } from './bot-memory';
import { checkContractOnExplorer, loadContractEntries, recordContractCheck } from './contract-registry';
import { CATALOGUED_CONTRACTS } from './contract-catalog';
import { assetUniverse, assetUniverseSummary } from './asset-universe';
import { loadRawArchive } from './raw-archive';
import { alertCounts, loadAngelStore } from './angel-security';
import { PROXY_ACTIONS, PROXY_ENV_NAMES, PROXY_PROVIDERS } from './security-posture-data';
import { createTask, loadTasks, transitionTask, type WorkerTask } from './worker-tasks';

export interface RuntimeExecutor {
  id: string;
  label: string;
  does: string;
  run: () => Promise<string>;
}

export const EXECUTORS: RuntimeExecutor[] = [
  {
    id: 'price-check',
    label: 'PRICE CHECK',
    does: 'Fetches governed BTC/ETH/SOL prices through the live-data chains and reports each value with its source and status.',
    run: async () => {
      const parts: string[] = [];
      let anyData = false;
      for (const sym of ['BTC', 'ETH', 'SOL']) {
        const obs = await fetchPrice(sym);
        if (obs.value) {
          anyData = true;
          parts.push(
            `${sym} ${fmtUsd(obs.value.price)}${obs.value.change24h !== null ? ` (${obs.value.change24h >= 0 ? '+' : ''}${obs.value.change24h.toFixed(2)}% 24h)` : ''} · ${obs.source ?? 'unknown source'} · ${obs.status} · fetched ${fmtTime(obs.fetchedAt)}`,
          );
        } else {
          parts.push(`${sym}: NO_DATA (chain ${obs.chain.join(' → ')} exhausted)`);
        }
      }
      if (!anyData) throw new Error('Every price chain returned NO_DATA.');
      return parts.join(' · ');
    },
  },
  {
    id: 'provider-status',
    label: 'PROVIDER STATUS',
    does: 'Asks the gateway which API pipelines are configured (presence only) and reports the connection state of each.',
    run: async () => {
      const res = await fetch('/api/mti6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'gateway.status' }),
      });
      const env = (await res.json().catch(() => null)) as
        | { ok?: boolean; data?: { providersConfigured?: Record<string, boolean>; star?: { configured?: boolean; model?: string | null } } }
        | null;
      if (!env?.ok || !env.data?.providersConfigured) {
        throw new Error('The gateway did not answer a status report.');
      }
      const cfg = env.data.providersConfigured;
      const line = Object.entries(cfg)
        .map(([k, v]) => `${k.toUpperCase()}: ${v ? 'KEY PRESENT' : 'NOT SET'}`)
        .join(' · ');
      return `${line} · STAR: ${env.data.star?.configured ? `CONNECTED (${env.data.star.model ?? 'model unnamed'})` : 'DEMO (no key)'}`;
    },
  },
  {
    id: 'coverage-report',
    label: 'COVERAGE REPORT',
    does: 'Computes the backbone coverage picture from the canonical records: workspace links, zero-strategy majors, empty families.',
    run: async () => {
      const rows = Object.values(WORKSPACE_COVERAGE);
      const primary = rows.reduce((n, w) => n + w.majors.length, 0);
      const secondary = rows.reduce((n, w) => n + w.secondaryMajors.length, 0);
      const childrenOf = (pid: string) => ENCYCLOPEDIA_INDEX.filter((e) => e.parent === pid);
      const zeroStrategy = CANONICAL_60.filter((m) => {
        const types = childrenOf(m.id).filter((c) => c.level === 'TYPE');
        const direct = childrenOf(m.id).filter((c) => c.level === 'STRATEGY').length;
        const under = types.reduce((n, t) => n + childrenOf(t.id).filter((c) => c.level === 'STRATEGY').length, 0);
        return direct + under === 0;
      }).map((m) => m.title);
      const famsWith = new Set(CANONICAL_60.map((m) => m.family));
      const emptyFams = ENCYCLOPEDIA_FAMILIES.filter((f) => !famsWith.has(f.id)).length;
      return `${CRYPTO_WORKSPACES.length} workspaces · ${primary} primary + ${secondary} secondary backbone links · zero-strategy majors: ${zeroStrategy.join(', ') || 'none'} · ${emptyFams} families hold no backbone major · encyclopedia ${ENCYCLOPEDIA_COUNTS.total} records`;
    },
  },
  {
    id: 'link-integrity',
    label: 'LINK INTEGRITY',
    does: 'Walks every encyclopedia parent link and entity record and counts anything that does not resolve.',
    run: async () => {
      const ids = new Set(ENCYCLOPEDIA_INDEX.map((e) => e.id));
      let unresolved = 0;
      for (const e of ENCYCLOPEDIA_INDEX) {
        if (e.parent && !ids.has(e.parent)) unresolved += 1;
      }
      const registries = { chains: 0, assets: 0, protocols: 0 } as Record<string, number>;
      for (const ent of ENTITY_UNIVERSE) registries[ent.registry] = (registries[ent.registry] ?? 0) + 1;
      return `${ENCYCLOPEDIA_INDEX.length} encyclopedia records walked · ${unresolved} unresolved parent links · ${ENTITY_UNIVERSE.length} entities (${registries.chains} networks / ${registries.assets} assets / ${registries.protocols} protocols)`;
    },
  },
];

export const executorById = (id: string): RuntimeExecutor | null =>
  EXECUTORS.find((e) => e.id === id) ?? null;

/* Phase 2 executors (v172) — the remaining live capabilities put
 * to work through the same governed paths the screens use. */
EXECUTORS.push(
  {
    id: 'yield-scan',
    label: 'YIELD SCAN',
    does: 'Fetches the governed DefiLlama yield observation for the watched projects and reports the largest pools with their source-reported APY.',
    run: async () => {
      const obs = await fetchYields();
      if (!obs.value || obs.value.length === 0) {
        throw new Error('The yield chain returned NO_DATA.');
      }
      const top = [...obs.value].sort((a, b) => b.tvlUsd - a.tvlUsd).slice(0, 3);
      const parts = top.map(
        (p) => `${p.project} ${p.symbol} (${p.chain}) APY ${p.apy.toFixed(2)}% · TVL ${fmtUsd(p.tvlUsd)}`,
      );
      return `${obs.value.length} watched pools · ${obs.source ?? 'DefiLlama'} · ${obs.status} · top by TVL: ${parts.join(' · ')} · APY is percent, source-reported, variable — not a promise`;
    },
  },
  {
    id: 'history-check',
    label: 'HISTORY CHECK',
    does: 'Fetches the governed 7-day BTC price history and computes the period move from the real series points.',
    run: async () => {
      const obs = await fetchHistory('BTC', '7d');
      if (!obs.value || obs.value.points.length < 2) {
        throw new Error('The history chain returned NO_DATA.');
      }
      const pts = obs.value.points;
      const first = pts[0].p;
      const last = pts[pts.length - 1].p;
      const move = ((last - first) / first) * 100;
      return `BTC 7d · ${pts.length} real series points · ${fmtUsd(first)} → ${fmtUsd(last)} (${move >= 0 ? '+' : ''}${move.toFixed(2)}% computed from the series) · ${obs.source ?? 'unknown source'} · ${obs.status}`;
    },
  },
  {
    id: 'geocode-check',
    label: 'GEOCODE CHECK',
    does: 'Resolves the Bronx through the gateway geocoding chain (Geoapify, then LocationIQ) and reports which provider answered with real coordinates.',
    run: async () => {
      const res = await fetch('/api/mti6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'geo.geocode', payload: { q: 'Bronx, New York' } }),
      });
      const env = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            data?: { results?: { label: string; lat: number; lon: number }[]; provider?: string };
            error?: { code?: string };
          }
        | null;
      if (!env?.ok) {
        const code = env?.error?.code ?? 'UPSTREAM_ERROR';
        throw new Error(
          code === 'AUTH_REQUIRED'
            ? 'Geocoding is NOT_CONFIGURED on the server (no provider key set yet).'
            : code === 'NOT_FOUND'
              ? 'The geocoding chain answered with no match for the Bronx query.'
              : `Geocoding query failed (${code}).`,
        );
      }
      const results = env.data?.results ?? [];
      const first = results[0];
      if (!first) throw new Error('The geocoding chain returned no results.');
      return `${env.data?.provider ?? 'geocoding chain'} answered · ${results.length} result(s) · first: ${first.label} @ ${first.lat.toFixed(4)}, ${first.lon.toFixed(4)} · pipeline live through the gateway`;
    },
  },
  {
    id: 'transit-check',
    label: 'TRANSIT CHECK',
    does: 'Queries live transit stops near the recorded Bronx reference point through the gateway (Transitland) and reports what answers.',
    run: async () => {
      const res = await fetch('/api/mti6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transit.stopsNear',
          payload: { lat: 40.8448, lon: -73.8648, radius: 1500, limit: 25 },
        }),
      });
      const env = (await res.json().catch(() => null)) as
        | { ok?: boolean; data?: { stops?: unknown[] }; error?: { code?: string } }
        | null;
      if (!env?.ok) {
        const code = env?.error?.code ?? 'UPSTREAM_ERROR';
        throw new Error(
          code === 'AUTH_REQUIRED' ? 'Transit is NOT_CONFIGURED on the server.' : `Transit query failed (${code}).`,
        );
      }
      const stops = Array.isArray(env.data?.stops) ? env.data.stops : [];
      const names: string[] = [];
      for (const raw of stops.slice(0, 3)) {
        const s = raw as Record<string, unknown>;
        const name = s.stop_name ?? s.name;
        if (typeof name === 'string' && name) names.push(name);
      }
      return `${stops.length} stops within 1500m of the Bronx reference point · Transitland via the gateway · first: ${names.join(' · ') || 'names not published'}`;
    },
  },
);

/* Phase 3 executors (v180) — the runtime reports on the
 * family's own governed stores: Bot Memory and the gateway
 * posture record. Both are pure reads over real in-app data. */
EXECUTORS.push(
  {
    id: 'memory-report',
    label: 'MEMORY REPORT',
    does: 'Summarizes Bot Memory from its own governed summary: active and retained counts, truth states, and stale records.',
    run: async () => {
      const s = memorySummary();
      const kinds = Object.entries(s.byKind)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${k} ${n}`)
        .join(' · ');
      return `Bot Memory: ${s.total} active of ${s.totalRetained} retained · UNVERIFIED ${s.byTruthState.UNVERIFIED ?? 0} · REJECTED ${s.byTruthState.REJECTED ?? 0} · ${s.staleCount} stale · kinds: ${kinds || 'none yet'} · VERIFIED is never writable by this layer`;
    },
  },
  {
    id: 'posture-check',
    label: 'POSTURE CHECK',
    does: 'Reports the gateway posture from the generated posture record: the action allowlist, the providers, and the env names the proxy reads (names only, never values).',
    run: async () =>
      `Gateway posture (from the generated record): ${PROXY_ACTIONS.length} actions allowlisted (${PROXY_ACTIONS.join(', ')}) · ${PROXY_PROVIDERS.length} providers (${PROXY_PROVIDERS.join(', ')}) · ${PROXY_ENV_NAMES.length} env names read, values never in the client`,
  },
);

/* Phase 3 (v181) — the opportunity digest: what the pipeline
 * holds for the owner, by stage, with whatever sits at PREPARED
 * named. A pure read of the owner's opportunity store; the
 * pipeline ends at PREPARED and never executes. */
EXECUTORS.push({
  id: 'opportunity-digest',
  label: 'OPPORTUNITY DIGEST',
  does: 'Reads the owner\u2019s opportunity store and reports the pipeline by stage, naming anything at PREPARED awaiting the owner\u2019s decision.',
  run: async () => {
    let records: { title?: unknown; pipelineState?: unknown }[] = [];
    try {
      const raw = localStorage.getItem('mti6_opportunities_v1');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) records = parsed;
    } catch {
      records = [];
    }
    if (records.length === 0) {
      return '0 opportunity records. The discovery feed is NOT_CONNECTED; opportunities are owner-recorded on the Opportunities screen. Nothing is at PREPARED, and nothing can be earned from an empty pipeline.';
    }
    const byStage = new Map<string, number>();
    const preparedTitles: string[] = [];
    for (const r of records) {
      const stage = typeof r.pipelineState === 'string' ? r.pipelineState : 'DISCOVERED';
      byStage.set(stage, (byStage.get(stage) ?? 0) + 1);
      if (stage === 'PREPARED' && typeof r.title === 'string') preparedTitles.push(r.title);
    }
    const stages = [...byStage.entries()].map(([s, n]) => `${s} ${n}`).join(' · ');
    return `${records.length} opportunity record(s) · ${stages} · ${preparedTitles.length} at PREPARED${preparedTitles.length ? `: ${preparedTitles.join(' · ')}` : ''} — PREPARED is the end of the line: acting on one is the owner's own step, outside the platform`;
  },
});

/* The Contract Intelligence edge (v184): a keyless Blockscout
 * REST v2 read of the owner-confirmed EIGEN token contract on
 * Ethereum — the same explorer check js/discovery-bots.js
 * performs for the candidate pipeline. Verification state is
 * EVIDENCE about the contract's source, never a truth promotion
 * and never execution authority: this reads, it cannot call. */
EXECUTORS.push({
  id: 'explorer-check',
  label: 'EXPLORER CHECK',
  does: 'Reads the EIGEN token contract (the owner-confirmed anchor) on Blockscout’s keyless API and reports its source-verification state as evidence.',
  run: async () => {
    const address = '0xec53bf9167f50cdeb3ae105f56099aaab9061f83';
    const res = await fetch(`https://eth.blockscout.com/api/v2/smart-contracts/${address}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Blockscout answered HTTP ${res.status}`);
    const body = (await res.json()) as {
      is_verified?: boolean;
      name?: string;
      compiler_version?: string;
      implementations?: { address_hash?: string }[];
    };
    const impl = body.implementations?.[0]?.address_hash;
    recordContractCheck(
      'ethereum',
      address,
      'TOKEN',
      {
        name: typeof body.name === 'string' ? body.name : null,
        isVerified: body.is_verified === true,
        compilerVersion: typeof body.compiler_version === 'string' ? body.compiler_version : null,
        implementationAddress: impl ?? null,
        sourceUrl: `https://eth.blockscout.com/api/v2/smart-contracts/${address}`,
      },
      'explorer-check',
    );
    return `EIGEN token contract ${address} on Ethereum (owner-confirmed anchor) · Blockscout source verified: ${body.is_verified ? 'YES' : 'NO'} · contract name: ${body.name ?? 'not reported'} · compiler: ${body.compiler_version ?? 'not reported'} · proxy: ${impl ? `yes, implementation ${impl}` : 'no'} · recorded in the Contract Discovery Registry — explorer verification is evidence about source code, not a truth promotion; execution stays DISABLED`;
  },
});

/* Opportunity discovery (v189) — Fabric Priority 4, fed by the
 * owner-named source (DefiLlama Yields, Registry v1 Category I).
 * The scan reads the governed yields fetch and records NEW pools
 * as DISCOVERED candidates in the owner's opportunity store —
 * candidate isolation holds: records are born UNVERIFIED at
 * DISCOVERED, carry NO return/APY figures (forbidden in
 * opportunity records; the yield figure lives on the yields
 * surface with its source label), and move only through the
 * pipeline's own transitions toward PREPARED. Nothing here
 * approves, recommends, or executes. */
EXECUTORS.push({
  id: 'opportunity-scan',
  label: 'OPPORTUNITY SCAN',
  does: 'Scans the watched DefiLlama yield pools and records new ones as DISCOVERED opportunity candidates (UNVERIFIED, no return figures) in the opportunity store.',
  run: async () => {
    const obs = await fetchYields();
    if (!obs.value || obs.value.length === 0) {
      return `Opportunity scan: the yields source answered ${obs.status} with no pools — no candidates created. The discovery source is DefiLlama Yields via the governed fetch; an empty answer creates nothing.`;
    }
    const KEY = 'mti6_opportunities_v1';
    let records: Record<string, unknown>[] = [];
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) records = parsed as Record<string, unknown>[];
    } catch {
      records = [];
    }
    const slug = (s: string): string =>
      s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'pool';
    const existing = new Set(records.map((r) => String(r.id)));
    let created = 0;
    let already = 0;
    const fresh: Record<string, unknown>[] = [];
    for (const pool of obs.value) {
      const id = `opp-defillama-${slug(`${pool.project}-${pool.symbol}-${pool.chain}`)}`;
      if (existing.has(id)) {
        already += 1;
        continue;
      }
      if (created >= 8) continue;
      existing.add(id);
      created += 1;
      fresh.push({
        id,
        title: `${pool.project} ${pool.symbol} pool (${pool.chain})`,
        assetRef: { assetClassId: '', chain: pool.chain },
        networkRef: { networkId: '' },
        majorActivityId: '',
        typeId: '',
        strategyId: '',
        source: 'worker-runtime:opportunity-scan',
        verificationStatus: 'UNVERIFIED',
        pipelineState: 'DISCOVERED',
        protocolRef: { name: pool.project, source: 'DefiLlama Yields (yields.llama.fi/pools)' },
        returnSource: {
          description:
            'Pool yield is reported by the source and shown, source-labelled, on the yields surface — never copied into this record.',
          source: 'DefiLlama Yields',
        },
      });
    }
    if (fresh.length > 0) {
      try {
        localStorage.setItem(KEY, JSON.stringify([...fresh, ...records]));
      } catch {
        return `Opportunity scan: storage unavailable — ${fresh.length} candidate(s) identified but NOT recorded. Source status ${obs.status}.`;
      }
    }
    return `Opportunity scan via DefiLlama Yields (status ${obs.status}): ${obs.value.length} watched pools · ${created} new DISCOVERED candidate(s) recorded · ${already} already recorded. Candidates are UNVERIFIED, carry no return figures, and advance only through the pipeline's own gates — nothing is approved or executed.`;
  },
});

/* DEX discovery + classification (v190) — the auto-placement
 * pipeline's first working slice. The scan reads the governed
 * DefiLlama protocol index, classifies every entry through the
 * deterministic category map (src/classification.ts), places
 * DEX-class entries into the DEX Registry as CANDIDATES, and
 * derives relationship candidates (deployed_on, has_native_token)
 * into their own candidate store. Candidates only: nothing is
 * approved, merged, or written canonical — the gate decides. */
EXECUTORS.push({
  id: 'dex-scan',
  label: 'DEX SCAN',
  does: 'Classifies the DefiLlama protocol index, places DEX-class entries into the DEX Registry as candidates, and derives deployed_on / native-token relationship candidates.',
  run: async () => {
    const obs = await fetchProtocolIndex();
    if (!obs.value || obs.value.length === 0) {
      return `DEX scan: the DefiLlama protocol index answered ${obs.status} with no entries — nothing classified, nothing placed.`;
    }
    const now = Date.now();
    const dexFresh: DexCandidate[] = [];
    const relFresh: RelationshipCandidate[] = [];
    let classified = 0;
    let dexClassTotal = 0;
    /* Placement is capped (registry discipline): the index is
     * TVL-ranked by the source, so the first DEX-class entries
     * are the largest; the rest await later scans and the gate. */
    const DEX_PLACE_CAP = 60;
    for (const entry of obs.value) {
      const { cls, subclass } = classifyCategory(entry.category);
      classified += 1;
      if (cls !== 'DEX') continue;
      dexClassTotal += 1;
      if (dexFresh.length >= DEX_PLACE_CAP) continue;
      dexFresh.push({
        id: entry.slug,
        name: entry.name,
        cls: 'DEX',
        subclass,
        chains: entry.chains,
        url: entry.url,
        github: entry.github,
        tokenSymbol: entry.symbol,
        tokenAddress: entry.tokenAddress,
        source: 'DefiLlama Protocols',
        status: 'CANDIDATE',
        truthState: 'UNVERIFIED',
        discoveredAt: now,
        updatedAt: now,
      });
      for (const chain of entry.chains) {
        relFresh.push({
          id: `${entry.slug}|deployed_on|${chain}`,
          from: entry.name,
          relation: 'deployed_on',
          to: chain,
          source: 'DefiLlama Protocols',
          status: 'CANDIDATE',
          at: now,
        });
      }
      if (entry.symbol) {
        relFresh.push({
          id: `${entry.slug}|has_native_token|${entry.symbol}`,
          from: entry.name,
          relation: 'has_native_token',
          to: entry.symbol,
          source: 'DefiLlama Protocols',
          status: 'CANDIDATE',
          at: now,
        });
      }
    }
    const dexRes = upsertDexCandidates(dexFresh);
    const relRes = addRelationshipCandidates(relFresh);
    const covered = dexFresh.reduce((acc, c) => acc + dexCoverage(c).length, 0);
    const avgCoverage = dexFresh.length > 0 ? (covered / dexFresh.length).toFixed(1) : '0';
    return `DEX scan via DefiLlama Protocols (status ${obs.status}): ${classified} protocols classified · ${dexClassTotal} DEX-class found, first ${dexFresh.length} placed as candidates (${dexRes.created} new, ${dexRes.updated} refreshed; registry holds ${dexRes.total}) · ${relRes.created} new relationship candidates (store holds ${relRes.total}) · average checklist evidence ${avgCoverage}/${DEX_CHECKLIST.length} dimensions per DEX — the rest read ABSENT, never guessed. All candidates UNVERIFIED; only the owner's gate promotes.`;
  },
});

/* Bot coverage expansion (v192) — the owner's direction: the
 * bots get in anywhere they can help — every registry, store,
 * and surface — building the platform up and keeping it updated
 * and secure, inside the same law (candidates only, evidence
 * only, execution disabled). Four coverage executors: the asset
 * universe audit, freshness assignment across stores, the
 * security sweep, and catalogue maintenance re-checks. */

EXECUTORS.push({
  id: 'universe-check',
  label: 'UNIVERSE CHECK',
  does: 'Audits the tiered Asset Universe: tier coverage, verified-contract joins, and the CONTRACT UNKNOWN symbols standing as open discovery tasks.',
  run: async () => {
    const s = assetUniverseSummary();
    const unknown = assetUniverse()
      .filter((a) => !a.contract)
      .map((a) => a.symbol);
    return `Asset Universe audit: ${s.total} candidate assets across Tiers 1–10 · ${s.withContract} with verified contract evidence · ${s.awaitingContract} CONTRACT UNKNOWN (open discovery tasks: ${unknown.slice(0, 14).join(', ')}${unknown.length > 14 ? ', …' : ''}). Contracts attach only through the verified catalogue — no symbol gets an address by guessing.`;
  },
});

EXECUTORS.push({
  id: 'freshness-check',
  label: 'FRESHNESS CHECK',
  does: 'Assigns freshness states (CURRENT / AGING / STALE / UNKNOWN) across the candidate stores from their own timestamps — never guessed.',
  run: async () => {
    const now = Date.now();
    const stateOf = (ts: number | null): string => {
      if (ts === null) return 'UNKNOWN (no records)';
      const ageH = (now - ts) / 3_600_000;
      if (ageH < 24) return `CURRENT (newest ${ageH.toFixed(1)}h old)`;
      if (ageH < 168) return `AGING (newest ${(ageH / 24).toFixed(1)}d old)`;
      return `STALE (newest ${(ageH / 24).toFixed(1)}d old)`;
    };
    const dex = loadDexCandidates();
    const rels = loadRelationshipCandidates();
    const contracts = loadContractEntries();
    const archive = loadRawArchive();
    const mem = memorySummary();
    const newest = (xs: number[]): number | null => (xs.length ? Math.max(...xs) : null);
    return [
      `Freshness assignment (thresholds: <24h CURRENT · <7d AGING · else STALE):`,
      `DEX Registry (${dex.length}): ${stateOf(newest(dex.map((d) => d.updatedAt)))}`,
      `Relationship candidates (${rels.length}): ${stateOf(newest(rels.map((r) => r.at)))}`,
      `Contract Registry (${contracts.length}): ${stateOf(newest(contracts.map((c) => c.checkedAt)))}`,
      `Raw Archive (${archive.length}): ${stateOf(newest(archive.map((a) => a.at)))}`,
      `Bot Memory (${mem.total} active): ${mem.staleCount} past their review dates`,
    ].join(' · ');
  },
});

EXECUTORS.push({
  id: 'security-sweep',
  label: 'SECURITY SWEEP',
  does: 'Sweeps the platform’s security posture: gateway allowlist, angel alerts by state, and the execution boundary (no opportunity record may sit past PREPARED).',
  run: async () => {
    const store = loadAngelStore();
    const counts = alertCounts(store.alerts);
    const active = store.alerts.filter((a) => a.state === 'ACTIVE' || a.state === 'CONFIRMED').length;
    let oppLine = 'opportunity store unreadable';
    try {
      const raw = localStorage.getItem('mti6_opportunities_v1');
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? (parsed as { pipelineState?: string }[]) : [];
      const past = list.filter((r) => {
        const order = ['DISCOVERED', 'IDENTIFIED', 'DATA_VERIFIED', 'RISK_ANALYZED', 'DEPENDENCIES_CHECKED', 'FRESHNESS_CHECKED', 'SIMULATED', 'RANKED', 'RECOMMENDED', 'PREPARED'];
        const i = order.indexOf(String(r.pipelineState));
        return i < 0 || i > order.indexOf('PREPARED');
      }).length;
      oppLine = `${list.length} opportunity record(s), ${past} past PREPARED (must be 0)`;
    } catch {
      /* oppLine stays honest */
    }
    return `Security sweep: gateway allowlist ${PROXY_ACTIONS.length} actions · ${PROXY_PROVIDERS.length} providers · ${PROXY_ENV_NAMES.length} env names (values never read) · Angel Security: ${store.alerts.length} alert(s), ${active} confirmed/active (by state: ${Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}) · execution boundary: ${oppLine} · execution remains DISABLED by design.`;
  },
});

EXECUTORS.push({
  id: 'catalog-check',
  label: 'CATALOGUE CHECK',
  does: 'Re-checks the least-recently-checked catalogued contracts against Blockscout (4 per run) and records the fresh evidence — catalogue maintenance, drift surfaces as evidence.',
  run: async () => {
    const entries = loadContractEntries();
    const lastByKey = new Map(entries.map((e) => [`${e.network}:${e.address}`, e.checkedAt]));
    const ordered = [...CATALOGUED_CONTRACTS].sort(
      (a, b) => (lastByKey.get(`${a.network}:${a.address}`) ?? 0) - (lastByKey.get(`${b.network}:${b.address}`) ?? 0),
    );
    const slice = ordered.slice(0, 4);
    const lines: string[] = [];
    for (const c of slice) {
      try {
        const result = await checkContractOnExplorer(c.network, c.address);
        recordContractCheck(c.network, c.address, c.role, result, 'catalog-check');
        lines.push(
          `${c.symbol}: live name ${result.name ?? 'not reported'} · source verified ${result.isVerified ? 'YES' : 'NO — DRIFT vs catalogue'}`,
        );
      } catch (err) {
        lines.push(`${c.symbol}: check failed (${err instanceof Error ? err.message : 'unknown'}) — recorded nothing`);
      }
    }
    return `Catalogue check (rotation, ${slice.length} of ${CATALOGUED_CONTRACTS.length}): ${lines.join(' · ')}. Fresh evidence recorded in the Contract Discovery Registry; a NO on verified is drift evidence for the owner, never an automatic edit.`;
  },
});

/* STAR chat command matching (v172): "run a price check" and
 * its kin map to an executor. Deliberately narrow — a run verb
 * plus an executor keyword — so ordinary questions never fire
 * a run by accident. */
export function runtimeCommandFor(text: string): string | null {
  const q = text.toLowerCase();
  if (!/(run|execute|start|do)\b/.test(q)) return null;
  if (q.includes('price')) return 'price-check';
  if (q.includes('yield')) return 'yield-scan';
  if (q.includes('history')) return 'history-check';
  if (q.includes('transit') || q.includes('stop')) return 'transit-check';
  if (q.includes('geocode') || q.includes('place')) return 'geocode-check';
  if (q.includes('memory')) return 'memory-report';
  if (q.includes('posture') || q.includes('security')) return 'posture-check';
  if (q.includes('freshness') || q.includes('stale')) return 'freshness-check';
  if (q.includes('sweep')) return 'security-sweep';
  if (q.includes('catalog')) return 'catalog-check';
  if (q.includes('universe')) return 'universe-check';
  if (q.includes('dex') && (q.includes('scan') || q.includes('classif') || q.includes('registr'))) return 'dex-scan';
  if (q.includes('opportunit') && (q.includes('scan') || q.includes('discover'))) return 'opportunity-scan';
  if (q.includes('opportunit')) return 'opportunity-digest';
  if (q.includes('explorer') || q.includes('blockscout') || q.includes('contract')) return 'explorer-check';
  if (q.includes('provider') || q.includes('connection')) return 'provider-status';
  if (q.includes('coverage')) return 'coverage-report';
  if (q.includes('link') || q.includes('integrity')) return 'link-integrity';
  return null;
}

// --- Runtime-kind registry (taskId → executor id) ----------------

export const RUNTIME_KINDS_KEY = 'mti6_runtime_kinds_v1';
export type RuntimeKindMap = Record<string, string>;

export function loadKinds(): RuntimeKindMap {
  try {
    const raw = localStorage.getItem(RUNTIME_KINDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: RuntimeKindMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string' && executorById(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveKinds(kinds: RuntimeKindMap): void {
  try {
    localStorage.setItem(RUNTIME_KINDS_KEY, JSON.stringify(kinds));
  } catch {
    /* storage unavailable — the registry simply does not persist */
  }
}

// --- Running a task ----------------------------------------------

export interface RunRecord {
  taskId: string;
  title: string;
  executor: string;
  startedAt: string;
  finishedAt: string;
  outcome: 'COMPLETE' | 'FAILED';
  evidence: string;
}

/* Execute one runtime task end to end. Intermediate task states
 * are pushed through `apply` as they happen, so the queue shows
 * QUEUED → ACTIVE while the work runs. The task must start in
 * UNASSIGNED or QUEUED. Completion carries the run's evidence;
 * failure marks FAILED with the reason. A completed run also
 * writes its Bot Memory record (best-effort: a memory refusal
 * never fails the run — the task record is the primary record). */
export async function runRuntimeTask(
  tasks: WorkerTask[],
  taskId: string,
  executorId: string,
  apply: (tasks: WorkerTask[]) => void,
): Promise<RunRecord> {
  const startedAt = new Date().toISOString();
  const task = tasks.find((t) => t.id === taskId);
  const executor = executorById(executorId);
  if (!task || !executor) {
    return {
      taskId,
      title: task?.title ?? taskId,
      executor: executorId,
      startedAt,
      finishedAt: new Date().toISOString(),
      outcome: 'FAILED',
      evidence: 'Task or executor not found.',
    };
  }
  let cur = tasks;
  const step = (to: 'QUEUED' | 'ACTIVE', note: string) => {
    const r = transitionTask(cur, taskId, to, { note });
    if (!r.error) {
      cur = r.tasks;
      apply(cur);
    }
  };
  if (task.state === 'UNASSIGNED') step('QUEUED', 'Queued by the worker runtime.');
  step('ACTIVE', `Worker runtime executing: ${executor.label}.`);
  try {
    const evidence = await executor.run();
    const r = transitionTask(cur, taskId, 'COMPLETE', {
      note: `Completed by the worker runtime (${executor.label}).`,
      evidence,
    });
    if (r.error) throw new Error(r.error);
    cur = r.tasks;
    apply(cur);
    try {
      recordMemory(
        {
          kind: 'ASSIGNMENT_OUTCOME',
          subject: task.title,
          summary: evidence.slice(0, 400),
          truthState: 'UNVERIFIED',
          refs: [task.id],
          source: 'worker-runtime',
        },
        task.principal ?? 'worker-runtime',
      );
    } catch {
      /* memory write is best-effort; the task record stands */
    }
    return {
      taskId,
      title: task.title,
      executor: executorId,
      startedAt,
      finishedAt: new Date().toISOString(),
      outcome: 'COMPLETE',
      evidence,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'The run failed.';
    const r = transitionTask(cur, taskId, 'FAILED', {
      note: `Worker runtime run failed: ${reason}`,
    });
    if (!r.error) {
      cur = r.tasks;
      apply(cur);
    }
    return {
      taskId,
      title: task.title,
      executor: executorId,
      startedAt,
      finishedAt: new Date().toISOString(),
      outcome: 'FAILED',
      evidence: reason,
    };
  }
}

/* Store-derived runtime summary (v177) — counts and the latest
 * completed runs, read from the canonical stores. Shared by
 * STAR's local answers and any surface that needs the runtime's
 * all-time state without rendering Bot Operations. */
export function runtimeStoreSummary(): {
  recorded: number;
  completed: number;
  failed: number;
  latestCompleted: { title: string; evidence: string }[];
} {
  const tasks = loadTasks();
  const kinds = loadKinds();
  const runtime = tasks.filter((t) => kinds[t.id]);
  return {
    recorded: runtime.length,
    completed: runtime.filter((t) => t.state === 'COMPLETE').length,
    failed: runtime.filter((t) => t.state === 'FAILED').length,
    latestCompleted: runtime
      .filter((t) => t.state === 'COMPLETE')
      .slice(0, 3)
      .map((t) => ({ title: t.title, evidence: t.completionEvidence ?? '' })),
  };
}

/* Run an executor as a fresh queue task (v172) — the path STAR
 * commands take. The task is created in the canonical store,
 * registered with its kind, executed, and left in Bot
 * Operations as the permanent record of the run. */
export async function runAdHocTask(executorId: string, title: string): Promise<RunRecord> {
  const executor = executorById(executorId);
  if (!executor) {
    return {
      taskId: '',
      title,
      executor: executorId,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      outcome: 'FAILED',
      evidence: 'Unknown executor.',
    };
  }
  const before = loadTasks();
  const next = createTask(before, { title, role: 'Monitoring', principal: null });
  if (next.length === before.length) {
    return {
      taskId: '',
      title,
      executor: executorId,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      outcome: 'FAILED',
      evidence: 'The task could not be recorded.',
    };
  }
  const created = next[0];
  const kinds = loadKinds();
  kinds[created.id] = executorId;
  saveKinds(kinds);
  return runRuntimeTask(next, created.id, executorId, () => {});
}
