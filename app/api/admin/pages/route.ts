// app/api/admin/pages/route.ts
// ============================================================================
// API Admin • Pages (lista + cria) — nível PhD (URLs opcionais robustas)
// ----------------------------------------------------------------------------
// GET  /api/admin/pages?locale=fi|en&q=...&status=...&page=1&perPage=20
// POST /api/admin/pages  { locale, title, path, excerpt?, content?, coverUrl?, status?, publishedAt?, seoTitle?, seoDescription?, canonicalUrl?, indexable?, follow? }
// - path normalizado (sem admin/category).
// - URLs opcionais: blank/"..." -> ignorado; aceita absoluta válida.
// ============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LOCALES } from '@/config/locales';
import { syncPageAssetsById } from '@/lib/assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RESERVED = new Set(['admin', 'category']);

function normalizePath(input: string) {
  let p = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^\/*/, '')
    .replace(/\/*$/, '')
    .replace(/\/+/g, '/');
  if (!p) return '';
  const first = p.split('/')[0];
  if (RESERVED.has(first)) throw new Error(`Path reservado: não pode começar com "${first}"`);
  return p;
}

const StatusEnum = z.enum(['draft', 'published', 'scheduled']);

// URL opcional robusta: string vazia ou com "..." vira undefined; só aceita URL absoluta válida
const optionalURL = z.preprocess((v) => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t || t.includes('...')) return undefined;
  try { new URL(t); return t; } catch { return undefined; }
}, z.string().url()).optional();

const CreateSchema = z.object({
  locale: z.enum(LOCALES as unknown as readonly [string, ...string[]]),
  title: z.string().min(2).max(180),
  path: z.string().min(1).max(200),
  excerpt: z.string().max(320).optional(),
  content: z.string().optional(),
  coverUrl: optionalURL,
  status: StatusEnum.default('draft'),
  publishedAt: z.string().datetime().optional(),
  seoTitle: z.string().max(180).optional(),
  seoDescription: z.string().max(300).optional(),
  canonicalUrl: optionalURL,
  indexable: z.boolean().optional().default(true),
  follow: z.boolean().optional().default(true),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const locale = searchParams.get('locale') || undefined;
    const q = searchParams.get('q') || undefined;
    const status = searchParams.get('status') || undefined;

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') || '20', 10)));
    const skip = (page - 1) * perPage;

    const where: any = {};
    if (locale && (LOCALES as unknown as string[]).includes(locale)) where.locale = locale;
    if (status && ['draft', 'published', 'scheduled'].includes(status)) where.status = status;
    if (q) where.title = { contains: q, mode: 'insensitive' as const };

    const [items, total] = await Promise.all([
      prisma.page.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take: perPage,
        select: { id: true, locale: true, title: true, path: true, status: true, updatedAt: true, publishedAt: true },
      }),
      prisma.page.count({ where }),
    ]);

    return NextResponse.json({ ok: true, page, perPage, total, items });
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
    const parsed = CreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    const path = normalizePath(body.path);

    const created = await prisma.page.create({
      data: {
        locale: body.locale,
        title: body.title,
        path,
        excerpt: body.excerpt || null,
        content: body.content || null,
        coverUrl: body.coverUrl || null,
        status: body.status,
        publishedAt:
          body.status === 'published'
            ? new Date()
            : body.publishedAt ? new Date(body.publishedAt) : null,
        seoTitle: body.seoTitle || null,
        seoDescription: body.seoDescription || null,
        canonicalUrl: body.canonicalUrl || null,
        indexable: body.indexable ?? true,
        follow: body.follow ?? true,
      },
      select: { id: true, path: true },
    });

    // Sincroniza assets da página recém criada
    await syncPageAssetsById(created.id);

    return NextResponse.json({ ok: true, id: created.id, path: created.path });
  } catch (e: any) {
    if ((e as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'Path já existe para este locale.' }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}