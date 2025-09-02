// app/api/admin/posts/[id]/generate-story/route.ts
// ============================================================================
// Admin API • Gerar Web Story (AMP) para um Post — nível PhD (revisado)
// ----------------------------------------------------------------------------
// POST /api/admin/posts/:id/generate-story
// Body: StoryOptions (JSON) — pode conter "publish: true" para publicar imediatamente
//
// Comportamento:
// - Gera o HTML AMP via generateWebStoryHtml(post, options).
// - Salva no Post: isWebStory=true, storyContent=HTML, storyOptions=options.
// - Se options.publish === true: status='published' e publishedAt=now (se ainda não houver).
// - Caso contrário, status='draft' (mantém publishedAt nulado).
//
// Retorno: { ok, storyUrl } com a rota pública /{locale}/story/{slug}.
// Requer admin (NextAuth).
// ============================================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateWebStoryHtml, StoryOptions } from '@/lib/webstory-generator';
import { syncPostAssetsById } from '@/lib/assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    // 1) Segurança
    const session = await getServerSession(authOptions);
    if ((session as any)?.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 });
    }

    const postId = params.id;
    if (!postId) {
      return NextResponse.json({ ok: false, error: 'ID do post é obrigatório.' }, { status: 400 });
    }

    // 2) Opções recebidas
    const options = (await req.json().catch(() => ({}))) as Partial<StoryOptions> & { publish?: boolean };

    // 3) Post original
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ ok: false, error: 'Post não encontrado' }, { status: 404 });
    }

    // 4) Geração do HTML AMP
    const storyHtml = generateWebStoryHtml({ post, options: (options || {}) as any });

    // 5) Persistência
    const publishNow = !!options?.publish;
    const updateData: any = {
      isWebStory: true,
      storyContent: storyHtml,
      storyOptions: (options || null) as any,
      status: publishNow ? 'published' : 'draft',
    };

    // publishedAt coerente
    if (publishNow) {
      updateData.publishedAt = post.publishedAt ?? new Date();
    } else {
      updateData.publishedAt = null;
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: updateData,
      select: { id: true, slug: true, locale: true },
    });

    // 6) Sincroniza assets do post (storyContent pode conter URLs do Blob)
    try { await syncPostAssetsById(postId); } catch {}

    // 7) OK
    return NextResponse.json({
      ok: true,
      storyUrl: `/${updatedPost.locale}/story/${updatedPost.slug}`,
    });
  } catch (e: any) {
    console.error(`[API Generate Story] Erro para Post ID ${params.id}:`, e);
    return NextResponse.json({ ok: false, error: e?.message || 'Erro interno do servidor' }, { status: 500 });
  }
}