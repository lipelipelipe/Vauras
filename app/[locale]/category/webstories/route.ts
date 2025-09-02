// app/[locale]/category/webstories/route.ts
// ============================================================================
// Redirect permanente da rota antiga de categoria para a nova URL
// /{locale}/web-stories — nível PhD (sem hardcode de host)
// ----------------------------------------------------------------------------
// Corrige o antigo redirecionamento que usava 'http://localhost' fixo.
// Agora reaproveita a própria origem do request, funcionando em qualquer domínio.
// ============================================================================

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { locale: string } }) {
  const { locale } = params;
  const url = new URL(req.url);
  url.pathname = `/${locale}/web-stories`;
  url.search = '';
  return NextResponse.redirect(url, { status: 308 });
}

export async function HEAD(req: Request, ctx: { params: { locale: string } }) {
  return GET(req, ctx);
}