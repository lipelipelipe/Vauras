// src/config/locales.ts
// ============================================================================
// Fonte única de truth para os locais suportados na aplicação.
// - Pode ser importado tanto por Client quanto por Server Components.
// - Não usa APIs de Node; seguro para o middleware.
// ============================================================================

export const LOCALES = ['fi', 'en'] as const;
export type Locale = typeof LOCALES[number];

export const DEFAULT_LOCALE: Locale = 'fi';

// Helper opcional: checa se uma string é um Locale válido.
export function isLocale(x: string | undefined | null): x is Locale {
  return !!x && (LOCALES as readonly string[]).includes(x);
}