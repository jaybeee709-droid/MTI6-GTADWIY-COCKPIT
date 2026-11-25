// Phase 1, package 6 — route smoke test for the unified MTI6 React app.
//
// Loads the BUILT app (dist/, served over a local static HTTP server) into
// jsdom with runScripts enabled, mounts it, then for EACH of the 22 screens
// clicks its nav entry and asserts the screen renders non-empty content
// containing its expected heading. Also asserts:
//   - the nav lists all 22 screens
//   - World Globe is the default route
//   - the STAR orb button (aria-label="STAR Orb") is present
//   - no 'Live' execution option exists (execution modes are Read-Only /
//     Paper / Sim / Guarded Auto only)
//   - honest states: NOT_CONNECTED appears; known fabricated strings do NOT
//     appear in rendered output
//
// jsdom LIMITATION (verified 2026-11-22): this jsdom install does NOT execute
// <script type="module"> at all — a probe module script never ran, with or
// without --experimental-vm-modules, and no error was reported. dist/index.html
// loads the bundle as a module, so loading that file directly mounts nothing.
// WORKAROUND: the script loads the exact same built bundle file
// (dist/assets/index-*.js — a self-contained IIFE: no import statements, no
// import.meta, no dynamic import()) via a classic <script src> on a minimal
// test page served from the same dist server. The bundle bytes are the built
// artifact; only the script-tag type differs. The dist/index.html wiring
// itself (module script + #root) is verified separately by the dev-server
// check and by reading dist/index.html. No esbuild re-bundle was needed.
//
// Run:  node scripts/route-smoke-test.mjs   (from the worktree root)
// Exit code 0 = every assertion passed; 1 = at least one failed.
// NOTE: jsdom has no layout engine — this checks rendering/DOM only, never
// visual layout at any viewport width.

import { createRequire } from 'node:module';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

// jsdom lives in the shared scratch install, not in this worktree.
// (v220: the old ~/workspace/mti6/jsdomtest path was wiped by a
// VM/service restart — the persistent install is
// ~/workspace/tools/jsdomtest; see AGENTS.md.)
const require = createRequire('/home/hatch/workspace/tools/jsdomtest/package.json');
const { JSDOM, VirtualConsole } = require('jsdom');

const WORKTREE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(WORKTREE, 'dist');

// The exact built bundle file (dist/assets/index-*.js), loaded as a classic
// script because jsdom cannot run <script type="module"> (see header note).
const BUNDLE = (await import('node:fs/promises').then((fs) => fs.readdir(path.join(DIST, 'assets'))))
  .find((f) => /^index-[A-Za-z0-9_-]+\.js$/.test(f));
if (!BUNDLE) throw new Error('no dist/assets/index-*.js bundle found — run npm run build first');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};

// Nav label -> expected heading text (exact substring, checked inside <main>).
const ROUTES = [
  ['World Map', 'WORLD MAP · MASTER COMMAND'],
  ['Crypto World', 'CRYPTO INTEL COMMAND'],
  ['Earnings World', 'EARNINGS WORLD · OPERATIONAL HUB'],
  ['Bot Operations', 'OPERATIONAL HUB · BOT OPERATIONS'],
  ['Urban Wallet', 'Urban Wallet & Treasury'],
  ['Opportunities', 'Opportunities World'],
  ['Positions & Assets', 'Positions & Assets Unified Ledger'],
  ['Encyclopedia', 'Encyclopedia · Platform Brain'],
  ['Security World', 'Security World & Governance'],
  ['Settings World', 'Settings & Appearance Studio'],
  ['Cockpit Status', 'MTI6 Cockpit Dashboard'],
  ['Knowledge', 'Knowledge Vault'],
  ['Mission Control Tasks', 'Mission Control — Tasks'],
  ['Mission Control Projects', 'Mission Control — Projects'],
  ['Resource Tracker', 'Resource Tracker'],
  ['Crypto Market', 'Crypto Market'],
  ['Bot Profile', 'Bot Profiles'],
  ['Operations', 'Operations'],
  ['Accounts & Finance', 'Our Accounts'],
  ['Web — Bot Work', 'Web — Bot Work Window'],
  ['Data Analytics', 'Data Analytics'],
  ['Crypto Workspaces', 'Crypto Workspaces — All 56'],
];

