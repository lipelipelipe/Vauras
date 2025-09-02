// app/api/admin/webstories/route.ts
// ============================================================================
// Admin API • Web Stories — Listagem
// ----------------------------------------------------------------------------
// GET /api/admin/webstories?locale=fi|en&page=1&perPage=20&q=...&status=...&onlyStories=0|1
// - Requer admin (NextAuth).
// - Retorna posts do locale com flags de Web Story.
// - hasStory = storyContent não vazio.
// ============================================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toInt(s: string | null, def: number, min: number, max: number) {
  const n = parseInt(String(s || ''), 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const locale = (searchParams.get('locale') || 'fi').toLowerCase();
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'all';
    const onlyStories = ['1', 'true', 'yes'].includes((searchParams.get('onlyStories') || '').toLowerCase());

    const page = toInt(searchParams.get('page'), 1, 1, 10_000);
    const perPage = toInt(searchParams.get('perPage'), 20, 1, 100);
    const skip = (page - 1) * perPage;

    const where: any = { locale };
    if (q.trim()) where.title = { contains: q.trim(), mode: 'insensitive' as const };
    if (status !== 'all' && ['draft', 'published', 'scheduled'].includes(status)) {
      where.status = status;
    }
    if (onlyStories) where.isWebStory = true;

    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take: perPage,
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          status: true,
          updatedAt: true,
          coverUrl: true,
          isWebStory: true,
          storyContent: true,
        },
      }),
      prisma.post.count({ where }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      category: r.category,
      status: r.status as 'draft' | 'published' | 'scheduled',
      updatedAt: r.updatedAt.toISOString(),
      coverUrl: r.coverUrl || null,
      isWebStory: !!r.isWebStory,
      hasStory: !!(r.storyContent && String(r.storyContent).trim().length > 0),
    }));

    return NextResponse.json({ ok: true, page, perPage, total, items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}