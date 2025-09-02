// app/[locale]/category/[slug]/[postSlug]/page.tsx
// ============================================================================
// Página de Artigo Individual — SEO “nota 10”, otimizada com next/image
// ----------------------------------------------------------------------------
// - JSON-LD rico: Person como author quando authorName existir;
//   keywords por tags; imagens (cover + markdown).
// - Aplica ALT padrão global às imagens do corpo (imageAltOverride).
// - robots dinâmico (index/follow) a partir de flags no Post.
// - COMENTÁRIOS: integra <Comments postId={...} locale={...}/> no final do artigo.
// ============================================================================

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import SidebarTrending, { TrendingItem } from '@/components/SidebarTrending';
import ArticleBody from '@/components/ArticleBody';
import ShareBar from '@/components/ShareBar';
import { getMessages, resolveLocale } from '@/lib/i18n';
import { getSiteSettings } from '@/lib/settings';
import { detectBaseUrl, pickByLocale } from '@/lib/seo/site';
import PostTracker from '@/components/PostTracker';
import Comments from '@/components/Comments';

export const revalidate = 60;

type PageProps = {
  params: {
    locale: 'fi' | 'en';
    slug: string;     // categoria
    postSlug: string; // slug do post
  };
};

function humanize(slug: string) {
  if (!slug) return '';
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}
// Extrai URLs de imagens do markdown ou HTML
export function extractMdImages(md?: string | null): string[] {
  if (!md) return [];

  const urls: string[] = [];

  // 1️⃣ Markdown padrão ![alt](URL "opcional")
const mdRx = /!\[.*?\]\((.*?)\s*(?:"[^"]*")?\)/g;
let match: RegExpExecArray | null;
while ((match = mdRx.exec(md))) {
  const url = (match[1] || '').trim();
  if (url) urls.push(url);
}

// 2️⃣ HTML <img src="URL" ...>
const htmlRx = /<img[^>]+src=["']([^"']+)["']/g;
while ((match = htmlRx.exec(md))) {
  const url = (match[1] || '').trim();
  if (url) urls.push(url);
}

  // Remove duplicados
  return Array.from(new Set(urls));
}


// ===================== SEO Metadata =====================
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug: categorySlug, postSlug } = params;

  const post = await prisma.post.findFirst({
    where: { locale, slug: postSlug, category: categorySlug, status: 'published' },
    select: {
      title: true,
      excerpt: true,
      coverUrl: true,
      seoTitle: true,
      seoDescription: true,
      canonicalUrl: true,
      groupId: true,
      category: true,
      slug: true,
      publishedAt: true,
      updatedAt: true,
      tags: true,
      // ADIÇÃO: flags para robots
      indexable: true,
      follow: true,
    },
  });
  if (!post) return {};

  const settings = await getSiteSettings();
  const siteName = pickByLocale(settings?.siteName as any, locale) || 'Uutiset';
  const baseUrl = detectBaseUrl(settings?.siteUrl || null);
  const title = (post.seoTitle || post.title).trim();
  const description = (post.seoDescription || post.excerpt || '').trim();
  const imageUrl = post.coverUrl || undefined;
  const urlAbs = `${baseUrl}/${locale}/category/${post.category}/${post.slug}`;

  const languages: Record<string, string> = { [locale]: urlAbs };
  const otherLocale = locale === 'fi' ? 'en' : 'fi';
  if (post.groupId) {
    const sibling = await prisma.post.findFirst({
      where: { groupId: post.groupId, locale: otherLocale, status: 'published' },
      select: { slug: true, category: true },
    });
    if (sibling) {
      languages[otherLocale] = `${baseUrl}/${otherLocale}/category/${sibling.category}/${sibling.slug}`;
    }
  }

  return {
    title: `${title} • ${siteName}`,
    description,
    alternates: {
      canonical: post.canonicalUrl || urlAbs,
      languages,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: urlAbs,
      images: imageUrl ? [{ url: imageUrl }] : [],
      siteName,
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      modifiedTime: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
      locale: locale === 'fi' ? 'fi_FI' : 'en_US',
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      site: (settings?.twitterHandle || undefined) as any,
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
    // ADIÇÃO: robots dinâmico conforme flags do post
    robots: {
      index: !!post.indexable,
      follow: !!post.follow,
    },
  };
}

