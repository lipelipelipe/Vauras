// app/sitemaps/posts/[locale]/[ym].xml/route.ts
// ============================================================================
// Posts Sitemap Mensal — nível PhD
// ----------------------------------------------------------------------------
// - Rota: /sitemaps/posts/{locale}/{YYYY-MM}.xml
// - Lista URLs daquele mês para o idioma com lastmod, alternates xhtml e image.
// - Domínio dinâmico (env ou headers); cache amigável; fail-safe.
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Detecta a base URL (env > headers) — funciona em qualquer domínio
function getBaseUrl(req: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  if (envUrl) {
    try {
      const u = new URL(envUrl);
      return u.origin.replace(/\/+$/, '');
    } catch {
      // ignora env inválida e tenta headers
    }
  }
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`.replace(/\/+$/, '');
}

// Escapa XML
function esc(s: string) {
  return String(s || '').replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&apos;'
  );
}

// Cabeçalho do urlset com namespaces necessários
function urlsetOpen() {
  return `<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">`;
}

// Aceita "YYYY-MM" ou "YYYY-MM.xml"
function parseYm(ym: string): { start: Date; end: Date } | null {
  const raw = ym.endsWith('.xml') ? ym.slice(0, -4) : ym;
  const m = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  if (isNaN(y) || isNaN(mo) || mo < 1 || mo > 12) return null;

  // Mês em UTC (evita problemas de fuso)
  const start = new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0));
  // Último dia do mês
  const end = new Date(Date.UTC(y, mo, 0, 23, 59, 59));
  return { start, end };
}

export async function GET(
  req: Request,
  { params }: { params: { locale: string; ym: string } }
) {
  const base = getBaseUrl(req);

  try {
    // Locale normalizado (apenas 'fi' ou 'en'); outros caem para 'fi'
    const locale = params.locale === 'en' ? 'en' : 'fi';
    const other = locale === 'fi' ? 'en' : 'fi';

    const rng = parseYm(params.ym);
    if (!rng) {
      return NextResponse.json({ error: 'Invalid month format (YYYY-MM)' }, { status: 400 });
    }

    // Seleciona posts publicados no mês:
    // - publishedAt entre [start, end], OU (publishedAt null e updatedAt no range)
    // - status published, idioma correspondente
    const posts = await prisma.post.findMany({
      where: {
        locale,
        status: 'published',
        OR: [
          { publishedAt: { gte: rng.start, lte: rng.end } },
          { AND: [{ publishedAt: null }, { updatedAt: { gte: rng.start, lte: rng.end } }] },
        ],
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 50000, // limite por sitemap (especificação: 50.000 URLs)
      select: {
        groupId: true,
        slug: true,
        category: true,
        coverUrl: true,
        updatedAt: true,
      },
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n${urlsetOpen()}\n`;

    for (const p of posts) {
      const loc = `${base}/${locale}/category/${p.category}/${p.slug}`;
      const lastmod = p.updatedAt.toISOString();

      // Alternates (hreflang) para o "outro" idioma quando houver tradução
      let xhtml = '';
      if (p.groupId) {
        const sib = await prisma.post.findFirst({
          where: { groupId: p.groupId, locale: other, status: 'published' },
          select: { slug: true, category: true },
        });
        if (sib) {
          const alt = `${base}/${other}/category/${sib.category}/${sib.slug}`;
          xhtml =
`    <xhtml:link rel="alternate" hreflang="${other}" href="${esc(alt)}" />
    <xhtml:link rel="alternate" hreflang="${locale}" href="${esc(loc)}" />`;
        }
      }

      // Imagem (capa), se houver
      const img = p.coverUrl
        ? `\n    <image:image>\n      <image:loc>${esc(p.coverUrl)}</image:loc>\n    </image:image>`
        : '';

      xml += `  <url>
    <loc>${esc(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
${xhtml || ''}${img}
  </url>\n`;
    }

    xml += `</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        // Cache amigável (1h) + SWR 10 min — ajuste conforme necessário
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch {
    // Fail-safe: retorna um urlset vazio porém válido, para nunca quebrar indexação
    const safe = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
    return new NextResponse(safe, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
}