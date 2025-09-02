// app/api/ops/keepalive/route.ts
// ============================================================================
// Upstash Redis Keep-Alive (anti inatividade) — nível PhD
// ----------------------------------------------------------------------------
// O que faz:
// - Mantém atividade no Redis (set/incr/ttl) para evitar inatividade em free tiers.
// - Usa UPSTASH_REDIS_REST_* quando disponíveis; senão, cai para o wrapper do projeto.
// - Idempotente e seguro; pronto para ser acionado via cron (vercel.json).
//
// Como usar:
// - GET /api/ops/keepalive -> { ok, mode, touched, count, ttl }
//
// Em produção (Vercel):
// - vercel.json agenda a chamada 2x por dia (UTC).
// ============================================================================

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { redis as projectRedis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function hasUpstashRestEnv(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
}

export async function GET() {
  try {
    const keyTs = 'keepalive:ts';
    const keyCount = 'keepalive:count';
    const ttlSeconds = 60 * 60 * 24 * 7; // 7 dias

    let mode: 'upstash-rest' | 'wrapper' = 'upstash-rest';
    const touched = Date.now();
    let count: number | null = null;
    let ttl: number | null = null;

    if (hasUpstashRestEnv()) {
      // Caminho oficial Upstash (REST)
      const r = Redis.fromEnv();

      await r.set(keyTs, touched, { ex: ttlSeconds }); // grava ts com TTL
      count = await r.incr(keyCount);                  // incrementa contador

      // Ajusta TTL do contador se ainda não tiver
      const ttlCount = await r.ttl(keyCount);
      if (ttlCount < 0) {
        await r.expire(keyCount, ttlSeconds);
      }
      ttl = await r.ttl(keyTs);
    } else {
      // Fallback: wrapper do projeto (usa REDIS_URL/TOKEN ou STUB)
      mode = 'wrapper';
      await projectRedis.set(keyTs, String(touched), { ex: ttlSeconds }).catch(() => null);
      const got = await projectRedis.get(keyCount).catch(() => null);
      const prev = typeof got === 'string' ? parseInt(got || '0', 10) : (typeof got === 'number' ? got : 0);
      count = (prev || 0) + 1;
      await projectRedis.set(keyCount, String(count), { ex: ttlSeconds }).catch(() => null);
      ttl = null; // wrapper pode ser stub; TTL não é garantido
    }

    return NextResponse.json({
      ok: true,
      mode,
      touched,
      count,
      ttl,
      info: 'Keep-alive executado. Agende via vercel.json (crons) para evitar inatividade.',
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || String(e),
        hint: 'Verifique UPSTASH_REDIS_REST_URL/TOKEN ou REDIS_URL/TOKEN no ambiente.',
      },
      { status: 500 }
    );
  }
}