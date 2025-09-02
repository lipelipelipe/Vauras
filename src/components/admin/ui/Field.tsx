// src/components/admin/ui/Field.tsx
// ============================================================================
// Field — rótulo/hint/erro padronizados para inputs
// ----------------------------------------------------------------------------
// - Label 12/600; hint 12/500; error 12/semáforo
// - Gera id automaticamente via useId() se não informado
// - Usa aria-describedby para acessibilidade
// ============================================================================
'use client';

import * as React from 'react';
import { cn } from '@/lib/ui/cn';

export interface FieldProps {
  id?: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function Field({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  const autoId = React.useId();
  const fieldId = id || `fld_${autoId}`;
  const hintId = hint ? `${fieldId}_hint` : undefined;
  const errorId = error ? `${fieldId}_error` : undefined;

  // Clona o filho para aplicar id e aria (se possível)
  const child = React.isValidElement(children)
    ? React.cloneElement(children as any, {
        id: (children as any).props?.id || fieldId,
        'aria-invalid': !!error || undefined,
        'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
      })
    : children;

  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <label
          htmlFor={fieldId}
          className="mb-1 block text-[12px] font-semibold text-slate-900"
        >
          {label}
          {required ? <span className="ml-1 text-rose-600">*</span> : null}
        </label>
      ) : null}

      {child}

      {hint ? (
        <p id={hintId} className="mt-1 text-[12px] text-slate-500">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="mt-1 text-[12px] text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}