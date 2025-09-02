// app/api/admin/categories/route.ts
// ============================================================================
// Admin API • Categories (list + merge from Menu) — nível PhD
// ----------------------------------------------------------------------------
// GET /api/admin/categories?locale=fi|en&mergeMenu=1
// - Requer admin (NextAuth).
// - Retorna { ok, items: [{ slug, name, order, source }] }.
// - source: 'db' | 'menu'
// - Ordenação: DB primeiro (order ASC), depois derivados do menu (na ordem do menu).
// ============================================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LOCALES } from '@/config/locales';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normLocale(l?: string | null): 'fi' | 'en' {
  const x = String(l || '').toLowerCase();
  return (LOCALES as unknown as string[]).includes(x) ? (x as 'fi' | 'en') : 'fi';
}
function boolQP(v: string | null | undefined, def = false) {
  if (v == null) return def;
  return ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase());
}

// Extrai slug de categoria de hrefs típicos do menu
function extractCategorySlugFromHref(href: string, locale: 'fi' | 'en'): string | null {
  try {
    const h = String(href || '').trim();
    if (!h) return null;

    // 1) category/<slug>
    const rx1 = /^\/?category\/([a-z0-9-]+)\/?$/i;
    const m1 = rx1.exec(h);
    if (m1?.[1]) return m1[1].toLowerCase();

    // 2) /{locale}/category/<slug>
    const rx2 = new RegExp(`^\\/?${locale}\\/category\\/([a-z0-9-]+)\\/?$`, 'i');
    const m2 = rx2.exec(h);
    if (m2?.[1]) return m2[1].toLowerCase();

    // 3) single segment (politics, politiikka)
    const rx3 = /^\/?([a-z0-9-]+)\/?$/i;
    const m3 = rx3.exec(h);
    if (m3?.[1]) return m3[1].toLowerCase();

    return null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    if ((session as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const locale = normLocale(searchParams.get('locale'));
    const mergeMenu = boolQP(searchParams.get('mergeMenu') || searchParams.get('merge'), false);

    // 1) Categorias do DB
    const dbCats = await prisma.category.findMany({
      where: { locale },
      orderBy: { order: 'asc' },
      select: { slug: true, name: true, order: true },
    });

    if (!mergeMenu) {
      return NextResponse.json({
        ok: true,
        items: dbCats.map((c) => ({ ...c, source: 'db' as const })),
      });
    }

    // 2) Derivar categorias do Menu e unir
    const menuItems = await prisma.menuItem.findMany({
      where: { locale },
      orderBy: { order: 'asc' },
      select: { href: true, label: true, order: true },
    });

    const seen = new Set<string>(dbCats.map((c) => c.slug));
    const derived: { slug: string; name: string; order: number; source: 'menu' }[] = [];

    for (const it of menuItems) {
      const slug = extractCategorySlugFromHref(String(it.href || ''), locale);
      if (!slug) continue;
      if (seen.has(slug)) continue;
      seen.add(slug);
      derived.push({
        slug,
        name: String(it.label || slug),
        order: 100000 + (typeof it.order === 'number' ? it.order : 0), // empurra pro fim, na ordem do menu
        source: 'menu',
      });
    }

    const items = [
      ...dbCats.map((c) => ({ ...c, source: 'db' as const })),
      ...derived,
    ];

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}