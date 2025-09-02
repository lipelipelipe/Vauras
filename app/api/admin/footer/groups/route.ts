// app/api/admin/footer/groups/route.ts
// ============================================================================
// API Admin • Footer Groups (lista + cria) — nível PhD
// ----------------------------------------------------------------------------
// GET  /api/admin/footer/groups?locale=fi|en
// POST /api/admin/footer/groups  { locale, title, order?, visible? }
// - order automático (+10) se omitido
// - unique (locale, title) -> 409 em duplicata
// ============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LOCALES } from '@/config/locales';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateGroupSchema = z.object({
  locale: z.enum(LOCALES as unknown as readonly [string, ...string[]]),
  title: z.string().min(1).max(80),
  order: z.number().int().optional(),
  visible: z.boolean().optional().default(true),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const locale = searchParams.get('locale') || undefined;

    const where: any = {};
    if (locale && (LOCALES as unknown as string[]).includes(locale)) where.locale = locale;

    const groups = await prisma.footerGroup.findMany({
      where,
      orderBy: [{ locale: 'asc' }, { order: 'asc' }],
      select: {
        id: true, locale: true, title: true, order: true, visible: true, updatedAt: true,
        links: {
          orderBy: { order: 'asc' },
          select: { id: true, label: true, href: true, external: true, rel: true, order: true, visible: true, updatedAt: true }
        }
      }
    });

    return NextResponse.json({ ok: true, items: groups });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const json = await req.json().catch(() => ({}));
    const parsed = CreateGroupSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    let order = body.order;
    if (typeof order !== 'number') {
      const max = await prisma.footerGroup.findFirst({
        where: { locale: body.locale },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = (max?.order ?? 0) + 10;
    }

    const g = await prisma.footerGroup.create({
      data: {
        locale: body.locale,
        title: body.title.trim(),
        order,
        visible: body.visible ?? true,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: g.id });
  } catch (e: any) {
    if ((e as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe um grupo com este título neste locale.' }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}