// src/components/ArticleCard.tsx
// ============================================================================
// Cartão de artigo (lista) — sizes/qualidade refinados (payload mínimo)
// ----------------------------------------------------------------------------
// - fill + sizes = '(max-width: 640px) 92vw, 192px' (thumb ~12rem).
// - quality={70} para cortar ~30–40% de bytes nas thumbs.
// - Mantém priority opcional para o 1º card quando não há herói.
// - Proteção: quando usar fallback local, desativa o otimizador (unoptimized)
//   para evitar erros do Sharp caso o arquivo esteja ausente/corrompido.
// ============================================================================

import Link from 'next/link';
import Image from 'next/image';

export type ArticleItem = {
  href: string;
  hat: string;
  title: string;
  cover?: string;
  timestamp?: string;
  section?: string;
};

type Props = {
  item: ArticleItem;
  priority?: boolean;
};

function isLocalFallback(src: string) {
  // Qualquer default local conhecido (ajuste caso mude o nome/forma)
  return src.startsWith('/images/default-cover');
}

export default function ArticleCard({ item, priority = false }: Props) {
  const coverSrc = (item.cover && item.cover.trim()) || '/images/default-cover.jpg';
  const useUnoptimized = isLocalFallback(coverSrc);

  // Precisão no mobile e thumb ~192px a partir de sm
  const sizes = '(max-width: 640px) 92vw, 192px';

  return (
    <article className="py-6 border-b border-gray-200">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Texto */}
        <div className="flex-1 order-2 sm:order-1">
          <span className="text-sm font-semibold text-blue-700">{item.hat}</span>

          <Link href={item.href} aria-label={item.title}>
            <h2 className="mt-1 text-xl font-bold text-gray-900 leading-tight hover:text-gray-700 transition-colors duration-200">
              {item.title}
            </h2>
          </Link>

          <div className="mt-2 flex items-center gap-x-3 text-xs text-gray-500">
            {item.timestamp ? <span>{item.timestamp}</span> : null}
            {item.timestamp && item.section ? <span className="font-bold">·</span> : null}
            {item.section ? <span>{item.section}</span> : null}
          </div>
        </div>

        {/* Imagem */}
        <div className="w-full sm:w-48 order-1 sm:order-2 flex-shrink-0">
          <Link href={item.href} className="block group" aria-label={item.title}>
            <div className="relative overflow-hidden rounded-lg aspect-video">
              <Image
                src={coverSrc}
                alt={item.title}
                fill
                sizes={sizes}
                quality={70}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                priority={priority}
                decoding="async"
                // Evita o otimizador quando usamos o fallback local,
                // assim não passamos pelo pipeline do Sharp em dev.
                unoptimized={useUnoptimized}
              />
            </div>
          </Link>
        </div>
      </div>
    </article>
  );
}