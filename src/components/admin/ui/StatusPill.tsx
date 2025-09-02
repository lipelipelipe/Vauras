// src/components/admin/ui/StatusPill.tsx
// ============================================================================
// StatusPill — indicador de status editorial (draft/published/scheduled)
// ----------------------------------------------------------------------------
// - Compacto, consistente e acessível
// - Suporte a variações extras: 'processing' e 'danger' (opcional)
// ============================================================================
'use client';

import * as React from 'react';
import { cn } from '@/lib/ui/cn';

type CoreStatus = 'draft' | 'published' | 'scheduled';
type ExtraStatus = 'processing' | 'danger' | 'info' | 'success' | 'warning';
export type StatusKind = CoreStatus | ExtraStatus;

export interface StatusPillProps {
  status: StatusKind;
  className?: string;
  children?: React.ReactNode; // caso queira label custom
}

function configFor(status: StatusKind) {
  switch (status) {
    case 'draft':
      return { text: 'Rascunho', cls: 'bg-gray-100 text-gray-700' };
    case 'published':
      return { text: 'Publicado', cls: 'bg-emerald-100 text-emerald-800' };
    case 'scheduled':
      return { text: 'Agendado', cls: 'bg-amber-100 text-amber-800' };
    case 'processing':
      return { text: 'Processando', cls: 'bg-sky-100 text-sky-800' };
    case 'danger':
      return { text: 'Atenção', cls: 'bg-rose-100 text-rose-800' };
    case 'success':
      return { text: 'OK', cls: 'bg-emerald-100 text-emerald-800' };
    case 'warning':
      return { text: 'Atenção', cls: 'bg-amber-100 text-amber-800' };
    case 'info':
      return { text: 'Info', cls: 'bg-slate-100 text-slate-700' };
    default:
      return { text: String(status), cls: 'bg-slate-100 text-slate-700' };
  }
}

export function StatusPill({ status, className, children }: StatusPillProps) {
  const { text, cls } = configFor(status);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        cls,
        className
      )}
      aria-label={`Status: ${text}`}
    >
      <span
        aria-hidden
        className={cn(
          'mr-1 inline-block h-1.5 w-1.5 rounded-full',
          cls.includes('emerald') ? 'bg-emerald-700' :
          cls.includes('amber') ? 'bg-amber-700' :
          cls.includes('rose') ? 'bg-rose-700' :
          cls.includes('sky') ? 'bg-sky-700' :
          'bg-slate-600'
        )}
      />
      {children ?? text}
    </span>
  );
}

export default StatusPill;