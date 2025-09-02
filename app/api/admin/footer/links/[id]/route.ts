// app/api/admin/footer/links/[id]/route.ts
// ============================================================================
// API Admin • Footer Link por ID — nível PhD
// ----------------------------------------------------------------------------
// PATCH  /api/admin/footer/links/:id   { label?, href?, external?, rel?, order?, visible? }
// DELETE /api/admin/footer/links/:id
// ============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UpdateLinkSchema = z.object({
  label: z.string().min(1).max(80).optional(),
  href: z.string().min(1).max(400).optional(),
  external: z.boolean().optional(),
  rel: z.string().max(120).optional().nullable(),
  order: z.number().int().optional(),
  visible: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const json = await req.json().catch(() => ({}));
    const parsed = UpdateLinkSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    const upd = await prisma.footerLink.update({
      where: { id: params.id },
      data: parsed.data,
      select: { id: true, updatedAt: true },
    });

    return NextResponse.json({ ok: true, id: upd.id, updatedAt: upd.updatedAt });
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

    await prisma.footerLink.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if ((e as any)?.code === 'P2025') return NextResponse.json({ ok: true });
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}