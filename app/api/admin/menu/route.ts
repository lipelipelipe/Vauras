// app/api/admin/menu/route.ts
// ============================================================================
// API Admin • Menu principal (lista + cria) — nível PhD (bootstrap idempotente)
// ----------------------------------------------------------------------------
// GET  /api/admin/menu?locale=fi|en
//  - Se não houver itens para o locale, popula com categorias do locale, de forma idempotente (upsert).
// POST /api/admin/menu  { locale, label, href, order?, visible? }
//  - Cria item novo (href relativo ou absoluto).
// ============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LOCALES } from '@/config/locales';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  locale: z.enum(LOCALES as unknown as readonly [string, ...string[]]),
  label: z.string().min(1).max(60),
  href: z.string().min(1).max(400),
  order: z.number().int().optional(),
  visible: z.boolean().optional().default(true),
});

// Normaliza href: aceita absoluto (/fi/sobre) ou relativo (sobre, company/team)
function normalizeHref(input: string) {
  const h = String(input || '').trim();
  if (!h) return '';
  if (h.startsWith('/')) return h.replace(/\/+$/, '');
  return h.replace(/^\/*/, '').replace(/\/+$/, '');
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const locale = searchParams.get('locale') || undefined;

    const where: any = {};
    if (locale && (LOCALES as unknown as string[]).includes(locale)) where.locale = locale;

    let items = await prisma.menuItem.findMany({
      where,
      orderBy: [{ locale: 'asc' }, { order: 'asc' }],
      select: { id: true, locale: true, label: true, href: true, order: true, visible: true, updatedAt: true },
    });

    // Bootstrap idempotente: só se pediram um locale específico e a lista veio vazia
    if (items.length === 0 && locale && (LOCALES as unknown as string[]).includes(locale)) {
      const cats = await prisma.category.findMany({
        where: { locale },
        orderBy: [{ order: 'asc' }],
        select: { slug: true, name: true },
      });

      if (cats.length > 0) {
        // upsert por (locale, href) dentro de uma transação (evita duplicidade sob concorrência)
        await prisma.$transaction(
          cats.map((c, idx) =>
            prisma.menuItem.upsert({
              where: { menu_locale_href_unique: { locale, href: `category/${c.slug}` } },
              update: {
                label: c.name,
                order: (idx + 1) * 10,
                visible: true,
              },
              create: {
                locale,
                label: c.name,
                href: `category/${c.slug}`,
                order: (idx + 1) * 10,
                visible: true,
              },
            })
          )
        );
        // Recarrega lista
        items = await prisma.menuItem.findMany({
          where: { locale },
          orderBy: [{ order: 'asc' }],
          select: { id: true, locale: true, label: true, href: true, order: true, visible: true, updatedAt: true },
        });
      }
    }

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = CreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    const href = normalizeHref(body.href);
    if (!href) return NextResponse.json({ error: 'Href inválido.' }, { status: 400 });

    // order automático se não informado
    let order = body.order;
    if (typeof order !== 'number') {
      const max = await prisma.menuItem.findFirst({
        where: { locale: body.locale },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = (max?.order ?? 0) + 10;
    }

    const created = await prisma.menuItem.create({
      data: {
        locale: body.locale,
        label: body.label.trim(),
        href,
        order,
        visible: body.visible ?? true,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    // Se bater a constraint única (locale, href)
    if ((e as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe um item para este locale+href.' }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}