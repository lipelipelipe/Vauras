// src/lib/settings.ts
// ============================================================================
// Fonte da Verdade para as Configurações do Site (com Cache Redis) — Nível PhD
// ----------------------------------------------------------------------------
// Estratégia cache-first: tenta Redis (rápido), cai para DB se falhar/ausente.
// Sem timeouts longos: o wrapper do redis já garante ping curto e stub.
// ============================================================================

import 'server-only';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { Prisma } from '@prisma/client';

export type SiteSettings = {
  id: string;
  siteName: Prisma.JsonValue;
  titleTemplate: Prisma.JsonValue;
  defaultMetaDescription: Prisma.JsonValue | null;
  defaultMetaImage: string | null;
  siteUrl: string | null;
  logoUrl: string | null;
  twitterHandle: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const CACHE_KEY = 'site_settings';
const CACHE_TTL_SECONDS = 60 * 60; // 1h

function defaultSettings() {
  return {
    id: 'singleton',
    siteName: { fi: 'Uutiset', en: 'Uutiset' } as any,
    titleTemplate: { fi: '%s • Uutiset', en: '%s • Uutiset' } as any,
    defaultMetaDescription: { fi: 'Ajankohtaiset uutiset', en: 'Latest news' } as any,
    defaultMetaImage: null as string | null,
    siteUrl: null as string | null,
    logoUrl: null as string | null,
    twitterHandle: null as string | null,
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  // 1) Cache (rápido; se offline, wrapper devolve null sem travar)
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return cached as SiteSettings;
  } catch {
    // silencioso — wrapper já logou caso necessário
  }

  // 2) DB
  let settings = await prisma.settings.findUnique({
    where: { id: 'singleton' },
  });

  // 3) Auto-reparo com defaults completos
  if (!settings) {
    const data = defaultSettings();
    settings = await prisma.settings.create({ data });
  }

  // 4) Repovoa cache (best-effort; sem logs)
  try {
    await redis.set(CACHE_KEY, settings, { ex: CACHE_TTL_SECONDS });
  } catch {
    // silencioso
  }

  return settings as SiteSettings;
}