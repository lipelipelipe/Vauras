// app/api/admin/webstories/[id]/route.ts
// ============================================================================
// Admin API • Web Stories — Ações em 1 item (robusto/anti-falha e tipado)
// ----------------------------------------------------------------------------
// PATCH /api/admin/webstories/:id
// Body: { action: 'generate'|'publish'|'schedule'|'draft'|'remove', publishedAt?, options? }
// - generate: gera HTML AMP (usa SEO do post) e salva (não publica).
// - publish: publica (se não houver story, gera automaticamente se tiver coverUrl).
// - schedule: agenda (se não houver story, gera automaticamente se tiver coverUrl).
// - draft: volta a rascunho (não apaga o story).
// - remove: remove o story (mantém o post), zera storyOptions com Prisma.DbNull e
//           storyContent com null (é String no Prisma).
//
// DELETE /api/admin/webstories/:id
// - Igual a action=remove (idempotente).
// ============================================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { generateWebStoryHtml } from '@/lib/webstory-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ActionSchema = z.object({
  action: z.enum(['generate', 'publish', 'schedule', 'draft', 'remove']),
  publishedAt: z.string().datetime().optional(),
  options: z.any().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if ((session as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const json = await req.json().catch(() => ({}));
    const parsed = ActionSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    const { action, publishedAt, options } = parsed.data;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data: Prisma.PostUpdateInput = {};

    if (action === 'remove') {
      data.isWebStory = false;
      data.storyContent = null;         // String? -> use null
      data.storyOptions = Prisma.DbNull; // Json? -> use DbNull
    } else if (action === 'generate') {
      if (!post.coverUrl) {
        return NextResponse.json(
          { error: 'Post sem coverUrl. Defina uma capa antes de gerar o Web Story.' },
          { status: 400 }
        );
      }
      const html = generateWebStoryHtml({ post, options: (options || {}) as any });
      data.isWebStory = true;
      data.storyContent = html;          // String
      if (options !== undefined) {
        data.storyOptions = options as any; // JSON
      }
      // Não altera status/publishedAt aqui
    } else if (action === 'publish' || action === 'schedule') {
      // Auto-gerar se necessário
      if (!post.storyContent || !post.isWebStory) {
        if (!post.coverUrl) {
          return NextResponse.json(
            { error: 'Post sem coverUrl. Gere o Web Story antes ou defina uma capa.' },
            { status: 400 }
          );
        }
        const html = generateWebStoryHtml({ post, options: (options || {}) as any });
        data.isWebStory = true;
        data.storyContent = html;
        if (options !== undefined) {
          data.storyOptions = options as any;
        }
      } else if (options !== undefined) {
        data.storyOptions = options as any;
      }

      if (action === 'publish') {
        data.status = 'published';
        data.publishedAt = post.publishedAt ?? new Date();
      } else {
        if (!publishedAt) {
          return NextResponse.json({ error: 'publishedAt é obrigatório para schedule' }, { status: 400 });
        }
        data.status = 'scheduled';
        data.publishedAt = new Date(publishedAt);
      }
    } else if (action === 'draft') {
      data.status = 'draft';
      data.publishedAt = null; // DateTime? -> null
    }

    const updated = await prisma.post.update({
      where: { id },
      data,
      select: { id: true, status: true, updatedAt: true, locale: true, slug: true },
    });

    return NextResponse.json({
      ok: true,
      id: updated.id,
      status: updated.status,
      storyUrl: `/${updated.locale}/story/${updated.slug}`,
      updatedAt: updated.updatedAt,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if ((session as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const id = params.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await prisma.post.update({
      where: { id },
      data: {
        isWebStory: false,
        storyContent: null,          // String? -> null
        storyOptions: Prisma.DbNull, // Json? -> DbNull
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}