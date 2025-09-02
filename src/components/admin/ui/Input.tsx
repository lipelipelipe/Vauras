// src/components/admin/ui/Input.tsx
// ============================================================================
// Input & Textarea — campos básicos com variações de estado (erro/disabled)
// ----------------------------------------------------------------------------
// - Suporte a ícones à esquerda/direita (iconLeft/iconRight)
// - Estados: padrão, focus-visible, erro
// - Textarea com mesmo look & feel
// ============================================================================
'use client';

import * as React from 'react';
import { cn } from '@/lib/ui/cn';

export interface BaseInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, BaseInputProps>(
  (
    { className, wrapperClassName, error, iconLeft, iconRight, disabled, ...props },
    ref
  ) => {
    return (
      <div
        className={cn(
          'relative w-full',
          wrapperClassName
        )}
      >
        {iconLeft ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-2 inline-flex items-center text-slate-400"
          >
            {iconLeft}
          </span>
        ) : null}

        <input
          ref={ref}
          className={cn(
            [
              'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition',
              'placeholder:text-slate-400',
              'focus:border-gray-400 focus:ring-0 focus:outline-none',
              // erro
              error
                ? 'border-rose-300 focus:border-rose-400'
                : 'border-gray-300',
              // disabled
              disabled ? 'cursor-not-allowed bg-slate-50 text-slate-500' : '',
              // padding para ícones
              iconLeft ? 'pl-8' : '',
              iconRight ? 'pr-9' : '',
            ].join(' ')
          )}
          disabled={disabled}
          {...props}
        />

        {iconRight ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-2 inline-flex items-center text-slate-400"
          >
            {iconRight}
          </span>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, disabled, rows = 5, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          [
            'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition',
            'placeholder:text-slate-400',
            'focus:border-gray-400 focus:ring-0 focus:outline-none',
            error ? 'border-rose-300 focus:border-rose-400' : 'border-gray-300',
            disabled ? 'cursor-not-allowed bg-slate-50 text-slate-500' : '',
            'resize-y',
          ].join(' '),
          className
        )}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';