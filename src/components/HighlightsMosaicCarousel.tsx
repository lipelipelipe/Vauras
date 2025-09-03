// src/components/HighlightsMosaicCarousel.tsx
// ============================================================================
// Carrossel "Mosaico de Destaques" — LCP/A11y refinados (nível PhD)
// ----------------------------------------------------------------------------
// - <Image fill> com sizes conservadores (menos overfetch).
// - Primeiro tile: priority + fetchPriority="high", quality moderada.
// - Indicadores com alvo ≥ 44x44px (WCAG).
// - Proteção: quando a capa usa fallback local, desativa otimização (unoptimized)
//   para evitar o erro do Sharp em dev se o arquivo estiver ausente/corrompido.
// - Adicionado 'isolation: isolate' para criar um novo contexto de empilhamento
//   e prevenir vazamento de z-index (overlay bug).
// ============================================================================

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import Image from 'next/image';

export type HighlightItem = {
  hat?: string;
  title: string;
  href: string;
  cover: string;
};

type SlideTriple = [HighlightItem | null, HighlightItem | null, HighlightItem | null];

type Props = {
  items: HighlightItem[];
  auto?: boolean;
  interval?: number;
  className?: string;
};

function isExternal(href?: string): boolean {
  return !!href && /^https?:\/\//i.test(href);
}

function isLocalFallback(src?: string | null) {
  const s = String(src || '');
  return s.startsWith('/images/default-cover');
}

function ScrimBottom({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'pointer-events-none absolute inset-x-0 bottom-0 h-2/5',
        'bg-gradient-to-t from-black/45 via-black/15 to-transparent',
        className
      )}
    />
  );
}

function TileSmall({ item, className }: { item: HighlightItem | null; className?: string }) {
  if (!item) return <div className={clsx('hidden md:block rounded-xl bg-gray-100', className)} />;

  const external = isExternal(item.href);
  const unoptimized = isLocalFallback(item.cover);

  const inner = (
    <>
      <div className="absolute inset-0">
        <Image
          src={item.cover}
          alt={item.title}
          fill
          // Pequenos (coluna direita): ~300px em >=1280px, 33vw no tablet, full no mobile
          sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 100vw"
          quality={60}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.01]"
          decoding="async"
          // Evita otimizador quando fallback local
          unoptimized={unoptimized}
        />
      </div>
      <ScrimBottom />
      <div className="relative z-10 h-full p-3 flex flex-col justify-end">
        {item.hat ? (
          <span className="inline-block max-w-max rounded bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-gray-900 shadow">
            {item.hat}
          </span>
        ) : null}
        <h3
          className="mt-1 text-base font-semibold leading-snug text-white"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,.35)' }}
        >
          {item.title}
        </h3>
      </div>
    </>
  );

  const classes = clsx(
    'group relative block overflow-hidden rounded-xl ring-1 ring-black/5 bg-white shadow-sm transition-transform duration-300 hover:scale-[1.01]',
    className
  );

  return external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={classes} aria-label={item.title}>
      {inner}
    </a>
  ) : (
    <Link href={item.href} className={classes} aria-label={item.title}>
      {inner}
    </Link>
  );
}

function TileLarge({ item, className }: { item: HighlightItem | null; className?: string }) {
  if (!item) return <div className={clsx('h-full rounded-xl bg-gray-100', className)} />;

  const unoptimized = isLocalFallback(item.cover);

  const inner = (
    <>
      <div className="absolute inset-0">
        <Image
          src={item.cover}
          alt={item.title}
          fill
          // Grande (coluna esquerda): teto ~900px em >=1280px, 66vw no tablet, full no mobile
          sizes="(min-width: 1280px) 900px, (min-width: 768px) 66vw, 100vw"
          quality={70}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.01]"
          decoding="async"
          // Evita otimizador quando fallback local
          unoptimized={unoptimized}
        />
      </div>
      <ScrimBottom />
      <div className="relative z-10 h-full p-4 sm:p-6 md:p-8 flex flex-col justify-end">
        {item.hat ? (
          <span className="inline-block max-w-max rounded bg-white/90 px-2 py-1 text-xs font-semibold text-gray-900 shadow">
            {item.hat}
          </span>
        ) : null}
        <h2
          className="mt-2 text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight text-white"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,.4)' }}
        >
          {item.title}
        </h2>
      </div>
    </>
  );

  const classes = clsx(
    'group relative block h-[260px] sm:h-[340px] md:h-full overflow-hidden rounded-xl ring-1 ring-black/5 bg-white shadow-sm transition-transform duration-300 hover:scale-[1.01]',
    className
  );

  return (
    <Link href={item.href} className={classes} aria-label={item.title}>
      {inner}
    </Link>
  );
}

