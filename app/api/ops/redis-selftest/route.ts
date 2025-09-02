// app/api/ops/redis-selftest/route.ts
// ============================================================================
// Auto-teste do cliente Redis do projeto (src/lib/redis)
// ----------------------------------------------------------------------------
// - GET /api/ops/redis-selftest
// - Se estiver com stub (sem credenciais/sem rede), retorna mode=stub.
// - Se estiver conectado de verdade, grava/lê uma chave (mode=real).
// ============================================================================

import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const key = 'ops:selftest';
    const payload = { ts: Date.now(), rnd: Math.random().toString(36).slice(2) };

    // grava (TTL 60s)
    await redis.set(key, JSON.stringify(payload), { ex: 60 }).catch(() => null);
    const raw = await redis.get(key).catch(() => null);

    let mode: 'real' | 'stub' = 'stub';
    let parsed: any = null;

    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      parsed = raw;
    }

    if (parsed && parsed.ts === payload.ts) {
      mode = 'real';
    }

    return NextResponse.json({
      ok: true,
      mode,
      set: payload,
      get: parsed ?? null,
      envDetected: {
        REDIS_URL: !!process.env.REDIS_URL,
        REDIS_TOKEN: !!process.env.REDIS_TOKEN,
        UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        KV_REST_API_URL: !!process.env.KV_REST_API_URL,
        KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
      },
      note:
        mode === 'stub'
          ? 'O wrapper está em modo STUB (sem Redis real). Preencha as envs e reinicie.'
          : 'Conectado ao Redis real com sucesso.',
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}