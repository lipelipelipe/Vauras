// src/components/admin/ui/Section.tsx
// ============================================================================
// Section (Right Rail / Seções compactas) — padronização militar
// ----------------------------------------------------------------------------
// - Wrapper para AdminCard com header consistente (title/desc/actions)
// - Compacto por padrão (padding menor), ideal para right rail
// - Evita variação visual entre blocos (SEO, Publicação, Mídia, Story, etc.)
// ============================================================================
'use client';

import * as React from 'react';
import { cn } from '@/lib/ui/cn';
import AdminCard, { CardBody, CardFooter } from './Card';

export interface SectionProps {
  title?: React.ReactNode;
  desc?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
  footerClassName?: string;
  withFooter?: boolean;
  compact?: boolean; // reduz padding do body (default: true)
}

export function Section({
  title,
  desc,
  actions,
  children,
  className,
  bodyClassName,
  footer,
  footerClassName,
  withFooter = false,
  compact = true,
}: SectionProps) {
  return (
    <AdminCard withHeader title={title} desc={desc} actions={actions} className={className}>
      <CardBody className={cn(compact ? 'p-3' : 'p-4', bodyClassName)}>
        {children}
      </CardBody>
      {(withFooter || footer) && (
        <CardFooter className={cn(compact ? 'px-3 py-2' : 'px-4 py-3', footerClassName)}>
          {footer}
        </CardFooter>
      )}
    </AdminCard>
  );
}

export default Section;