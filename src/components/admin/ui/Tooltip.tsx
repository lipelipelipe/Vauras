// src/components/admin/ui/Tooltip.tsx
// ============================================================================
// Tooltip (Radix) — wrapper padronizado para dicas de UI
// ----------------------------------------------------------------------------
// - Provider com delay leve (200ms)
// - Content com tema escuro sutil (Admin)
// - API:
//   <Tooltip>
//     <Tooltip.Trigger>...</Tooltip.Trigger>
//     <Tooltip.Content>Texto</Tooltip.Content>
//   </Tooltip>
// ============================================================================
'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/ui/cn';

export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export interface TooltipContentProps extends TooltipPrimitive.TooltipContentProps {
  className?: string;
}

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = 6, ...props }, ref) => {
  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 select-none rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-md',
        'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className
      )}
      {...props}
    />
  );
});
TooltipContent.displayName = 'TooltipContent';

export interface TooltipProps extends TooltipPrimitive.TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: TooltipPrimitive.TooltipContentProps['side'];
  align?: TooltipPrimitive.TooltipContentProps['align'];
  contentClassName?: string;
}

/**
 * Componente de conveniência:
 * <Tooltip content="Ajuda">
 *   <Tooltip.Trigger asChild><button>?</button></Tooltip.Trigger>
 * </Tooltip>
 */
export function Tooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  contentClassName,
  ...rootProps
}: TooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <TooltipRoot {...rootProps}>
        {children}
        <TooltipContent side={side} align={align} className={contentClassName}>
          {content}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
}