// app/api/service/webstories/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PutWebStoryBody } from '@/lib/service/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isService(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  const expected = process.env.SERVICE_TOKEN || process.env.NEXTJS_SERVICE_TOKEN || '';
  return !!token && !!expected && token === expected;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    if (!isService(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = PutWebStoryBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    const { storyContent, coverUrl, publish, storyOptions } = parsed.data;

    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true, locale: true, slug: true },
    });
    if (!post) {
      return NextResponse.json({ ok: false, error: 'Post not found' }, { status: 404 });
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        isWebStory: true,
        storyContent,
        storyOptions: (storyOptions ?? null) as any,
        ...(coverUrl ? { coverUrl } : {}),
        ...(publish
          ? { status: 'published', publishedAt: new Date() }
          : { status: undefined, publishedAt: undefined }),
      },
      select: { id: true, locale: true, slug: true, status: true, updatedAt: true },
    });

    return NextResponse.json({
      ok: true,
      postId: updated.id,
      status: updated.status,
      storyUrl: `/${updated.locale}/story/${updated.slug}`,
      updatedAt: updated.updatedAt,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}