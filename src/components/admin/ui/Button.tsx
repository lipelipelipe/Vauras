// src/components/admin/ui/Button.tsx
// ============================================================================
// Button (Admin UI) — variante cva + acessibilidade
// ----------------------------------------------------------------------------
// - Variants: primary, secondary, ghost, danger, soft
// - Sizes: sm, md, lg
// - Focus-visible com ring consistente (WCAG)
// - Desabilitado: pointer-events-none + opacity
// ============================================================================
'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/ui/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:opacity-60 disabled:pointer-events-none',
    // ring-offset para superfícies brancas (admin)
    'ring-offset-white',
    // altura mínima e espaçamentos básicos (substituídos por size)
    'select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-black text-white hover:bg-gray-800 focus-visible:ring-black',
        secondary:
          'bg-white text-slate-900 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-400',
        ghost:
          'bg-transparent text-slate-900 hover:bg-gray-50 focus-visible:ring-gray-300',
        danger:
          'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600',
        soft:
          'bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-300',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-9 px-3.5 text-sm',
        lg: 'h-10 px-4 text-sm',
      },
      full: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
      full: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, full, iconLeft, iconRight, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size, full }),
          // Alinhar ícones com texto
          'gap-2',
          className
        )}
        {...props}
      >
        {iconLeft ? <span aria-hidden className="inline-flex">{iconLeft}</span> : null}
        <span className="inline-flex">{children}</span>
        {iconRight ? <span aria-hidden className="inline-flex">{iconRight}</span> : null}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };