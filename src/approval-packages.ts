/* MTI6 Approval Packages (v203) — the Auto-Placement pipeline's
 * review step (owner spec, 2026-11-24): Discover → Evidence →
 * Classify → Subclassify → Place → Relationships → Dependencies
 * → Expansion → Freshness → APPROVAL PACKAGE → Daniel review →
 * Canonical → World Engine.
 *
 * A package assembles everything the placement slices have
 * placed — every registry's candidates with their subclass mix
 * and chain coverage, plus the relationship candidates — into
 * one reviewable bundle for the owner. Generating a package
 * promotes NOTHING, approves NOTHING, and writes NOTHING
 * canonical: it is the paperwork laid on the gate, and the
 * gate is Daniel's alone. Only the latest package is kept —
 * a package is a snapshot for review, not an archive. */

import { loadDexCandidates, loadRelationshipCandidates } from './dex-registry';
import { loadBridgeCandidates } from './bridge-registry';
import { loadPoolCandidates, loadVaultCandidates } from './pool-vault-registry';

export const APPROVAL_PACKAGE_KEY = 'mti6_approval_package_v1';
export const APPROVAL_PACKAGE_LAW =
  "This package assembles candidates for Daniel's review. Every candidate in it is UNVERIFIED; generating a package promotes nothing, approves nothing, and writes nothing canonical. Only Daniel's review at the gate can move a candidate toward canonical.";

export interface PackageCandidateLine {
  name: string;
  subclass: string;
  chains: number;
  tokenSymbol: string | null;
}

export interface PackageSection {
  registry: 'DEX' | 'BRIDGE' | 'POOL' | 'VAULT';
  count: number;
  chainsCovered: number;
  bySubclass: { subclass: string; count: number }[];
  candidates: PackageCandidateLine[];
}

export interface ApprovalPackage {
  generatedAt: number;
  totalCandidates: number;
  relationshipCount: number;
  sections: PackageSection[];
  law: string;
}

interface GenericCandidate {
  name: string;
  subclass: string;
  chains: string[];
  tokenSymbol: string | null;
}

function section(registry: PackageSection['registry'], rows: GenericCandidate[]): PackageSection {
  const chains = new Set<string>();
  const subclassCounts = new Map<string, number>();
  for (const r of rows) {
    for (const c of r.chains) chains.add(c);
    subclassCounts.set(r.subclass, (subclassCounts.get(r.subclass) ?? 0) + 1);
  }
  return {
    registry,
    count: rows.length,
    chainsCovered: chains.size,
    bySubclass: [...subclassCounts.entries()]
      .map(([subclass, count]) => ({ subclass, count }))
      .sort((a, b) => b.count - a.count),
    candidates: rows.slice(0, 12).map((r) => ({
      name: r.name,
      subclass: r.subclass,
      chains: r.chains.length,
      tokenSymbol: r.tokenSymbol,
    })),
  };
}

export function buildApprovalPackage(now: number = Date.now()): ApprovalPackage {
  const sections = [
    section('DEX', loadDexCandidates()),
    section('BRIDGE', loadBridgeCandidates()),
    section('POOL', loadPoolCandidates()),
    section('VAULT', loadVaultCandidates()),
  ];
  return {
    generatedAt: now,
    totalCandidates: sections.reduce((acc, s) => acc + s.count, 0),
    relationshipCount: loadRelationshipCandidates().length,
    sections,
    law: APPROVAL_PACKAGE_LAW,
  };
}

export function saveApprovalPackage(pkg: ApprovalPackage): void {
  try {
    localStorage.setItem(APPROVAL_PACKAGE_KEY, JSON.stringify(pkg));
  } catch {
    /* storage unavailable — the package still returns to its caller */
  }
}

export function loadApprovalPackage(): ApprovalPackage | null {
  try {
    const raw = localStorage.getItem(APPROVAL_PACKAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApprovalPackage;
    return parsed && typeof parsed.generatedAt === 'number' && Array.isArray(parsed.sections) ? parsed : null;
  } catch {
    return null;
  }
}

export function approvalPackageText(pkg: ApprovalPackage): string {
  const parts = pkg.sections.map(
    (s) =>
      `${s.registry}: ${s.count} candidate(s) over ${s.chainsCovered} chain(s)` +
      (s.bySubclass.length > 0 ? ` (${s.bySubclass.map((b) => `${b.subclass} ${b.count}`).join(', ')})` : ''),
  );
  return `Approval package generated ${new Date(pkg.generatedAt).toLocaleString()}: ${pkg.totalCandidates} placed candidate(s) awaiting Daniel's review — ${parts.join(' · ')} · ${pkg.relationshipCount} relationship candidate(s). ${pkg.law}`;
}
