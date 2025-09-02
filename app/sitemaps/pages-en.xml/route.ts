// app/sitemaps/pages-en.xml/route.ts
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
    const pages = await prisma.page.findMany({
      where: { locale: 'en', status: 'published' },
      orderBy: [{ updatedAt: 'desc' }],
      take: 50000,
      select: { path: true, updatedAt: true },
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const p of pages) {
      const loc = `${base}/en/${p.path}`;
      xml += `  <url>\n    <loc>${esc(loc)}</loc>\n    <lastmod>${p.updatedAt.toISOString()}</lastmod>\n  </url>\n`;
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