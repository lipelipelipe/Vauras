// app/api/admin/posts/min/route.ts
// ============================================================================
// Admin • Posts (lista mínima para selects) — nível PhD
// ----------------------------------------------------------------------------
// GET /api/admin/posts/min?locale=fi|en|all&status=published|draft|scheduled|all&q=...&limit=2000
// - Retorna lista enxuta para popular selects/autocomplete no Admin.
// - Campos: id, title, slug, category, locale, status, publishedAt.
// - Protegido: admin.
// - Limite padrão: 2000 (parametrizável).
// ============================================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LOCALES } from '@/config/locales';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normLocale(l?: string | null): 'fi' | 'en' | 'all' {
  const x = String(l || '').toLowerCase();
  if ((LOCALES as unknown as string[]).includes(x)) return x as 'fi' | 'en';
  return 'all';
}

function normStatus(s?: string | null): 'draft' | 'published' | 'scheduled' | 'all' {
  const x = String(s || '').toLowerCase();
  if (x === 'draft' || x === 'published' || x === 'scheduled') return x;
  return 'all';
}

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    if ((session as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const loc = normLocale(searchParams.get('locale'));
    const st = normStatus(searchParams.get('status'));
    const q = String(searchParams.get('q') || '').trim();
    const limit = clamp(parseInt(searchParams.get('limit') || '2000', 10) || 2000, 1, 10000);

    const where: any = {};
    if (loc !== 'all') where.locale = loc;
    if (st !== 'all') where.status = st;
    if (q) where.title = { contains: q, mode: 'insensitive' as const };

    const rows = await prisma.post.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        locale: true,
        status: true,
        publishedAt: true,
      },
    });

    const items = rows.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      category: p.category,
      locale: p.locale,
      status: p.status,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    }));

    return NextResponse.json({ ok: true, items, total: items.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}