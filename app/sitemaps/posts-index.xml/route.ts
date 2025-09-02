// app/sitemaps/posts-index.xml/route.ts
// ============================================================================
// Posts Sitemap Index (particionado por mês) — nível PhD
// ----------------------------------------------------------------------------
// - Detecta todos os meses (YYYY-MM) com posts publicados por idioma (FI/EN).
// - Gera <sitemap> para cada mês: /sitemaps/posts/{locale}/{YYYY-MM}.xml
// - lastmod real por mês; domínio dinâmico; cache amigável; fail-safe.
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
    try {
      const u = new URL(envUrl);
      return trimTrailingSlash(u.origin);
    } catch {}
  }
  const fHost = req.headers.get('x-forwarded-host') || '';
  const fProto = req.headers.get('x-forwarded-proto') || '';
  const rawHost = fHost || (req.headers.get('host') || '');
  const host = rawHost.split(',')[0].trim();
  let proto = fProto.split(',')[0].trim();
  if (!proto) proto = host.includes('localhost') ? 'http' : 'https';
  try {
    const u = new URL(`${proto}://${host}`);
    return trimTrailingSlash(u.origin);
  } catch {
    return 'http://localhost:3000';
  }
}

function iso(d?: Date | null) {
  return (d ? d : new Date()).toISOString();
}

export async function GET(req: Request) {
  const base = getBaseUrl(req);

  try {
    // Efetivo: obtém ano-mês (YYYY-MM), locale e lastmod por mês via SQL (Postgres)
    const rows = await prisma.$queryRaw<
      { ym: string; locale: string; lastmod: Date }[]
    >`
      SELECT
        to_char(date_trunc('month', COALESCE("publishedAt","updatedAt")), 'YYYY-MM') AS "ym",
        "locale",
        MAX("updatedAt") AS "lastmod"
      FROM "Post"
      WHERE "status" = 'published'
      GROUP BY 1, 2
      ORDER BY 1 DESC, 2 ASC;
    `;

    const xmlParts: string[] = [];
    xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
    xmlParts.push('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

    // Para cada (YYYY-MM, locale), gera uma entrada
    for (const r of rows) {
      // Apenas dois idiomas esperados (fi/en), demais são ignorados
      const l = r.locale === 'en' ? 'en' : 'fi';
      const loc = `${base}/sitemaps/posts/${l}/${r.ym}.xml`;
      xmlParts.push(`  <sitemap>`);
      xmlParts.push(`    <loc>${loc}</loc>`);
      xmlParts.push(`    <lastmod>${iso(r.lastmod)}</lastmod>`);
      xmlParts.push(`  </sitemap>`);
    }

    xmlParts.push('</sitemapindex>');
    const xml = xmlParts.join('\n');

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch {
    const now = new Date().toISOString();
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${base}/sitemaps/pages.xml</loc><lastmod>${now}</lastmod></sitemap>
</sitemapindex>`;
    return new NextResponse(fallback, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
}