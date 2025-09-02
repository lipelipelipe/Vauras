// src/lib/trending.ts
// ============================================================================
// Trending (server-only) — baseado no tracking em tempo real
// ----------------------------------------------------------------------------
// - Lê o ZSET trending:{locale} (membros: "post:{id}") do Upstash Redis.
// - Resolve metadados via Prisma e devolve em ordem de score.
// - Fail-safe: se Redis não estiver configurado/sem dados, retorna [].
// - Pensado para SSR (App Router) com TTFB mínimo (1 ida ao Redis + 1 ao DB).
// ============================================================================

import 'server-only';
import { Redis } from '@upstash/redis';
import { prisma } from '@/lib/prisma';
import { LOCALES, DEFAULT_LOCALE } from '@/config/locales';

export type TrendingPost = {
  id: string;
  title: string;
  slug: string;
  category: string;
  coverUrl: string | null;
  score: number;
};

function normalizeLocale(l?: string | null): string {
  const t = String(l || '').toLowerCase();
  return (LOCALES as unknown as string[]).includes(t) ? t : DEFAULT_LOCALE;
}

export async function getTrendingPosts(locale: string, limit = 5): Promise<TrendingPost[]> {
  const l = normalizeLocale(locale);
  let r: ReturnType<typeof Redis.fromEnv> | null = null;
  try {
    r = Redis.fromEnv();
  } catch {
    r = null;
  }
  if (!r || limit <= 0) return [];

  // Lê top-N com score
  const rows = await r
    .zrange<{ member: string; score: number }[]>(
      `trending:${l}`,
      0,
      Math.max(0, limit - 1),
      { rev: true, withScores: true }
    )
    .catch(() => []);

  const ids = (rows || [])
    .map((x) => String(x.member || '').replace(/^post:/, ''))
    .filter(Boolean);

  if (!ids.length) return [];

  const posts = await prisma.post.findMany({
    where: { id: { in: ids }, locale: l, status: 'published' as any },
    select: { id: true, title: true, slug: true, category: true, coverUrl: true },
  });

  const map = new Map(posts.map((p) => [p.id, p]));
  const out: TrendingPost[] = [];

  for (const rw of rows || []) {
    const id = String(rw.member || '').replace(/^post:/, '');
    const p = map.get(id);
    if (!p) continue;
    out.push({
      id,
      title: p.title,
      slug: p.slug,
      category: p.category,
      coverUrl: p.coverUrl || null,
      score: Math.round(Number(rw.score || 0)),
    });
    if (out.length >= limit) break;
  }

  return out;
}