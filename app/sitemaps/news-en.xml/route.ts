// app/sitemaps/news-en.xml/route.ts
// ============================================================================
// Google News Sitemap (EN) — últimas 48h — nível PhD
// ----------------------------------------------------------------------------
// - Formato compatível com Google News (news:news).
// - Inclui até 100 itens recentes das últimas 48h.
// - Domínio detectado dinamicamente (env ou headers).
// - Cache curto e fail-safe (nunca quebra).
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function baseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  if (envUrl) {
    try {
      return new URL(envUrl).origin.replace(/\/+$/, '');
    } catch {
      // ignora env inválida e tenta headers
    }
  }
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`.replace(/\/+$/, '');
}

function esc(s: string) {
  return String(s || '').replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&apos;'
  );
}

export async function GET(req: Request) {
  const base = baseUrl(req);

  try {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const locale = 'en';

    // Busca as últimas notícias publicadas nas últimas 48h (máx. 100)
    const items = await prisma.post.findMany({
      where: {
        locale,
        status: 'published',
        publishedAt: { gte: since },
      },
      orderBy: [{ publishedAt: 'desc' }],
      take: 100,
      select: {
        title: true,
        slug: true,
        category: true,
        publishedAt: true,
      },
    });

    // Montagem do XML (Google News)
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
>\n`;

    for (const it of items) {
      const loc = `${base}/${locale}/category/${it.category}/${it.slug}`;
      const pubDate = (it.publishedAt || new Date()).toISOString();

      xml += `  <url>
    <loc>${esc(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>Uutiset</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${esc(it.title)}</news:title>
    </news:news>
  </url>\n`;
    }

    xml += `</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        // Cache curto (5 min) + SWR (5 min). Ajuste conforme necessidade.
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=300',
      },
    });
  } catch {
    // Fail-safe: sitemap vazio porém válido
    const safe = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
    return new NextResponse(safe, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
}