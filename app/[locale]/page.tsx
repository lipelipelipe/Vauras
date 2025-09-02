// app/[locale]/page.tsx
// ============================================================================
// Home — ajustes de CLS e estabilidade de layout (match de placeholders)
// ----------------------------------------------------------------------------
// - Fallbacks dos imports dinâmicos agora respeitam as alturas reais dos widgets:
//   • HelsinkiBoard: 320px (minHeightPx=320)
//   • WeatherWidget: 240px (já estava)
//   • WebStories: 380px (minHeightPx=380)
// - Adiciona contain-intrinsic-size/content-visibility nos placeholders para
//   evitar variação e reduzir CLS.
// ============================================================================

import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import HighlightsMosaicCarousel, { type HighlightItem } from '@/components/HighlightsMosaicCarousel';
import SidebarTrending, { type TrendingItem } from '@/components/SidebarTrending';
import ArticleCard, { type ArticleItem } from '@/components/ArticleCard';
import { prisma } from '@/lib/prisma';
import { getMessages, resolveLocale } from '@/lib/i18n';
import { getSiteSettings } from '@/lib/settings';
import { DEFAULT_LOCALE } from '@/config/locales';
import { buildOrganizationLD, buildWebSiteLD } from '@/lib/seo/structuredData';
import { detectBaseUrl, pickByLocale } from '@/lib/seo/site';
import { getTrendingPosts } from '@/lib/trending';
import type { ApiResp as WeatherResp } from '@/components/WeatherWidget';

// Lazy (abaixo da dobra) — placeholders com altura igual aos widgets
const HelsinkiBoard = dynamic(() => import('@/components/HelsinkiBoard'), {
  ssr: false,
  loading: () => (
    <div
      className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm"
      style={{
        height: 320,
        contentVisibility: 'auto' as any,
        containIntrinsicSize: '320px',
      }}
    />
  ),
});
const WeatherWidget = dynamic(() => import('@/components/WeatherWidget'), {
  ssr: false,
  loading: () => (
    <div
      className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm"
      style={{
        height: 240,
        contentVisibility: 'auto' as any,
        containIntrinsicSize: '240px',
      }}
    />
  ),
});
const WebStories = dynamic(() => import('@/components/WebStories'), {
  ssr: false,
  loading: () => (
    <div
      className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm"
      style={{
        height: 380,
        contentVisibility: 'auto' as any,
        containIntrinsicSize: '380px',
      }}
    />
  ),
});

// ISR (revalidate) em vez de force-dynamic — ajuda bfcache e perf geral
export const revalidate = 60;

type PageProps = { params: { locale: string } };

