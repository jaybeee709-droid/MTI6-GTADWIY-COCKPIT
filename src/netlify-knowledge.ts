/* Netlify knowledge — facts about where MTI6-GTADWIY-COCKPIT is
 * hosted and how it deploys, written for STAR and the bots.
 *
 * SOURCE: owner-verified Netlify facts (2026-11-25). Every claim
 * here is one of those facts; nothing else is asserted. Env vars
 * are listed by NAME ONLY — never a value, never a partial value.
 * If a fact stops being true, update this file, not the callers:
 * the NetlifyPanel reads the same constants, so there is one
 * source of truth, not two.
 *
 * NOT verifiable from this repo checkout alone (taken from the
 * owner-verified brief): the project id, the team name, the
 * production commit f785c45, the Deploy Preview #1 URL, and the
 * full env-var presence list. Verifiable in-repo: the site name
 * (netlify-adjacent strings + Twitch embed parents), the gateway
 * action list (netlify/functions/mti6-proxy.mjs), the /api/mti6
 * rewrite (netlify.toml), and the sw.js CACHE_VERSION marker. */

export const NETLIFY_SITE_NAME = 'mti6-gtadwiy-cockpit';
export const NETLIFY_PROJECT_ID = '9349ce19-1fb5-4f2e-a08e-cf9603b45727';
export const NETLIFY_TEAM = "Jay Beee's team";
export const NETLIFY_CREATED = 'Oct 19, 2026';
export const NETLIFY_PRODUCTION_BRANCH = 'main';
export const NETLIFY_PRODUCTION_COMMIT = 'f785c45';
export const NETLIFY_PRODUCTION_COMMIT_DATE = 'Nov 3, 2026';
export const NETLIFY_PRODUCTION_URL = 'https://mti6-gtadwiy-cockpit.netlify.app';
export const NETLIFY_PREVIEW_BRANCH = 'development';
export const NETLIFY_PREVIEW_URL =
  'https://deploy-preview-1--mti6-gtadwiy-cockpit.netlify.app';
export const NETLIFY_PREVIEW_LABEL = 'Deploy Preview #1 (PR #1)';

/** The proxy function. POST-only; the production host has NO
 * function, so gateway calls to production 404 — the proxy lives
 * on the preview only. */
export const NETLIFY_GATEWAY_PATH = '/api/mti6';
export const NETLIFY_GATEWAY_FUNCTION = 'netlify/functions/mti6-proxy.mjs';

/** Every action the gateway supports (matches the switch in
 * netlify/functions/mti6-proxy.mjs). */
export const NETLIFY_GATEWAY_ACTIONS: string[] = [
  'gateway.status',
  'gateway.ping',
  'transit.stopsNear',
  'transit.departures',
  'star.chat',
  'market.prices',
  'geo.geocode',
  'flights.nearby',
  'cameras.nyc',
  'disasters.gdacs',
  'cameras.california',
  'cameras.maryland',
  'cameras.louisiana',
  'cameras.utah',
  'cameras.windy',
  'streams.twitch',
];

/** Env vars present in Netlify, by NAME ONLY. All are
 * secret-marked except MTI6_TWITCH_CLIENT_ID (a public client
 * ID, not a secret). There is NO Netlify API token, so nothing
 * can read live deploy data from Netlify's API. */
export const NETLIFY_ENV_VAR_NAMES: string[] = [
  'MTI6_STAR_API_KEY',
  'MTI6_WINDY_API_KEY',
  'MTI6_TWITCH_CLIENT_ID',
  'MTI6_TWITCH_CLIENT_SECRET',
  'OPENROUTER_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'ALCHEMY_API_KEY',
  'ETHERSCAN_API_KEY',
  'COINGECKO_API_KEY',
  'TRANSITLAND_API_KEY',
];

/** Names only, comma-separated — for answers that list the keys. */
export const NETLIFY_ENV_VAR_NAMES_TEXT = NETLIFY_ENV_VAR_NAMES.join(', ');

