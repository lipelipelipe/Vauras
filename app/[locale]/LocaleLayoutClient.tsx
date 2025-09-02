// app/[locale]/LocaleLayoutClient.tsx
// ============================================================================
// Locale Layout (Client) — máximo desempenho (mínima hidratação)
// ----------------------------------------------------------------------------
// - Remove detecção de admin (route group já isola o admin).
// - MobileDrawer por import dinâmico e carregado somente quando aberto.
// - Memoização dos itens de navegação e labels estáveis (evita re-renders).
// - Provider de i18n mantém API, mas evita recomputações desnecessárias.
// ============================================================================

'use client';

import React, { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { I18nProvider } from '@/components/I18nProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { PublicMenuItem } from '@/lib/menu';
import type { PublicFooterGroup } from '@/lib/footer';

// Import dinâmico do Drawer (sem SSR). Carregado somente quando for renderizado.
const MobileDrawer = dynamic(() => import('@/components/MobileDrawer'), {
  ssr: false,
});

type NavItem = { label: string; href: string };

type Props = {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, any>;
  menu: PublicMenuItem[];
  footer: PublicFooterGroup[];
};

function LocaleLayoutClientBase({ children, locale, messages, menu, footer }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Itens de navegação memoizados (evita recriações a cada render)
  const navItems: NavItem[] = useMemo(
    () => (Array.isArray(menu) ? menu.map((m) => ({ label: m.label, href: m.href })) : []),
    [menu]
  );

  // Label de idioma memoizada (reduz consumo de contexto no cliente)
  const languageLabel = useMemo(
    () => (messages?.nav?.language as string) || 'Language',
    [messages?.nav?.language]
  );

  const handleMenuOpen = useCallback(() => setMenuOpen(true), []);
  const handleMenuClose = useCallback(() => setMenuOpen(false), []);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <Header onMenuOpen={handleMenuOpen} navItems={navItems} />

      {/* Drawer só carrega quando aberto (reduz JS inicial e TBT) */}
      {menuOpen && (
        <MobileDrawer
          open={menuOpen}
          onClose={handleMenuClose}
          navItems={navItems}
          locale={locale}
          languageLabel={languageLabel}
        />
      )}

      <main className="container mx-auto px-4 py-6">{children}</main>

      <Footer data={footer} />
    </I18nProvider>
  );
}

const LocaleLayoutClient = React.memo(LocaleLayoutClientBase);
export default LocaleLayoutClient;