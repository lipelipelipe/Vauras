// src/components/SidebarTrending.tsx
'use client';

import React, { useId, useState } from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/components/I18nProvider';

export type TrendingItem = {
  title: string;
  href: string;
  image?: string;
  kicker?: string;
};

type Props = {
  title?: string;
  items: TrendingItem[];
  moreItems?: TrendingItem[];
  moreLabel?: string;
  className?: string;
  sticky?: boolean;
};

function isExternal(href?: string): boolean {
  return !!href && /^https?:\/\//i.test(href);
}

function isLocalFallback(src?: string | null) {
  const s = String(src || '');
  return s.startsWith('/images/default-cover');
}

export default function SidebarTrending({
  title,
  items,
  moreItems = [],
  moreLabel,
  className,
  sticky = true
}: Props) {
  const { messages } = useI18n();
  const t = (k: string) => messages?.home?.[k] ?? messages?.common?.[k] ?? k;

  const [open, setOpen] = useState(false);
  const ctrlId = useId();

  const resolvedTitle = title || t('trending') || 'Assuntos em alta';
  const resolvedMore = moreLabel || t('moreRecommended') || 'Mais conteúdos recomendados';

  return (
    <aside className={clsx(className, sticky && 'md:sticky md:top-6')}>
      <div className="overflow-hidden rounded-2xl ring-1 ring-black/5 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-[15px] font-bold tracking-tight text-gray-800">{resolvedTitle}</h2>
        </div>

        {/* Lista principal */}
        <div className="px-4 sm:px-5">
          <ul>
            {items.map((it, idx) => {
              const ext = isExternal(it.href);
              const src = it.image || '/images/default-cover.jpg';
              const unoptimized = isLocalFallback(src);

              const Thumb = (
                <div className="flex-shrink-0" aria-label={it.title}>
                  <div className="relative h-[94px] w-[94px] sm:h-[100px] sm:w-[100px] rounded-lg overflow-hidden">
                    <Image
                      src={src}
                      alt={it.title}
                      fill
                      sizes="(max-width: 640px) 94px, 100px"
                      className="object-cover"
                      loading="lazy"
                      // Evita o otimizador do Next para o fallback local
                      unoptimized={unoptimized}
                    />
                  </div>
                </div>
              );

              const Title = ext ? (
                <a
                  href={it.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[16px] font-bold leading-snug tracking-[-0.02em] text-gray-900 hover:text-gray-700"
                >
                  {it.title}
                </a>
              ) : (
                <Link
                  href={it.href}
                  className="block text-[16px] font-bold leading-snug tracking-[-0.02em] text-gray-900 hover:text-gray-700"
                >
                  {it.title}
                </Link>
              );

              return (
                <li key={idx} className={clsx('py-4 sm:py-5', idx !== 0 && 'border-t border-gray-200')}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      {it.kicker ? (
                        <div className="mb-1 text-[12px] font-semibold leading-5 text-gray-700">{it.kicker}</div>
                      ) : null}
                      {Title}
                    </div>
                    {ext ? (
                      <a href={it.href} target="_blank" rel="noopener noreferrer">
                        {Thumb}
                      </a>
                    ) : (
                      <Link href={it.href}>{Thumb}</Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Mais conteúdos (colapsável) */}
        {moreItems.length > 0 && (
          <div className="border-t border-gray-200 px-4 sm:px-5 py-4">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={ctrlId}
              onClick={() => setOpen((v) => !v)}
              className="group inline-flex items-center gap-1.5 text-[14px] font-bold tracking-[-0.02em] text-blue-700 hover:text-blue-800"
            >
              <span>{resolvedMore}</span>
              <span aria-hidden className={clsx('transition-transform', open && 'rotate-180')}>
                <svg viewBox="2 2 18 18" width="16" height="16">
                  <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" fill="currentColor"></path>
                </svg>
              </span>
            </button>

            <div id={ctrlId} hidden={!open} className="mt-4">
              <ul className="space-y-3">
                {moreItems.map((it, i) => {
                  const ext = isExternal(it.href);
                  const linkCls =
                    'block text-[15px] font-semibold leading-snug tracking-[-0.02em] text-gray-900 hover:text-gray-700';

                  return (
                    <li key={i}>
                      {ext ? (
                        <a href={it.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                          {it.title}
                        </a>
                      ) : (
                        <Link href={it.href} className={linkCls}>
                          {it.title}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}