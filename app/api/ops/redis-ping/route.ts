// app/api/ops/redis-ping/route.ts
// ============================================================================
// Ping (diagnóstico) do Upstash Redis usando Redis.fromEnv() — oficial
// ----------------------------------------------------------------------------
// Como usar:
// - GET /api/ops/redis-ping
// - Resposta contém ok, valores set/get e se coincidem (same = true).
// - Se falhar, retorna 500 com o erro do SDK Upstash.
// ============================================================================

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const redis = Redis.fromEnv(); // UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN

    const key = 'ops:ping';
    const now = Date.now();

    // grava e lê (TTL 60s)
    await redis.set(key, now, { ex: 60 });
    const got = await redis.get<number>(key);

    return NextResponse.json({
      ok: true,
      env: {
        UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      },
      set: now,
      get: got,
      same: got === now,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || String(e),
        hint:
          'Cheque suas envs: UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN. Em dev, rode "vercel env pull .env".',
      },
      { status: 500 }
    );
  }
}