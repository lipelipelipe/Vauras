// app/api/admin/pages/[id]/route.ts
// ============================================================================
// API Admin • Page por ID — nível PhD (URLs opcionais robustas no PATCH)
// ----------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LOCALES } from '@/config/locales';
import { syncPageAssetsById, removeRefsForEntityAndGC } from '@/lib/assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RESERVED = new Set(['admin', 'category']);
function normalizePath(input: string) {
  let p = String(input || '').trim().toLowerCase().replace(/^\/*/, '').replace(/\/*$/, '').replace(/\/+/, '/');
  if (!p) return '';
  const first = p.split('/')[0];
  if (RESERVED.has(first)) throw new Error(`Path reservado: não pode começar com "${first}"`);
  return p;
}

const StatusEnum = z.enum(['draft', 'published', 'scheduled']);

// URL opcional/nullable no PATCH: '' -> null (remove), '...' -> undefined (ignora), válida -> string
const optionalNullableURL = z.preprocess((v) => {
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t) return null;
  if (t.includes('...')) return undefined;
  try { new URL(t); return t; } catch { return undefined; }
}, z.string().url().or(z.null())).optional();

const UpdateSchema = z.object({
  locale: z.enum(LOCALES as unknown as readonly [string, ...string[]]).optional(),
  title: z.string().min(2).max(180).optional(),
  path: z.string().min(1).max(200).optional(),
  excerpt: z.string().max(320).optional(),
  content: z.string().optional(),
  coverUrl: optionalNullableURL,
  status: StatusEnum.optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  seoTitle: z.string().max(180).optional(),
  seoDescription: z.string().max(300).optional(),
  canonicalUrl: optionalNullableURL,
  indexable: z.boolean().optional(),
  follow: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const page = await prisma.page.findUnique({
      where: { id: params.id },
      select: {
        id: true, locale: true, title: true, path: true, excerpt: true, content: true,
        coverUrl: true, status: true, publishedAt: true,
        seoTitle: true, seoDescription: true, canonicalUrl: true,
        indexable: true, follow: true, createdAt: true, updatedAt: true,
      },
    });
    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(page);
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
    const parsed = UpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    const existing = await prisma.page.findUnique({
      where: { id: params.id },
      select: { id: true, locale: true, path: true, publishedAt: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data: any = { ...body };

    if (typeof body.path === 'string') {
      data.path = normalizePath(body.path);
    }

    // publishedAt coerente
    if (body.status === 'published' && !existing.publishedAt) {
      data.publishedAt = new Date();
    } else if (body.publishedAt !== undefined) {
      data.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
    }

    // coverUrl/canonicalUrl: body.coverUrl pode ser string, null ou undefined pela preprocess
    if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl;
    if (body.canonicalUrl !== undefined) data.canonicalUrl = body.canonicalUrl;

    const updated = await prisma.page.update({
      where: { id: params.id },
      data,
      select: { id: true, path: true, updatedAt: true },
    });

    // Sincroniza assets dessa página
    await syncPageAssetsById(updated.id);

    return NextResponse.json({ ok: true, id: updated.id, path: updated.path, updatedAt: updated.updatedAt });
  } catch (e: any) {
    if ((e as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'Path já existe para este locale.' }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.page.delete({ where: { id: params.id } });

    // Remove refs e faz GC dos órfãos tocados
    await removeRefsForEntityAndGC('page', params.id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if ((e as any)?.code === 'P2025') return NextResponse.json({ ok: true });
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}