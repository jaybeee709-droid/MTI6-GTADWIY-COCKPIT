/* Top bar widgets (v212, owner spec 2026-11-24): the world
 * clock and the weather, sitting in the one-line top bar
 * between the MTI6 logo and the search bar.
 *
 * Clock: the bar shows the time in a chosen world time zone;
 * clicking flips down the world list — pick any city and the
 * bar keeps that zone (persisted). Times come from the
 * platform's own Intl time-zone data: exact, offline-capable,
 * no source to fake.
 *
 * Weather: Open-Meteo (keyless, probed live 2026-11-24),
 * governed through live-data like every other figure — the
 * chip is the Bronx (home), the flip-down carries the home
 * detail plus the same world cities. No answer = NO_DATA,
 * never an invented temperature. */
import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from 'lucide-react';
import { fetchWeather, type Observation, type WeatherNow } from './live-data';

function useClickOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return ref;
}

const chipCls =
  'flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-[#151515] px-2.5 text-[#E8EAF0] md:h-10';
const panelCls =
  'absolute left-0 top-full z-40 mt-2 w-72 rounded-xl border border-white/15 bg-[#101010] p-3 text-xs shadow-2xl';
const micro = 'font-mono text-[10px] tracking-widest text-[#B8B8B8]';

/* ------------------------------- clock ------------------------------- */
export const CLOCK_ZONES: { city: string; tz: string }[] = [
  { city: 'New York', tz: 'America/New_York' },
  { city: 'Chicago', tz: 'America/Chicago' },
  { city: 'Los Angeles', tz: 'America/Los_Angeles' },
  { city: 'London', tz: 'Europe/London' },
  { city: 'Berlin', tz: 'Europe/Berlin' },
  { city: 'Dubai', tz: 'Asia/Dubai' },
  { city: 'Mumbai', tz: 'Asia/Kolkata' },
  { city: 'Singapore', tz: 'Asia/Singapore' },
  { city: 'Tokyo', tz: 'Asia/Tokyo' },
  { city: 'Sydney', tz: 'Australia/Sydney' },
  { city: 'UTC', tz: 'UTC' },
];

const ZONE_KEY = 'mti6_clock_zone_v1';

function fmtTime(tz: string, d: Date): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
  } catch {
    return '';
  }
}

function fmtDay(tz: string, d: Date): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(d);
  } catch {
    return '';
  }
}

