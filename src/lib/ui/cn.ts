// src/lib/ui/cn.ts
// cn() — compõe classes Tailwind com clsx + tailwind-merge (ESM correto)
import type { ClassValue } from 'clsx';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs));
}