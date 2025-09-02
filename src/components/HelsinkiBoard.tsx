// src/components/HelsinkiBoard.tsx
// ============================================================================
// HelsinkiBoard — Zero-CLS (altura fixa) + IO gating + idle timers
// ----------------------------------------------------------------------------
// - Define altura fixa (height = minHeightPx) para impedir qualquer variação vertical.
// - content-visibility + containIntrinsicSize mantidos para ganho de pintura.
// - Fetch/rotação só quando visível (IntersectionObserver + idle).
// - SetState apenas quando há mudança real.
// ============================================================================

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

type Locale = 'fi' | 'en';
type IndexData = { symbol: string; name: string; price: number | null; changePct: number | null; currency: string | null };
type Item = { symbol: string; name: string; changePct: number | null };
type ApiResp = { ok: true; ts: number; index: IndexData; gainers: Item[]; losers: Item[] } | { ok: false; error: string };

type Props = {
  locale?: Locale;
  refreshSeconds?: number;
  rotateSeconds?: number;
  className?: string;
  count?: number;
  minHeightPx?: number; // AGORA USADO COMO ALTURA FIXA
};

const L = (l: Locale) =>
  l === 'fi'
    ? { title: 'Pörssi', index: 'OMX Helsinki PI', gainers: 'Nousijat', losers: 'Laskijat', updated: 'Päivitetty', unavailable: 'Tietoja ei ole saatavilla juuri nyt.' }
    : { title: 'Market', index: 'OMX Helsinki PI', gainers: 'Risers', losers: 'Fallers', updated: 'Updated', unavailable: 'Data not available right now.' };

