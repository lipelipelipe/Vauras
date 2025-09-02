// app/sitemaps/categories.xml/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  if (envUrl) { try { return new URL(envUrl).origin.replace(/\/+$/, ''); } catch {} }
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`.replace(/\/+$/, '');
}
function esc(s: string) { return String(s||'').replace(/[&<>"']/g, c => c==='&'?'&amp;':c==='<'?'&lt;':c==='>'?'&gt;':c==='"'?'&quot;':'&apos;'); }

export async function GET(req: Request) {
  const base = getBaseUrl(req);
  try {
    const cats = await prisma.category.findMany({
      orderBy: [{ locale: 'asc' }, { order: 'asc' }],
      select: { locale: true, slug: true, updatedAt: true },
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const c of cats) {
      const loc = `${base}/${c.locale}/category/${c.slug}`;
      xml += `  <url>\n    <loc>${esc(loc)}</loc>\n    <lastmod>${c.updatedAt.toISOString()}</lastmod>\n  </url>\n`;
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
    return new NextResponse(safe, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  }
}