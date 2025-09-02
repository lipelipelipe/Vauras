// src/lib/menu.ts
// ============================================================================
// Menu dinâmico — nível PhD (Server-only)
// ----------------------------------------------------------------------------
// - Carrega menu do DB por locale (visíveis, ordenados).
// - Normaliza href: se relativo, prefixa /{locale}/.
// - Fallback: se não houver itens, usa categorias do locale (sem gravar no DB).
// ============================================================================

import 'server-only';
import { prisma } from '@/lib/prisma';

export type PublicMenuItem = {
  label: string;
  href: string;   // absoluto, pronto para <Link href={...}>
  order: number;
  visible: boolean;
};

function toAbsoluteHref(locale: string, rawHref: string): string {
  const h = String(rawHref || '').trim();
  if (!h) return `/${locale}`;
  // Se o href já for absoluto (começa com /), mantém
  if (h.startsWith('/')) return h.replace(/\/+$/, '');
  // Caso contrário, trata como relativo e prefixa com /{locale}/
  return `/${locale}/${h.replace(/^\/*/, '').replace(/\/+$/, '')}`;
}

export async function getPublicMenu(locale: string): Promise<PublicMenuItem[]> {
  const l = (locale || 'fi').toLowerCase();
  // 1) Tenta menu do DB
  const rows = await prisma.menuItem.findMany({
    where: { locale: l, visible: true },
    orderBy: { order: 'asc' },
    select: { label: true, href: true, order: true, visible: true },
  });

  if (rows.length > 0) {
    return rows.map(r => ({
      label: r.label,
      href: toAbsoluteHref(l, r.href),
      order: r.order,
      visible: true,
    }));
  }

  // 2) Fallback: categorias
  const cats = await prisma.category.findMany({
    where: { locale: l },
    orderBy: { order: 'asc' },
    select: { name: true, slug: true },
  });

  return cats.map((c, idx) => ({
    label: c.name,
    href: `/${l}/category/${c.slug}`,
    order: (idx + 1) * 10,
    visible: true,
  }));
}