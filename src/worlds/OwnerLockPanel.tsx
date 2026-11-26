import React, { useEffect, useState } from 'react';
import { KeyRound, Lock, LockKeyhole, ShieldCheck } from 'lucide-react';
import {
  OWNER_EMAIL,
  checkLockStatus,
  googleClientId,
  lockNow,
  type LockState,
} from '../owner-lock';

/* Owner lock panel — Settings > Devices (v248 part 1).
 *
 * READ-ONLY status + setup steps. This panel never accepts, sets,
 * or stores a password: the password is set by Daniel via the Secure
 * Vault form and only its SHA-256 hash lands in the Netlify env var
 * MTI6_APP_LOCK_HASH. The Google step needs a Google Cloud OAuth
 * client ID in VITE_MTI6_GOOGLE_CLIENT_ID (Netlify env, redeploy).
 * Until BOTH are set, the lock is honestly "not set up yet" and the
 * app opens as before — the panel says exactly what is missing. */

export function OwnerLockPanel() {
  const [state, setState] = useState<LockState>('checking');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const clientId = googleClientId();

  useEffect(() => {
    let live = true;
    checkLockStatus().then((r) => {
      if (!live) return;
      setState(r.state);
      setConfigured(r.configured);
      setUnreachable(r.unreachable);
    });
    return () => {
      live = false;
    };
  }, []);

  const passwordSet = configured === true;
  const googleReady = clientId !== null;
  const lockEngaged = passwordSet && googleReady;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-[#0A0A0A] p-4">
      <div className="mb-1 flex items-center gap-2">
        <LockKeyhole className="h-4 w-4 text-[#00B7FF]" />
        <h4 className="text-sm font-semibold">Owner lock</h4>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 font-mono text-[10px] ${
            state === 'unlocked'
              ? 'bg-[#32D74B]/15 text-[#32D74B]'
              : state === 'locked'
                ? 'bg-[#FFB020]/15 text-[#FFB020]'
                : state === 'not-set-up'
                  ? 'bg-white/10 text-[#B8B8B8]'
                  : 'bg-white/10 text-[#B8B8B8]'
          }`}
        >
          {state === 'checking'
            ? 'CHECKING…'
            : state === 'unlocked'
              ? 'UNLOCKED THIS SESSION'
              : state === 'locked'
                ? 'LOCKED'
                : 'NOT SET UP YET'}
        </span>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-[#B8B8B8]">
        The owner lock gates the whole app behind two checks, both required: the device signed
        in to {OWNER_EMAIL}, and the fresh app password. Nothing runs without both once the
        lock is set up.
      </p>

      <div className="space-y-2 text-xs">
        <div className="flex items-start gap-2">
          <ShieldCheck
            className={`mt-0.5 h-4 w-4 shrink-0 ${googleReady ? 'text-[#32D74B]' : 'text-[#FFB020]'}`}
          />
          <div>
            <span className="font-semibold text-white">Step 1 — Google sign-in: </span>
            {googleReady ? (
              <span className="text-[#B8B8B8]">
                ready — the sign-in button checks the account against {OWNER_EMAIL}.
              </span>
            ) : (
              <span className="text-[#FFB020]">
                Google sign-in not set up yet — no OAuth client ID is configured.
              </span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <KeyRound
            className={`mt-0.5 h-4 w-4 shrink-0 ${passwordSet ? 'text-[#32D74B]' : 'text-[#FFB020]'}`}
          />
          <div>
            <span className="font-semibold text-white">Step 2 — App password: </span>
            {passwordSet ? (
              <span className="text-[#B8B8B8]">
                set — the lock is engaged. The password itself is never stored in the app.
              </span>
            ) : (
              <span className="text-[#FFB020]">
                app password not set — the lock is not engaged yet.
              </span>
            )}
          </div>
        </div>
        {unreachable && (
          <p className="rounded-lg bg-[#FFB020]/10 px-3 py-2 text-[#FFB020]">
            The gateway could not be reached, so the lock state could not be checked. The app
            stays locked rather than opening by default.
          </p>
        )}
      </div>

      {!lockEngaged && (
        <div className="mt-3 rounded-lg border border-[#FFB020]/30 bg-[#FFB020]/5 p-3">
          <p className="mb-2 text-xs font-semibold text-white">To set up the lock:</p>
          <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-[#B8B8B8]">
            {!passwordSet && (
              <li>
                Set the app password via the Secure Vault form — only its hash is stored (Netlify
                env var MTI6_APP_LOCK_HASH). Until then the app opens as today and the lock is
                not active.
              </li>
            )}
            {!googleReady && (
              <li>
                Create a Google Cloud OAuth client ID for the app, set it as
                VITE_MTI6_GOOGLE_CLIENT_ID in Netlify, and redeploy. Without it the Google step
                cannot run and the lock cannot be satisfied.
              </li>
            )}
          </ol>
        </div>
      )}

      {state === 'unlocked' && (
        <button
          onClick={() => {
            lockNow();
            window.location.reload();
          }}
          className="mt-3 flex items-center gap-2 rounded-lg border border-white/15 bg-[#202020] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2A2A2A]"
        >
          <Lock className="h-3.5 w-3.5" /> Lock now
        </button>
      )}
    </div>
  );
}
