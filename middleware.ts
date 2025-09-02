// middleware.ts
// ============================================================================
// Middleware de localização
// - Garante prefixo /[locale] nas rotas de página.
// - Usa cookie 'lang' como preferência e DEFAULT_LOCALE como fallback.
// - Ignora /api, /_next, /favicon e arquivos estáticos.
// - Melhoria: usa LOCALES/DEFAULT_LOCALE de uma fonte única (src/config/locales.ts).
// ============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LOCALES, DEFAULT_LOCALE, isLocale } from '@/config/locales';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ignora API, assets do Next e arquivos estáticos
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Obtém o primeiro segmento do caminho
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];

  // Se já há um locale suportado como primeiro segmento, segue adiante.
  if ((LOCALES as readonly string[]).includes(first)) {
    return NextResponse.next();
  }

  // Preferência via cookie 'lang' (se válido), senão usa DEFAULT_LOCALE
  const cookieLang = req.cookies.get('lang')?.value;
  const locale = isLocale(cookieLang) ? cookieLang : DEFAULT_LOCALE;

  // Redireciona para o mesmo path com o prefixo de locale aplicado
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

// Matcher mantém o comportamento atual: aplica middleware em tudo,
// exceto _next e arquivos estáticos com extensão.
export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};