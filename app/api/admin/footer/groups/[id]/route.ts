// app/api/admin/footer/groups/[id]/route.ts
// ============================================================================
// API Admin • Footer Group por ID — nível PhD
// ----------------------------------------------------------------------------
// GET    /api/admin/footer/groups/:id
// PATCH  /api/admin/footer/groups/:id   { title?, order?, visible? }
// DELETE /api/admin/footer/groups/:id
// ============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UpdateGroupSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  order: z.number().int().optional(),
  visible: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const g = await prisma.footerGroup.findUnique({
      where: { id: params.id },
      select: {
        id: true, locale: true, title: true, order: true, visible: true, updatedAt: true,
        links: {
          orderBy: { order: 'asc' },
          select: { id: true, label: true, href: true, external: true, rel: true, order: true, visible: true, updatedAt: true }
        }
      }
    });
    if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(g);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const json = await req.json().catch(() => ({}));
    const parsed = UpdateGroupSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    const upd = await prisma.footerGroup.update({
      where: { id: params.id },
      data: parsed.data,
      select: { id: true, updatedAt: true },
    });

    return NextResponse.json({ ok: true, id: upd.id, updatedAt: upd.updatedAt });
  } catch (e: any) {
    if ((e as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'Título já existe neste locale.' }, { status: 409 });
    }
    if ((e as any)?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.footerGroup.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if ((e as any)?.code === 'P2025') return NextResponse.json({ ok: true });
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}