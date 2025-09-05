// src/components/Footer.tsx

'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from './I18nProvider';
import type { PublicFooterGroup } from '@/lib/footer';

type Props = {
  data: PublicFooterGroup[];
};

function FooterBase({ data = [] }: Props) {
  const { locale, messages } = useI18n();
  const t = (k: string) => messages?.footer?.[k] ?? k;

  const siteName: string = (messages?.brand?.siteName as string) || 'Uutiset';

  return (
    <footer className="border-t mt-12 bg-white">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href={`/${locale}`} className="font-semibold text-lg tracking-tight text-gray-900">
              {siteName}
            </Link>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <Image
                    src="/logo-96x96.png" // <-- APONTANDO PARA SEU ARQUIVO PNG
                    alt={`${siteName} logo`}
                    width={20}
                    height={20}
                    className="h-5 w-5"
                />
                <span>
                    © {new Date().getFullYear()} {siteName} • {t('tagline')}
                </span>
            </div>
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
