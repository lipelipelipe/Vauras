// src/components/WebStoryCard.tsx
// ============================================================================
// WebStoryCard — Card dedicado para Web Stories (9:16) — nível PhD (next/image)
// ----------------------------------------------------------------------------
// - Substitui <img> por <Image fill> com sizes responsivo.
// - Mantém overlay/ícone/aria-label e foco visível.
// - Resulta em menos payload e melhor LCP/CLS.
// - Proteção: quando usa fallback local, desativa otimização (unoptimized)
//   para evitar erro do Sharp em dev caso o arquivo esteja ausente/corrompido.
// ============================================================================

'use client';

import Link from 'next/link';
import Image from 'next/image';
import clsx from 'clsx';

export type WebStoryItem = {
  href: string;
  title: string;
  cover?: string | null;
  timestamp?: string; // opcional (formatado)
};

type Props = {
  item: WebStoryItem;
  className?: string;
};

function isLocalFallback(src?: string | null) {
  const s = String(src || '');
  return s.startsWith('/images/default-cover');
}

export default function WebStoryCard({ item, className }: Props) {
  const coverSrc = (item.cover && item.cover.trim()) || '/images/default-cover.jpg';
  const unoptimized = isLocalFallback(coverSrc);

  return (
    <article className={clsx('group', className)}>
      <Link
        href={item.href}
        aria-label={item.title}
        className="block overflow-hidden rounded-2xl ring-1 ring-black/5 bg-white shadow-sm transition-transform duration-300 hover:-translate-y-[1px] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {/* Área visual 9:16 para parecer “story” */}
        <div className="relative aspect-[9/16] w-full">
          {/* Capa otimizada (ou não, se fallback local) */}
          <Image
            src={coverSrc}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 25vw, 20vw"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            // Evita o otimizador se usando fallback local
            unoptimized={unoptimized}
            quality={70}
          />

          {/* Overlay gradiente */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

          {/* Ícone de “play/story” no topo */}
          <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow ring-1 ring-black/10">
            <svg width="16" height="16" viewBox="0 0 21 26" fill="none" aria-hidden>
              <path d="M0.25 2.98942C0.25 1.05401 2.21314 -0.138837 3.75123 0.861993L19.1356 10.8726C20.6215 11.8394 20.6215 14.1606 19.1356 15.1274L3.75122 25.138C2.21314 26.1388 0.25 24.946 0.25 23.0106V2.98942Z" fill="#111" />
            </svg>
          </div>

          {/* Título */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow">
              {item.title}
            </h3>
            {item.timestamp ? (
              <div className="mt-1 text-[11px] text-white/85">{item.timestamp}</div>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}