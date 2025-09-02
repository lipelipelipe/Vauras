// src/components/Header.tsx
// ============================================================================
// Header (Client) — ultra leve, sem usePathname e com re-renders mínimos
// ----------------------------------------------------------------------------
// - Remove usePathname (menos custo de navegação/hidratação).
// - switchLocale atua apenas no evento (usa window.location), evitando ler pathname a cada render.
// - Componente memoizado para evitar re-render desnecessário.
// - Mantém prefetch padrão do Next para navegação fluida (pode desativar com prefetch={false} se quiser reduzir pós-carregamento).
// ============================================================================

'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from './I18nProvider';
import { LOCALES } from '@/config/locales';

type NavItem = { label: string; href: string };

type Props = {
  onMenuOpen: () => void;
  navItems: NavItem[];
};

function HeaderBase({ onMenuOpen, navItems }: Props) {
  const { locale, messages } = useI18n();
  const router = useRouter();

  const t = useCallback((k: string) => messages?.nav?.[k] ?? k, [messages?.nav]);
  const siteName: string = (messages?.brand?.siteName as string) || 'Uutiset';

  // Troca de locale só quando o usuário altera o select (evita custo por render)
  const switchLocale = useCallback((next: string) => {
    try {
      // persiste preferencia
      document.cookie = `lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;

      // reescreve o 1º segmento do pathname
      const { pathname, search, hash } = window.location;
      const parts = pathname.split('/');
      if (parts.length > 1) {
        parts[1] = next;
      }
      const nextUrl = parts.join('/') + (search || '') + (hash || '');

      // Navegação direta (rápida)
      router.push(nextUrl);
    } catch {
      // fallback hard
      window.location.href = `/${next}`;
    }
  }, [router]);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="h-14 flex items-center justify-between">
          {/* Logo/Nome do site (dinâmico) */}
          <Link href={`/${locale}`} className="font-semibold text-lg tracking-tight" aria-label={siteName}>
            {siteName}
          </Link>

          {/* Menu (desktop) */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6">
            {navItems.map((n, i) => (
              <Link
                key={`${n.href}-${i}`}
                href={n.href}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Seletor de idioma */}
          <div className="hidden md:flex items-center gap-2">
            <label className="sr-only">{t('language') || 'Language'}</label>
            <select
              value={locale}
              onChange={(e) => switchLocale(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
              aria-label={t('language') || 'Language'}
            >
              {(LOCALES as unknown as string[]).map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Botão do menu (mobile) — 44x44px */}
          <button
            aria-label="Open menu"
            className="md:hidden inline-flex items-center justify-center h-11 w-11 rounded hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300"
            onClick={onMenuOpen}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

export default React.memo(HeaderBase);