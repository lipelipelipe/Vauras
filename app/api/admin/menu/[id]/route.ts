// app/api/admin/menu/[id]/route.ts
// ============================================================================
// API Admin • Menu principal (item por ID) — nível PhD
// ----------------------------------------------------------------------------
// PATCH  /api/admin/menu/:id  { label?, href?, order?, visible? }
// DELETE /api/admin/menu/:id
// ============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  label: z.string().min(1).max(60).optional(),
  href: z.string().min(1).max(400).optional(),
  order: z.number().int().optional(),
  visible: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const json = await req.json().catch(() => ({}));
    const parsed = UpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.menuItem.update({
      where: { id: params.id },
      data: parsed.data,
      select: { id: true, updatedAt: true },
    });

    return NextResponse.json({ ok: true, id: updated.id, updatedAt: updated.updatedAt });
  } catch (e: any) {
    if ((e as any)?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.menuItem.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if ((e as any)?.code === 'P2025') return NextResponse.json({ ok: true });
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}