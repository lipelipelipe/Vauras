// app/api/admin/settings/route.ts
// ============================================================================
// API para Gerenciar as Configurações Globais do Site — Nível PhD
// ----------------------------------------------------------------------------
// Funções:
// - GET: Retorna as configurações atuais. Se não existirem, cria o registro padrão.
//        Acessível apenas por administradores.
// - PATCH: Atualiza as configurações. Valida os dados de entrada com Zod e,
//          crucialmente, invalida o cache do Redis após a atualização.
//          Acessível apenas por administradores.
// ============================================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Schema de validação para os dados de entrada do PATCH. Garante a integridade dos dados.
const SettingsSchema = z.object({
  // O `any()` é usado aqui porque Zod não tem um validador de JSON nativo robusto,
  // mas podemos garantir que é um objeto.
  siteName: z.any().refine(val => typeof val === 'object' && val !== null && !Array.isArray(val), {
    message: 'O nome do site deve ser um objeto JSON.'
  }),
  titleTemplate: z.any().refine(val => typeof val === 'object' && val !== null && !Array.isArray(val), {
    message: 'O template de título deve ser um objeto JSON.'
  }),
  defaultMetaDescription: z.any().optional().nullable(),
  defaultMetaImage: z.string().url('A URL da imagem deve ser válida.').optional().nullable(),
  twitterHandle: z.string().max(16, 'O handle do Twitter não pode exceder 15 caracteres.').optional().nullable(),

  // Novos campos para SEO da Home / Structured Data
  siteUrl: z.string().url('A URL do site deve ser válida.').optional().nullable(),
  logoUrl: z.string().url('A URL do logo deve ser válida.').optional().nullable(),
});

// GET /api/admin/settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if ((session as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });

    // Se as configurações não existirem, cria com os valores padrão (completos)
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 'singleton',
          siteName: { fi: 'Uutiset', en: 'Uutiset' },
          titleTemplate: { fi: '%s • Uutiset', en: '%s • Uutiset' },
          defaultMetaDescription: { fi: 'Ajankohtaiset uutiset', en: 'Latest news' },
          defaultMetaImage: null,
          siteUrl: null,
          logoUrl: null,
          twitterHandle: null,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

// PATCH /api/admin/settings
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const parsed = SettingsSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Corpo da requisição inválido', details: parsed.error.flatten() }, { status: 400 });
    }

    const updatedSettings = await prisma.settings.update({
      where: { id: 'singleton' },
      data: parsed.data,
    });

    // Invalida o cache do Redis (para refletir mudanças imediatamente)
    await redis.del('site_settings');

    return NextResponse.json({ ok: true, settings: updatedSettings });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}