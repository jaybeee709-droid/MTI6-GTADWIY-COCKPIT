// Web — Bot Work, migrated from js/modules/web.js
//
// The "browser box" a web page can honestly offer:
// - No embedded YouTube player (removed by owner choice Oct 31,
//   2026): web search finds videos, and video links open in the
//   phone's default browser instead.
// - Public page URLs show their readable text via the scouts layer.
// - Pages that block browser fetches are NOT bypassed: the window
//   shows a link to open them in the phone's default browser.
// - Topics search saved bot knowledge and Hacker News headlines.
// The content window resizes (Small / Medium / Full), and the
// activity log shows every bot step with a time, so the work is
// visible instead of silent. Clips and movies are made in Muse chat
// and saved to play in the default browser — this page does not
// render movies locally.
//
// The KnowledgeScout layer is not wired in this React build, so no
// page text can be fetched and no saved knowledge can be searched
// here — the window says so honestly instead of pretending to work.

import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { EmptyState, Panel, ScreenHeader } from './shared';

type WindowSize = 'small' | 'medium' | 'full';

const WINDOW_HEIGHTS: Record<WindowSize, string> = {
  small: 'min-h-[120px]',
  medium: 'min-h-[220px]',
  full: 'min-h-[420px]',
};

function isVideoLink(text: string): boolean {
  return /(?:youtube\.com\/watch\?|youtu\.be\/|vimeo\.com\/)/i.test(text);
}

function fmtClock(): string {
  try {
    return new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

export const WebBotWorkScreen: React.FC = () => {
  const [input, setInput] = useState('');
  const [size, setSize] = useState<WindowSize>('medium');
  const [windowText, setWindowText] = useState('Your content will appear here.');
  const [windowLink, setWindowLink] = useState<{ href: string; label: string } | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog((prev) => [...prev, `${fmtClock()} — ${msg}`]);

  const go = () => {
    const value = input.trim();
    if (!value) return;
    addLog(`Bot starting: ${value.slice(0, 80)}`);
    if (isVideoLink(value)) {
      addLog('Video link — no embedded player; opening via default browser link (web search finds the video).');
      setWindowText('Video links open in your phone’s default browser. Use the global search bar to find videos on the web.');
      setWindowLink({ href: value, label: 'Open video in your phone’s default browser' });
      return;
    }
    if (/^https?:\/\//i.test(value)) {
      addLog('Fetching public page text (no bypass if blocked)…');
      addLog('Scouts layer did not load — no page text can be fetched in this build.');
      setWindowText(
        'The KnowledgeScout layer is not wired in this build, so this page’s text cannot be read here. Pages that block browser fetches are never bypassed — open it in your phone’s default browser instead.',
      );
      setWindowLink({ href: value, label: 'Open in your phone’s default browser' });
      return;
    }
    addLog(`Searching saved bot knowledge and headlines for: ${value}`);
    addLog('No saved knowledge match — the KnowledgeScout layer is not wired in this build.');
    setWindowText(
      'No saved bot knowledge matched. Try the Scouts panel to scrape and save a public page on this topic first — the Scouts layer is not connected in this build.',
    );
    setWindowLink(null);
  };

  return (
    <div className="space-y-5 text-white">
      <ScreenHeader
        icon={Globe}
        title="Web — Bot Work Window"
        subtitle="Search box at the top, content window below, activity log under it"
        note="This is not another browser — it cannot open Safari, Chrome, or Tor, and it never bypasses a page that blocks it. No embedded video player, by owner choice."
      />

      <Panel>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                go();
              }
            }}
            placeholder="Video link, public page URL, or topic…"
            aria-label="Web search or URL"
            className="flex-1 rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-xs text-white placeholder-[#B8B8B8] outline-none"
          />
          <button
            onClick={go}
            className="shrink-0 rounded-xl bg-[#00B7FF] px-4 py-2 text-xs font-semibold text-black transition hover:opacity-90"
          >
            Go
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          {(['small', 'medium', 'full'] as WindowSize[]).map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                size === s
                  ? 'bg-[#00B7FF] font-semibold text-black'
                  : 'bg-[#151515] text-[#B8B8B8] hover:bg-[#202020] hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className={`mt-3 rounded-xl border border-white/10 bg-[#151515] p-4 ${WINDOW_HEIGHTS[size]}`}>
          <p className="text-xs text-[#B8B8B8]">{windowText}</p>
          {windowLink ? (
            <a
              href={windowLink.href}
              target="_blank"
              rel="noopener"
              className="mt-2 inline-block text-xs font-semibold text-[#00B7FF] underline"
            >
              {windowLink.label}
            </a>
          ) : null}
        </div>

        <h3 className="mb-2 mt-4 text-sm font-semibold">Bot activity</h3>
        {log.length ? (
          <div className="space-y-1 rounded-xl bg-[#151515] p-3">
            {log.map((line, i) => (
              <div key={i} className="font-mono text-[11px] text-[#B8B8B8]">
                {line}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Activity log — bot steps will appear here. No bot work has run in this build.</EmptyState>
        )}
      </Panel>
    </div>
  );
};
