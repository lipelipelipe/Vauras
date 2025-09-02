// app/api/admin/posts/[id]/translate/route.ts
// ============================================================================
// API Admin • Criar tradução do post (FI <-> EN) — nível PhD
// ----------------------------------------------------------------------------
// O que faz:
// - Recebe o ID de um post origem (FI ou EN).
// - Cria uma cópia em outro idioma (targetLocale) como rascunho, vinculada por groupId.
// - Mapeia categoria entre FI <-> EN (slugs diferentes).
// - Gera slug único no target e mantém SEO/cover/tags.
//
// Body: { targetLocale: 'fi' | 'en' }
// Resposta: { ok, id, slug, locale, groupId }
// Segurança: admin somente.
// ============================================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  targetLocale: z.enum(['fi', 'en']),
});

// Slugify igual aos outros endpoints
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
  return s || 'post';
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

// Mapas de categoria (FI <-> EN)
const MAP_FI_TO_EN: Record<string, string> = {
  politiikka: 'politics',
  talous: 'business',
  urheilu: 'sports',
  kulttuuri: 'culture',
  teknologia: 'technology',
};
const MAP_EN_TO_FI: Record<string, string> = {
  politics: 'politiikka',
  business: 'talous',
  sports: 'urheilu',
  culture: 'kulttuuri',
  technology: 'teknologia',
};

function mapCategory(sourceSlug: string, toLocale: 'fi' | 'en') {
  return toLocale === 'en' ? (MAP_FI_TO_EN[sourceSlug] || sourceSlug) : (MAP_EN_TO_FI[sourceSlug] || sourceSlug);
}

function newGroupId(): string {
  // ID curto/estável para agrupar traduções
  return 'grp_' + crypto.randomBytes(8).toString('hex');
}

export async function POST(req: Request, context: { params: { id: string } }) {
  try {
    // Auth
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = context.params;
    const db = prisma as any;

    // Valida body
    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }
    const targetLocale = parsed.data.targetLocale;

    // Carrega post origem
    const src = await db.post.findUnique({
      where: { id },
      select: {
        id: true, groupId: true, locale: true, title: true, slug: true,
        excerpt: true, content: true, coverUrl: true, category: true,
        tags: true, status: true, // SEO
        seoTitle: true, seoDescription: true, canonicalUrl: true,
        focusKeyphrase: true, indexable: true, follow: true,
        publishedAt: true,
      },
    });
    if (!src) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (src.locale === targetLocale) {
      return NextResponse.json({ error: 'Post já está no locale alvo' }, { status: 400 });
    }

    // Garante/define groupId no post origem
    let groupId = src.groupId || newGroupId();
    if (!src.groupId) {
      await db.post.update({ where: { id: src.id }, data: { groupId } });
    }

    // Já existe tradução no target?
    const existingTarget = await db.post.findFirst({
      where: { groupId, locale: targetLocale },
      select: { id: true, slug: true },
    });
    if (existingTarget) {
      return NextResponse.json({
        ok: true,
        id: existingTarget.id,
        slug: existingTarget.slug,
        locale: targetLocale,
        groupId,
        note: 'Tradução já existia',
      });
    }

    // Categoria mapeada
    const mappedCategory = mapCategory(src.category, targetLocale);

    // Slug base: reaproveita título (ou slug) e garante unicidade no target
    const base = slugify(src.title || src.slug);
    const uniqueSlug = await ensureUniqueSlug(db, base, targetLocale);

    // Cria a tradução (rascunho)
    const created = await db.post.create({
      data: {
        groupId,
        locale: targetLocale,
        title: src.title,              // o editor vai traduzir depois
        slug: uniqueSlug,
        coverUrl: src.coverUrl || null,
        excerpt: src.excerpt || null,
        content: src.content || null,
        category: mappedCategory,
        tags: src.tags || [],
        status: 'draft',               // sempre rascunho ao criar tradução
        publishedAt: null,
        // SEO (copiados; o editor ajusta no idioma alvo)
        seoTitle: src.seoTitle || null,
        seoDescription: src.seoDescription || null,
        canonicalUrl: null,           // não herdamos canonical
        focusKeyphrase: src.focusKeyphrase || null,
        indexable: src.indexable ?? true,
        follow: src.follow ?? true,
      },
      select: { id: true, slug: true, locale: true, groupId: true },
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
      slug: created.slug,
      locale: created.locale,
      groupId: created.groupId,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}