function humanize(slug: string) {
  return (slug || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
function trimSlash(u?: string | null) {
  if (!u) return '';
  return String(u).replace(/\/+$/, '');
}

// ===================== generateMetadata (absoluto) =====================
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const settings = await getSiteSettings();

  const siteName = pickByLocale(settings?.siteName as any, locale) || 'Uutiset';
  const titleTemplate = pickByLocale(settings?.titleTemplate as any, locale) || '%s';
  const description = pickByLocale(settings?.defaultMetaDescription as any, locale) || 'Ajankohtaiset uutiset';
  const imageUrl = (settings?.defaultMetaImage || '').trim() || undefined;
  const twitterHandle = (settings?.twitterHandle || '').trim() || undefined;

  const baseUrl = detectBaseUrl(settings?.siteUrl || null);
  const pathname = `/${locale}`;
  const title = titleTemplate.includes('%s') ? titleTemplate.replace('%s', siteName) : siteName;

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}${pathname}`,
      languages: { fi: `${baseUrl}/fi`, en: `${baseUrl}/en` },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${baseUrl}${pathname}`,
      images: imageUrl ? [{ url: imageUrl }] : [],
      locale: locale === 'fi' ? 'fi_FI' : 'en_US',
      siteName,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      site: twitterHandle || undefined,
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

// ============================ Página (SSR) ==================================
export default async function HomePage({ params }: PageProps) {
  const locale = resolveLocale(params.locale);

  const messages = await getMessages(locale, ['home']);
  const t = (k: string) => messages.home?.[k] ?? k;

  const settings = await getSiteSettings();
  const siteNameObj = (settings?.siteName as any) || {};
  const brandSiteName: string =
    (siteNameObj?.[locale] as string) ||
    (siteNameObj?.[DEFAULT_LOCALE] as string) ||
    'Uutiset';

  const baseUrl = detectBaseUrl(settings?.siteUrl || null);
  const orgLD = buildOrganizationLD({ name: brandSiteName, url: baseUrl, logo: settings?.logoUrl || undefined });
  const webLD = buildWebSiteLD({ name: brandSiteName, url: baseUrl, inLanguage: locale === 'fi' ? 'fi-FI' : 'en-US' });

  const posts = await prisma.post.findMany({
    where: { locale, status: 'published' } as any,
    orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    take: 24,
    select: { id: true, title: true, slug: true, coverUrl: true, excerpt: true, category: true, publishedAt: true },
  });

  const fallbackCover = '/images/default-cover.jpg';

  const top = posts.slice(0, 9);
  const carousel: HighlightItem[] = top.map((p) => ({
    hat: humanize(p.category),
    title: p.title,
    href: `/${locale}/category/${p.category}/${p.slug}`,
    cover: p.coverUrl || fallbackCover,
  }));

  const trendingRaw = await getTrendingPosts(locale, 5).catch(() => []);
  let trending: TrendingItem[] = trendingRaw.map((p) => ({
    title: p.title,
    href: `/${locale}/category/${p.category}/${p.slug}`,
    image: p.coverUrl || fallbackCover,
    kicker: humanize(p.category),
  }));

  if (trending.length === 0) {
    const rightSrc = posts.length > 9 ? posts.slice(9, 13) : posts.slice(0, 4);
    trending = rightSrc.map((p) => ({
      title: p.title, href: `/${locale}/category/${p.category}/${p.slug}`, image: p.coverUrl || fallbackCover, kicker: humanize(p.category),
    }));
  }

  const moreRaw = posts.length > 13 ? posts.slice(13, 16) : posts.slice(4, 7);
  const more: TrendingItem[] = moreRaw.map((p) => ({ title: p.title, href: `/${locale}/category/${p.category}/${p.slug}` }));

  const moreNews: ArticleItem[] = posts.map((p) => ({
    href: `/${locale}/category/${p.category}/${p.slug}`,
    hat: humanize(p.category), title: p.title, cover: p.coverUrl || fallbackCover,
    timestamp: p.publishedAt
      ? new Date(p.publishedAt).toLocaleString(locale === 'fi' ? 'fi-FI' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '',
    section: humanize(p.category),
  }));

  // SSR: clima (seed) — revalidate (bfcache-friendly)
  let weatherInitial: WeatherResp | null = null;
  try {
    const url = `${baseUrl}/api/weather?lat=60.1699&lon=24.9384&locale=${locale}`;
    const res = await fetch(url, {
      next: { revalidate: 600 },
      headers: { 'x-internal': '1' },
    });
    const json = (await res.json()) as WeatherResp;
    if ((res.ok) && (json as any)?.ok) weatherInitial = json;
  } catch { weatherInitial = null; }

  return (
    <div className="space-y-8 md:space-y-12">
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLD) }} />
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(webLD) }} />

      {carousel.length > 0 ? (
        <section>
          <HighlightsMosaicCarousel items={carousel} auto interval={6000} />
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-y-8 lg:grid-cols-3 lg:gap-x-8">
        <div className="lg:col-span-2">
          <div>
            <h2 className="mb-2 border-b-2 border-gray-800 pb-2 text-2xl font-bold">
              {t('moreNews')}
            </h2>
            <div className="space-y-2">
              {moreNews.map((item, i) => (
                <ArticleCard key={i} item={item} priority={i === 0} />
              ))}
              {posts.length === 0 ? (
                <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-600">
                  No posts yet.
                </div>
              ) : null}
            </div>
          </div>

          {/* Pörssi (lazy) — altura estável 320px */}
          <div className="mt-8">
            <HelsinkiBoard
              locale={locale as 'fi' | 'en'}
              refreshSeconds={60}
              count={5}
              minHeightPx={320}
            />
          </div>

          {/* Web Stories (lazy) — altura estável 380px */}
          <div className="mt-8">
            <WebStories
              locale={locale as 'fi' | 'en'}
              limit={12}
              // novo prop de estabilidade
              minHeightPx={380}
            />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <SidebarTrending items={trending} moreItems={more} sticky />
          <WeatherWidget
            locale={locale as 'fi' | 'en'}
            lat={60.1699}
            lon={24.9384}
            city={locale === 'fi' ? 'Helsinki' : 'Helsinki'}
            initial={weatherInitial}
            refreshMinutes={15}
            minHeightPx={240}
          />
        </aside>
      </section>
    </div>
  );
}