// src/components/I18nProvider.tsx
// ============================================================================
// I18nProvider — leve, estável e sem efeitos (máximo desempenho)
// ----------------------------------------------------------------------------
// - Contexto minimalista para evitar hidratação pesada.
// - Valor memoizado para identidade estável (reduz re-renders).
// - Provider memoizado (React.memo) para evitar recomputações desnecessárias.
// ============================================================================

'use client';

import React, { createContext, useContext, useMemo } from 'react';

type Ctx = {
  locale: string;
  messages: Record<string, any>;
};

const I18nContext = createContext<Ctx | null>(null);

function I18nProviderBase({ locale, messages, children }: React.PropsWithChildren<Ctx>) {
  // Garante que a identidade do objeto de contexto não mude entre renders
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const I18nProvider = React.memo(I18nProviderBase);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}