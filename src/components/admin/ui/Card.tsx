// src/components/admin/ui/Card.tsx
// ============================================================================
// Card (Admin UI) — base unificada para seções
// ----------------------------------------------------------------------------
// - Header opcional (title/desc/actions)
// - Body com padding consistente
// - Estilo: border suave + shadow-sm (sem excesso de ruído)
// - Slots: <Card.Header/Body/Footer> (flexível) ou props diretas
// ============================================================================
'use client';

import * as React from 'react';
import { cn } from '@/lib/ui/cn';

type HeaderProps = {
  title?: React.ReactNode;
  desc?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};
type BodyProps = {
  className?: string;
  children: React.ReactNode;
};
type FooterProps = {
  className?: string;
  children?: React.ReactNode;
};

export interface AdminCardProps extends HeaderProps, BodyProps {
  withHeader?: boolean; // se false, não renderiza header mesmo com title/desc/actions
  withFooter?: boolean;
  footer?: React.ReactNode;
  surfaceClassName?: string;
}

/**
 * Componente composto:
 * - <AdminCard title desc actions>children</AdminCard>
 * - <AdminCard>
 *     <AdminCard.Header title="..." actions={<.../>} />
 *     <AdminCard.Body>...</AdminCard.Body>
 *     <AdminCard.Footer>...</AdminCard.Footer>
 *   </AdminCard>
 */
export function AdminCard({
  title,
  desc,
  actions,
  withHeader = true,
  withFooter = false,
  footer,
  surfaceClassName,
  className,
  children,
}: AdminCardProps) {
  const showHeader = withHeader && (!!title || !!desc || !!actions);

  return (
    <section
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        surfaceClassName
      )}
    >
      {showHeader ? (
        <div
          className={cn(
            'flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3',
            className
          )}
        >
          <div className="min-w-0">
            {title ? (
              <h3 className="text-[14px] font-semibold leading-5 text-slate-900">
                {title}
              </h3>
            ) : null}
            {desc ? (
              <p className="mt-0.5 text-[12px] leading-5 text-slate-500">
                {desc}
              </p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}

      <div className="p-4">{children}</div>

      {withFooter || footer ? (
        <div className="border-t border-gray-100 px-4 py-3">{footer}</div>
      ) : null}
    </section>
  );
}

export function CardHeader({ title, desc, actions, className }: HeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3',
        className
      )}
    >
      <div className="min-w-0">
        {title ? (
          <h3 className="text-[14px] font-semibold leading-5 text-slate-900">
            {title}
          </h3>
        ) : null}
        {desc ? (
          <p className="mt-0.5 text-[12px] leading-5 text-slate-500">{desc}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: BodyProps) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }: FooterProps) {
  return (
    <div className={cn('border-t border-gray-100 px-4 py-3', className)}>
      {children}
    </div>
  );
}

AdminCard.Header = CardHeader;
AdminCard.Body = CardBody;
AdminCard.Footer = CardFooter;

export default AdminCard;