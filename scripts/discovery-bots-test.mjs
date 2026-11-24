/* MTI6-GTADWIY-COCKPIT — discovery bots verification.
 * Loads the REAL engines (js/entity-candidates.js,
 * js/resource-engine.js) plus js/discovery-bots.js into a vm
 * with an in-memory CockpitDB stub, then proves the adapter
 * contract end to end:
 *   - a discovered contract (the owner-confirmed EIGEN anchor)
 *     becomes an UNVERIFIED candidate, advances to DEDUPED with
 *     a recorded verdict, and carries the explorer evidence;
 *   - an invalid address is refused as UNCERTAINANCHOR;
 *   - all six keyless sources are proposed to ResourceEngine
 *     and born DISCOVERED / UNVERIFIED, none approved, none
 *     connected.
 * Run: node scripts/discovery-bots-test.mjs */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const store = new Map();
const sandbox = {
  console,
  fetch,
  CockpitDB: {
    getAll: () => Promise.resolve([...store.values()].map((r) => JSON.parse(JSON.stringify(r)))),
    put: (_store, rec) => {
      store.set(rec.id, JSON.parse(JSON.stringify(rec)));
      return Promise.resolve(rec);
    },
  },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['js/entity-candidates.js', 'js/resource-engine.js', 'js/discovery-bots.js']) {
  vm.runInContext(readFileSync(f, 'utf8'), sandbox, { filename: f });
}
const B = sandbox.window.MTI6DiscoveryBots;
if (!B) throw new Error('MTI6DiscoveryBots not loaded');

const EIGEN = '0xec53bf9167f50cdeb3ae105f56099aaab9061f83'; // owner-confirmed EigenLayer EIGEN token contract (Etherscan label)

const contract = await B.ingestDiscoveredContract({
  name: 'EigenLayer (EIGEN) Token',
  entityKind: 'asset',
  contractAddress: EIGEN,
  networkRef: 'ethereum',
  contractRole: 'TOKEN',
  explorerVerified: true,
  sourceUrl: 'https://eth.blockscout.com/token/' + EIGEN,
});
console.log('contract ingest:', JSON.stringify(contract));
if (!contract.ok) throw new Error('contract ingest failed');
if (contract.truthState !== 'UNVERIFIED') throw new Error('truth state not UNVERIFIED');
if (contract.stage !== 'DEDUPED') throw new Error('expected stage DEDUPED, got ' + contract.stage);
if (!contract.dedupeVerdict) throw new Error('no dedupe verdict recorded');

const refused = await B.ingestDiscoveredContract({
  name: 'Guesswork',
  contractAddress: '0x123',
  networkRef: 'ethereum',
  contractRole: 'TOKEN',
});
console.log('bad anchor refused:', JSON.stringify(refused));
if (refused.ok) throw new Error('invalid address was accepted');

const proposals = await B.proposeAllKeylessSources();
console.log('keyless proposals:', JSON.stringify(proposals));
if (proposals.length !== 15 || !proposals.every((p) => p.ok)) {
  throw new Error('keyless proposals incomplete');
}
const resources = [...store.values()].filter((r) => r.recordKind === 'RESOURCE_CANDIDATE');
if (resources.length !== 15) throw new Error('expected 15 resource candidates, got ' + resources.length);
for (const r of resources) {
  if (r.pipelineStage !== 'DISCOVERED' || r.verificationStatus !== 'UNVERIFIED') {
    throw new Error('resource candidate born wrong: ' + r.id + ' ' + r.pipelineStage + '/' + r.verificationStatus);
  }
  if (r.ownerApprovalState !== 'NOT_REQUESTED' || r.pipelineStage === 'CONNECTED') {
    throw new Error('a bot approved or connected a resource: ' + r.id);
  }
}
const entities = [...store.values()].filter((r) => r.recordKind === 'ENTITY_CANDIDATE');
if (entities.length !== 1) throw new Error('expected exactly 1 entity candidate, got ' + entities.length);
const rec = entities[0];
if (!rec.contractAnchors?.some((a) => a.address === EIGEN && a.networkRef === 'ethereum')) {
  throw new Error('network-qualified anchor missing');
}
if (!rec.evidence?.some((e) => e.kind === 'ONCHAIN_ANCHOR')) {
  throw new Error('explorer evidence missing');
}
console.log(
  'DISCOVERY_BOTS_TEST_PASS — contract candidate ' + rec.id + ' @ ' + rec.pipelineStage +
    ' · dedupe ' + rec.dedupe.verdict + ' · 15 keyless resources proposed, all DISCOVERED/UNVERIFIED',
);
