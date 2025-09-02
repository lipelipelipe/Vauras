// app/api/track/ping/route.ts
// ============================================================================
// Read-Time Collector (ping) — Edge Runtime • Máxima performance
// ----------------------------------------------------------------------------
// - Runtime: edge
// - Entrada: { postId, locale, category, ms } (ms desde o último ping)
// - Acumula tempo de leitura por dia (UTC) para site, post e categoria
// - Clamps e TTLs para segurança e janela de análise
// - Chaves:
//   • site:readms:{YYYYMMDD}
//   • post:readms:{postId}:{YYYYMMDD}
//   • cat:readms:{locale}:{category}:{YYYYMMDD}
// - Cache-Control: private, max-age=0, must-revalidate (bfcache-friendly)
// ============================================================================

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { LOCALES, DEFAULT_LOCALE } from '@/config/locales';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function dayKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function normLocale(l?: string | null): string {
  const t = String(l || '').toLowerCase();
  return (LOCALES as unknown as string[]).includes(t) ? t : DEFAULT_LOCALE;
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const postId = String(json?.postId || '').trim();
    if (!postId) {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    }

    const locale = normLocale(json?.locale);
    const category = String(json?.category || '').trim();

    // Clamp de ms (0 .. 5min por ping)
    const msRaw = Number(json?.ms || 0);
    const ms = Math.max(0, Math.min(5 * 60 * 1000, Math.floor(msRaw)));
    if (!ms) {
      return new NextResponse(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'private, max-age=0, must-revalidate',
        },
      });
    }

    let r: ReturnType<typeof Redis.fromEnv> | null = null;
    try {
      r = Redis.fromEnv();
    } catch {
      r = null;
    }

    if (r) {
      const day = dayKey();
      const ttl = 60 * 60 * 24 * 40;

      const p = (r as any).pipeline();
      p.incrby(`site:readms:${day}`, ms);
      p.incrby(`post:readms:${postId}:${day}`, ms);
      if (category) p.incrby(`cat:readms:${locale}:${category}:${day}`, ms);

      p.expire(`site:readms:${day}`, ttl);
      p.expire(`post:readms:${postId}:${day}`, ttl);
      if (category) p.expire(`cat:readms:${locale}:${category}:${day}`, ttl);

      await p.exec().catch(() => null);
    }

    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}