// Primeiro tile (herói): priority + fetchPriority="high"
function TileLargeFirst({ item, className }: { item: HighlightItem | null; className?: string }) {
  if (!item) return <div className={clsx('h-full rounded-xl bg-gray-100', className)} />;

  const unoptimized = isLocalFallback(item.cover);

  const inner = (
    <>
      <div className="absolute inset-0">
        <Image
          src={item.cover}
          alt={item.title}
          fill
          sizes="(min-width: 1280px) 900px, (min-width: 768px) 66vw, 100vw"
          quality={72}
          className="object-cover"
          priority
          fetchPriority="high"
          // Evita otimizador quando fallback local
          unoptimized={unoptimized}
        />
      </div>
      <ScrimBottom />
      <div className="relative z-10 h-full p-4 sm:p-6 md:p-8 flex flex-col justify-end">
        {item.hat ? (
          <span className="inline-block max-w-max rounded bg-white/90 px-2 py-1 text-xs font-semibold text-gray-900 shadow">
            {item.hat}
          </span>
        ) : null}
        <h2
          className="mt-2 text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight text-white"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,.4)' }}
        >
          {item.title}
        </h2>
      </div>
    </>
  );

  const classes = clsx(
    'group relative block h-[260px] sm:h-[340px] md:h-full overflow-hidden rounded-xl ring-1 ring-black/5 bg-white shadow-sm'
  );

  return (
    <Link href={item.href} className={classes} aria-label={item.title}>
      {inner}
    </Link>
  );
}

function buildSlides(all: HighlightItem[]): SlideTriple[] {
  const res: SlideTriple[] = [];
  for (let i = 0; i < all.length; i += 3) {
    res.push([all[i] ?? null, all[i + 1] ?? null, all[i + 2] ?? null]);
  }
  return res;
}

export default function HighlightsMosaicCarousel({
  items,
  auto = true,
  interval = 6000,
  className
}: Props) {
  const slides: SlideTriple[] = useMemo(() => buildSlides(items || []), [items]);
  const [index, setIndex] = useState(0);
  const total = slides.length;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHover = useRef(false);

  useEffect(() => {
    if (!auto || total <= 1) return;
    clearTimer();
    timer.current = setInterval(() => {
      if (!isHover.current) next();
    }, Math.max(2000, interval));
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, auto, interval, total]);

  function clearTimer() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }
  function prev() { setIndex(i => (i - 1 + total) % total); }
  function next() { setIndex(i => (i + 1) % total); }
  function goTo(i: number) { setIndex(((i % total) + total) % total); }

  if (!total) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Destaques"
      className={clsx('relative', className)}
      onMouseEnter={() => { isHover.current = true; }}
      onMouseLeave={() => { isHover.current = false; }}
      style={{ isolation: 'isolate' }}
    >
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-black/5 bg-white h-[560px] sm:h-[600px] md:h-[560px] xl:h-[620px] shadow-sm">
        <div
          className="flex h-full w-full transition-transform duration-500"
          style={{ transform: `translateX(-${index * 100}%)` }}
          role="group"
          aria-live="polite"
        >
          {slides.map((triplet, sIdx) => {
            const [largeLeft, smallTop, smallBottom] = triplet;
            const isFirst = sIdx === 0;
            return (
              <div key={sIdx} className="relative shrink-0 w-full h-full p-3 sm:p-4 md:p-5">
                <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
                  <div className="order-1 md:col-span-2 md:h-full">
                    {isFirst ? <TileLargeFirst item={largeLeft} className="md:h-full" /> : <TileLarge item={largeLeft} className="md:h-full" />}
                  </div>
                  <div className="order-2 md:col-span-1 md:h-full">
                    <div className="grid grid-cols-1 grid-rows-2 gap-4 md:gap-5 md:h-full">
                      <TileSmall item={smallTop} className="h-full" />
                      <TileSmall item={smallBottom} className="h-full" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {total > 1 && (
          <>
            <button
              aria-label="Anterior"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-white/85 hover:bg-white shadow-sm ring-1 ring-black/5 text-gray-900 flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <button
              aria-label="Próximo"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-white/85 hover:bg-white shadow-sm ring-1 ring-black/5 text-gray-900 flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Indicadores com alvo ≥ 44x44px */}
            <div className="absolute bottom-3 left-0 right-0 z-20 flex items-center justify-center gap-1.5">
              {slides.map((_, i) => {
                const active = i === index;
                return (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-label={`Ir para o slide ${i + 1}`}
                    aria-current={active ? 'true' : 'false'}
                    className={clsx(
                      'relative flex items-center justify-center h-11 w-11 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300',
                      'transition-colors'
                    )}
                  >
                    <span
                      aria-hidden
                      className={clsx(
                        'h-2.5 w-2.5 rounded-full ring-1 ring-black/10',
                        active ? 'bg-gray-900' : 'bg-gray-300 hover:bg-gray-400'
                      )}
                    />
                    <span className="sr-only">{active ? 'Slide atual' : ''}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