export const TopBarClock: React.FC = () => {
  const [tz, setTz] = useState<string>(() => {
    try {
      return localStorage.getItem(ZONE_KEY) || 'America/New_York';
    } catch {
      return 'America/New_York';
    }
  });
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const ref = useClickOutside(() => setOpen(false));

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  const zone = CLOCK_ZONES.find((z) => z.tz === tz) ?? CLOCK_ZONES[0];

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        className={chipCls}
        aria-label={`Time in ${zone.city}: ${fmtTime(tz, now)}. Choose a world time zone.`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-mono text-xs font-semibold tabular-nums">{fmtTime(tz, now)}</span>
        <span className="hidden font-mono text-[9px] tracking-widest text-[#B8B8B8] lg:block">
          {zone.city.toUpperCase()}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-[#B8B8B8]" />
      </button>
      {open && (
        <div className={panelCls}>
          <div className={`${micro} mb-2`}>WORLD TIME — TAP A CITY TO PIN IT HERE</div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {CLOCK_ZONES.map((z) => (
              <button
                key={z.tz}
                type="button"
                onClick={() => {
                  setTz(z.tz);
                  try { localStorage.setItem(ZONE_KEY, z.tz); } catch { /* choice kept for the session */ }
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-[#202020] ${z.tz === tz ? 'bg-[#00B7FF]/10' : ''}`}
              >
                <span className="font-semibold text-white">
                  {z.city}
                  <span className="ml-2 font-normal text-[#B8B8B8]">{fmtDay(z.tz, now)}</span>
                </span>
                <span className="font-mono text-xs tabular-nums text-[#E8EAF0]">{fmtTime(z.tz, now)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------ weather ------------------------------ */
export function wmo(code: number): { label: string; Icon: typeof Sun } {
  if (code === 0) return { label: 'Clear', Icon: Sun };
  if (code === 1 || code === 2) return { label: 'Partly cloudy', Icon: CloudSun };
  if (code === 3) return { label: 'Overcast', Icon: Cloud };
  if (code === 45 || code === 48) return { label: 'Fog', Icon: CloudFog };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', Icon: CloudDrizzle };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: 'Rain', Icon: CloudRain };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Snow', Icon: CloudSnow };
  if (code >= 95) return { label: 'Thunderstorm', Icon: CloudLightning };
  return { label: '—', Icon: Cloud };
}

const HOME = { city: 'Bronx, New York', lat: 40.8448, lon: -73.8648 };
const WORLD_WEATHER: { city: string; lat: number; lon: number }[] = [
  { city: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  { city: 'London', lat: 51.5074, lon: -0.1278 },
  { city: 'Berlin', lat: 52.52, lon: 13.405 },
  { city: 'Dubai', lat: 25.2048, lon: 55.2708 },
  { city: 'Mumbai', lat: 19.076, lon: 72.8777 },
  { city: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { city: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { city: 'Sydney', lat: -33.8688, lon: 151.2093 },
];

export const TopBarWeather: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [home, setHome] = useState<Observation<WeatherNow> | null>(null);
  const [world, setWorld] = useState<Record<string, Observation<WeatherNow>>>({});
  const ref = useClickOutside(() => setOpen(false));

  useEffect(() => {
    let live = true;
    fetchWeather(HOME.lat, HOME.lon).then((o) => {
      if (live) setHome(o);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    for (const c of WORLD_WEATHER) {
      if (world[c.city]) continue;
      fetchWeather(c.lat, c.lon).then((o) => setWorld((w) => ({ ...w, [c.city]: o })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  const hw = home?.value ? wmo(home.value.code) : null;
  const HomeIcon = hw?.Icon ?? Cloud;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        className={chipCls}
        aria-label={home?.value ? `Weather in the Bronx: ${Math.round(home.value.tempF)} degrees, ${hw?.label}. Open world weather.` : 'Weather — open world weather.'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <HomeIcon className="h-4 w-4 text-[#FFB020]" />
        <span className="font-mono text-xs font-semibold tabular-nums">
          {home?.value ? `${Math.round(home.value.tempF)}°F` : '——°'}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-[#B8B8B8]" />
      </button>
      {open && (
        <div className={panelCls}>
          <div className={`${micro} mb-2`}>WEATHER — OPEN-METEO ({home?.status ?? 'LOADING'})</div>
          {home?.value ? (
            <div className="mb-2 space-y-0.5">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-white">{HOME.city}</span>
                <span className="font-mono text-sm text-white">
                  {Math.round(home.value.tempF)}°F · {hw?.label}
                </span>
              </div>
              <div className="text-[11px] text-[#B8B8B8]">
                Feels {home.value.feelsF !== null ? `${Math.round(home.value.feelsF)}°F` : '—'} · Humidity{' '}
                {home.value.humidity !== null ? `${Math.round(home.value.humidity)}%` : '—'} · Wind{' '}
                {home.value.windMph !== null ? `${Math.round(home.value.windMph)} mph` : '—'} · Today{' '}
                {home.value.lowF !== null ? Math.round(home.value.lowF) : '—'}° /{' '}
                {home.value.highF !== null ? Math.round(home.value.highF) : '—'}°
              </div>
            </div>
          ) : (
            <div className="mb-2 text-[11px] text-[#B8B8B8]">HOME WEATHER: NO_DATA — OPEN-METEO DID NOT ANSWER</div>
          )}
          <div className="max-h-56 space-y-1 overflow-y-auto border-t border-white/10 pt-2">
            {WORLD_WEATHER.map((c) => {
              const o = world[c.city];
              const w = o?.value ? wmo(o.value.code) : null;
              const RowIcon = w?.Icon ?? Cloud;
              return (
                <div key={c.city} className="flex items-center justify-between rounded-lg px-2 py-1">
                  <span className="font-semibold text-white">{c.city}</span>
                  {o?.value ? (
                    <span className="flex items-center gap-1.5 font-mono text-xs text-[#E8EAF0]">
                      <RowIcon className="h-3.5 w-3.5 text-[#FFB020]" />
                      {Math.round(o.value.tempF)}°F · {w?.label}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-[#B8B8B8]">{o ? 'NO_DATA' : '…'}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
