// app/api/stories/route.ts
// ============================================================================
// API Pública • Web Stories e Destaques — nível PhD
// ----------------------------------------------------------------------------
// O que faz:
// - Lista itens para a seção "Web Stories" da Home.
// - Prioriza posts marcados como isWebStory=true e linka para /{locale}/story/{slug}.
// - Fallback: se não houver stories reais, busca posts com tags 'webstory'/'webstories'
//   e linka para a página do artigo (/category/...).
//
// Parâmetros (query):
// - locale=fi|en (default: fi)
// - limit=1..24 (default: 12)
//
// Resposta:
// { ok: true, items: [{ id, title, cover, href, ts }] }
//
// Cache:
// - Headers com s-maxage + SWR para performance em produção.
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toInt(s: string | null, def: number) {
  const n = parseInt(String(s || ''), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locale = (searchParams.get('locale') || 'fi').toLowerCase();
    const limit = Math.min(24, toInt(searchParams.get('limit'), 12));

    // 1) Stories reais (isWebStory = true)
    let items = await prisma.post.findMany({
      where: {
        locale,
        status: 'published',
        isWebStory: true,
      } as any,
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        coverUrl: true,
        category: true,
        publishedAt: true,
        locale: true,
        isWebStory: true,
      },
    });

    // 2) Fallback por tags (webstory/webstories)
    if (items.length === 0) {
      items = await prisma.post.findMany({
        where: {
          locale,
          status: 'published',
          OR: [
            { tags: { has: 'webstory' } },
            { tags: { has: 'webstories' } },
          ],
        } as any,
        orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          coverUrl: true,
          category: true,
          publishedAt: true,
          locale: true,
          isWebStory: false as any,
        },
      });
    }

    const out = items.map((p) => ({
      id: p.id,
      title: p.title,
      cover: p.coverUrl || null,
      href: p.isWebStory
        ? `/${p.locale}/story/${p.slug}`
        : `/${p.locale}/category/${p.category}/${p.slug}`,
      ts: p.publishedAt ? new Date(p.publishedAt).getTime() : null,
    }));

    return new NextResponse(JSON.stringify({ ok: true, items: out }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=120',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server error' }, { status: 500 });
  }
}