// app/[locale]/category/[slug]/page.tsx
// ============================================================================
// Listagem por Categoria — i18n completo (FI/EN) e sem textos em PT-BR
// ----------------------------------------------------------------------------
// - Usa i18n (getMessages) para rótulos "Category", "Current locale" e mensagem de vazio.
// - Mantém ArticleCard que já trata fallback local no <Image>.
// - ISR: revalidate para melhor bfcache/performance.
// - robots explícito: index, follow.
// ============================================================================

import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import ArticleCard, { type ArticleItem } from '@/components/ArticleCard';
import { detectBaseUrl } from '@/lib/seo/site';
import { getSiteSettings } from '@/lib/settings';
import { getMessages } from '@/lib/i18n';

export const revalidate = 120;

type Params = { locale: string; slug: string };

function humanize(slug: string) {
  return (slug || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// SEO básico: título da categoria + canonical absoluto
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = params;
  const settings = await getSiteSettings();
  const baseUrl = detectBaseUrl(settings?.siteUrl || null);
  const title = humanize(slug);
  const urlAbs = `${baseUrl}/${locale}/category/${slug}`;
  return {
    title: `${title} • Uutiset`,
    alternates: { canonical: urlAbs },
    openGraph: { title: `${title} • Uutiset`, url: urlAbs, type: 'website' },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { locale, slug } = params;

  // i18n: carrega apenas o namespace 'common' que contém 'category', 'currentLocale' e 'noPostsInCategory'
  const messages = await getMessages(locale as any, ['common']);
  const t = (k: string) => messages.common?.[k] ?? k;

  const posts = await prisma.post.findMany({
    where: {
      locale,
      category: slug,
      status: 'published',
    } as any,
    orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    take: 30,
    select: {
      id: true,
      title: true,
      slug: true,
      coverUrl: true,
      excerpt: true,
      category: true,
      publishedAt: true,
    },
  });

  const fallbackCover = '/images/default-cover.jpg';

  const items: ArticleItem[] = posts.map((p) => ({
    href: `/${locale}/category/${p.category}/${p.slug}`,
    hat: humanize(p.category),
    title: p.title,
    cover: p.coverUrl || fallbackCover,
    timestamp: p.publishedAt
      ? new Date(p.publishedAt).toLocaleString(locale === 'fi' ? 'fi-FI' : 'en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '',
    section: humanize(p.category),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-1 text-2xl font-semibold">
          {t('category')}: {humanize(slug)}
        </h1>
        <p className="text-gray-600">
          {t('currentLocale')}: <strong>{locale.toUpperCase()}</strong>
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700">
          {t('noPostsInCategory')}
        </div>
      ) : (
        <section className="space-y-2">
          {items.map((it, i) => (
            <ArticleCard key={i} item={it} priority={i === 0} />
          ))}
        </section>
      )}
    </div>
  );
}