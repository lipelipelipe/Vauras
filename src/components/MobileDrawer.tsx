// src/components/MobileDrawer.tsx
// ============================================================================
// Drawer de navegação (Mobile) — A11y + desempenho máximo
// ----------------------------------------------------------------------------
// - Render leve: sem usePathname (só resolve locale no evento).
// - switchLocale altera apenas quando necessário (usa window.location para fallback).
// - Componente memoizado; só é carregado quando "open=true" (via dynamic import no layout).
// - Mantém alvos ≥ 44px, roles e aria para acessibilidade.
// ============================================================================

'use client';

import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALES } from '@/config/locales';

type NavItem = { label: string; href: string };

type Props = {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
  locale: string;
  languageLabel: string;
};

function MobileDrawerBase({ open, onClose, navItems, locale, languageLabel }: Props) {
  const router = useRouter();
  const localeOptions = useMemo(() => LOCALES as unknown as string[], []);

  const switchLocale = useCallback((next: string) => {
    try {
      onClose();
      document.cookie = `lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;

      const { pathname, search, hash } = window.location;
      const parts = pathname.split('/');
      if (parts.length > 1) parts[1] = next;
      const nextUrl = parts.join('/') + (search || '') + (hash || '');

      router.push(nextUrl);
    } catch {
      window.location.href = `/${next}`;
    }
  }, [onClose, router]);

  const go = useCallback((href: string) => {
    onClose();
    router.push(href);
  }, [onClose, router]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-200 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      hidden={!open}
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ease-in-out ${open ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Painel */}
      <div
        className={`absolute top-0 left-0 h-full w-[86vw] max-w-[360px] bg-white shadow-xl transition-transform duration-200 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <span className="font-semibold">Uutiset</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <nav className="flex flex-col">
            {navItems.map((n) => (
              <button
                key={n.href}
                onClick={() => go(n.href)}
                className="text-left text-[16px] text-gray-800 -mx-4 px-4 py-3 border-b hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
              >
                {n.label}
              </button>
            ))}
          </nav>

          <div className="mt-6">
            <label className="mb-2 block text-sm text-gray-600">{languageLabel}</label>
            <select
              value={locale}
              onChange={(e) => switchLocale(e.target.value)}
              className="w-full rounded border bg-gray-50 px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300"
              aria-label={languageLabel}
            >
              {localeOptions.map((l) => (
                <option key={l} value={l}>
                  {String(l).toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(MobileDrawerBase);