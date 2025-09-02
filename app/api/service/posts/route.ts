// app/api/service/posts/route.ts
// ============================================================================
// Service-only API • Listar e Criar Posts — nível PhD
// ----------------------------------------------------------------------------
// GET: Lista posts com filtros avançados para consumo por serviços externos.
// POST: Cria um novo post, protegido por token de serviço.
// Segurança: exige header Authorization: Bearer {SERVICE_TOKEN}
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LOCALES } from '@/config/locales';
import { getSiteSettings } from '@/lib/settings';
import { serializePostForService } from '@/lib/service/serialize';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ==========================================================
// Funções Helper (Compartilhadas por GET e POST)
// ==========================================================

function isService(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  return token && token === process.env.SERVICE_TOKEN;
}

function toInt(s: string | null, def: number, min: number, max: number) {
  const n = parseInt(String(s || ''), 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function parseBoolFlag(v: string | null): boolean {
  if (!v) return false;
  return ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase());
}

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  try {
    const d = new Date(s);
    return Number.isFinite(+d) ? d : null;
  } catch {
    return null;
  }
}

function getBaseUrl(req: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  if (envUrl) {
    try {
      const u = new URL(envUrl);
      return u.origin.replace(/\/+$/, '');
    } catch {}
  }
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`.replace(/\/+$/, '');
}

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

async function ensureUniqueSlug(db: any, base: string, locale: string) {
  let candidate = base || 'post';
  let i = 1;
  while (i < 50) {
    const existing = await db.post.findFirst({
      where: { slug: candidate, locale },
      select: { id: true },
    });
    if (!existing) break;
    i += 1;
    candidate = `${base}-${i}`;
  }
  return candidate;
}

// ==========================================================
// Schema de Validação (Zod) para o POST
// ==========================================================

const LOCALE_VALUES = LOCALES as unknown as readonly [string, ...string[]];

const CreateServicePostSchema = z.object({
  locale: z.enum(LOCALE_VALUES),
  title: z.string().min(3, 'O título é obrigatório.'),
  category: z.string().min(2, 'A categoria é obrigatória.'),
  content: z.string().optional(),
  excerpt: z.string().max(320).optional(),
  coverUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published']).default('published'),
});

// ==========================================================
// Função GET: Listar Posts
// ==========================================================
export async function GET(req: Request) {
  try {
    if (!isService(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // locale
    const rawLocale = (searchParams.get('locale') || 'all').toLowerCase();
    const locale = (LOCALES as unknown as string[]).includes(rawLocale)
      ? rawLocale
      : rawLocale === 'all'
      ? 'all'
      : 'all';

    // status
    const rawStatus = (searchParams.get('status') || 'draft').toLowerCase();
    const validStatus = new Set(['draft', 'published', 'scheduled', 'all']);
    const status = validStatus.has(rawStatus) ? rawStatus : 'draft';

    const category = searchParams.get('category') || undefined;
    const q = searchParams.get('q') || undefined;
    const updatedSince = parseDate(searchParams.get('updatedSince'));
    const onlyWithoutWebStory = parseBoolFlag(searchParams.get('onlyWithoutWebStory'));
    const onlyWithCover = parseBoolFlag(searchParams.get('onlyWithCover'));

    const page = toInt(searchParams.get('page'), 1, 1, 10_000);
    const perPage = toInt(searchParams.get('perPage'), 20, 1, 100);
    const skip = (page - 1) * perPage;

    // where
    const where: any = {};
    if (locale !== 'all') where.locale = locale;
    if (status !== 'all') where.status = status;
    if (category) where.category = category;
    if (q) where.title = { contains: q, mode: 'insensitive' as const };
    if (updatedSince) where.updatedAt = { gte: updatedSince };
    if (onlyWithoutWebStory) where.isWebStory = false;
    if (onlyWithCover) {
      where.AND = (where.AND || []).concat([{ coverUrl: { not: null } }, { NOT: { coverUrl: '' } }]);
    }

    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take: perPage,
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
          updatedAt: true,
          seoTitle: true,
          seoDescription: true,
          canonicalUrl: true,
          focusKeyphrase: true,
          indexable: true,
          follow: true,
          isWebStory: true,
          storyContent: true,
          storyOptions: true, // IMPORTANTE: incluir para satisfazer o tipo do serializer
        },
      }),
      prisma.post.count({ where }),
    ]);

    const [settings] = await Promise.all([getSiteSettings()]);
    const baseUrl = getBaseUrl(req);

    const items = await Promise.all(
      rows.map((p) =>
        serializePostForService(p, {
          baseUrl,
          settings,
          mode: 'list',
          listLimits: {
            paragraphsMax: 8,
            imagesMax: 10,
            candidatesMax: 6,
          },
        })
      )
    );

    return NextResponse.json({
      ok: true,
      page,
      perPage,
      total,
      items,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}

// ==========================================================
// Função POST: Criar Post
// ==========================================================
export async function POST(req: Request) {
  try {
    if (!isService(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = CreateServicePostSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    const baseSlug = slugify(body.title);
    const slug = await ensureUniqueSlug(prisma, baseSlug, body.locale);

    const created = await prisma.post.create({
      data: {
        locale: body.locale,
        title: body.title,
        slug,
        category: body.category,
        content: body.content || '',
        excerpt: body.excerpt || '',
        coverUrl: body.coverUrl || null,
        tags: body.tags || [],
        status: body.status,
        publishedAt: body.status === 'published' ? new Date() : null,
      },
      select: { id: true, slug: true, locale: true },
    });

    return NextResponse.json({ ok: true, id: created.id, slug: created.slug, locale: created.locale });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}