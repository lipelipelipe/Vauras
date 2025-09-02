// src/components/admin/seo/SeoChecks.tsx
// ============================================================================
// Lista de checagens e métricas do SEO Analyzer — nível PhD (Client Component)
// ----------------------------------------------------------------------------
// - Renderiza badges por nível (good/warn/bad/info) com ícones semânticos.
// - Exibe métricas auxiliares (palavras, densidade, títulos, passiva etc.).
// - Suporte a detalhes (expandir JSON de cada check quando existir).
// - Integrável com lib/seo/analyzer (SEOCheck/AnalyzerMetrics).
// ============================================================================

'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import type { SEOCheck, AnalyzerMetrics } from '@/lib/seo/analyzer';

type Props = {
  checks: SEOCheck[];
  metrics?: AnalyzerMetrics;
  className?: string;
  title?: string; // título opcional da seção (ex.: 'SEO Analyzer')
};

function levelStyle(level: SEOCheck['level']) {
  switch (level) {
    case 'good':
      return {
        pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        dot: 'bg-emerald-600',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ),
        label: 'Bom',
      };
    case 'warn':
      return {
        pill: 'bg-amber-50 text-amber-700 ring-amber-200',
        dot: 'bg-amber-600',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 8v5m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ),
        label: 'Atenção',
      };
    case 'bad':
      return {
        pill: 'bg-red-50 text-red-700 ring-red-200',
        dot: 'bg-red-600',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
        label: 'Precisa melhorar',
      };
    default:
      return {
        pill: 'bg-slate-50 text-slate-700 ring-slate-200',
        dot: 'bg-slate-500',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
          </svg>
        ),
        label: 'Info',
      };
  }
}

function Metric({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-gray-500">{hint}</div> : null}
    </div>
  );
}

export default function SeoChecks({ checks, metrics, className, title = 'SEO Analyzer' }: Props) {
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});

  return (
    <div className={clsx('space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>

      {/* Checagens */}
      <ul className="space-y-2">
        {checks.map((c) => {
          const st = levelStyle(c.level);
          const hasDetails = !!c.details && Object.keys(c.details || {}).length > 0;
          const id = `${c.key}`;
          const isOpen = openDetails[id];

          return (
            <li
              key={c.key}
              className={clsx(
                'flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-white p-3 ring-1 ring-black/5'
              )}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span
                  className={clsx('mt-[2px] inline-flex h-2 w-2 flex-shrink-0 rounded-full', st.dot)}
                  aria-hidden
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1',
                        st.pill
                      )}
                    >
                      {st.icon}
                      {st.label}
                    </span>
                    <span className="text-sm font-medium text-slate-900">{c.message}</span>
                  </div>
                  {hasDetails ? (
                    <div className="mt-1">
                      <button
                        type="button"
                        className="text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline"
                        onClick={() =>
                          setOpenDetails((m) => ({ ...m, [id]: !m[id] }))
                        }
                        aria-expanded={isOpen}
                        aria-controls={`details-${id}`}
                        title="Ver detalhes"
                      >
                        {isOpen ? 'Ocultar detalhes' : 'Ver detalhes'}
                      </button>
                      {isOpen ? (
                        <pre
                          id={`details-${id}`}
                          className="mt-2 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-700"
                        >
                          {JSON.stringify(c.details, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Métricas (opcional) */}
      {metrics ? (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-900">Métricas</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Metric label="Palavras" value={metrics.words.toLocaleString()} hint={`~${metrics.readMinutes} min de leitura`} />
            <Metric
              label="Densidade"
              value={`${metrics.density.toFixed(2)}%`}
              hint={`${metrics.keyOccurrences} ocorrências em ${metrics.totalWords} palavras`}
            />
            <Metric label="Título (chars)" value={metrics.titleLength} />
            <Metric label="Description (chars)" value={metrics.descLength} />
            <Metric label="Slug (chars)" value={metrics.slugLength} />
            <Metric label="Passiva (~%)" value={metrics.passiveRatio.toFixed(1)} />
            <Metric label="Transição (~%)" value={metrics.transitionRatio.toFixed(1)} />
            <Metric label="Gap subtítulos (~pal.)" value={metrics.worstHeadingGap} />
            <Metric label="Links internos" value={metrics.linksInternal} />
            <Metric label="Links externos" value={metrics.linksExternal} />
          </div>
        </div>
      ) : null}
    </div>
  );
}