// app/api/service/settings/route.ts
import { NextResponse } from 'next/server';
import { LOCALES, DEFAULT_LOCALE } from '@/config/locales';
import { getSiteSettings } from '@/lib/settings';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isService(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  const expected = process.env.SERVICE_TOKEN || process.env.NEXTJS_SERVICE_TOKEN || '';
  return !!token && !!expected && token === expected;
}

export async function GET(req: Request) {
  try {
    if (!isService(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const s = await getSiteSettings();

    const siteName = (s.siteName as any) || {};
    const titleTemplate = (s.titleTemplate as any) || {};
    const defaultMetaDescription = (s.defaultMetaDescription as any) || {};

    const [catsFi, catsEn] = await Promise.all([
      prisma.category.findMany({
        where: { locale: 'fi' },
        orderBy: [{ order: 'asc' }],
        select: { slug: true, name: true, order: true },
      }),
      prisma.category.findMany({
        where: { locale: 'en' },
        orderBy: [{ order: 'asc' }],
        select: { slug: true, name: true, order: true },
      }),
    ]);

    const body = {
      ok: true,
      locales: { supported: LOCALES, default: DEFAULT_LOCALE },
      brand: {
        siteName: { fi: String(siteName.fi || '').trim(), en: String(siteName.en || '').trim() },
      },
      seo: {
        titleTemplate: { fi: String(titleTemplate.fi || '').trim(), en: String(titleTemplate.en || '').trim() },
        defaultMetaDescription: { fi: String(defaultMetaDescription.fi || '').trim(), en: String(defaultMetaDescription.en || '').trim() },
        defaultMetaImage: s.defaultMetaImage || null,
        twitterHandle: s.twitterHandle || null,
      },
      site: {
        siteUrl: s.siteUrl || null,
        logoUrl: s.logoUrl || null,
      },
      categories: {
        fi: catsFi.map((c) => ({ slug: c.slug, name: c.name, order: c.order })),
        en: catsEn.map((c) => ({ slug: c.slug, name: c.name, order: c.order })),
      },
    };

    return new NextResponse(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}