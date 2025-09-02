// src/components/admin/ui/Toolbar.tsx
// ============================================================================
// Toolbar (Editor) — sticky, única fonte de ações primárias
// ----------------------------------------------------------------------------
// - Fixa abaixo do Topbar do Admin (offset top-14)
// - Exibe status, info de salvamento e botões principais (Salvar/Publicar/Agendar)
// - Permite injetar ações extras do lado direito
// ============================================================================
'use client';

import * as React from 'react';
import { cn } from '@/lib/ui/cn';
import { Button } from './Button';
import StatusPill, { type StatusKind } from './StatusPill';

export interface ToolbarProps {
  status: StatusKind;
  savedLabel?: string; // ex.: "Auto-salvo há 2 min"
  className?: string;
  onSaveDraft?: () => void;
  onPublish?: () => void;
  onSchedule?: () => void;
  rightExtra?: React.ReactNode; // para ações extras (ex.: link "Ver no site")
}

export function Toolbar({
  status,
  savedLabel,
  className,
  onSaveDraft,
  onPublish,
  onSchedule,
  rightExtra,
}: ToolbarProps) {
  return (
    <div
      className={cn(
        'sticky top-14 z-30 border-b border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60',
        className
      )}
      role="region"
      aria-label="Barra de ferramentas do editor"
    >
      <div className="mx-auto flex h-12 max-w-[1200px] items-center justify-between px-4">
        <div className="flex items-center gap-3 min-w-0">
          <StatusPill status={status} />
          {savedLabel ? (
            <span className="truncate text-xs text-slate-600">{savedLabel}</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* Ações primárias */}
          {onSaveDraft ? (
            <Button variant="secondary" size="md" onClick={onSaveDraft}>
              Salvar
            </Button>
          ) : null}
          {onPublish ? (
            <Button variant="primary" size="md" onClick={onPublish}>
              Publicar
            </Button>
          ) : null}
          {onSchedule ? (
            <Button variant="soft" size="md" onClick={onSchedule}>
              Agendar
            </Button>
          ) : null}

          {/* Extras à direita (opcional) */}
          {rightExtra ? <div className="ml-2">{rightExtra}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default Toolbar;