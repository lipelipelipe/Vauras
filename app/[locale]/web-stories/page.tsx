// app/[locale]/web-stories/page.tsx
// ============================================================================
// Web Stories — i18n nos textos visíveis (sem PT-BR em produção)
// ----------------------------------------------------------------------------
// - Usa 'currentLocale' do namespace 'common'.
// - Mensagem quando vazio: reutiliza 'noPostsInCategory' (você pode criar
//   uma chave específica como 'noStories' nos JSONs se quiser customizar).
// - Links de cada card apontam para /{locale}/story/{slug}.
// - Mantém ArticleCard com fallback local já tratado no <Image>.
// ============================================================================

import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import ArticleCard, { type ArticleItem } from '@/components/ArticleCard';
import { getSiteSettings } from '@/lib/settings';
import { detectBaseUrl } from '@/lib/seo/site';
import { getMessages } from '@/lib/i18n';

type Params = { locale: string };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = params;

  const settings = await getSiteSettings();
  const baseUrl = detectBaseUrl(settings?.siteUrl || null);
  const urlAbs = `${baseUrl}/${locale}/web-stories`;
  const title = 'Web Stories • Uutiset';

  return {
    title,
    alternates: { canonical: urlAbs },
    openGraph: {
      title,
      type: 'website',
      url: urlAbs,
      siteName: 'Uutiset',
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function WebStoriesIndex({ params }: { params: Params }) {
  const { locale } = params;

  // i18n
  const messages = await getMessages(locale as any, ['common']);
  const t = (k: string) => messages.common?.[k] ?? k;

  const posts = await prisma.post.findMany({
    where: {
      locale,
      status: 'published',
      isWebStory: true,
    } as any,
    orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    take: 60,
    select: {
      id: true,
      title: true,
      slug: true,
      coverUrl: true,
      publishedAt: true,
      category: true,
    },
  });

  const fallbackCover = '/images/default-cover.jpg';

  const items: ArticleItem[] = posts.map((p) => ({
    href: `/${locale}/story/${p.slug}`,
    hat: 'Web Story',
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
    section: 'Web Stories',
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-1 text-2xl font-semibold">Web Stories</h1>
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
            <ArticleCard key={i} item={it} />
          ))}
        </section>
      )}
    </div>
  );
}