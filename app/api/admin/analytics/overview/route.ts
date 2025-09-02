// app/api/admin/analytics/overview/route.ts
// ============================================================================
// Admin Analytics Overview — KPIs + Série 30d + Top Posts 24h + Categorias 7d
// ----------------------------------------------------------------------------
// - Auth: admin (NextAuth)
// - Redis (Upstash): série diária, rankings (ZSET) e trending
// - Prisma: resolver metadados (título/slug/categoria) e posts publicados
// - Desempenho: pipeline para série 30d; agregação leve em memória
// ============================================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Redis } from '@upstash/redis';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function keyDayUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${dd}`;
}

function lastNDaysKeys(n: number): string[] {
  const out: string[] = [];
  const base = new Date();
  // normaliza para 00:00 UTC
  const todayUTC = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(todayUTC);
    d.setUTCDate(todayUTC.getUTCDate() - i);
    out.push(keyDayUTC(d));
  }
  return out;
}

function toInt(x: any, def = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    if ((session as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const locale = (searchParams.get('locale') || 'fi').toLowerCase();

    let r: ReturnType<typeof Redis.fromEnv> | null = null;
    try { r = Redis.fromEnv(); } catch { r = null; }

    // Série 30 dias (site:views:{YYYYMMDD})
    const days30 = lastNDaysKeys(30);
    let series30d: { day: string; value: number }[] = [];

    if (r) {
      const p = (r as any).pipeline();
      for (const k of days30) p.get(`site:views:${k}`);
      const vals = await p.exec().catch(() => []) as any[];
      series30d = days30.map((day, i) => ({ day, value: toInt(vals?.[i], 0) }));
    } else {
      series30d = days30.map((day) => ({ day, value: 0 }));
    }

    const today = days30[days30.length - 1];

    // KPI: Visitas (24h)
    const visits24h = r ? toInt(await r.get<number>(`site:views:${today}`), 0) : 0;

    // KPI: Crescimento (7d) — compara 7 dias anteriores vs últimos 7
    const days14 = lastNDaysKeys(14);
    let growth7d = 0;
    if (r) {
      const p = (r as any).pipeline();
      for (const d of days14) p.get(`site:views:${d}`);
      const vals = await p.exec().catch(() => []) as any[];
      const prev = vals.slice(0, 7).reduce((acc: number, v: any) => acc + toInt(v, 0), 0);
      const curr = vals.slice(7).reduce((acc: number, v: any) => acc + toInt(v, 0), 0);
      growth7d = prev ? Math.round(((curr - prev) / prev) * 100) : 0;
    }

    // KPI: Posts publicados
    const postsPublished = await prisma.post.count({ where: { status: 'published' } });

    // Top Posts 24h (ZSET posts:views:day:{today})
    let topPosts24h: { id: string; score: number; title: string; slug: string; category: string }[] = [];
    if (r) {
      const rows = await r
        .zrange<{ member: string; score: number }[]>(`posts:views:day:${today}`, 0, 4, { rev: true, withScores: true })
        .catch(() => []);
      const ids = (rows || [])
        .map((x) => String(x.member || '').replace(/^post:/, ''))
        .filter(Boolean);
      if (ids.length) {
        const posts = await prisma.post.findMany({
          where: { id: { in: ids } },
          select: { id: true, title: true, slug: true, category: true },
        });
        const map = new Map(posts.map((p) => [p.id, p]));
        topPosts24h = (rows || [])
          .map((rw) => {
            const id = String(rw.member || '').replace(/^post:/, '');
            const p = map.get(id);
            if (!p) return null;
            return {
              id,
              score: Math.round(Number(rw.score || 0)),
              title: p.title,
              slug: p.slug,
              category: p.category,
            };
          })
          .filter(Boolean) as any[];
      }
    }

    // Em alta agora (trending:{locale})
    let hotNow: { id: string; score: number; title: string }[] = [];
    if (r) {
      const rows = await r
        .zrange<{ member: string; score: number }[]>(`trending:${locale}`, 0, 4, { rev: true, withScores: true })
        .catch(() => []);
      const ids = (rows || [])
        .map((x) => String(x.member || '').replace(/^post:/, ''))
        .filter(Boolean);
      if (ids.length) {
        const posts = await prisma.post.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
        const map = new Map(posts.map((p) => [p.id, p.title]));
        hotNow = (rows || []).map((rw) => {
          const id = String(rw.member || '').replace(/^post:/, '');
          return { id, score: Math.round(Number(rw.score || 0)), title: map.get(id) || id };
        });
      }
    }

    // Categorias mais vistas (7d): soma ZSET categories:views:day:{locale}:{day}
    let topCategories7d: { category: string; views: number }[] = [];
    if (r) {
      const days7 = lastNDaysKeys(7);
      const agg: Record<string, number> = {};
      // Pode ser paralelizado (Promise.all)
      const daily = await Promise.all(
        days7.map((d) =>
          r!.zrange<{ member: string; score: number }[]>(
            `categories:views:day:${locale}:${d}`,
            0,
            -1,
            { withScores: true }
          ).catch(() => [])
        )
      );
      for (const rows of daily) {
        for (const it of rows || []) {
          const cat = String(it.member || '');
          const sc = Number(it.score || 0);
          agg[cat] = (agg[cat] || 0) + sc;
        }
      }
      topCategories7d = Object.entries(agg)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, views]) => ({ category, views }));
    }

    return NextResponse.json({
      ok: true,
      kpis: {
        visits24h,
        postsPublished,
        growth7d,
      },
      series30d,
      hotNow,
      topPosts24h,
      topCategories7d,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}