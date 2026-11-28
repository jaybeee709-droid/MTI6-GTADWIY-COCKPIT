/* MTI6-GTADWIY-COCKPIT — Crypto World live surfaces (v252, Priority 1)
 *
 * Surfaces the live-data capabilities that already existed in
 * src/live-data.ts but were consumed by no screen. NO new APIs, NO
 * new provider keys, NO new fetchers: every panel below calls a
 * function that was already exported and already governed.
 *
 * Rules carried over from the layer and never weakened here:
 *   - Every figure renders through ProvenanceChip, so LIVE / CACHED
 *     / STALE / NO_DATA is visible per figure and tappable to its
 *     source, fetch time and fallback chain.
 *   - NO_DATA renders as an honest empty state. No figure is invented,
 *     no unmeasured value is shown as zero.
 *   - Nothing here writes, signs, trades, or moves funds. Every panel
 *     is a read-only observation surface.
 *   - Fetches are one governed call per panel on mount, plus an
 *     explicit REFRESH press. The governor dedupes and TTL-caches, so
 *     mounting several panels cannot storm a provider.
 *
 * Panels and their sources:
 *   StablecoinsPanel      fetchStablecoins()        DefiLlama Stablecoins
 *   PerpFundingPanel      fetchPerpFunding()        Hyperliquid
 *   PendleMarketsPanel    fetchPendleMarkets()      Pendle (Ethereum/Base)
 *   ProtocolIndexPanel    fetchProtocolIndex()      DefiLlama Protocols
 *   DexVolumesPanel       fetchDexVolumes()         DefiLlama DEX Overview
 *   ProtocolFeesPanel     fetchProtocolFees()       DefiLlama Fees Overview
 *   GovernancePanel       fetchGovernanceProposals() Snapshot GraphQL
 */

import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Coins,
  Landmark,
  Layers,
  Percent,
  Timer,
  Vote,
} from 'lucide-react';
import {
  fetchDexVolumes,
  fetchGovernanceProposals,
  fetchPendleMarkets,
  fetchPerpFunding,
  fetchProtocolFees,
  fetchProtocolIndex,
  fetchStablecoins,
  fmtUsd,
  useObservation,
  type Observation,
} from '../live-data';
import { ProvenanceChip } from '../ProvenanceChip';

/* ---- shared shell ------------------------------------------------- */

const PanelHead: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  note: string;
  obs: Observation<unknown>;
  loading: boolean;
  refresh: () => void;
  right?: React.ReactNode;
}> = ({ icon: Icon, title, note, obs, loading, refresh, right }) => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
      <Icon className="h-4 w-4" />
      <span>{title}</span>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {right}
      <ProvenanceChip obs={obs} compact />
      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        className="rounded border border-white/15 bg-[#151515] px-2 py-1 font-mono text-[10px] text-white hover:border-[#00B7FF]/60 disabled:opacity-50"
      >
        {loading ? 'LOADING…' : 'REFRESH'}
      </button>
    </div>
  </div>
);

const EmptyNote: React.FC<{ loading: boolean; what: string; obs: Observation<unknown> }> = ({
  loading,
  what,
  obs,
}) => (
  <p className="font-mono text-[11px] leading-relaxed text-[#B8B8B8]">
    {loading
      ? `FETCHING — ${what} (one governed call, cached by the governor)…`
      : obs.status === 'NO_DATA'
        ? `NO DATA — ${what} could not be read. Nothing is invented to fill this panel.`
        : `NO ROWS RETURNED — ${what} answered empty. An empty result is shown as empty.`}
  </p>
);

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-xl border border-white/10 bg-[#101010] p-4 space-y-3">{children}</div>
);

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#151515] px-3 py-2 font-mono text-[11px]">
    {children}
  </div>
);

/* ---- 1. Stablecoins ----------------------------------------------- */

