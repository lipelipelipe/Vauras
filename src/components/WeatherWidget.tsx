// src/components/WeatherWidget.tsx
// ============================================================================
// Weather Widget — IO gating + idle fetch + CLS-safe (máxima eficiência)
// ----------------------------------------------------------------------------
// - Só busca dados quando o widget entra em viewport (IntersectionObserver).
// - Usa requestIdleCallback para não competir com hidratação.
// - Reserva altura mínima e usa content-visibility para evitar CLS/custo offscreen.
// - Mantém auto-refresh apenas quando visível.
// ============================================================================

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

type Props = {
  locale?: 'fi' | 'en';
  lat?: number;
  lon?: number;
  city?: string;
  className?: string;
  refreshMinutes?: number;
  initial?: ApiResp | null;
  minHeightPx?: number; // para evitar CLS (default 240)
};

export type ApiResp =
  | { ok: true; data: {
      tz: string;
      updatedAt: string | null;
      tempC: number | null;
      windKmh: number | null;
      precipMm: number | null;
      tMinC: number | null;
      tMaxC: number | null;
      precipSumMm: number | null;
      weatherCode: number | null;
    } }
  | { ok: false; error: string };

const DEFAULTS = {
  lat: 60.1699,
  lon: 24.9384,
  cityFi: 'Helsinki',
  cityEn: 'Helsinki',
};

function labels(locale: 'fi' | 'en') {
  if (locale === 'fi') {
    return {
      weather: 'Sää',
      temp: 'Lämpötila',
      wind: 'Tuuli',
      precip: 'Sademäärä',
      today: 'Tänään',
      min: 'Min',
      max: 'Max',
      mm: 'mm',
      kmh: 'km/h',
      updated: 'Päivitetty',
      error: 'Säätietoja ei ole saatavilla juuri nyt.',
      daily: ' (päivä)',
    };
  }
  return {
    weather: 'Weather',
    temp: 'Temperature',
    wind: 'Wind',
    precip: 'Precipitation',
    today: 'Today',
    min: 'Min',
    max: 'Max',
    mm: 'mm',
    kmh: 'km/h',
    updated: 'Updated',
    error: 'Weather data is not available right now.',
    daily: ' (daily)',
  };
}

function fmt(n: number | undefined | null, digits = 1): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return n.toFixed(digits);
}

function rIC(cb: () => void, timeout = 1200) {
  // requestIdleCallback fallback
  // @ts-ignore
  const rid = (typeof window !== 'undefined' && window.requestIdleCallback) as any;
  if (typeof rid === 'function') {
    // @ts-ignore
    return rid(cb, { timeout });
  }
  return setTimeout(cb, Math.min(800, timeout));
}

