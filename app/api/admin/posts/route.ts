// app/api/admin/posts/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LOCALES } from '@/config/locales';
import { z } from 'zod';
import { syncPostAssetsById } from '@/lib/assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Zod helpers
const LOCALE_VALUES = LOCALES as unknown as readonly [string, ...string[]];

// Validação: permite URL válida, nulo, ou omitido.
const optionalURL = z.string().url().optional().nullable();

const StatusEnum = z.enum(['draft', 'published', 'scheduled']);

const CreatePostSchema = z.object({
  locale: z.enum(LOCALE_VALUES),
  title: z.string().min(3).max(180),
  slug: z.string().optional(),
  coverUrl: optionalURL,
  excerpt: z.string().max(320).optional(),
  content: z.string().optional(),
  category: z.string().min(2),
  tags: z.array(z.string()).optional().default([]),
  status: StatusEnum.default('draft'),
  publishedAt: z.string().datetime().optional(), // ISO string
  // SEO
  seoTitle: z.string().max(180).optional(),
  seoDescription: z.string().max(300).optional(),
  canonicalUrl: optionalURL,
  focusKeyphrase: z.string().max(120).optional(),
  indexable: z.boolean().optional().default(true),
  follow: z.boolean().optional().default(true),
  // Novos campos
  authorName: z.string().max(120).optional(),
  imageAlt: z.string().max(200).optional(),
});

// Slugify e unicidade
function slugify(input: string, maxLen = 60) {
  const s = (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLen);
  return s;
}
async function ensureUniqueSlug(db: any, base: string, locale: string, excludeId?: string) {
  let candidate = base || 'post';
  let i = 1;
  while (i < 50) {
    const existing = await db.post.findFirst({
      where: { slug: candidate, locale, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) break;
    i += 1;
    candidate = `${base}-${i}`;
  }
  return candidate;
}

// GET /api/admin/posts
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const locale = searchParams.get('locale') || undefined;
    const status = searchParams.get('status') || undefined;
    const q = searchParams.get('q') || undefined;
    const category = searchParams.get('category') || undefined;

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') || '20', 10)));
    const skip = (page - 1) * perPage;
    const take = perPage;

    const where: any = {};
    if (locale && LOCALES.includes(locale as any)) where.locale = locale;
    if (status && ['draft', 'published', 'scheduled'].includes(status)) where.status = status;
    if (category) where.category = category;
    if (q) where.title = { contains: q, mode: 'insensitive' as const };

    const db = prisma as any;

    const [items, total] = await Promise.all([
      db.post.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take,
        select: {
          id: true,
          locale: true,
          title: true,
          slug: true,
          status: true,
          category: true,
          tags: true,
          updatedAt: true,
          publishedAt: true,
          coverUrl: true,
          // não é necessário retornar authorName/imageAlt nesta lista
        },
      }),
      db.post.count({ where }),
    ]);

    return NextResponse.json({ ok: true, page, perPage, total, items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/admin/posts
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = CreatePostSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    const db = prisma as any;

    const baseSlug = slugify(body.slug || body.title);
    const slug = await ensureUniqueSlug(db, baseSlug, body.locale);

    const created = await db.post.create({
      data: {
        locale: body.locale,
        title: body.title,
        slug,
        coverUrl: body.coverUrl || null,
        excerpt: body.excerpt || null,
        content: body.content || null,
        category: body.category,
        tags: body.tags || [],
        status: body.status,
        publishedAt:
          body.status === 'published'
            ? new Date().toISOString()
            : body.publishedAt || null,
        // SEO
        seoTitle: body.seoTitle || null,
        seoDescription: body.seoDescription || null,
        canonicalUrl: body.canonicalUrl || null,
        focusKeyphrase: body.focusKeyphrase || null,
        indexable: body.indexable ?? true,
        follow: body.follow ?? true,
        // Novos
        authorName: body.authorName || null,
        imageAlt: body.imageAlt || null,
      },
      select: { id: true, slug: true },
    });

    // SINCRONIZA ASSETS DO POST RECÉM-CRIADO
    try { await syncPostAssetsById(created.id); } catch {}

    return NextResponse.json({ ok: true, id: created.id, slug: created.slug });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}