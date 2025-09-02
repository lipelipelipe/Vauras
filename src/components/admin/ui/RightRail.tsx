// src/components/admin/ui/RightRail.tsx
// ============================================================================
// RightRail — coluna direita padronizada (sticky)
// ----------------------------------------------------------------------------
// - Mantém seções compactas (Section) em uma coluna com espaçamento consistente
// - Sticky configurável (offset top)
// - Evita variação de layout entre páginas do Admin
// ============================================================================
'use client';

import * as React from 'react';
import { cn } from '@/lib/ui/cn';

export interface RightRailProps {
  children: React.ReactNode;
  className?: string;
  /**
   * CSS top offset para sticky.
   * Ex.: 80 (px) -> equivalente ao top-20; default 80.
   */
  topOffsetPx?: number;
  /**
   * Espaçamento vertical entre seções (default: 16px)
   */
  gapPx?: number;
}

export default function RightRail({
  children,
  className,
  topOffsetPx = 80,
  gapPx = 16,
}: RightRailProps) {
  return (
    <aside className={cn('lg:col-span-4', className)}>
      <div
        className="sticky"
        style={{ top: topOffsetPx }}
        aria-label="Painel lateral do editor"
      >
        <div
          className="flex flex-col"
          style={{ gap: gapPx }}
        >
          {children}
        </div>
      </div>
    </aside>
  );
}