// app/api/admin/webstories/bulk/route.ts
// ============================================================================
// Admin API • Web Stories — Ações em lote (robusto/anti-falha e tipado)
// ----------------------------------------------------------------------------
// - storyContent (String?) -> usar null para limpar
// - storyOptions (Json?)  -> usar Prisma.DbNull para limpar
// - publishedAt (DateTime?) -> usar null para limpar
// ============================================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { LOCALES } from '@/config/locales';
import { generateWebStoryHtml } from '@/lib/webstory-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  action: z.enum([
    'generate_publish',
    'generate_schedule',
    'publish',
    'schedule',
    'draft',
    'remove',
  ]),
  locale: z.enum(LOCALES as unknown as [string, ...string[]]).optional(),
  ids: z.array(z.string()).optional(),
  onlyWithoutWebStory: z.boolean().optional().default(false),
  onlyWithCover: z.boolean().optional().default(false),
  publishedAt: z.string().datetime().optional(),
  options: z.any().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }
    const { action, locale, ids, onlyWithoutWebStory, onlyWithCover, publishedAt, options } = parsed.data;

    let posts: any[] = [];
    if (ids && ids.length) {
      posts = await prisma.post.findMany({ where: { id: { in: ids } } });
    } else {
      const where: any = {};
      if (locale) where.locale = locale;
      if (onlyWithoutWebStory) where.isWebStory = false;
      if (onlyWithCover) where.coverUrl = { not: null };
      posts = await prisma.post.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 1000,
      });
    }

    let processed = 0;
    let generated = 0;
    let updated = 0;
    let removed = 0;
    let errors = 0;

    for (const post of posts) {
      if (!post) continue;
      try {
        const data: Prisma.PostUpdateInput = {};

        if (action === 'remove') {
          data.isWebStory = false;
          data.storyContent = null;          // String? -> null
          data.storyOptions = Prisma.DbNull; // Json?   -> DbNull
          removed++;
        } else if (action === 'draft') {
          data.status = 'draft';
          data.publishedAt = null; // DateTime? -> null
        } else if (action === 'publish') {
          // auto-gerar se necessário
          if (!post.storyContent || !post.isWebStory) {
            if (!post.coverUrl) throw new Error('Post sem coverUrl para auto-gerar no publish.');
            const html = generateWebStoryHtml({ post, options: (options || {}) as any });
            data.isWebStory = true;
            data.storyContent = html;
            if (options !== undefined) data.storyOptions = options as any;
            generated++;
          } else if (options !== undefined) {
            data.storyOptions = options as any;
          }
          data.status = 'published';
          data.publishedAt = post.publishedAt ?? new Date();
        } else if (action === 'schedule') {
          if (!publishedAt) throw new Error('publishedAt obrigatório para schedule');
          // auto-gerar se necessário
          if (!post.storyContent || !post.isWebStory) {
            if (!post.coverUrl) throw new Error('Post sem coverUrl para auto-gerar no schedule.');
            const html = generateWebStoryHtml({ post, options: (options || {}) as any });
            data.isWebStory = true;
            data.storyContent = html;
            if (options !== undefined) data.storyOptions = options as any;
            generated++;
          } else if (options !== undefined) {
            data.storyOptions = options as any;
          }
          data.status = 'scheduled';
          data.publishedAt = new Date(publishedAt);
        } else if (action === 'generate_publish' || action === 'generate_schedule') {
          if (!post.coverUrl) throw new Error('Post sem coverUrl para gerar Web Story');
          const html = generateWebStoryHtml({ post, options: (options || {}) as any });
          data.isWebStory = true;
          data.storyContent = html;
          if (options !== undefined) data.storyOptions = options as any;

          if (action === 'generate_publish') {
            data.status = 'published';
            data.publishedAt = post.publishedAt ?? new Date();
          } else {
            if (!publishedAt) throw new Error('publishedAt obrigatório para generate_schedule');
            data.status = 'scheduled';
            data.publishedAt = new Date(publishedAt);
          }
          generated++;
        }

        await prisma.post.update({ where: { id: post.id }, data });
        updated++;
        processed++;
      } catch (_e) {
        errors++;
      }
    }

    return NextResponse.json({ ok: true, processed, generated, updated, removed, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}