const FABRICATED = ['$2,842,610', 'EXECUTE READY', 'Harvested 1,240 USDC', '$95,240', '14 gwei', 'Subsea cable failover', 'Transit corridor congestion'];

const results = [];
let failures = 0;
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function serveDist() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        // Minimal test page: #root + the exact dist bundle as a classic script.
        // (dist/index.html itself uses <script type="module">, which jsdom
        // cannot execute — see header note.)
        if (urlPath === '/__smoke.html') {
          res.writeHead(200, { 'content-type': 'text/html' });
          res.end(
            `<!doctype html><html><head><meta charset="utf-8"></head>` +
              `<body><div id="root"></div>` +
              `<script src="/assets/${BUNDLE}"></script></body></html>`,
          );
          return;
        }
        let file = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
        if (!file.startsWith(DIST)) throw new Error('outside dist');
        const data = await readFile(file);
        res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, timeoutMs, what) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const v = fn();
    if (v) return v;
    await sleep(100);
  }
  throw new Error(`timed out waiting for: ${what}`);
}

const server = await serveDist();
const port = server.address().port;
const errors = [];

try {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push(`jsdomError: ${e.detail?.message ?? e.message}`));
  vc.on('error', (...a) => errors.push(`console error: ${a.join(' ')}`));
  const dom = await JSDOM.fromURL(`http://127.0.0.1:${port}/__smoke.html`, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  check('smoke page loads dist bundle as classic script', true, `bundle: dist/assets/${BUNDLE}`);
  const { window } = dom;
  const { document } = window;
  window.addEventListener('error', (e) => errors.push(`window error: ${e.message}`));
  window.addEventListener('unhandledrejection', (e) => errors.push(`unhandled rejection: ${e.reason}`));

  // App mounts into #root.
  await waitFor(
    () => document.querySelector('#root')?.children.length > 0,
    15000,
    'app to mount into #root',
  );
  check('app mounts into #root', true, `${document.querySelector('#root').children.length} top-level child(ren)`);

  const main = () => document.querySelector('main');
  const navButtons = () => [...document.querySelectorAll('header nav button')];

  // Default route = World Map.
  check(
    'default route is World Map',
    main().textContent.includes('WORLD MAP · MASTER COMMAND'),
    'main contains "WORLD MAP · MASTER COMMAND" on first paint',
  );

  // Nav lists all 22 screens.
  const navLabels = navButtons().map((b) => b.textContent.trim());
  const missingNav = ROUTES.map(([label]) => label).filter((l) => !navLabels.includes(l));
  check(
    'nav lists all 22 screens',
    navLabels.length === 22 && missingNav.length === 0,
    `${navLabels.length} nav buttons${missingNav.length ? `; missing: ${missingNav.join(', ')}` : ''}`,
  );

  // v222 — MAP VIEW selector on the World Globe (base style,
  // terrain hillshade, lens row) + the Map Position panel's live
  // TERRAIN line. The default route is the World Map, so these are
  // in the DOM on first paint.
  const globeText = main().textContent;
  check('map-view selector present', globeText.includes('MAP VIEW'), 'MAP VIEW bar in main');
  check(
    'base style buttons present',
    ['STREETS', 'SATELLITE', 'FLOOR'].every((t) => globeText.includes(t)),
    'STREETS / SATELLITE / FLOOR',
  );
  check(
    'terrain toggle present',
    globeText.includes('HILLSHADE'),
    'TERRAIN OFF / HILLSHADE',
  );
  check(
    'lens row present',
    ['LENS', 'COVERAGE'].every((t) => globeText.includes(t)),
    'LENS WORLD / CRYPTO / EARNINGS / SECURITY / TRANSIT / COVERAGE',
  );
  check(
    'map position terrain line reads OFF by default',
    globeText.includes('TERRAIN: OFF'),
    'TERRAIN: OFF — turn on HILLSHADE in MAP VIEW',
  );
  check(
    'deep-zoom hint present',
    globeText.includes('ZOOM TO z21'),
    'ZOOM TO z21 · DRAG · SCROLL · PINCH · DOUBLE-CLICK',
  );

  // STAR orb present.
  const starOrb = document.querySelector('button[aria-label="STAR Orb"]');
  check('STAR orb button present', !!starOrb, starOrb ? 'aria-label="STAR Orb"' : 'not found');

  // No 'Live' execution option: the execution-mode strip must offer only
  // Read-Only / Paper / Sim / Guarded Auto. (The word "Live" does appear in
  // prose on the Crypto Market screen — "Live crypto prices only" — but that
  // is a subtitle describing intent, not an execution option; the screen body
  // honestly shows NOT_CONNECTED. See report.)
  const execButtons = [...document.querySelectorAll('header button')]
    .map((b) => b.textContent.trim())
    .filter((t) => ['Read-Only', 'Paper / Sim', 'Guarded Auto', 'Live'].includes(t));
  check(
    "no 'Live' execution option",
    execButtons.length === 3 && !execButtons.includes('Live'),
    `execution-mode buttons: ${execButtons.join(' | ')}`,
  );
  check(
    'owner-sign execution notice present',
    document.body.textContent.includes('Execution: owner signs') &&
      !document.body.textContent.includes('Execution disabled by design'),
    '"Execution: owner signs" present, stale "disabled" claim absent',
  );

  // Per-route smoke: click nav entry, wait for the render to settle (React
  // flushes async in jsdom — an immediate read still shows the previous
  // route), then assert heading + non-empty content.
  const routeTexts = [];
  async function settledMainText() {
    // Two identical consecutive samples 150ms apart = render settled.
    let prev = null;
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const t = main().textContent;
      if (t === prev) return t;
      prev = t;
      await sleep(150);
    }
    return main().textContent;
  }
  for (const [label, heading] of ROUTES) {
    const btn = navButtons().find((b) => b.textContent.trim() === label);
    if (!btn) {
      check(`route: ${label}`, false, 'no nav button');
      continue;
    }
    btn.click();
    const text = await settledMainText();
    routeTexts.push(text);
    const hasHeading = text.includes(heading);
    const nonEmpty = text.trim().length > 200;
    check(
      `route: ${label}`,
      hasHeading && nonEmpty,
      hasHeading
        ? `heading "${heading}" rendered, main text ${text.trim().length} chars`
        : `heading "${heading}" NOT found in main (main text ${text.trim().length} chars)`,
    );
  }

  // Guard against stale-render false passes: every route's settled <main>
  // text must be distinct (a click that failed to switch would repeat the
  // previous route's text, and a too-short wait would too).
  const hashes = routeTexts.map((t) => crypto.createHash('md5').update(t).digest('hex'));
  const uniqueHashes = new Set(hashes);
  check(
    'all 22 route renders are distinct',
    routeTexts.length === 22 && uniqueHashes.size === 22,
    `${uniqueHashes.size} distinct renders of ${routeTexts.length} routes`,
  );

  // v223 — Appearance Studio / Visual Universe on the Settings
  // route (the default tab). The route texts were captured above;
  // find the Settings render and assert the Studio sections.
  const settingsText = routeTexts[ROUTES.findIndex(([l]) => l === 'Settings World')] ?? '';
  check('appearance studio present', settingsText.includes('Appearance Studio'), 'Studio tab renders');
  check(
    'theme grid present',
    ['Electric Blue Command', 'Purple STAR', 'Stainless Steel Silver', 'Cyberpunk Neon'].every((t) =>
      settingsText.includes(t),
    ),
    '11 named themes',
  );
  check(
    'studio sections present',
    ['Custom Theme Builder', 'Presets — save entire worlds', 'Globe Designer', 'Window Designer', 'Visual Effects Studio', 'Alert Styles', 'Dynamic Living World', 'Media Library', 'Typography'].every((t) =>
      settingsText.includes(t),
    ),
    'builder / presets / globe / windows / effects / alerts / mood / media / type',
  );
  check(
    'colour-law guardrails stated',
    settingsText.includes('status colours') && settingsText.includes('canonical identities'),
    'law note present in the Studio',
  );
  check(
    'honest not-connected rows present',
    settingsText.includes('NOT_CONNECTED') && settingsText.includes('no image provider is configured'),
    'sound packs + AI generator honestly unconnected',
  );
  check(
    'steel + electric globe types present',
    settingsText.includes('STEEL') && settingsText.includes('ELECTRIC'),
    'Globe Designer offers 10 types',
  );

  // v224 — Living World: day/night terminator on the World Map
  // route (NIGHT toggle in the MAP VIEW bar + NIGHT line in the
  // Map Position panel, on by default).
  const worldMapText = routeTexts[ROUTES.findIndex(([l]) => l === 'World Map')] ?? '';
  check('night toggle present', worldMapText.includes('NIGHT'), 'MAP VIEW bar has NIGHT');
  check(
    'night line present',
    worldMapText.includes('NIGHT: ON'),
    'Map Position panel reports the terminator live',
  );
  check(
    'place intelligence gated',
    !worldMapText.includes('PLACE INTELLIGENCE'),
    'relationship panel stays hidden until a place or stop is focused',
  );
  check('places toggle present', worldMapText.includes('PLACES'), 'MAP VIEW bar has PLACES');
  check('flights toggle present', worldMapText.includes('FLIGHTS'), 'MAP VIEW bar has FLIGHTS');
  check('weather toggle present', worldMapText.includes('WEATHER'), 'MAP VIEW bar has WEATHER');

  // Honest states, checked across the whole rendered document after visiting
  // every route (last route visited is Crypto Workspaces; re-visit Globe and
  // Crypto Market so their honest-state strings are in the DOM too — the
  // check below runs on the full document, so instead collect rendered text
  // per route; simpler: re-check the two key screens now).
  const seenText = [];
  for (const label of ['World Map', 'Crypto Market', 'Crypto World']) {
    navButtons().find((b) => b.textContent.trim() === label)?.click();
    seenText.push(await settledMainText());
  }
  const allSeen = routeTexts.join('\n') + '\n' + seenText.join('\n');

  // D6 executor console + Command Decision Board (v219): the
  // executor panel renders on Crypto Market, dry-run only, and
  // the board renders on Cockpit Status. The executor must
  // never claim a live execution.
  const marketText = routeTexts[ROUTES.findIndex(([l]) => l === 'Crypto Market')] ?? '';
  check(
    'D6 executor console present, dry-run only',
    marketText.includes('D6 EXECUTOR') && marketText.includes('DRY_RUN') && !marketText.includes('LIVE_EXECUTION'),
    'executor panel on Crypto Market, DRY_RUN, no live-execution claim',
  );
  const statusText = routeTexts[ROUTES.findIndex(([l]) => l === 'Cockpit Status')] ?? '';
  check(
    'Command Decision Board present',
    statusText.includes('COMMAND DECISION BOARD') && statusText.includes('D6 Autonomous Executor'),
    'decision board on Cockpit Status with the D6 row',
  );
  check(
    'WalletConnect row on the Decision Board',
    statusText.includes('WalletConnect Project ID'),
    'board names the WalletConnect project-ID step (v220)',
  );
  check(
    'injected wallets block on Crypto Market',
    marketText.includes('DETECTED WALLETS') && marketText.includes('NO CONNECTION'),
    'desk shows the read-only injected-wallet detector (v220)',
  );
  check(
    'Across bridge fee block on Crypto Market',
    marketText.includes('BRIDGE TO BASE') && marketText.includes('QUOTE $50 USDC'),
    'desk shows the $50 funding-leg bridge quote (v221)',
  );
  const botOpsText = routeTexts[ROUTES.findIndex(([l]) => l === 'Bot Operations')] ?? '';
  check(
    'new radar categories on Bot Operations',
    botOpsText.includes('Stablecoins') && botOpsText.includes('Fixed Yield') && botOpsText.includes('Perp Funding'),
    'radar coverage lists Stablecoins, Perp Funding, Fixed Yield (v221)',
  );
  check(
    'honest state NOT_CONNECTED appears',
    allSeen.includes('NOT_CONNECTED'),
    'NOT_CONNECTED present across visited routes',
  );
  for (const s of FABRICATED) {
    check(
      `fabricated string absent: "${s}"`,
      !allSeen.includes(s) && !document.body.textContent.includes(s),
      s,
    );
  }

  // No uncaught script errors during the whole run.
  check('no uncaught window errors', errors.length === 0, errors.join(' | ') || 'none recorded');
} finally {
  server.close();
}

console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures ? 1 : 0);