export const StablecoinsPanel: React.FC = () => {
  const [limit, setLimit] = useState(10);
  const { obs, refresh, loading } = useObservation(() => fetchStablecoins(), []);
  const all = obs.value ?? [];
  return (
    <Shell>
      <PanelHead
        icon={Coins}
        title="LIVE DATA — STABLECOINS · PEG OBSERVATION"
        note="DefiLlama Stablecoins"
        obs={obs}
        loading={loading}
        refresh={refresh}
        right={
          <span className="font-mono text-[10px] text-[#B8B8B8]">
            {all.length > 0 ? `${Math.min(limit, all.length)} OF ${all.length}` : '—'}
          </span>
        }
      />
      {all.length === 0 ? (
        <EmptyNote loading={loading} what="the stablecoin index" obs={obs} />
      ) : (
        <div className="space-y-1.5">
          {all.slice(0, limit).map((s, i) => (
            <Row key={`${s.symbol}-${i}`}>
              <span className="min-w-0">
                <span className="font-semibold text-white">{s.symbol}</span>{' '}
                <span className="text-[#B8B8B8]">{s.name}</span>
              </span>
              <span className="flex flex-wrap items-center gap-3">
                <span className="text-[#B8B8B8]">
                  CIRC {s.circulatingUsd === null ? 'NO_DATA' : fmtUsd(s.circulatingUsd)}
                </span>
                <span className="text-white">{s.price === null ? 'NO_DATA' : fmtUsd(s.price)}</span>
                <span
                  className={
                    s.pegDeviationPct === null
                      ? 'text-[#B8B8B8]'
                      : Math.abs(s.pegDeviationPct) >= 1
                        ? 'text-[#FFB020]'
                        : 'text-[#B8B8B8]'
                  }
                >
                  PEG {s.pegDeviationPct === null ? 'NO_DATA' : `${s.pegDeviationPct.toFixed(3)}%`}
                </span>
              </span>
            </Row>
          ))}
        </div>
      )}
      {all.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((n) => Math.min(n + 10, all.length))}
          className="rounded border border-white/15 bg-[#151515] px-2 py-1 font-mono text-[10px] text-white hover:border-[#00B7FF]/60"
        >
          SHOW 10 MORE
        </button>
      )}
      <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
        PEG DEVIATION IS THE SOURCE'S OWN REPORTED FIGURE AT FETCH TIME — A VARIABLE
        OBSERVATION, NOT A STABILITY CLAIM. A DEVIATION OF 1% OR MORE IS FLAGGED AMBER; THAT IS
        A DISPLAY THRESHOLD, NOT A RISK SCORE.
      </p>
    </Shell>
  );
};

/* ---- 2. Perp funding ---------------------------------------------- */

export const PerpFundingPanel: React.FC = () => {
  const { obs, refresh, loading } = useObservation(() => fetchPerpFunding(), []);
  const rows = (obs.value ?? []).slice(0, 12);
  return (
    <Shell>
      <PanelHead
        icon={Percent}
        title="LIVE DATA — PERPETUAL FUNDING · 8H"
        note="Hyperliquid"
        obs={obs}
        loading={loading}
        refresh={refresh}
      />
      {rows.length === 0 ? (
        <EmptyNote loading={loading} what="the perpetual funding feed" obs={obs} />
      ) : (
        <div className="space-y-1.5">
          {rows.map((p) => (
            <Row key={p.coin}>
              <span className="font-semibold text-white">{p.coin}</span>
              <span className="flex flex-wrap items-center gap-3">
                <span className="text-[#B8B8B8]">
                  OI {p.openInterest === null ? 'NO_DATA' : fmtUsd(p.openInterest)}
                </span>
                <span className="text-[#B8B8B8]">
                  MARK {p.markPrice === null ? 'NO_DATA' : fmtUsd(p.markPrice)}
                </span>
                <span className={p.fundingPct8h >= 0 ? 'text-[#32D74B]' : 'text-[#FFB020]'}>
                  {p.fundingPct8h >= 0 ? '+' : ''}
                  {p.fundingPct8h.toFixed(4)}% / 8h
                </span>
              </span>
            </Row>
          ))}
        </div>
      )}
      <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
        FUNDING IS WHAT A POSITION PAYS OR RECEIVES TO BE HELD — AN OBSERVED RATE AT FETCH TIME,
        NOT A RETURN, NOT A RECOMMENDATION, AND NOT A TRADEABLE QUOTE. NO POSITION EXISTS HERE;
        THIS PANEL HOLDS NO POSITIONS.
      </p>
    </Shell>
  );
};

/* ---- 3. Pendle markets -------------------------------------------- */

