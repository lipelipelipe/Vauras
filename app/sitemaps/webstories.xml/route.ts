// app/sitemaps/webstories.xml/route.ts
// ============================================================================
// Sitemap de Web Stories (AMP) — nível PhD
// ----------------------------------------------------------------------------
// Lista /{locale}/story/{slug} para stories publicados, incluindo:
// - <lastmod> via updatedAt
// - <image:image> com a capa (coverUrl), se houver
// - alternates (xhtml:link hreflang) quando existir tradução no outro locale
//
// Cache amigável em produção (SWR).
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBaseUrl(req: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  if (envUrl) {
    try { return new URL(envUrl).origin.replace(/\/+$/, ''); } catch {}
  }
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`.replace(/\/+$/, '');
}
function esc(s: string) {
  return String(s || '').replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;' :
    c === '>' ? '&gt;' :
    c === '"' ? '&quot;' :
    '&apos;'
  );
}

export async function GET(req: Request) {
  const base = getBaseUrl(req);

  try {
    // Stories publicados
    const rows = await prisma.post.findMany({
      where: { status: 'published', isWebStory: true } as any,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        groupId: true,
        locale: true,
        slug: true,
        coverUrl: true,
        updatedAt: true,
      },
      take: 50000,
    });

    if (!rows || rows.length === 0) {
      const empty = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
></urlset>`;
      return new NextResponse(empty, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=300',
        },
      });
    }

    // Alternates por groupId (traduções publicadas)
    const groupIds = Array.from(new Set(rows.map((r) => r.groupId).filter(Boolean))) as string[];
    const siblings = groupIds.length
      ? await prisma.post.findMany({
          where: { groupId: { in: groupIds }, status: 'published', isWebStory: true } as any,
          select: { groupId: true, locale: true, slug: true },
        })
      : [];

    const map: Record<string, { fi?: string; en?: string }> = {};
    for (const s of siblings) {
      if (!s.groupId) continue;
      const m = (map[s.groupId] ||= {});
      if (s.locale === 'fi') m.fi = s.slug;
      else if (s.locale === 'en') m.en = s.slug;
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>\n`;

    for (const r of rows) {
      const loc = `${base}/${r.locale}/story/${r.slug}`;
      const lastmod = r.updatedAt.toISOString();

      // alternates
      let xhtml = '';
      if (r.groupId && map[r.groupId]) {
        const fiSlug = map[r.groupId].fi;
        const enSlug = map[r.groupId].en;
        if (r.locale === 'fi' && enSlug) {
          const hrefEn = `${base}/en/story/${enSlug}`;
          xhtml += `    <xhtml:link rel="alternate" hreflang="en" href="${esc(hrefEn)}" />\n`;
          xhtml += `    <xhtml:link rel="alternate" hreflang="fi" href="${esc(loc)}" />\n`;
        } else if (r.locale === 'en' && fiSlug) {
          const hrefFi = `${base}/fi/story/${fiSlug}`;
          xhtml += `    <xhtml:link rel="alternate" hreflang="fi" href="${esc(hrefFi)}" />\n`;
          xhtml += `    <xhtml:link rel="alternate" hreflang="en" href="${esc(loc)}" />\n`;
        }
      }

      const imageBlock = r.coverUrl
        ? `    <image:image>\n      <image:loc>${esc(r.coverUrl)}</image:loc>\n    </image:image>\n`
        : '';

      xml += `  <url>
    <loc>${esc(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
${xhtml}${imageBlock}  </url>\n`;
    }

    xml += `</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch {
    const safe = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
    return new NextResponse(safe, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
}