// ============================ Página ============================
export default async function PostPage({ params }: PageProps) {
  const locale = resolveLocale(params.locale);
  const { slug: categorySlug, postSlug } = params;

  const messages = await getMessages(locale, ['post', 'common']);
  const t = (k: string) => messages.post?.[k] ?? messages.common?.[k] ?? k;

  const post = await prisma.post.findFirst({
    where: {
      locale,
      slug: postSlug,
      category: categorySlug,
      status: 'published',
    },
    select: {
      id: true,
      title: true,
      slug: true,
      coverUrl: true,
      excerpt: true,
      content: true,
      category: true,
      publishedAt: true,
      updatedAt: true,
      seoDescription: true,
      tags: true,
      // Novos
      authorName: true,
      imageAlt: true,
    },
  });
  if (!post) notFound();
  const postId = post.id;

  // Settings
  const settings = await getSiteSettings();
  const baseUrl = detectBaseUrl(settings?.siteUrl || null);
  const brandName = pickByLocale(settings?.siteName as any, locale) || 'Uutiset';
  const articleUrl = `${baseUrl}/${locale}/category/${post.category}/${post.slug}`;
  const logoUrl = (settings?.logoUrl || `${baseUrl}/logo-112x112.png`).trim();

  // JSON-LD NewsArticle (author preferencialmente Person se authorName existir)
  const envDefaultAuthor = (process.env.NEXT_PUBLIC_DEFAULT_AUTHOR || '').trim();
  const authorBlock =
    (post.authorName && post.authorName.trim().length)
      ? [{ '@type': 'Person', name: post.authorName.trim() }]
      : (envDefaultAuthor
          ? [{ '@type': 'Person', name: envDefaultAuthor }]
          : [{ '@type': 'Organization', name: brandName, url: baseUrl }]
        );

  // Imagens: cover + imagens do markdown
  const imageCandidates = new Set<string>();
  if (post.coverUrl) imageCandidates.add(post.coverUrl);
  for (const u of extractMdImages(post.content)) imageCandidates.add(u);
  const imagesArray = Array.from(imageCandidates);

  const newsLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    headline: post.title,
    image: imagesArray.length ? imagesArray : undefined,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date().toISOString(),
    dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : new Date().toISOString(),
    inLanguage: locale === 'fi' ? 'fi-FI' : 'en-US',
    articleSection: categorySlug,
    description: (post.seoDescription || post.excerpt || '').trim(),
    author: authorBlock,
    publisher: {
      '@type': 'Organization',
      name: brandName,
      logo: { '@type': 'ImageObject', url: logoUrl, width: 112, height: 112 },
    },
  };
  if (Array.isArray(post.tags) && post.tags.length) {
    newsLd.keywords = post.tags.join(', ');
  }

  // Trending (exclui o atual)
  const trendingPosts = await prisma.post.findMany({
    where: { locale, status: 'published', NOT: { id: post.id } },
    orderBy: { publishedAt: 'desc' },
    take: 5,
    select: { title: true, slug: true, category: true, coverUrl: true },
  });
  const trendingItems: TrendingItem[] = trendingPosts.map((p) => ({
    title: p.title,
    href: `/${locale}/category/${p.category}/${p.slug}`,
    image: p.coverUrl || '/images/default-cover.jpg',
    kicker: humanize(p.category),
  }));

  return (
    <article className="mx-auto max-w-screen-md px-4">
      {/* Tracking */}
      <PostTracker postId={postId} locale={locale} category={categorySlug} />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsLd) }}
      />

      {/* Header */}
      <header className="my-6">
        <Link
          href={`/${locale}/category/${post.category}`}
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          {humanize(post.category)}
        </Link>

        <h1 className="mt-2 text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          {post.title}
        </h1>

        {post.excerpt ? (
          <p className="mt-3 text-lg text-gray-600">{post.excerpt}</p>
        ) : null}

        <div className="mt-4 text-sm text-gray-500">
          <span>
            {messages.common?.publishedOn}{' '}
            {post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : '—'}
          </span>
          <span className="mx-2">·</span>
          <span>
            {messages.common?.updatedOn}{' '}
            {new Date(post.updatedAt).toLocaleDateString(locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </header>

      {/* Share */}
      <ShareBar />

      {/* Capa */}
      {post.coverUrl ? (
        <div className="relative my-6 overflow-hidden rounded-2xl shadow-sm">
          <div className="relative aspect-video">
            <Image
              src={post.coverUrl}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover"
              priority
            />
          </div>
        </div>
      ) : null}

      {/* Corpo (ALT padrão aplicado) */}
      <ArticleBody
        content={post.content || ''}
        articleTitle={post.title}
        imageAltOverride={(post.imageAlt || '').trim() || undefined}
      />

      {/* Comentários */}
      <section id="comments" className="mt-10">
        <Comments postId={postId} locale={locale} />
      </section>

      {/* CTA: voltar à categoria */}
      <div className="my-8 flex justify-center">
        <Link
          href={`/${locale}/category/${post.category}`}
          className="rounded-full bg-blue-50 px-5 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
        >
          {messages.post?.seeAllPosts}
        </Link>
      </div>

      {/* Mais para ler */}
      {trendingItems.length > 0 ? (
        <section className="my-10">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">{messages.post?.moreToRead}</h2>
          <SidebarTrending items={trendingItems} sticky={false} />
        </section>
      ) : null}
    </article>
  );
}