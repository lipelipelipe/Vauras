// app/sitemap-index.xml/route.ts
// ============================================================================
// Sitemap Index — inclui Web Stories (global) e por idioma (fi/en) — nível PhD
// ----------------------------------------------------------------------------
// - Mantém: pages, pages-fi/en, categories, posts-index e news.
// - Adiciona:
//   • /sitemaps/webstories.xml (stories globais)
//   • /sitemaps/webstories/fi.xml  (stories FI)
//   • /sitemaps/webstories/en.xml  (stories EN)
// - lastmod real para cada item, com base nos registros mais recentes.
// - Base URL dinâmica: env (NEXT_PUBLIC_SITE_URL|NEXTAUTH_URL) > headers.
// - Cache amigável (SWR).
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function trimTrailingSlash(u: string) {
  return String(u || '').replace(/\/+$/, '');
}
function getBaseUrl(req: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  if (envUrl) {
    try { return trimTrailingSlash(new URL(envUrl).origin); } catch {}
  }
  const fHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const fProto = req.headers.get('x-forwarded-proto') || (fHost.includes('localhost') ? 'http' : 'https');
  return `${fProto}://${fHost}`.replace(/\/+$/, '');
}
async function getMaxDate(fn: () => Promise<any>, pick: (x: any) => Date | string | null | undefined) {
  try {
    const x = await fn();
    if (!x) return null;
    const v = pick(x);
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(+d) ? null : d;
  } catch { return null; }
}
function iso(d?: Date | null) { return (d ? d : new Date()).toISOString(); }

export async function GET(req: Request) {
  const base = getBaseUrl(req);

  try {
    const [
      lastPagesFi,
      lastPagesEn,
      lastCategories,
      lastPostsFi,
      lastPostsEn,
      lastStoriesAll, // últimos stories (qualquer idioma)
      lastStoriesFi,  // stories fi
      lastStoriesEn,  // stories en
    ] = await Promise.all([
      getMaxDate(
        () => prisma.page.findFirst({
          where: { locale: 'fi', status: 'published' },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }),
        (x) => x.updatedAt
      ),
      getMaxDate(
        () => prisma.page.findFirst({
          where: { locale: 'en', status: 'published' },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }),
        (x) => x.updatedAt
      ),
      getMaxDate(
        () => prisma.category.findFirst({
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }),
        (x) => x.updatedAt
      ),
      getMaxDate(
        () => prisma.post.findFirst({
          where: { locale: 'fi', status: 'published' },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }),
        (x) => x.updatedAt
      ),
      getMaxDate(
        () => prisma.post.findFirst({
          where: { locale: 'en', status: 'published' },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }),
        (x) => x.updatedAt
      ),
      getMaxDate(
        () => prisma.post.findFirst({
          where: { status: 'published', isWebStory: true } as any,
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }),
        (x) => x.updatedAt
      ),
      getMaxDate(
        () => prisma.post.findFirst({
          where: { locale: 'fi', status: 'published', isWebStory: true } as any,
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }),
        (x) => x.updatedAt
      ),
      getMaxDate(
        () => prisma.post.findFirst({
          where: { locale: 'en', status: 'published', isWebStory: true } as any,
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }),
        (x) => x.updatedAt
      ),
    ]);

    const candidates = [lastPagesFi, lastPagesEn, lastCategories, lastPostsFi, lastPostsEn, lastStoriesAll]
      .filter(Boolean) as Date[];
    const lastAll = candidates.length ? new Date(Math.max(...candidates.map((d) => +d))) : new Date();

    const nowIso = new Date().toISOString();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Raízes por idioma -->
  <sitemap><loc>${base}/sitemaps/pages.xml</loc><lastmod>${iso(lastAll)}</lastmod></sitemap>
  <sitemap><loc>${base}/sitemaps/pages-fi.xml</loc><lastmod>${iso(lastPagesFi)}</lastmod></sitemap>
  <sitemap><loc>${base}/sitemaps/pages-en.xml</loc><lastmod>${iso(lastPagesEn)}</lastmod></sitemap>

  <!-- Categorias -->
  <sitemap><loc>${base}/sitemaps/categories.xml</loc><lastmod>${iso(lastCategories)}</lastmod></sitemap>

  <!-- Índice de posts por mês -->
  <sitemap><loc>${base}/sitemaps/posts-index.xml</loc><lastmod>${iso(lastAll)}</lastmod></sitemap>

  <!-- Google News por idioma -->
  <sitemap><loc>${base}/sitemaps/news-fi.xml</loc><lastmod>${nowIso}</lastmod></sitemap>
  <sitemap><loc>${base}/sitemaps/news-en.xml</loc><lastmod>${nowIso}</lastmod></sitemap>

  <!-- Web Stories (AMP) -->
  <sitemap><loc>${base}/sitemaps/webstories.xml</loc><lastmod>${iso(lastStoriesAll)}</lastmod></sitemap>
  <sitemap><loc>${base}/sitemaps/webstories/fi.xml</loc><lastmod>${iso(lastStoriesFi)}</lastmod></sitemap>
  <sitemap><loc>${base}/sitemaps/webstories/en.xml</loc><lastmod>${iso(lastStoriesEn)}</lastmod></sitemap>
</sitemapindex>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch {
    const now = new Date().toISOString();
    const safe = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${base}/sitemaps/pages.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>${base}/sitemaps/posts-index.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>${base}/sitemaps/news-fi.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>${base}/sitemaps/news-en.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>${base}/sitemaps/webstories.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>${base}/sitemaps/webstories/fi.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>${base}/sitemaps/webstories/en.xml</loc><lastmod>${now}</lastmod></sitemap>
</sitemapindex>`;
    return new NextResponse(safe, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=300',
      },
    });
  }
}