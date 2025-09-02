// src/components/Footer.tsx
// ============================================================================
// Footer — ultra leve, sem usePathname, com re-renders mínimos
// ----------------------------------------------------------------------------
// - Remove verificação de rota/admin no cliente (o route group já isola admin).
// - Usa I18nProvider para obter siteName e strings do footer.
// - Componente memoizado para evitar re-render desnecessário.
// - Apenas renderiza links visíveis recebidos do servidor.
// ============================================================================

'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from './I18nProvider';
import type { PublicFooterGroup } from '@/lib/footer';

type Props = {
  data: PublicFooterGroup[];
};

function FooterBase({ data = [] }: Props) {
  const { locale, messages } = useI18n();
  const t = (k: string) => messages?.footer?.[k] ?? k;

  // Nome do site dinâmico injetado pelo Layout no namespace "brand"
  const siteName: string = (messages?.brand?.siteName as string) || 'Uutiset';

  return (
    <footer className="border-t mt-12 bg-white">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href={`/${locale}`} className="font-semibold text-lg tracking-tight text-gray-900">
              {siteName}
            </Link>
            <p className="mt-2 text-sm text-gray-500">
              © {new Date().getFullYear()} {siteName} • {t('tagline')}
            </p>
          </div>

          {data.map((group) => (
            <div key={group.id}>
              <h3 className="font-semibold text-sm text-gray-900">{group.title}</h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.id}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel={link.rel || 'noopener noreferrer'}
                        className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default React.memo(FooterBase);