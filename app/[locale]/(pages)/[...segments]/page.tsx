// app/[locale]/(pages)/[...segments]/page.tsx
// ============================================================================
// Páginas dinâmicas (CMS) — Nível PhD (Versão Definitiva e Completa)
// ----------------------------------------------------------------------------
// - robots dinâmico (index/follow) com base em flags da Page.
// ============================================================================

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ArticleBody from '@/components/ArticleBody';
import { getMessages, resolveLocale } from '@/lib/i18n';
import { getSiteSettings } from '@/lib/settings';
import { DEFAULT_LOCALE } from '@/config/locales';

type PageProps = {
  params: { locale: 'fi' | 'en'; segments: string[] };
};

const RESERVED = new Set(['admin', 'category']);

function normPath(segments?: string[]) {
  const arr = Array.isArray(segments) ? segments : [];
  return arr.join('/').trim().toLowerCase();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = (params.locale || 'fi').toLowerCase() as 'fi' | 'en';
  const path = normPath(params.segments);

  if (!path || RESERVED.has(path.split('/')[0] || '')) return {};

  const page = await prisma.page.findFirst({
    where: { locale, path, status: 'published' },
    select: {
      title: true,
      seoTitle: true,
      seoDescription: true,
      canonicalUrl: true,
      coverUrl: true,
      groupId: true,
      path: true,
      // ADIÇÃO: flags para robots
      indexable: true,
      follow: true,
    },
  });

  if (!page) return {};

  const title = page.seoTitle || page.title;
  const description = page.seoDescription || '';
  const imageUrl = page.coverUrl || undefined;

  const otherLocale = locale === 'fi' ? 'en' : 'fi';
  const languages: Record<string, string> = {
    [locale]: `/${locale}/${page.path}`,
  };
  if (page.groupId) {
    const sibling = await prisma.page.findFirst({
      where: { groupId: page.groupId, locale: otherLocale, status: 'published' },
      select: { path: true },
    });
    if (sibling) {
      languages[otherLocale] = `/${otherLocale}/${sibling.path}`;
    }
  }

  return {
    title: `${title} • Uutiset`,
    description,
    alternates: {
      canonical: page.canonicalUrl || undefined,
      languages,
    },
    openGraph: {
      title,
      description,
      images: imageUrl ? [{ url: imageUrl }] : [],
      type: 'article',
    },
    // ADIÇÃO: robots dinâmico conforme flags da página
    robots: {
      index: !!page.indexable,
      follow: !!page.follow,
    },
  };
}

export default async function CmsPage({ params }: PageProps) {
  const locale = resolveLocale(params.locale);
  const path = normPath(params.segments);

  // 1) Carrega as traduções do namespace 'common'
  const messages = await getMessages(locale, ['common']);
  const t = (k: string) => messages.common?.[k] ?? k;

  // 2) Carrega Settings para obter o siteName dinâmico (brand) no idioma atual
  const settings = await getSiteSettings();
  const siteNameObj = (settings?.siteName as any) || {};
  const brandSiteName: string =
    (siteNameObj?.[locale] as string) ||
    (siteNameObj?.[DEFAULT_LOCALE] as string) ||
    'Uutiset';

  if (!path || RESERVED.has(path.split('/')[0] || '')) {
    notFound();
  }

  const page = await prisma.page.findFirst({
    where: { locale, path, status: 'published' },
  });

  if (!page) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-screen-md px-4">
      <header className="my-6">
        <Link href={`/${locale}`} className="font-semibold text-blue-600 hover:text-blue-700">
          {brandSiteName}
        </Link>
        <h1 className="mt-2 text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          {page.title}
        </h1>
        {page.excerpt ? (
          <p className="mt-3 text-lg text-gray-600">{page.excerpt}</p>
        ) : null}
        <div className="mt-3 text-xs text-gray-500">
          {t('updatedOn')}{' '}
          {new Date(page.updatedAt).toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </header>

      {page.coverUrl ? (
        <div className="relative my-6 overflow-hidden rounded-2xl shadow-sm">
          <div className="aspect-video">
            <img
              src={page.coverUrl}
              alt={page.title}
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
        </div>
      ) : null}

      {/* CORREÇÃO: ArticleBody agora exige articleTitle */}
      <ArticleBody content={page.content || ''} articleTitle={page.title} />

      <div className="my-8 flex justify-center">
        <Link
          href={`/${locale}`}
          className="rounded-full bg-blue-50 px-5 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
        >
          {t('backToHome')}
        </Link>
      </div>
    </article>
  );
}