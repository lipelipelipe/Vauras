// src/components/ShareBar.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from './I18nProvider';

export default function ShareBar() {
  const pathname = usePathname();
  const { messages } = useI18n();
  const t = (k: string) => messages?.common?.[k] ?? k;

  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    const origin =
      (process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXTAUTH_URL ||
        (typeof window !== 'undefined' ? window.location.origin : ''))
        .replace(/\/+$/, '');
    setShareUrl(`${origin}${pathname || ''}`);
  }, [pathname]);

  const whatsappLink = shareUrl ? `https://api.whatsapp.com/send?text=${encodeURIComponent(shareUrl)}` : '#';
  const facebookLink = shareUrl ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` : '#';

  return (
    <div className="flex items-center gap-3 my-4">
      <span className="text-sm font-semibold text-gray-600">{t('share')}</span>
      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366]"
        aria-label="Compartilhar no WhatsApp"
      >
        <svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.433-9.89-9.889-9.89-5.452 0-9.887 4.434-9.889 9.891.001 2.03.575 3.988 1.637 5.668l-1.023 3.748 3.847-1.026zM12 4.411c4.138 0 7.502 3.362 7.502 7.5s-3.364 7.5-7.502 7.5c-4.138 0-7.5-3.363-7.5-7.5s3.362-7.5 7.5-7.5zm.001 2.999c-.396 0-.719.322-.719.718v5.564c0 .396.323.718.719.718h.001c.396 0 .718-.322.718-.718V8.128c0-.396-.322-.718-.718-.718zm0-1.999c-.414 0-.75.336-.75.75s.336.75.75.75.75-.336.75-.75-.336-.75-.75-.75z" />
        </svg>
      </a>
      <a
        href={facebookLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1877F2] text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1877F2]"
        aria-label="Compartilhar no Facebook"
      >
        <svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
        </svg>
      </a>
    </div>
  );
}