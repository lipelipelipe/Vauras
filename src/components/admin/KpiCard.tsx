// src/components/admin/KpiCard.tsx
// ============================================================================
// Componente KPI Card — nível PhD (Client Component)
// ----------------------------------------------------------------------------
// Objetivo:
// - Exibir um indicador-chave (KPI) com valor principal, variação (delta)
//   e um pequeno hint/sublabel (ex.: período).
//
// Props:
// - label: título do KPI (ex.: "Visitas (24h)")
// - value: valor principal (string | número)
// - delta?: número (variação percentual; >0 verde, <0 vermelho, 0 neutro)
// - sublabel?: string (ex.: "últimas 24h")
// - icon?: React.ReactNode (ícone opcional à esquerda do título)
// - loading?: boolean (renderiza skeleton)
// - href?: string (torna o card clicável, opcional)
//
// UX:
// - Cartão branco com sombra leve, borda sutil e microinterações de hover.
// - Cores semáforo para delta (verde/verm/red).
// - Skeleton quando loading=true.
// ============================================================================

'use client';

import Link from 'next/link';
import clsx from 'clsx';

type Props = {
  label: string;
  value: string | number;
  delta?: number;           // ex.: 12.5 -> +12.5%
  sublabel?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  href?: string;            // se fornecido, renderiza como link clicável
};

function DeltaBadge({ delta }: { delta: number }) {
  const dir = delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down';
  const color =
    dir === 'up' ? 'text-emerald-700 bg-emerald-50 ring-emerald-200' :
    dir === 'down' ? 'text-red-700 bg-red-50 ring-red-200' :
    'text-slate-700 bg-slate-50 ring-slate-200';
  const sign = delta > 0 ? '+' : delta < 0 ? '' : '';
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1', color)}>
      {dir === 'up' && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 14l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {dir === 'down' && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M18 10l-6 6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {dir === 'flat' && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      <span>{sign}{Math.abs(delta).toFixed(1)}%</span>
    </span>
  );
}

export default function KpiCard({ label, value, delta, sublabel, icon, loading, href }: Props) {
  const Wrapper: any = href ? Link : 'div';
  const wrapperProps: any = href ? { href } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={clsx(
        'block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition',
        href ? 'hover:shadow-md hover:-translate-y-[1px]' : ''
      )}
      aria-label={href ? `${label} — abrir detalhes` : undefined}
    >
      {/* Cabeçalho do card: label + ícone opcional */}
      <div className="flex items-center gap-2">
        {icon && (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-slate-700 ring-1 ring-black/5">
            {icon}
          </span>
        )}
        <div className="text-sm text-gray-500">{label}</div>
      </div>

      {/* Valor principal */}
      <div className="mt-2 flex items-baseline gap-2">
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-gray-100" aria-hidden />
        ) : (
          <div className="text-3xl font-semibold text-slate-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
        )}
        {!loading && typeof delta === 'number' && <DeltaBadge delta={delta} />}
      </div>

      {/* Sublabel (ex.: período) */}
      <div className="mt-2">
        {loading ? (
          <div className="h-4 w-32 animate-pulse rounded bg-gray-100" aria-hidden />
        ) : sublabel ? (
          <div className="text-xs text-gray-500">{sublabel}</div>
        ) : null}
      </div>
    </Wrapper>
  );
}