export const NETLIFY_KNOWLEDGE = [
  'Netlify hosting for MTI6-GTADWIY-COCKPIT: one site, "mti6-gtadwiy-cockpit"',
  `(project id ${NETLIFY_PROJECT_ID}, created ${NETLIFY_CREATED}), on the account/team`,
  `"${NETLIFY_TEAM}". Exactly one site exists; auto-publishing is on. There is no`,
  'second Netlify project.',
  '',
  'Production is the main branch, published as main @ f785c45 (Nov 3, 2026) — the',
  'initial PWA shell only, with 0 functions. Production host: https://mti6-gtadwiy-cockpit.netlify.app.',
  'Development is live only as Deploy Preview #1 (PR #1):',
  'https://deploy-preview-1--mti6-gtadwiy-cockpit.netlify.app.',
  '',
  'Production vs preview: production is the frozen public release (main @ f785c45);',
  'the preview is the live development build, redeployed automatically on every push',
  'to development. The two are different deployments of the same site, not two sites.',
  '',
  'Deploy flow: push to development and the Deploy Preview redeploys automatically.',
  'Production changes only via merging PR #1 into main, which the owner has NOT',
  'authorized. Never merge to main, never change production, never create a second',
  'Netlify project.',
  '',
  'Gateway: netlify/functions/mti6-proxy.mjs, POST-only, reached at /api/mti6.',
  'It lives on the preview only — the production host has NO function, so gateway',
  'calls to production 404. Actions: gateway.status, gateway.ping, transit.stopsNear,',
  'transit.departures, star.chat, market.prices, geo.geocode, flights.nearby, cameras.nyc,',
  'disasters.gdacs, cameras.california, cameras.maryland, cameras.louisiana, cameras.utah,',
  'cameras.windy, streams.twitch.',
  '',
  'Environment variables in Netlify, by NAME ONLY (never values): MTI6_STAR_API_KEY,',
  'MTI6_WINDY_API_KEY, MTI6_TWITCH_CLIENT_ID, MTI6_TWITCH_CLIENT_SECRET, OPENROUTER_API_KEY,',
  'ANTHROPIC_API_KEY, GEMINI_API_KEY, ALCHEMY_API_KEY, ETHERSCAN_API_KEY, COINGECKO_API_KEY,',
  'TRANSITLAND_API_KEY. All are secret-marked except MTI6_TWITCH_CLIENT_ID.',
  '',
  'Limits: there is NO Netlify API token, so no live deploy log, build status, or',
  'deploy history can be read from Netlify\'s API. The panel reports NOT_CONNECTED',
  'for anything it cannot read live; it never invents a deploy state.',
].join('\n');

/* --- STAR question answering ------------------------------------ */

function norm(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9 .#/_:-]/g, ' ').replace(/\s+/g, ' ').trim();
}

const has = (q: string, ...words: string[]): boolean => words.some((w) => q.includes(w));

const ANSWER_WHAT_IS_NETLIFY =
  'Netlify is the hosting platform for MTI6-GTADWIY-COCKPIT. It builds the React app ' +
  '(npm run build, publishing dist/) and serves it on one site, "mti6-gtadwiy-cockpit", ' +
  `on the account/team "${NETLIFY_TEAM}" (project id ${NETLIFY_PROJECT_ID}, created ${NETLIFY_CREATED}). ` +
  'It also runs the serverless gateway function (netlify/functions/mti6-proxy.mjs) that the app ' +
  'calls at /api/mti6. Auto-publishing is on, and there is exactly one site — no second Netlify project.';

const ANSWER_WHERE_DEPLOYED =
  'MTI6-GTADWIY-COCKPIT is deployed on Netlify as one site, "mti6-gtadwiy-cockpit". ' +
  `Production: ${NETLIFY_PRODUCTION_URL} (main @ ${NETLIFY_PRODUCTION_COMMIT}, ${NETLIFY_PRODUCTION_COMMIT_DATE} — ` +
  'the initial PWA shell only, 0 functions). Development is live only as Deploy Preview #1 (PR #1): ' +
  `${NETLIFY_PREVIEW_URL}. The gateway function lives on the preview only; production has no function, ` +
  'so gateway calls to production 404.';

const ANSWER_PROD_VS_PREVIEW =
  'Production and the preview are two deployments of the same Netlify site, not two sites. ' +
  `Production is the main branch at main @ ${NETLIFY_PRODUCTION_COMMIT} (${NETLIFY_PRODUCTION_COMMIT_DATE}) — ` +
  'the initial PWA shell only, with 0 functions. The preview (Deploy Preview #1, PR #1) is the ' +
  'development branch, redeployed automatically on every push to development, and it is the only ' +
  'place the gateway function runs. Production changes only by merging PR #1, which the owner has NOT authorized.';

