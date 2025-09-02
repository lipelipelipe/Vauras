// app/api/admin/footer/groups/[id]/links/route.ts
// ============================================================================
// API Admin • Footer Links (criar link em um grupo) — nível PhD
// ----------------------------------------------------------------------------
// POST /api/admin/footer/groups/:id/links
// Body: { label, href, external?, rel?, order?, visible? }
// - href pode ser relativo (sobre) ou absoluto (/fi/sobre ou https://...)
// - order automático (+10) se omitido
// ============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateLinkSchema = z.object({
  label: z.string().min(1).max(80),
  href: z.string().min(1).max(400),
  external: z.boolean().optional().default(false),
  rel: z.string().max(120).optional(),
  order: z.number().int().optional(),
  visible: z.boolean().optional().default(true),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const groupId = params.id;
    const group = await prisma.footerGroup.findUnique({ where: { id: groupId }, select: { id: true } });
    if (!group) return NextResponse.json({ error: 'FooterGroup not found' }, { status: 404 });

    const json = await req.json().catch(() => ({}));
    const parsed = CreateLinkSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    let order = body.order;
    if (typeof order !== 'number') {
      const max = await prisma.footerLink.findFirst({
        where: { groupId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = (max?.order ?? 0) + 10;
    }

    const link = await prisma.footerLink.create({
      data: {
        groupId,
        label: body.label.trim(),
        href: body.href.trim(),
        external: !!body.external,
        rel: body.rel || null,
        order,
        visible: body.visible ?? true,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: link.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}