export const PendleMarketsPanel: React.FC = () => {
  const [chainId, setChainId] = useState<1 | 8453>(1);
  const { obs, refresh, loading } = useObservation(() => fetchPendleMarkets(chainId), [chainId]);
  const all = obs.value ?? [];
  return (
    <Shell>
      <PanelHead
        icon={BarChart3}
        title="LIVE DATA — YIELD-TRADING MARKETS (PENDLE) · IMPLIED APY"
        note="Pendle markets"
        obs={obs}
        loading={loading}
        refresh={refresh}
        right={
          <span className="flex items-center gap-1">
            {([1, 8453] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setChainId(id)}
                className={`rounded border px-2 py-1 font-mono text-[10px] ${
                  chainId === id
                    ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
                    : 'border-white/10 bg-[#151515] text-[#B8B8B8] hover:text-white'
                }`}
              >
                {id === 1 ? 'ETHEREUM' : 'BASE'}
              </button>
            ))}
          </span>
        }
      />
      {all.length === 0 ? (
        <EmptyNote
          loading={loading}
          what={`active Pendle markets on ${chainId === 1 ? 'Ethereum' : 'Base'}`}
          obs={obs}
        />
      ) : (
        <div className="space-y-1.5">
          {all.slice(0, 12).map((m) => (
            <Row key={m.address}>
              <span className="min-w-0 truncate text-white">{m.name}</span>
              <span className="flex flex-wrap items-center gap-3">
                <span className="text-[#B8B8B8]">
                  EXPIRY {m.expiry ? new Date(m.expiry).toLocaleDateString('en-US') : 'NO_DATA'}
                </span>
                <span className="text-white">
                  {m.impliedApy === null ? 'NO_DATA' : `${m.impliedApy.toFixed(2)}%`}
                </span>
              </span>
            </Row>
          ))}
        </div>
      )}
      <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
        IMPLIED APY IS THE MARKET'S OWN OBSERVED FIGURE AT FETCH TIME. IT IS A MARKET PRICE, NOT
        A PROMISE OF YIELD, NOT A FIXED RATE, AND NOT AN OPPORTUNITY RECORD. THE PT / YT
        INSTRUMENTS THEMSELVES ARE NOT PRICED HERE.
      </p>
    </Shell>
  );
};

/* ---- 4. Protocol index -------------------------------------------- */

export const ProtocolIndexPanel: React.FC = () => {
  const [onlyAudited, setOnlyAudited] = useState(false);
  const { obs, refresh, loading } = useObservation(() => fetchProtocolIndex(), []);
  const all = obs.value ?? [];
  const audited = all.filter((p) => p.audits !== null && p.audits > 0);
  const rows = (onlyAudited ? audited : all).slice(0, 15);
  return (
    <Shell>
      <PanelHead
        icon={Layers}
        title="LIVE DATA — PROTOCOL INDEX · IDENTITY & AUDIT EVIDENCE"
        note="DefiLlama Protocols"
        obs={obs}
        loading={loading}
        refresh={refresh}
        right={
          <span className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-[#B8B8B8]">
            <span>
              {all.length} RECORDED · {audited.length} CARRY AUDIT EVIDENCE
            </span>
            <button
              type="button"
              onClick={() => setOnlyAudited((v) => !v)}
              className={`rounded border px-2 py-1 ${
                onlyAudited
                  ? 'border-[#00B7FF] bg-[#00B7FF]/15 text-white'
                  : 'border-white/10 bg-[#151515] text-[#B8B8B8] hover:text-white'
              }`}
            >
              {onlyAudited ? 'AUDITED ONLY' : 'ALL'}
            </button>
          </span>
        }
      />
      {all.length === 0 ? (
        <EmptyNote loading={loading} what="the protocol index" obs={obs} />
      ) : rows.length === 0 ? (
        <p className="font-mono text-[11px] text-[#B8B8B8]">
          NO PROTOCOL IN THIS INDEX CARRIES AUDIT EVIDENCE — THE SOURCE REPORTS NONE. A PROTOCOL
          WITHOUT AUDIT EVIDENCE IS NOT RENDERED AS AUDITED.
        </p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((p) => (
            <Row key={p.slug}>
              <span className="min-w-0">
                <span className="font-semibold text-white">{p.name}</span>{' '}
                <span className="text-[#B8B8B8]">{p.category ?? 'UNCATEGORISED'}</span>
              </span>
              <span className="flex flex-wrap items-center gap-3 text-[#B8B8B8]">
                <span>
                  {p.chains.length} CHAIN{p.chains.length === 1 ? '' : 'S'}
                </span>
                <span>{p.symbol ?? 'NO TOKEN'}</span>
                <span className={p.audits ? 'text-[#32D74B]' : 'text-[#B8B8B8]'}>
                  AUDITS {p.audits ?? 'NOT RECORDED'}
                </span>
              </span>
            </Row>
          ))}
        </div>
      )}
      <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
        IDENTITY AND AUDIT EVIDENCE ONLY — TVL AND MARKET-CAP FIGURES ARE DELIBERATELY NOT
        CARRIED BY THIS SURFACE. THE SOURCE DOES NOT REPORT AUDITS FOR EVERY PROTOCOL; "NOT
        RECORDED" MEANS THE SOURCE DID NOT SAY, NOT THAT NONE EXISTS.
      </p>
    </Shell>
  );
};