const ANSWER_DEPLOY_FLOW =
  'Deploy flow: push to the development branch and Deploy Preview #1 redeploys automatically ' +
  '(auto-publishing is on). That preview is where all current work is verified. Production (main) ' +
  'changes only via merging PR #1 into main, which the owner has NOT authorized — so nothing is ' +
  'deployed to production by pushing. There is exactly one Netlify site and no second project is created.';

const ANSWER_KEYS =
  'These environment variables are configured in Netlify, by name only — values are never shown: ' +
  `${NETLIFY_ENV_VAR_NAMES_TEXT}. All are secret-marked except MTI6_TWITCH_CLIENT_ID, which is a ` +
  'public client ID, not a secret. There is NO Netlify API token, so live deploy data cannot be read ' +
  "from Netlify's API.";

const ANSWER_GATEWAY =
  'The gateway is netlify/functions/mti6-proxy.mjs, a POST-only serverless function reached at /api/mti6. ' +
  'It lives on the Deploy Preview only — the production host has no function, so gateway calls to production 404. ' +
  'It supports these actions: ' +
  NETLIFY_GATEWAY_ACTIONS.join(', ') +
  '. Secrets stay in Netlify env vars; the gateway never returns a secret to the client.';
const ANSWER_VERSION =
  `Published production is main @ ${NETLIFY_PRODUCTION_COMMIT} (${NETLIFY_PRODUCTION_COMMIT_DATE}) — the initial ` +
  'PWA shell only. The live app version is whatever the running build reports from its own sw.js version marker; ' +
  'the Netlify panel shows it when it can read it and UNKNOWN when it cannot. Development work is verified on ' +
  'Deploy Preview #1, not on production.';

/**
 * Answer a Netlify question from the verified facts, or null when
 * the question cannot be answered from those facts. Never invents.
 */
export function answerNetlifyQuestion(q: string): string | null {
  const n = norm(q);
  if (!n) return null;
  if (!has(n, 'netlify', 'deploy', 'host', 'production', 'preview', 'gateway', 'proxy', 'publish', 'env', 'key', 'secret', 'version', 'commit')) {
    return null;
  }
  // Most specific first: production-vs-preview, then deploy flow.
  if (
    (has(n, 'difference', 'differ', 'vs', 'versus', 'compare') &&
      has(n, 'production', 'preview', 'main', 'development')) ||
    has(n, 'production vs preview', 'preview vs production')
  ) {
    return ANSWER_PROD_VS_PREVIEW;
  }
  if (has(n, 'deploy flow', 'how do i deploy', 'how does deployment work', 'how is it deployed', 'how do you deploy', 'deployment work', 'deploy process', 'how to deploy', 'deploying')) {
    return ANSWER_DEPLOY_FLOW;
  }
  if (
    has(n, 'what keys', 'which keys', 'what env', 'which env', 'environment variables', 'env vars', 'what secrets', 'api keys in netlify', 'keys are in netlify', 'keys in netlify', 'secrets in netlify') ||
    (has(n, 'key', 'keys', 'secret', 'env') && has(n, 'netlify'))
  ) {
    return ANSWER_KEYS;
  }
  if (has(n, 'what is the gateway', 'what is gateway', 'gateway', 'proxy', 'what actions', 'gateway actions', 'what can the gateway')) {
    return ANSWER_GATEWAY;
  }
  if (has(n, 'what version', 'which version', 'what commit', 'which commit', 'version is live', 'version is the app', 'production commit', 'is production up to date', 'is production current')) {
    return ANSWER_VERSION;
  }
  if (has(n, 'what is netlify', 'what does netlify', 'netlify do', 'what is netlify for')) {
    return ANSWER_WHAT_IS_NETLIFY;
  }
  if (
    has(n, 'where is the app deployed', 'where is it deployed', 'where is it hosted', 'where does it live', 'deployed', 'hosted', 'production url', 'preview url', 'deploy url', 'site url', 'what is the url', 'live url', 'app url')
  ) {
    return ANSWER_WHERE_DEPLOYED;
  }
  return null;
}