export default function WeatherWidget({
  locale = 'fi',
  lat = DEFAULTS.lat,
  lon = DEFAULTS.lon,
  city,
  className,
  refreshMinutes = 15,
  initial = null,
  minHeightPx = 240,
}: Props) {
  const L = labels(locale);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleHandle = useRef<any>(null);
  const mounted = useRef(true);
  const activated = useRef(false);

  const [loading, setLoading] = useState<boolean>(!initial || !('ok' in initial) || !initial.ok);
  const [err, setErr] = useState<string | null>(initial && 'ok' in initial && !initial.ok ? initial.error : null);
  const [data, setData] = useState<ApiResp | null>(initial && 'ok' in initial ? initial : null);

  const cityLabel = city || (locale === 'fi' ? DEFAULTS.cityFi : DEFAULTS.cityEn);

  const fetchData = useCallback(async () => {
    try {
      setErr(null);
      setLoading(true);

      const params = new URLSearchParams();
      params.set('lat', String(lat));
      params.set('lon', String(lon));
      params.set('locale', locale);

      const res = await fetch(`/api/weather?${params.toString()}`, { cache: 'no-store' });
      const json: ApiResp = await res.json();
      if (!res.ok || !json.ok) throw new Error((json as any)?.error || `HTTP ${res.status}`);
      if (!mounted.current) return;
      setData(json);
    } catch (e: any) {
      if (mounted.current) setErr(e?.message || 'fetch failed');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [lat, lon, locale]);

  const startRefresh = useCallback(() => {
    if (timerRef.current || refreshMinutes <= 0) return;
    timerRef.current = setInterval(() => void fetchData(), Math.max(1, refreshMinutes) * 60_000);
  }, [fetchData, refreshMinutes]);

  const stopRefresh = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // IO gating
  useEffect(() => {
    mounted.current = true;
    const el = hostRef.current;
    if (!el) return;

    observerRef.current = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      if (e.isIntersecting && !activated.current) {
        activated.current = true;
        idleHandle.current = rIC(() => {
          if (!data || !('ok' in data) || !data.ok) void fetchData();
          startRefresh();
        });
      } else if (!e.isIntersecting) {
        stopRefresh();
      }
    }, { rootMargin: '120px 0px' });

    observerRef.current.observe(el);

    return () => {
      mounted.current = false;
      try { observerRef.current?.disconnect(); } catch {}
      try { stopRefresh(); } catch {}
      try {
        // @ts-ignore
        if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idleHandle.current);
        else clearTimeout(idleHandle.current);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const view = useMemo(() => {
    if (!data || !('ok' in data) || !data.ok) return null;
    return data.data;
  }, [data]);

  // ---------------------- Ícones por weatherCode (idem versão anterior) ----------------------
  function IconSun() { return (<svg width="36" height="36" viewBox="0 0 24 24" className="text-amber-300 drop-shadow"><path d="M12 4V2m0 20v-2M4 12H2m20 0h-2M5 5L3.6 3.6M20.4 20.4 19 19M5 19l-1.4 1.4M20.4 3.6 19 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="12" cy="12" r="4.5" fill="currentColor" /></svg>); }
  function IconCloud() { return (<svg width="36" height="36" viewBox="0 0 24 24" className="text-slate-200 drop-shadow"><path d="M3 14a4 4 0 0 1 6.5-3A5 5 0 1 1 14 21H7a4 4 0 0 1-4-4z" fill="currentColor"/></svg>); }
  function IconRain() { return (<svg width="36" height="36" viewBox="0 0 24 24" className="text-sky-300 drop-shadow"><path d="M7 16l-1.5 3M12 16l-1.5 3M17 16l-1.5 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M3 12a5 5 0 0 1 9.58-1.74A4 4 0 1 1 14 20H7a4 4 0 0 1-4-4z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>); }
  function IconSnow() { return (<svg width="36" height="36" viewBox="0 0 24 24" className="text-cyan-100 drop-shadow"><path d="M12 3v18M5 6l14 12M19 6 5 18M3 12h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>); }
  function IconStorm() { return (<svg width="36" height="36" viewBox="0 0 24 24" className="text-yellow-300 drop-shadow"><path d="M10 21l1.5-5H8l5-9-1.5 5H16l-6 9z" fill="currentColor"/></svg>); }
  function IconFog() { return (<svg width="36" height="36" viewBox="0 0 24 24" className="text-slate-300 drop-shadow"><path d="M3 10h18M2 14h20M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>); }
  function pickIcon(code?: number | null) {
    if (code == null) return <IconCloud />;
    if (code === 0) return <IconSun />;               // clear
    if (code >= 1 && code <= 3) return <IconCloud />; // partly cloudy / overcast
    if ([45, 48].includes(code)) return <IconFog />;  // fog
    if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67)) return <IconRain />; // drizzle/rain
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return <IconSnow />;  // snow
    if (code >= 95 && code <= 99) return <IconStorm />; // thunderstorm
    return <IconCloud />;
  }

  const icon = useMemo(() => pickIcon(view?.weatherCode ?? null), [view?.weatherCode]);

  // Tema dinâmico (idêntico ao anterior)
  function themeByTemp(tempC?: number | null, code?: number | null) {
    if (code != null) {
      if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { from: '#0ea5e9', to: '#38bdf8' };
      if ((code >= 61 && code <= 67) || (code >= 51 && code <= 57)) return { from: '#22c55e', to: '#06b6d4' };
      if (code >= 95 && code <= 99) return { from: '#f59e0b', to: '#ef4444' };
      if ([45, 48].includes(code)) return { from: '#64748b', to: '#94a3b8' };
    }
    if (typeof tempC === 'number') {
      if (tempC <= 0) return { from: '#0284c7', to: '#22d3ee' };
      if (tempC <= 10) return { from: '#0ea5e9', to: '#60a5fa' };
      if (tempC <= 20) return { from: '#22c55e', to: '#14b8a6' };
      if (tempC <= 30) return { from: '#f59e0b', to: '#fb923c' };
      return { from: '#ef4444', to: '#f43f5e' };
    }
    return { from: '#0ea5e9', to: '#60a5fa' };
  }

  const theme = useMemo(
    () => themeByTemp(view?.tempC ?? undefined, view?.weatherCode ?? undefined),
    [view?.tempC, view?.weatherCode]
  );

  const precipDisplay = useMemo(() => {
    if (!view) return { value: null as number | null, suffix: L.mm };
    if (typeof view.precipMm === 'number') return { value: view.precipMm, suffix: L.mm };
    if (typeof view.precipSumMm === 'number') return { value: view.precipSumMm, suffix: L.mm + (L.daily || '') };
    return { value: null as number | null, suffix: L.mm };
  }, [view, L.mm, L.daily]);

  const headerStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)`,
  };

  return (
    <section
      ref={hostRef}
      className={clsx(
        'mt-6 overflow-hidden rounded-2xl ring-1 ring-black/5 bg-white shadow-sm transition-transform duration-300 hover:shadow-md hover:-translate-y-[1px]',
        className
      )}
      aria-label="Weather widget"
      style={{
        contentVisibility: 'auto' as any,
        containIntrinsicSize: `${minHeightPx}px`,
        minHeight: `${minHeightPx}px`,
      }}
    >
      {/* Faixa gradiente decorativa */}
      <div className="relative h-12" style={headerStyle} aria-hidden>
        <div className="absolute inset-0 opacity-30" />
      </div>

      {/* Cabeçalho textual com ícone sobreposto */}
      <div className="relative px-5 -mt-8">
        <div className="flex items-center justify-between">
          <div className="rounded-xl bg-white/80 px-3 py-1.5 text-[13px] font-semibold text-slate-900 ring-1 ring-black/5 backdrop-blur">
            {L.weather} • {cityLabel}
          </div>
          <div className="rounded-full bg-white/80 p-1.5 ring-1 ring-black/5 backdrop-blur">
            {icon}
          </div>
        </div>
      </div>

      {/* Corpo */}
      <div className="p-5">
        {loading && !view ? (
          <div className="space-y-3" aria-busy="true">
            <div className="h-6 w-44 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-56 animate-pulse rounded bg-gray-100" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-16 rounded bg-gray-100" />
              <div className="h-16 rounded bg-gray-100" />
              <div className="h-16 rounded bg-gray-100" />
            </div>
          </div>
        ) : err && !view ? (
          <div className="text-sm text-gray-600">{L.error}</div>
        ) : (
          <>
            {/* Temperatura + chips */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)` }}>
                  {fmt(view?.tempC, 1)}°C
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {L.updated}:{' '}
                  {view?.updatedAt
                    ? new Date(view.updatedAt).toLocaleString(locale === 'fi' ? 'fi-FI' : 'en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[12px] font-medium text-sky-700 ring-1 ring-sky-200">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M7 16l-1.5 3M12 16l-1.5 3M17 16l-1.5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {L.precip}: {fmt(precipDisplay.value, 1)} {precipDisplay.suffix}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M4 12h8a4 4 0 0 0 4-4V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M3 20c2-2 5-3 9-3s7 .5 9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {L.wind}: {fmt(view?.windKmh, 0)} {L.kmh}
                </span>
              </div>
            </div>

            {/* Hoje: min/max/precip dia */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:bg-gray-50">
                <div className="text-xs text-gray-500">{L.min}</div>
                <div className="mt-0.5 text-lg font-semibold text-slate-900">{fmt(view?.tMinC, 1)}°C</div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:bg-gray-50">
                <div className="text-xs text-gray-500">{L.max}</div>
                <div className="mt-0.5 text-lg font-semibold text-slate-900">{fmt(view?.tMaxC, 1)}°C</div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:bg-gray-50">
                <div className="text-xs text-gray-500">{L.precip}</div>
                <div className="mt-0.5 text-lg font-semibold text-slate-900">
                  {fmt(view?.precipSumMm, 1)} {L.mm}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}