/* ---- 5. DEX volumes ------------------------------------------------ */

export const DexVolumesPanel: React.FC = () => {
  const { obs, refresh, loading } = useObservation(() => fetchDexVolumes(), []);
  const rows = (obs.value ?? []).slice(0, 12);
  return (
    <Shell>
      <PanelHead
        icon={Activity}
        title="LIVE DATA — DEX VOLUME · 24H, DAY-OVER-DAY"
        note="DefiLlama DEX Overview"
        obs={obs}
        loading={loading}
        refresh={refresh}
      />
      {rows.length === 0 ? (
        <EmptyNote loading={loading} what="the DEX volume overview" obs={obs} />
      ) : (
        <div className="space-y-1.5">
          {rows.map((d) => (
            <Row key={d.slug}>
              <span className="min-w-0">
                <span className="font-semibold text-white">{d.name}</span>{' '}
                <span className="text-[#B8B8B8]">
                  {d.chains.length > 0 ? d.chains.slice(0, 3).join(' · ') : 'CHAINS NOT REPORTED'}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-3">
                <span className="text-white">{fmtUsd(d.total24h)}</span>
                <span
                  className={
                    d.changePct === null
                      ? 'text-[#B8B8B8]'
                      : d.changePct >= 0
                        ? 'text-[#32D74B]'
                        : 'text-[#FFB020]'
                  }
                >
                  {d.changePct === null
                    ? 'Δ NO_DATA'
                    : `${d.changePct >= 0 ? '+' : ''}${d.changePct.toFixed(2)}%`}
                </span>
              </span>
            </Row>
          ))}
        </div>
      )}
      <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
        VOLUME IS THE SOURCE'S OWN 24H OBSERVATION; THE CHANGE IS THE SOURCE'S OWN PRIOR-DAY
        PAIR, NOT A COMPUTED TREND. HIGH VOLUME IS NOT A RECOMMENDATION AND CARRIES NO RISK
        JUDGEMENT.
      </p>
    </Shell>
  );
};

/* ---- 6. Protocol fees --------------------------------------------- */

export const ProtocolFeesPanel: React.FC = () => {
  const { obs, refresh, loading } = useObservation(() => fetchProtocolFees(), []);
  const rows = (obs.value ?? []).slice(0, 12);
  return (
    <Shell>
      <PanelHead
        icon={Landmark}
        title="LIVE DATA — PROTOCOL FEES · 24H REVENUE OBSERVATION"
        note="DefiLlama Fees Overview"
        obs={obs}
        loading={loading}
        refresh={refresh}
      />
      {rows.length === 0 ? (
        <EmptyNote loading={loading} what="the protocol fees overview" obs={obs} />
      ) : (
        <div className="space-y-1.5">
          {rows.map((f) => (
            <Row key={f.slug}>
              <span className="min-w-0">
                <span className="font-semibold text-white">{f.name}</span>{' '}
                <span className="text-[#B8B8B8]">{f.category ?? 'UNCATEGORISED'}</span>
              </span>
              <span className="flex flex-wrap items-center gap-3">
                <span className="text-white">{fmtUsd(f.total24h)}</span>
                <span
                  className={
                    f.changePct === null
                      ? 'text-[#B8B8B8]'
                      : f.changePct >= 0
                        ? 'text-[#32D74B]'
                        : 'text-[#FFB020]'
                  }
                >
                  {f.changePct === null
                    ? 'Δ NO_DATA'
                    : `${f.changePct >= 0 ? '+' : ''}${f.changePct.toFixed(2)}%`}
                </span>
              </span>
            </Row>
          ))}
        </div>
      )}
      <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
        A FEE COLLECTED BY A PROTOCOL IS NOT INCOME AVAILABLE TO THE OWNER, NOT A TOKEN HOLDER
        RETURN, AND NOT AN EARNING. THIS PANEL OBSERVES A PROTOCOL'S OWN FEE LINE ONLY; IT MAKES
        NO CLAIM ABOUT WHO RECEIVES IT OR WHETHER IT IS DISTRIBUTED.
      </p>
    </Shell>
  );
};

