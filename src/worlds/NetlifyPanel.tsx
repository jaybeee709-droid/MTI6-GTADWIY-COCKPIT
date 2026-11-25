// Netlify Panel — pinned deploy/hosting panel for MTI6-GTADWIY-COCKPIT.
//
// Everything shown here comes from src/netlify-knowledge.ts (the
// owner-verified facts) plus two live reads made at runtime:
//   1. the live app version, read from the served /sw.js CACHE_VERSION
//      marker (netlify.toml serves sw.js no-cache, so the read is
//      fresh). sw.js is a service-worker script, not an importable
//      module, and the app displays no version anywhere else, so a
//      same-origin fetch is the only honest source. If the fetch or
//      the parse fails, the version reads UNKNOWN — never a guessed
//      or hardcoded number.
//   2. the gateway state, from a POST /api/mti6 gateway.status call.
//      The gateway lives on the Deploy Preview only; on the
//      production host (no function) the call 404s and the panel
//      honestly shows NOT_CONNECTED. Any failure shows NOT_CONNECTED.
// Env vars are listed by NAME ONLY — never a value. There is NO
// Netlify API token, so the panel cannot read live deploy logs,
// build status, or deploy history from Netlify's API, and it says
// so instead of inventing a deploy state.

import React, { useEffect, useState } from 'react';
import { Cloud } from 'lucide-react';
import { Panel, ScreenHeader, StatusPill } from '../screens/shared';
import {
  NETLIFY_ENV_VAR_NAMES,
  NETLIFY_GATEWAY_ACTIONS,
  NETLIFY_GATEWAY_PATH,
  NETLIFY_PREVIEW_BRANCH,
  NETLIFY_PREVIEW_LABEL,
  NETLIFY_PREVIEW_URL,
  NETLIFY_PRODUCTION_BRANCH,
  NETLIFY_PRODUCTION_COMMIT,
  NETLIFY_PRODUCTION_COMMIT_DATE,
  NETLIFY_PRODUCTION_URL,
  NETLIFY_SITE_NAME,
  NETLIFY_TEAM,
} from '../netlify-knowledge';

type GatewayState =
  | { state: 'checking' }
  | { state: 'ok'; configuredCount: number; configuredTotal: number }
  | { state: 'unreachable' };

type VersionState = { state: 'checking' } | { state: 'read'; value: string } | { state: 'unknown' };

const VERSION_RE = /CACHE_VERSION\s*=\s*"([^"]+)"/;

