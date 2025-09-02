// app/api/track/view/route.ts
// ============================================================================
// Pageview Collector — Edge Runtime • Máxima performance
// ----------------------------------------------------------------------------
// - Runtime: edge (latência mínima, sem cold start de Node)
// - Entrada: { postId, locale?, category?, sid? }
// - Enriquecimento: país via headers (x-vercel-ip-country), UV (hash de IP + HLL)
// - Persistência (Upstash Redis via REST): contadores diários, rankings e trending
// - Chaves (UTC):
//   • site:views:{YYYYMMDD}
//   • post:views:{postId}:{YYYYMMDD}
//   • post:views:{postId}                      (total)
//   • posts:views:day:{YYYYMMDD}               (ZSET, member "post:{postId}")
//   • categories:views:day:{locale}:{YYYYMMDD} (ZSET, member "slug")
//   • countries:views:day:{locale}:{YYYYMMDD}  (ZSET, member "CC")
//   • trending:{locale}                        (ZSET, member "post:{postId}")
//   • site:uv:{YYYYMMDD}                       (HLL com hash IP)
//   • post:uv:{postId}:{YYYYMMDD}              (HLL com hash IP)
// - TTL: chaves diárias expiram ~40 dias (janela para 30d/7d/24h).
// - Cache-Control: private, max-age=0, must-revalidate (bfcache-friendly).
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

function countryFromHeaders(req: Request): string {
  const h = (name: string) => req.headers.get(name) || '';
  return (h('x-vercel-ip-country') || h('cf-ipcountry') || 'XX').toUpperCase();
}

function getIP(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '';
}

// Hash FNV-1a 32-bit (rápido, suficiente para anonimizar em HLL)
function hashIp(ip: string): string {
  const salt = (process.env.IP_HASH_SALT || '').trim();
  const s = `${ip}|${salt}`;
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const postId = String(json?.postId || '').trim();
    if (!postId) {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    }

    const locale = normLocale(json?.locale);
    const category = String(json?.category || '').trim(); // slug de categoria (opcional)

    const ctry = countryFromHeaders(req);
    const ip = getIP(req);
    const ipHash = ip ? hashIp(ip) : '';

    // Redis (REST, edge-safe). Se envs ausentes, apenas responde OK (fail-safe).
    let r: ReturnType<typeof Redis.fromEnv> | null = null;
    try {
      r = Redis.fromEnv();
    } catch {
      r = null;
    }

    if (r) {
      const day = dayKey();
      const ttl = 60 * 60 * 24 * 40; // ~40 dias

      // Pipeline reduz round-trips (máximo desempenho)
      const p = (r as any).pipeline();

      // Contadores de views
      p.incr(`site:views:${day}`);
      p.incr(`post:views:${postId}:${day}`);
      p.incr(`post:views:${postId}`); // total

      // Rankings diários (top posts 24h) e por categoria/país
      p.zincrby(`posts:views:day:${day}`, 1, `post:${postId}`);
      if (category) p.zincrby(`categories:views:day:${locale}:${day}`, 1, category);
      p.zincrby(`countries:views:day:${locale}:${day}`, 1, ctry);

      // Trending (tempo real) por locale (TTL 24h)
      p.zincrby(`trending:${locale}`, 1, `post:${postId}`);
      p.expire(`trending:${locale}`, 60 * 60 * 24);

      // UV estimado via HyperLogLog
      if (ipHash) {
        p.pfadd(`site:uv:${day}`, ipHash);
        p.pfadd(`post:uv:${postId}:${day}`, ipHash);
      }

      // TTLs para chaves diárias
      p.expire(`site:views:${day}`, ttl);
      p.expire(`post:views:${postId}:${day}`, ttl);
      p.expire(`posts:views:day:${day}`, ttl);
      if (category) p.expire(`categories:views:day:${locale}:${day}`, ttl);
      p.expire(`countries:views:day:${locale}:${day}`, ttl);
      if (ipHash) {
        p.expire(`site:uv:${day}`, ttl);
        p.expire(`post:uv:${postId}:${day}`, ttl);
      }

      await p.exec().catch(() => null);
    }

    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // Evita 'no-store' para permitir bfcache sem prejudicar privacidade
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}