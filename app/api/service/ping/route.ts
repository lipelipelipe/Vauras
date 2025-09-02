// app/api/service/ping/route.ts
import { NextResponse } from 'next/server';
import { LOCALES, DEFAULT_LOCALE } from '@/config/locales';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isService(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  const expected = process.env.SERVICE_TOKEN || process.env.NEXTJS_SERVICE_TOKEN || '';
  return !!token && !!expected && token === expected;
}

function getBaseUrl(req: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  if (envUrl) {
    try {
      const u = new URL(envUrl);
      return u.origin.replace(/\/+$/, '');
    } catch {}
  }
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`.replace(/\/+$/, '');
}

export async function GET(req: Request) {
  try {
    if (!isService(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = Date.now();
    const baseUrl = getBaseUrl(req);

    return new NextResponse(
      JSON.stringify({
        ok: true,
        ts: now,
        baseUrl,
        locales: { supported: LOCALES, default: DEFAULT_LOCALE },
        endpoints: [
          { method: 'GET', path: '/api/service/ping' },
          { method: 'GET', path: '/api/service/settings' },
          { method: 'GET', path: '/api/service/posts' },
          { method: 'POST', path: '/api/service/posts' },
          { method: 'GET', path: '/api/service/posts/:id' },
          { method: 'PUT', path: '/api/service/webstories/:id' },
        ],
        auth: { required: true },
        cache: 'no-store',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}