function pctClass(v: number | null | undefined) {
  if (typeof v !== 'number') return 'text-slate-700';
  if (v > 0.0001) return 'text-emerald-700';
  if (v < -0.0001) return 'text-rose-700';
  return 'text-slate-700';
}
function chipClass(v: number | null | undefined) {
  if (typeof v !== 'number') return 'bg-slate-50 text-slate-700 ring-slate-200';
  if (v > 0.0001) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (v < -0.0001) return 'bg-rose-50 text-rose-700 ring-rose-200';
  return 'bg-slate-50 text-slate-700 ring-slate-200';
}
function arrow(v: number | null | undefined) {
  if (typeof v !== 'number') return null;
  if (v > 0.0001) return (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 14l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>);
  if (v < -0.0001) return (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M18 10l-6 6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>);
  return (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>);
}
function fmt(n: number | null | undefined, d = 2) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return n.toFixed(d);
}
function timeLabel(ts: number | null, locale: Locale) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (locale === 'fi') {
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}. ${hh}:${mm}`;
  }
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function pageSlice(all: Item[], page: number, size: number): Item[] {
  if (!all.length) return [];
  const n = all.length;
  const start = (page * size) % n;
  const out: Item[] = [];
  for (let i = 0; i < size; i++) out.push(all[(start + i) % n] || all[(start + i) % n]);
  return out;
}
function rIC(cb: () => void, timeout = 1200) {
  // @ts-ignore
  const rid = (typeof window !== 'undefined' && window.requestIdleCallback) as any;
  if (typeof rid === 'function') {
    // @ts-ignore
    return rid(cb, { timeout });
  }
  return setTimeout(cb, Math.min(800, timeout));
}

export default function HelsinkiBoard({
  locale = 'fi',
  refreshSeconds = 60,
  rotateSeconds = 10,
  className,
  count = 5,
  minHeightPx = 320,
}: Props) {
  const T = L(locale);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const fetchTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotateTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleHandle = useRef<any>(null);
  const mounted = useRef(true);
  const activated = useRef(false);

  const [data, setData] = useState<{ ts: number | null; index: IndexData | null; gainers: Item[]; losers: Item[] }>({
    ts: null, index: null, gainers: [], losers: [],
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    try {
      const sp = new URLSearchParams({ count: String(Math.max(count, 5)) });
      const res = await fetch(`/api/market/helsinki?${sp.toString()}`, { cache: 'no-store' });
      const j = (await res.json()) as ApiResp;
      if (!mounted.current) return;
      if ('ok' in j && j.ok) {
        setData(prev => {
          const same =
            prev.ts === j.ts &&
            prev.index?.price === j.index?.price &&
            prev.index?.changePct === j.index?.changePct;
          if (same) return prev;
          return { ts: j.ts, index: j.index, gainers: j.gainers || [], losers: j.losers || [] };
        });
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [count]);

  const startIntervals = useCallback(() => {
    if (fetchTimer.current || rotateTimer.current) return;
    if (refreshSeconds > 0) fetchTimer.current = setInterval(() => void load(), Math.max(15, refreshSeconds) * 1000);
    if (rotateSeconds > 0) rotateTimer.current = setInterval(() => setPage((p) => p + 1), Math.max(5, rotateSeconds) * 1000);
  }, [load, refreshSeconds, rotateSeconds]);

  const stopIntervals = useCallback(() => {
    if (fetchTimer.current) { clearInterval(fetchTimer.current); fetchTimer.current = null; }
    if (rotateTimer.current) { clearInterval(rotateTimer.current); rotateTimer.current = null; }
  }, []);

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
          void load();
          startIntervals();
        });
      } else if (!e.isIntersecting) {
        stopIntervals();
      }
    }, { rootMargin: '100px 0px' });

    observerRef.current.observe(el);

    return () => {
      mounted.current = false;
      try { observerRef.current?.disconnect(); } catch {}
      try { stopIntervals(); } catch {}
      try {
        // @ts-ignore
        if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idleHandle.current);
        else clearTimeout(idleHandle.current);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatedAt = useMemo(() => timeLabel(data.ts, locale), [data.ts, locale]);

  const gainersVis = useMemo(() => {
    const base = data.gainers.length > count ? pageSlice(data.gainers, page, count) : data.gainers.slice(0, count);
    return base.length >= count
      ? base
      : [...base, ...Array.from({ length: count - base.length }, (_, i) => ({ symbol: `—${i}`, name: '—', changePct: null }))];
  }, [data.gainers, page, count]);

  const losersVis = useMemo(() => {
    const base = data.losers.length > count ? pageSlice(data.losers, page, count) : data.losers.slice(0, count);
    return base.length >= count
      ? base
      : [...base, ...Array.from({ length: count - base.length }, (_, i) => ({ symbol: `—${i}`, name: '—', changePct: null }))];
  }, [data.losers, page, count]);

  return (
    <section
      ref={hostRef}
      className={clsx('rounded-2xl border border-gray-200 bg-white p-4 shadow-sm', className)}
      aria-label="Pörssi"
      style={{
        // ZERO-CLS: altura fixa + CV/containIntrinsic
        height: `${minHeightPx}px`,
        contentVisibility: 'auto' as any,
        containIntrinsicSize: `${minHeightPx}px`,
        minHeight: `${minHeightPx}px`,
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{T.title}</h2>
        <div className="text-xs text-gray-500">{T.updated}: {updatedAt}</div>
      </div>

      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">{T.index}</div>
          <span className={clsx('inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ring-1', chipClass(data.index?.changePct ?? null))}>
            {arrow(data.index?.changePct ?? null)}
            <span className={clsx('font-medium', pctClass(data.index?.changePct ?? null))}>
              {typeof data.index?.changePct === 'number' ? `${data.index.changePct.toFixed(2)}%` : '—%'}
            </span>
          </span>
        </div>
        <div className="mt-1 text-2xl font-bold font-mono tracking-tight text-slate-900">
          {fmt(data.index?.price, 2)} <span className="text-xs font-normal text-gray-500">{data.index?.currency || ''}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 h-[calc(100%-130px)]">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm overflow-hidden">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{T.gainers}</h3>
            <div className="text-[11px] text-gray-500">{updatedAt}</div>
          </div>
          {loading && data.gainers.length === 0 ? (
            <ul className="space-y-2">
              {Array.from({ length: count }).map((_, i) => (
                <li key={i} className="flex items-center justify-between">
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-gray-100">
              {gainersVis.map((it, idx) => (
                <li key={`${it.symbol}-${idx}`} className="flex items-center justify-between py-2">
                  <span className="truncate text-sm text-slate-900">{it.name}</span>
                  <span className={clsx('ml-3 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[12px] ring-1', chipClass(it.changePct))}>
                    {arrow(it.changePct)}
                    <span className={clsx('font-semibold', pctClass(it.changePct))}>
                      {typeof it.changePct === 'number' ? `${it.changePct.toFixed(2)}%` : '—%'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm overflow-hidden">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{T.losers}</h3>
            <div className="text-[11px] text-gray-500">{updatedAt}</div>
          </div>
          {loading && data.losers.length === 0 ? (
            <ul className="space-y-2">
              {Array.from({ length: count }).map((_, i) => (
                <li key={i} className="flex items-center justify-between">
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-gray-100">
              {losersVis.map((it, idx) => (
                <li key={`${it.symbol}-${idx}`} className="flex items-center justify-between py-2">
                  <span className="truncate text-sm text-slate-900">{it.name}</span>
                  <span className={clsx('ml-3 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[12px] ring-1', chipClass(it.changePct))}>
                    {arrow(it.changePct)}
                    <span className={clsx('font-semibold', pctClass(it.changePct))}>
                      {typeof it.changePct === 'number' ? `${it.changePct.toFixed(2)}%` : '—%'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}