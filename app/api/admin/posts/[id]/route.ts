// app/api/admin/posts/[id]/route.ts
// ============================================================================
// Admin API • Post por ID — Nível PhD (com storyFlags no GET)
// ----------------------------------------------------------------------------
// - GET: retorna o post completo, incluindo storyOptions, isWebStory e storyContent.
// - PATCH: atualiza campos do post (com validações), mantém coerência de slug/publishedAt.
//          Aceita coverUrl/canonicalUrl = null (remover), authorName e imageAlt.
// - DELETE: remove o post e limpa assets do Blob (refs + GC).
// Requer admin (NextAuth).
// ============================================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LOCALES } from '@/config/locales';
import { z } from 'zod';
import { syncPostAssetsById, removeRefsForEntityAndGC } from '@/lib/assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// URL opcional/nullable no PATCH: '' -> null (remove), '...' -> undefined (ignora), válida -> string
const optionalNullableURL = z.preprocess((v) => {
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t) return null;
  if (t.includes('...')) return undefined;
  try { new URL(t); return t; } catch { return undefined; }
}, z.string().url().or(z.null())).optional();

const StatusEnum = z.enum(['draft', 'published', 'scheduled']);
const UpdateSchema = z.object({
  locale: z.enum(LOCALES as unknown as readonly [string, ...string[]]).optional(),
  title: z.string().min(3).max(180).optional(),
  slug: z.string().max(60).optional(),
  coverUrl: optionalNullableURL,              // aceita null para remover
  excerpt: z.string().max(320).optional(),
  content: z.string().optional(),
  category: z.string().min(2).optional(),
  tags: z.array(z.string()).optional(),
  status: StatusEnum.optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  seoTitle: z.string().max(180).optional(),
  seoDescription: z.string().max(300).optional(),
  canonicalUrl: optionalNullableURL,          // aceita null para remover
  focusKeyphrase: z.string().max(120).optional(),
  indexable: z.boolean().optional(),
  follow: z.boolean().optional(),
  // Novos
  authorName: z.string().max(120).nullable().optional(),
  imageAlt: z.string().max(200).nullable().optional(),
});

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

// GET
export async function GET(_req: Request, context: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = context.params;
    const db = prisma as any;

    const post = await db.post.findUnique({
      where: { id },
      select: {
        id: true,
        locale: true,
        title: true,
        slug: true,
        coverUrl: true,
        excerpt: true,
        content: true,
        category: true,
        tags: true,
        status: true,
        publishedAt: true,
        seoTitle: true,
        seoDescription: true,
        canonicalUrl: true,
        focusKeyphrase: true,
        indexable: true,
        follow: true,
        // Novos
        authorName: true,
        imageAlt: true,
        // Story
        storyOptions: true,
        isWebStory: true,
        storyContent: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(post);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

// PATCH
export async function PATCH(req: Request, context: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = context.params;
    const db = prisma as any;

    const json = await req.json().catch(() => ({}));
    const parsed = UpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    const existing = await db.post.findUnique({ where: { id }, select: { id: true, locale: true, slug: true, publishedAt: true } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const nextLocale = body.locale || existing.locale;

    let nextSlug = existing.slug;
    if (typeof body.slug === 'string') {
      const base = slugify(body.slug || '');
      nextSlug = await ensureUniqueSlug(db, base, nextLocale, id);
    }

    let nextPublishedAt = body.publishedAt ?? existing.publishedAt ?? undefined;
    if (body.status === 'published' && !existing.publishedAt) {
      nextPublishedAt = new Date().toISOString();
    }

    const data: any = {
      ...body,
      slug: nextSlug,
      publishedAt: nextPublishedAt,
    };
    // respeita null de forma explícita para URLs
    if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl;
    if (body.canonicalUrl !== undefined) data.canonicalUrl = body.canonicalUrl;

    // respeita undefined vs null para novos campos
    if (body.authorName !== undefined) data.authorName = body.authorName;
    if (body.imageAlt !== undefined) data.imageAlt = body.imageAlt;

    const updated = await db.post.update({
      where: { id },
      data,
      select: { id: true, slug: true, updatedAt: true },
    });

    // Sincroniza refs de assets do post e faz GC de órfãos tocados
    await syncPostAssetsById(updated.id);

    return NextResponse.json({ ok: true, id: updated.id, slug: updated.slug, updatedAt: updated.updatedAt });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

// DELETE
export async function DELETE(_req: Request, context: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = context.params;
    const db = prisma as any;

    await db.post.delete({ where: { id } });

    // Remove todas as refs do post e GC de órfãos (apaga do Blob quando refCount=0)
    await removeRefsForEntityAndGC('post', id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if ((e as any)?.code === 'P2025') return NextResponse.json({ ok: true });
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}