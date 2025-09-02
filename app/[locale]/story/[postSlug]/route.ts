// app/[locale]/story/[postSlug]/route.ts
// ============================================================================
// Rota de Visualização de Web Story — Nível PhD
// ----------------------------------------------------------------------------
// - Serve o HTML AMP pré-gerado (storyContent) de posts publicados e isWebStory.
// - Define X-Robots-Tag dinamicamente (index/nofollow) conforme flags do Post.
// - Mantém cache amigável (SWR) e Content-Type adequado.
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { locale: string; postSlug: string } }
) {
  try {
    const { locale, postSlug } = params;

    if (!locale || !postSlug) {
      return new Response('Parâmetros de rota ausentes.', { status: 400 });
    }

    // Busca rigorosa: story publicado e marcado como Web Story
    const storyPost = await prisma.post.findFirst({
      where: {
        slug: postSlug,
        locale: locale,
        isWebStory: true,
        status: 'published',
      },
      select: {
        storyContent: true,
        // Flags para robots
        indexable: true,
        follow: true,
      },
    });

    if (!storyPost || !storyPost.storyContent) {
      return new Response('Web Story não encontrado.', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // X-Robots-Tag coerente com flags do Post
    const robots = `${storyPost.indexable ? 'index' : 'noindex'}, ${storyPost.follow ? 'follow' : 'nofollow'}`;

    return new Response(storyPost.storyContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        'X-Robots-Tag': robots,
      },
    });
  } catch (e: any) {
    console.error(`[Web Story Route] Erro para /${params.locale}/story/${params.postSlug}:`, e);
    return new Response('Erro interno do servidor.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}