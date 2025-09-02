// src/components/admin/seo/SeoGauge.tsx
// ============================================================================
// SEO Gauge (0..100) — estilo Yoast (Client Component) — nível PhD
// ----------------------------------------------------------------------------
// - SVG circular progress com cores por faixa (ruim/ok/bom).
// - Acessível (aria), responsivo e sem dependências externas.
// - Props configuráveis (size/strokeWidth/label).
// ============================================================================

'use client';

import React from 'react';
import clsx from 'clsx';

type Props = {
  score: number;          // 0..100
  size?: number;          // diâmetro total em px (default: 140)
  strokeWidth?: number;   // largura do traço em px (default: 10)
  label?: string;         // rótulo sob o número (default: 'SEO Score')
  className?: string;     // classes utilitárias adicionais
};

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function colorByScore(score: number) {
  if (score >= 80) {
    return {
      stroke: 'stroke-emerald-500',
      text: 'text-emerald-700',
      badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      label: 'Bom',
    };
  }
  if (score >= 50) {
    return {
      stroke: 'stroke-amber-500',
      text: 'text-amber-700',
      badge: 'bg-amber-50 text-amber-700 ring-amber-200',
      label: 'Ok',
    };
  }
  return {
    stroke: 'stroke-red-500',
    text: 'text-red-700',
    badge: 'bg-red-50 text-red-700 ring-red-200',
    label: 'Precisa melhorar',
  };
}

export default function SeoGauge({
  score: raw,
  size = 140,
  strokeWidth = 10,
  label = 'SEO Score',
  className,
}: Props) {
  const score = clamp(Math.round(raw || 0), 0, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (1 - score / 100);

  const colors = colorByScore(score);
  const ariaText = `${label}: ${score} de 100 (${colors.label})`;

  return (
    <div
      className={clsx(
        'inline-flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-3 shadow-sm',
        className
      )}
      role="group"
      aria-label={ariaText}
      title={ariaText}
    >
      <svg
        width={size}
        height={size}
        className="block"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {/* trilho */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-gray-200"
            strokeWidth={strokeWidth}
          />
          {/* progresso */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={clsx('transition-[stroke-dashoffset] duration-500 ease-out', colors.stroke)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dash}
          />
        </g>
      </svg>

      {/* número */}
      <div className="pointer-events-none absolute flex flex-col items-center justify-center">
        {/* vazio: container posicionado relativo via parent? */}
      </div>

      {/* valor + rótulos */}
      <div className="mt-2 flex flex-col items-center">
        <div className={clsx('text-3xl font-semibold leading-none', colors.text)} aria-hidden>
          {score}
        </div>
        <div className="mt-0.5 text-xs text-gray-500">{label}</div>
        <div
          className={clsx(
            'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1',
            colors.badge
          )}
        >
          <span
            className={clsx(
              'inline-block h-1.5 w-1.5 rounded-full',
              colors.text === 'text-emerald-700'
                ? 'bg-emerald-600'
                : colors.text === 'text-amber-700'
                ? 'bg-amber-600'
                : 'bg-red-600'
            )}
          />
          {colors.label}
        </div>
      </div>
    </div>
  );
}