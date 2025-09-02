// app/robots.txt/route.ts
// ============================================================================
// robots.txt dinâmico — nível PhD
// ----------------------------------------------------------------------------
// Objetivos:
// - Funcionar com QUALQUER domínio (custom domains), sem depender de hardcode.
// - Usar envs quando houver (NEXT_PUBLIC_SITE_URL ou NEXTAUTH_URL), senão
//   inferir do request (x-forwarded-* / host / proto) com fallback seguro.
// - Nunca quebrar: sempre retorna um robots.txt válido.
// - Apontar para /sitemap-index.xml (dinâmico) na mesma origem.
// - Opção de bloquear tudo via env ROBOTS_DISALLOW_ALL (staging/preview).
// ============================================================================

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Converte env string para boolean (true/false), com defaults seguros
function envBool(name: string, def = false): boolean {
  const v = process.env[name];
  if (!v) return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).trim().toLowerCase());
}

// Remove múltiplas barras e barra final
function trimTrailingSlash(u: string) {
  return String(u || '').replace(/\/+$/, '');
}

// Detecta a base URL:
// 1) NEXT_PUBLIC_SITE_URL ou NEXTAUTH_URL (se setado)
// 2) x-forwarded-host + x-forwarded-proto (proxy/CDN)
// 3) host + proto heurístico (https fora de localhost)
// 4) fallback: http://localhost:3000
function getBaseUrl(req: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  if (envUrl) {
    try {
      const u = new URL(envUrl);
      return trimTrailingSlash(u.origin);
    } catch {
      // ignora env inválida e tenta headers
    }
  }

  // Tenta cabeçalhos de proxy/CDN
  const forwardedHost = req.headers.get('x-forwarded-host') || '';
  const forwardedProto = req.headers.get('x-forwarded-proto') || '';
  const rawHost = forwardedHost || (req.headers.get('host') || '');

  // Em alguns proxies, x-forwarded-host pode vir com múltiplos valores
  const host = rawHost.split(',')[0].trim();
  let proto = forwardedProto.split(',')[0].trim();

  if (!proto) {
    // Heurística: localhost -> http, senão https
    proto = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  }

  const candidate = `${proto}://${host}`;
  try {
    const u = new URL(candidate);
    return trimTrailingSlash(u.origin);
  } catch {
    // Fallback definitivo
    return 'http://localhost:3000';
  }
}

export async function GET(req: Request) {
  try {
    const base = getBaseUrl(req);
    const blockAll = envBool('ROBOTS_DISALLOW_ALL', false);

    // Política principal
    // - Em produção, por padrão liberamos (Allow: /) para qualquer domínio.
    // - Se ROBOTS_DISALLOW_ALL=true, bloqueamos tudo (útil em staging/preview).
    const lines: string[] = [];

    if (blockAll) {
      // Bloqueia tudo (staging/preview)
      lines.push(
        'User-agent: *',
        'Disallow: /',
        '',
        `Sitemap: ${base}/sitemap-index.xml`,
      );
    } else {
      // Permite tudo, com exceções sensatas
      lines.push(
        'User-agent: *',
        'Allow: /',
        '',
        // Zonas internas e rotas não indexáveis
        'Disallow: /api/',
        'Disallow: /_next/',
        'Disallow: /favicon.ico',
        'Disallow: /*/admin/', // ex.: /fi/admin/..., /en/admin/...
        '',
        // Mapa de site dinâmico (sempre usa a base detectada)
        `Sitemap: ${base}/sitemap-index.xml`,
      );
    }

    const body = lines.join('\n');
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // Cache leve (1h). Ajuste conforme necessário.
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch {
    // Fallback: nunca quebrar — ainda devolve algo válido
    const fallback = [
      'User-agent: *',
      'Allow: /',
      '',
      'Sitemap: /sitemap-index.xml',
    ].join('\n');
    return new NextResponse(fallback, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}