// src/lib/slug.ts
// ============================================================================
// Utilidades de slug — nível PhD (unificado para client/server)
// ----------------------------------------------------------------------------
// - slugify: minúsculo, sem acentos/diacríticos, hífens, sem pontuação, limite.
// - ensureUniqueSlug: gera variante única usando callback de existência.
// - ensureUniqueSlugFromList: versão síncrona usando um conjunto/array existente.
// ============================================================================

import { stripDiacritics } from './seo/text';

/**
 * Normaliza string para slug ASCII hifenizado, com limite de tamanho.
 */
export function slugify(input: string, maxLen = 60): string {
  const s = stripDiacritics(String(input || ''))
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // remove pontuação
    .replace(/\s+/g, '-')          // espaços -> hífen
    .replace(/-+/g, '-')           // colapsa múltiplos hífens
    .replace(/^-|-$/g, '');        // trim de hífens

  return s.slice(0, Math.max(1, maxLen));
}

/**
 * Tenta preservar cortes "elegantes" (no limite próximo a hífen/space).
 * Útil quando precisa truncar slugs longos sem cortar palavras no meio.
 */
export function truncateSlugNicely(slug: string, maxLen = 60): string {
  if (slug.length <= maxLen) return slug;
  const cut = slug.slice(0, maxLen);
  const lastHy = cut.lastIndexOf('-');
  if (lastHy > maxLen * 0.6) return cut.slice(0, lastHy);
  return cut;
}

export type SlugExists = (candidate: string) => boolean | Promise<boolean>;

/**
 * Garante unicidade do slug chamando uma função de verificação (sync ou async).
 * - Tenta "base", depois "base-2", "base-3", ... até maxAttempts.
 * - Ideal para banco/serviço (exists consulta DB).
 */
export async function ensureUniqueSlug(
  base: string,
  exists: SlugExists,
  maxAttempts = 50
): Promise<string> {
  const b = slugify(base);
  if (!b) return 'post';

  let candidate = b;
  for (let i = 1; i <= maxAttempts; i++) {
    const taken = await exists(candidate);
    if (!taken) return candidate;
    candidate = `${b}-${i + 1}`;
  }
  return `${b}-${Date.now()}`; // fallback extremo (não deve acontecer)
}

/**
 * Versão síncrona baseada em um conjunto/array de slugs existentes.
 */
export function ensureUniqueSlugFromList(
  base: string,
  existing: Iterable<string>,
  maxAttempts = 50
): string {
  const set = new Set(Array.from(existing || []).map((s) => String(s)));
  const b = slugify(base);
  if (!b) return 'post';

  let candidate = b;
  for (let i = 1; i <= maxAttempts; i++) {
    if (!set.has(candidate)) return candidate;
    candidate = `${b}-${i + 1}`;
  }
  return `${b}-${Date.now()}`;
}