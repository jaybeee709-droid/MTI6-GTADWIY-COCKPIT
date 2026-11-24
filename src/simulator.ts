/* Crypto Simulator — the React mirror of the canonical simulator
 * integration (js/opportunity-intelligence.js §99-19,
 * simulateOpportunity) and directive §67.
 *
 * A simulation is a SIMULATION record, never an execution and
 * never real accounting: it carries accountingScope
 * "SIMULATION_ONLY", states SIMULATED / NOT EXECUTED, and writes
 * nothing into positions or earnings. Its inputs are the
 * opportunity's recorded references plus the owner's amount /
 * currency ASSUMPTIONS. Everything the record does not carry is
 * UNKNOWN, never invented:
 *  - Prices: opportunity records on this surface carry no sourced
 *    prices, so prices are UNKNOWN with the reason stated.
 *  - Costs: no cost records are wired to these opportunities, so
 *    every canonical cost kind is UNKNOWN (listed in full) —
 *    never zero.
 *  - Expected outcome: numeric return fields are FORBIDDEN in
 *    opportunity records, so the expected gross is UNKNOWN and
 *    the expected net is null — stated, never computed from air.
 *
 * Creating a simulation is the ONLY way an opportunity's
 * pipeline reaches SIMULATED (the canonical rule); the manual
 * stage advance in the Opportunities screen refuses that step. */

import { COST_KINDS } from './cost-risk-data';

export interface SimulatableOpportunity {
  id: string;
  title: string;
  assetRef: { assetClassId: string; chain: string };
  networkRef: { networkId: string };
  majorActivityId: string;
  typeId: string;
  strategyId: string;
}

export interface SimulationRecord {
  id: string;
  opportunityId: string;
  createdAt: string;
  accountingScope: 'SIMULATION_ONLY';
  inputs: {
    title: string;
    assetRef: { assetClassId: string; chain: string };
    networkRef: { networkId: string };
    majorActivityId: string;
    typeId: string;
    strategyId: string;
    amount: number | 'UNKNOWN';
    currency: string;
  };
  pricesUsed: { state: 'UNKNOWN'; detail: string };
  costsUsed: { state: 'UNKNOWN'; detail: string };
  unknownCosts: string[];
  unknowns: string[];
  expectedOutcome: { state: 'UNKNOWN'; detail: string };
}

const STORAGE_KEY = 'mti6_simulations_v1';
const MAX_SIMULATIONS = 100;

export function simulate(
  opp: SimulatableOpportunity,
  amountRaw: string,
  currencyRaw: string,
): SimulationRecord {
  const parsed = Number(amountRaw);
  const amount: number | 'UNKNOWN' =
    amountRaw.trim() !== '' && Number.isFinite(parsed) && parsed > 0 ? parsed : 'UNKNOWN';
  const currency = currencyRaw.trim().toUpperCase() || 'UNKNOWN';
  const unknownCosts = COST_KINDS.map((k) => k.kind);
  return {
    id: `sim-${opp.id}-${Date.now().toString(36)}`,
    opportunityId: opp.id,
    createdAt: new Date().toISOString(),
    accountingScope: 'SIMULATION_ONLY',
    inputs: {
      title: opp.title,
      assetRef: { ...opp.assetRef },
      networkRef: { ...opp.networkRef },
      majorActivityId: opp.majorActivityId,
      typeId: opp.typeId,
      strategyId: opp.strategyId,
      amount,
      currency,
    },
    pricesUsed: {
      state: 'UNKNOWN',
      detail:
        'No sourced price is recorded on this opportunity; no price was invented.',
    },
    costsUsed: {
      state: 'UNKNOWN',
      detail:
        'No cost records are wired to this opportunity, so every cost kind is UNKNOWN — never zero, never assumed.',
    },
    unknownCosts,
    unknowns: [
      'price',
      'expected gross',
      ...unknownCosts.map((k) => `cost: ${k}`),
    ],
    expectedOutcome: {
      state: 'UNKNOWN',
      detail:
        'Expected net is null while the gross or any required cost is UNKNOWN. Numeric return fields are forbidden in opportunity records, so no outcome figure is computed.',
    },
  };
}

export function loadSimulations(): SimulationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is SimulationRecord =>
        !!s && typeof s === 'object' &&
        typeof (s as SimulationRecord).id === 'string' &&
        (s as SimulationRecord).accountingScope === 'SIMULATION_ONLY',
    );
  } catch {
    return [];
  }
}

export function saveSimulations(list: SimulationRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_SIMULATIONS)));
  } catch {
    /* storage unavailable — simulations stay in memory for this session */
  }
}
