// src/components/WebStories.tsx
// ============================================================================
// Web Stories — Zero-CLS (altura fixa) + estabilidade total
// ----------------------------------------------------------------------------
// - Define altura fixa (height = minHeightPx) no container.
// - Mantém content-visibility/containIntrinsicSize.
// - Resto do carrossel permanece igual.
// ============================================================================

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import Image from 'next/image';

type Locale = 'fi' | 'en';
type Story = { id: string; title: string; cover: string | null; href: string; ts: number | null };
type ApiResp = { ok: true; items: Story[] } | { ok: false; error: string };

type Props = {
  locale?: Locale;
  limit?: number;
  refreshSeconds?: number;
  className?: string;
  title?: string;
  minHeightPx?: number; // ALTURA FIXA (default 380)
};

const L = (l: Locale) =>
  l === 'fi' ? { title: 'Web Stories' } : { title: 'Web Stories' };

function isLocalFallback(src?: string | null) {
  const s = String(src || '');
  return s.startsWith('/images/default-cover');
}

export default function WebStories({
  locale = 'fi',
  limit = 12,
  refreshSeconds = 0,
  className,
  title,
  minHeightPx = 380,
}: Props) {
  const T = L(locale);
  const [items, setItems] = useState<Story[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState<number>(5);
  const [page, setPage] = useState<number>(0);

  useEffect(() => {
    function updateVisible() {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
      if (w < 640) setVisible(1);
      else if (w < 768) setVisible(2);
      else if (w < 1024) setVisible(3);
      else if (w < 1280) setVisible(4);
      else setVisible(5);
    }
    updateVisible();
    window.addEventListener('resize', updateVisible);
    return () => window.removeEventListener('resize', updateVisible);
  }, []);

  async function load() {
    try {
      setLoading(true);
      const sp = new URLSearchParams({ locale, limit: String(limit) });
      const res = await fetch(`/api/stories?${sp.toString()}`, { cache: 'no-store' });
      const j = (await res.json()) as ApiResp;
      if ('ok' in j && j.ok) {
        const sorted = (j.items || []).sort((a, b) => (b.ts || 0) - (a.ts || 0));
        setItems(sorted);
      } else {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [locale, limit]);

  useEffect(() => {
    if (!refreshSeconds || refreshSeconds <= 0) return;
    const t = setInterval(() => void load(), Math.max(30, refreshSeconds) * 1000);
    return () => clearInterval(t);
  }, [refreshSeconds, locale, limit]);

  const total = items.length;
  const maxPage = Math.max(0, total - visible);
  const canPrev = page > 0;
  const canNext = page < maxPage;

  function go(delta: number) {
    const el = wrapRef.current;
    if (!el) {
      setPage((p) => Math.max(0, Math.min(maxPage, p + delta)));
      return;
    }
    setPage((p) => {
      const next = Math.max(0, Math.min(maxPage, p + delta));
      const w = el.clientWidth;
      el.scrollTo({ left: next * (w / visible), behavior: 'smooth' });
      return next;
    });
  }

  const SK = Array.from({ length: visible }).map((_, i) => (
    <li key={`sk-${i}`} className="shrink-0" style={{ flex: `0 0 calc(${100 / visible}% - 12px)` }}>
      <div className="relative overflow-hidden rounded-xl border border-gray-100 shadow-sm bg-gray-100 h-[320px] sm:h-[360px] md:h-[380px]" />
      <div className="mt-2 h-4 w-3/4 rounded bg-gray-100" />
    </li>
  ));

  return (
    <section
      className={clsx('mt-8', className)}
      aria-label="Web Stories"
      style={{
        // ZERO-CLS: altura fixa + CV/containIntrinsic
        height: `${minHeightPx}px`,
        contentVisibility: 'auto' as any,
        containIntrinsicSize: `${minHeightPx}px`,
        minHeight: `${minHeightPx}px`,
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{title || T.title}</h2>
        <div className="flex items-center gap-1">
          <button
            aria-label="Anterior"
            onClick={() => go(-1)}
            disabled={!canPrev}
            className={clsx(
              'inline-flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-black/10 bg-white shadow-sm',
              !canPrev && 'opacity-50 cursor-not-allowed'
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            aria-label="Próximo"
            onClick={() => go(+1)}
            disabled={!canNext}
            className={clsx(
              'inline-flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-black/10 bg-white shadow-sm',
              !canNext && 'opacity-50 cursor-not-allowed'
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="relative h-[calc(100%-44px)]">
        <div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent" />

        <div ref={wrapRef} className="overflow-hidden h-full">
          <ul className="flex gap-3 h-full" style={{ transform: `translateX(0)`, scrollBehavior: 'smooth' }}>
            {loading
              ? SK
              : items.map((it) => {
                  const src = it.cover || '/images/default-cover.jpg';
                  const unoptimized = isLocalFallback(src);

                  return (
                    <li key={it.id} className="shrink-0 h-full" style={{ flex: `0 0 calc(${100 / visible}% - 12px)` }}>
                      <a href={it.href} className="group block h-full" aria-label={it.title}>
                        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm h-full">
                          <Image
                            src={src}
                            alt={it.title}
                            fill
                            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 28vw, 18vw"
                            quality={70}
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                            unoptimized={unoptimized}
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow">
                              {it.title}
                            </h3>
                          </div>
                          <div className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow ring-1 ring-black/10">
                            <svg width="16" height="16" viewBox="0 0 21 26" fill="none" aria-hidden>
                              <path d="M0.25 2.98942C0.25 1.05401 2.21314 -0.138837 3.75123 0.861993L19.1356 10.8726C20.6215 11.8394 20.6215 14.1606 19.1356 15.1274L3.75122 25.138C2.21314 26.1388 0.25 24.946 0.25 23.0106V2.98942Z" fill="#111" />
                            </svg>
                          </div>
                        </div>
                      </a>
                    </li>
                  );
                })}
          </ul>
        </div>
      </div>
    </section>
  );
}