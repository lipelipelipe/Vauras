// app/sitemaps/pages.xml/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  if (envUrl) { try { return new URL(envUrl).origin.replace(/\/+$/, ''); } catch {} }
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`.replace(/\/+$/, '');
}

export async function GET(req: Request) {
  const base = getBaseUrl(req);
  const now = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/fi</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>${base}/en</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
  </url>
</urlset>`;
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}