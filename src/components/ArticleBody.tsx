// src/components/ArticleBody.tsx
// ============================================================================
// Renderizador de Conteúdo Markdown — Nível PhD (next/image + sizes)
// ----------------------------------------------------------------------------
// - Intercepta <img> do markdown e usa <Image> do Next.js (otimizado).
// - Define sizes inteligentes para reduzir payload em mobile.
// - Fallback de alt baseado no título do artigo (SEO/A11y).
// - NOVO: imageAltOverride aplica ALT padrão a todas as imagens do conteúdo.
// - Proteção: quando usa fallback local, desativa o otimizador (unoptimized)
//   para evitar erro do Sharp em dev caso o arquivo esteja ausente/corrompido.
// ============================================================================

'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import Image from 'next/image';

type Props = {
  content: string;
  articleTitle: string;
  imageAltOverride?: string; // <- ALT padrão para todas as imagens
};

function isExternal(href?: string) {
  if (!href) return false;
  try {
    return /^https?:\/\//i.test(href);
  } catch {
    return false;
  }
}

function isLocalFallback(src?: string | null) {
  const s = String(src || '');
  return s.startsWith('/images/default-cover');
}

export default function ArticleBody({ content, articleTitle, imageAltOverride }: Props) {
  const override = (imageAltOverride || '').trim();

  return (
    <div className="prose prose-slate dark:prose-invert mx-auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a(props: any) {
            const { href, children, ...rest } = props;
            const external = isExternal(href);
            return (
              <a
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                {...rest}
              >
                {children}
              </a>
            );
          },

          // Imagens dentro do markdown
          img(props: any) {
            const { src, alt } = props;
            const s = typeof src === 'string' ? src.trim() : '';
            // Prioridade: override global > alt do md > título do artigo > fallback
            const effectiveAlt =
              (override || '') ||
              (alt || '') ||
              (articleTitle || '') ||
              'Imagem do artigo';

            const resolvedSrc = s || '/images/default-cover.jpg';
            const unoptimized = isLocalFallback(resolvedSrc);

            return (
              <Image
                src={resolvedSrc}
                alt={effectiveAlt}
                width={800}
                height={450}
                sizes="(max-width: 768px) 100vw, 800px"
                className={clsx('rounded-xl object-cover w-full h-auto')}
                loading="lazy"
                // Evita o otimizador quando o fallback local é usado
                unoptimized={unoptimized}
              />
            );
          },

          h2({ children, ...rest }: any) {
            return (
              <h2 className="font-bold tracking-tight" {...rest}>
                {children}
              </h2>
            );
          },

          h3({ children, ...rest }: any) {
            return (
              <h3 className="font-bold tracking-tight" {...rest}>
                {children}
              </h3>
            );
          },

          blockquote({ children, ...rest }: any) {
            return (
              <blockquote
                className="border-l-4 border-gray-200 pl-4 italic text-gray-700 dark:text-gray-300"
                {...rest}
              >
                {children}
              </blockquote>
            );
          },

          p({ children, ...rest }: any) {
            return (
              <p className="leading-relaxed" {...rest}>
                {children}
              </p>
            );
          },

          code(props: any) {
            const { inline, children, className, ...rest } = props;
            if (inline) {
              return (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="overflow-x-auto rounded-lg bg-gray-900 text-gray-100 p-4 text-sm" {...rest}>
                <code className={className}>{children}</code>
              </pre>
            );
          },
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}