export function NetlifyPanel(): React.ReactElement {
  const [gateway, setGateway] = useState<GatewayState>({ state: 'checking' });
  const [version, setVersion] = useState<VersionState>({ state: 'checking' });

  // Live app version: read the served sw.js marker. If the marker
  // cannot be read or parsed, the version is UNKNOWN — not guessed.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch('/sw.js', { cache: 'no-store' });
        if (!res.ok) throw new Error(`sw.js HTTP ${res.status}`);
        const text = await res.text();
        const m = VERSION_RE.exec(text);
        if (!live) return;
        setVersion(m ? { state: 'read', value: m[1] } : { state: 'unknown' });
      } catch {
        if (live) setVersion({ state: 'unknown' });
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // Gateway state: POST gateway.status to the same-origin proxy.
  // Reachable only where the function is deployed (the preview);
  // on production the call 404s and this reads NOT_CONNECTED.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(NETLIFY_GATEWAY_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'gateway.status' }),
        });
        const env = (await res.json().catch(() => null)) as {
          ok?: boolean;
          data?: { providersConfigured?: Record<string, boolean> };
        } | null;
        if (!live) return;
        if (res.ok && env?.ok && env.data?.providersConfigured) {
          const flags = Object.values(env.data.providersConfigured);
          setGateway({
            state: 'ok',
            configuredCount: flags.filter(Boolean).length,
            configuredTotal: flags.length,
          });
        } else {
          setGateway({ state: 'unreachable' });
        }
      } catch {
        if (live) setGateway({ state: 'unreachable' });
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="space-y-5 text-white">
      <ScreenHeader
        icon={Cloud}
        title="Netlify — Deploy & Hosting"
        subtitle={`One site: ${NETLIFY_SITE_NAME} · ${NETLIFY_TEAM} · auto-publishing on`}
        note="Deploy status, gateway status, and env vars by name only. Nothing here is read from Netlify's API — there is no Netlify API token."
      />

      <Panel title="Deploy status">
        <div className="space-y-1.5 font-mono text-[11px] leading-relaxed text-[#B8B8B8]">
          <p>
            <span className="text-white">Live app version</span> ·{' '}
            {version.state === 'checking' ? (
              <span>CHECKING…</span>
            ) : version.state === 'read' ? (
              <span className="text-[#32D74B]">{version.value}</span>
            ) : (
              <span className="text-[#FFB020]">UNKNOWN</span>
            )}{' '}
            · read from the served /sw.js version marker; UNKNOWN when the marker cannot be read
          </p>
          <p>
            <span className="text-white">Production</span> ·{' '}
            <span className="text-white">
              {NETLIFY_PRODUCTION_BRANCH} @ {NETLIFY_PRODUCTION_COMMIT}
            </span>{' '}
            ({NETLIFY_PRODUCTION_COMMIT_DATE}) · initial PWA shell only, 0 functions ·{' '}
            {NETLIFY_PRODUCTION_URL}
          </p>
          <p>
            <span className="text-white">{NETLIFY_PREVIEW_LABEL}</span> ·{' '}
            <span className="text-white">{NETLIFY_PREVIEW_BRANCH} branch</span> · redeploys
            automatically on every push to development · {NETLIFY_PREVIEW_URL}
          </p>
          <p className="pt-1 text-[10px]">
            DEPLOY FLOW: PUSH TO DEVELOPMENT → PREVIEW REDEPLOYS AUTOMATICALLY. PRODUCTION CHANGES
            ONLY VIA MERGING PR #1 INTO MAIN, WHICH THE OWNER HAS NOT AUTHORIZED.
          </p>
        </div>
      </Panel>

      <Panel title="Gateway / function status">
        <div className="space-y-1.5 font-mono text-[11px] leading-relaxed text-[#B8B8B8]">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-white">Gateway ({NETLIFY_GATEWAY_PATH})</span>
            {gateway.state === 'checking' ? (
              <StatusPill status="CHECKING…" tone="neutral" />
            ) : gateway.state === 'ok' ? (
              <StatusPill status="CONNECTED" tone="ok" />
            ) : (
              <StatusPill status="NOT_CONNECTED" tone="bad" />
            )}
            {gateway.state === 'ok' ? (
              <span>
                gateway.status answered · {gateway.configuredCount}/{gateway.configuredTotal}{' '}
                providers report configured
              </span>
            ) : gateway.state === 'unreachable' ? (
              <span>
                gateway.status did not answer from here — the function lives on the preview only;
                on the production host (no function) this call 404s
              </span>
            ) : null}
          </p>
          <p>
            <span className="text-white">Actions</span> · {NETLIFY_GATEWAY_ACTIONS.join(', ')}
          </p>
          <p className="text-[10px]">
            POST-ONLY PROXY (netlify/functions/mti6-proxy.mjs). SECRETS STAY IN NETLIFY ENV; THE
            GATEWAY NEVER RETURNS A SECRET TO THE CLIENT.
          </p>
        </div>
      </Panel>

      <Panel title="Environment variables — names only">
        <div className="space-y-1.5">
          {NETLIFY_ENV_VAR_NAMES.map((name) => (
            <p
              key={name}
              className="flex flex-wrap items-center gap-2 font-mono text-[11px] leading-relaxed text-[#B8B8B8]"
            >
              <span className="text-white">{name}</span>
              <StatusPill status="CONFIGURED" tone="ok" />
              {name === 'MTI6_TWITCH_CLIENT_ID' ? (
                <span>(public client ID — not secret-marked)</span>
              ) : null}
            </p>
          ))}
          <p className="pt-1 font-mono text-[10px] leading-relaxed text-[#B8B8B8]">
            PRESENCE BY NAME ONLY — VALUES ARE NEVER SHOWN, LOGGED, OR SENT TO THE CLIENT. ALL
            OTHERS ARE SECRET-MARKED.
          </p>
        </div>
      </Panel>

      <Panel title="What this panel cannot read">
        <div className="space-y-1.5 font-mono text-[11px] leading-relaxed text-[#B8B8B8]">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-white">Live deploy log / build status / deploy history</span>
            <StatusPill status="NOT_CONNECTED" tone="bad" />
            <span>— there is NO Netlify API token, so nothing can be read from Netlify&apos;s API</span>
          </p>
          <p className="text-[10px]">
            THIS PANEL NEVER INVENTS A DEPLOY STATE. IF A DEPLOY STATE IS NOT SHOWN ABOVE FROM A
            VERIFIED FACT OR A LIVE READ, IT IS UNKNOWN.
          </p>
        </div>
      </Panel>
    </div>
  );
}
