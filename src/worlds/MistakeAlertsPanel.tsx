/**
 * Mistake Alerts Panel (v247, owner direction #10) — the owner
 * gets NOTIFIED on ANY mistake, right away. Every mistake
 * creates an immediate owner ALERT: NEW alerts first (title,
 * detail, source, time, kind) with an ACKNOWLEDGE button each,
 * acknowledged alerts below, and the alert config (alerts
 * email shown, phone field, and a form to set the phone +
 * change the email — owner input only).
 *
 * HONEST DELIVERY: in-app only. No SMS or mail provider is
 * wired, so no text or email is sent and no sent status is
 * ever shown. Alerts go to BOTH contacts in the config (the
 * number and the email) once a delivery route exists.
 * Reads live from the mistake-alerts store (mistake-alerts.ts).
 */
import React, { useEffect, useState } from 'react';
import {
  acknowledgeAlert,
  getAlertConfig,
  loadMistakeAlerts,
  setAlertConfig,
  unreadMistakeAlertCount,
  type AlertConfig,
  type MistakeAlert,
} from '../mistake-alerts';

export function MistakeAlertsPanel() {
  const [alerts, setAlerts] = useState<MistakeAlert[]>([]);
  const [config, setConfig] = useState<AlertConfig>({ email: '', phone: '' });
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [savedNote, setSavedNote] = useState('');

  useEffect(() => {
    const cfg = getAlertConfig();
    setConfig(cfg);
    setPhoneInput(cfg.phone);
    setEmailInput(cfg.email);
    setAlerts(loadMistakeAlerts());
  }, []);

  const refresh = () => setAlerts(loadMistakeAlerts());
  const unread = alerts.filter((a) => a.status === 'NEW');
  const acknowledged = alerts.filter((a) => a.status === 'ACKNOWLEDGED');

  const onAcknowledge = (id: string) => {
    acknowledgeAlert(id);
    refresh();
  };

  const onSaveConfig = () => {
    const next = setAlertConfig({ email: emailInput, phone: phoneInput });
    setConfig(next);
    setPhoneInput(next.phone);
    setEmailInput(next.email);
    setSavedNote('Alert contact saved.');
  };

  return (
    <div className="rounded-lg border border-[#2a2a3a] bg-[#0b0b12] p-4">
      <div className="mb-1 text-sm font-bold tracking-wide text-white">MISTAKE ALERTS — THE OWNER IS NOTIFIED ON ANY MISTAKE</div>
      <p className="mb-3 text-xs leading-relaxed text-zinc-400">
        {alerts.length} alert(s) recorded · {unreadMistakeAlertCount()} new — every mistake creates an alert at once, and it
        stays NEW until the owner acknowledges it. Delivery is in-app only.
      </p>

      {alerts.length === 0 ? (
        <p className="text-xs text-zinc-500">No mistake alerts recorded yet.</p>
      ) : (
        <>
          {unread.length > 0 && (
            <div className="space-y-3">
              {unread.map((a) => (
                <div key={a.id} className="rounded-md border border-[#ff6b6b]/50 bg-[#12121c] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">{a.title}</span>
                    <span className="rounded bg-[#ff6b6b]/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[#ff6b6b]">
                      {a.kind}
                    </span>
                    <span className="rounded bg-[#ff6b6b]/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[#ff6b6b]">
                      NEW
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      recorded {new Date(a.recordedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-300">{a.detail}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                    <span className="font-semibold">Source: </span>
                    {a.source}
                  </p>
                  <button
                    type="button"
                    onClick={() => onAcknowledge(a.id)}
                    className="mt-2 rounded bg-[#8B5CFF] px-3 py-1 text-xs font-bold text-white hover:bg-[#7a4de8]"
                  >
                    ACKNOWLEDGE
                  </button>
                </div>
              ))}
            </div>
          )}

          {acknowledged.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-bold tracking-wide text-zinc-400">
                ACKNOWLEDGED ({acknowledged.length})
              </div>
              <div className="space-y-3">
                {acknowledged.map((a) => (
                  <div key={a.id} className="rounded-md border border-[#2a2a3a] bg-[#12121c] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-200">{a.title}</span>
                      <span className="rounded bg-zinc-700/40 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-zinc-400">
                        {a.kind}
                      </span>
                      <span className="rounded bg-zinc-700/40 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-zinc-400">
                        ACKNOWLEDGED
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        recorded {new Date(a.recordedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">{a.detail}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                      <span className="font-semibold">Source: </span>
                      {a.source}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-4 rounded-md border border-[#2a2a3a] bg-[#12121c] p-3">
        <div className="mb-2 text-xs font-bold tracking-wide text-white">ALERT CONTACT</div>
        <p className="text-xs leading-relaxed text-zinc-400">
          Alerts email: <span className="font-semibold text-zinc-200">{config.email}</span>
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          Phone for alerts:{' '}
          {config.phone ? (
            <span className="font-semibold text-zinc-200">{config.phone}</span>
          ) : (
            <span className="text-zinc-500">not provided yet — the owner gives it when he wants phone alerts</span>
          )}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          Alerts go to BOTH the number and the email. The number is a US number, voice + SMS capable, from a
          second-number app — keeping it secured (premium) is what keeps the number his.
        </p>
        <div className="mt-3 space-y-2">
          <label className="block text-[11px] font-semibold text-zinc-300">
            Phone for alerts
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="Alerts number — the owner changes it here"
              className="mt-1 block w-full rounded border border-[#2a2a3a] bg-[#0b0b12] px-2 py-1.5 text-xs text-white placeholder:text-zinc-600"
            />
          </label>
          <label className="block text-[11px] font-semibold text-zinc-300">
            Alerts email
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="mt-1 block w-full rounded border border-[#2a2a3a] bg-[#0b0b12] px-2 py-1.5 text-xs text-white placeholder:text-zinc-600"
            />
          </label>
          <button
            type="button"
            onClick={onSaveConfig}
            className="rounded bg-[#8B5CFF] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#7a4de8]"
          >
            SAVE ALERT CONTACT
          </button>
          {savedNote && <span className="ml-2 text-[11px] text-[#32D74B]">{savedNote}</span>}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-zinc-500">
        In-app delivery only — no SMS or email provider is wired, so no text or email is sent. Outbound SMS/email
        delivery is a designed follow-on.
      </p>
    </div>
  );
}