/* ---- 7. Governance proposals -------------------------------------- */

export const GovernancePanel: React.FC = () => {
  const { obs, refresh, loading } = useObservation(() => fetchGovernanceProposals(), []);
  const all = obs.value ?? [];
  return (
    <Shell>
      <PanelHead
        icon={Vote}
        title="LIVE DATA — GOVERNANCE PROPOSALS · WATCHED SPACES"
        note="Snapshot GraphQL"
        obs={obs}
        loading={loading}
        refresh={refresh}
        right={
          <span className="font-mono text-[10px] text-[#B8B8B8]">
            {all.length > 0 ? `${all.length} RECORDED` : '—'}
          </span>
        }
      />
      {all.length === 0 ? (
        <EmptyNote loading={loading} what="the watched Snapshot spaces" obs={obs} />
      ) : (
        <div className="space-y-1.5">
          {all.slice(0, 10).map((p) => (
            <Row key={p.id}>
              <span className="min-w-0 flex-1">
                <span className="block text-white">{p.title}</span>
                <span className="block text-[10px] text-[#B8B8B8]">
                  {p.spaceName || p.spaceId || 'SPACE NOT REPORTED'}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-3 text-[10px]">
                <span className="text-[#B8B8B8]">
                  ENDS {p.end ? new Date(p.end * 1000).toLocaleDateString('en-US') : 'NO_DATA'}
                </span>
                <span
                  className={
                    p.state === 'active'
                      ? 'text-[#32D74B]'
                      : p.state === 'closed'
                        ? 'text-[#B8B8B8]'
                        : 'text-[#FFB020]'
                  }
                >
                  {p.state.toUpperCase()}
                </span>
              </span>
            </Row>
          ))}
        </div>
      )}
      <p className="font-mono text-[9px] leading-relaxed text-[#B8B8B8]">
        WATCHED SPACES ONLY — EVERY SPACE ID WAS VERIFIED AGAINST THE SNAPSHOT API BEFORE IT WAS
        WATCHED; NONE IS GUESSED. THIS PANEL READS PROPOSALS. IT HOLDS NO VOTING POWER, CASTS NO
        VOTE, AND REPRESENTS NO DELEGATION.
      </p>
    </Shell>
  );
};

/* ---- bundle -------------------------------------------------------- */

export const CryptoLiveSurfaces: React.FC = () => (
  <div className="space-y-4">
    <div className="rounded-xl border border-[#00B7FF]/25 bg-[#101010] p-4 space-y-2">
      <div className="flex items-center gap-2 text-xs font-mono text-[#00B7FF]">
        <Timer className="h-4 w-4" />
        <span>LIVE SURFACES — CAPABILITIES THAT EXISTED BUT HAD NO SCREEN</span>
      </div>
      <p className="text-xs leading-relaxed text-[#B8B8B8]">
        These panels call observation functions that were already built and governed in the live
        data layer, but were consumed by no screen. No new source, no new key, no new fetch path
        was added — only a surface. Every figure carries its provenance chip; tap it to audit the
        source, status, fetch time and fallback chain.
      </p>
    </div>
    <StablecoinsPanel />
    <PerpFundingPanel />
    <PendleMarketsPanel />
    <ProtocolIndexPanel />
    <DexVolumesPanel />
    <ProtocolFeesPanel />
    <GovernancePanel />
  </div>
);
