// app/api/service/posts/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isService(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  const expected = process.env.SERVICE_TOKEN || process.env.NEXTJS_SERVICE_TOKEN || '';
  return !!token && !!expected && token === expected;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    if (!isService(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
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
        updatedAt: true,
        isWebStory: true,
        storyContent: true,
        storyOptions: true,
        seoTitle: true,
        seoDescription: true,
        canonicalUrl: true,
        focusKeyphrase: true,
        indexable: true,
        follow: true,
        groupId: true,
        createdAt: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, post });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}