// src/lib/footer.ts
// ============================================================================
// Lógica para buscar os dados do rodapé (Server-only)
// ============================================================================

import 'server-only';
import { prisma } from '@/lib/prisma';

// Tipos para os dados públicos do rodapé
export type PublicFooterLink = {
  id: string;
  label: string;
  href: string;
  external: boolean;
  rel: string | null;
};

export type PublicFooterGroup = {
  id: string;
  title: string;
  links: PublicFooterLink[];
};

/**
 * Busca todos os grupos de rodapé visíveis e seus links visíveis para um
 * determinado locale, já ordenados.
 */
export async function getPublicFooter(locale: string): Promise<PublicFooterGroup[]> {
  const l = (locale || 'fi').toLowerCase();

  const groups = await prisma.footerGroup.findMany({
    where: {
      locale: l,
      visible: true, // Apenas grupos visíveis
    },
    orderBy: {
      order: 'asc', // Ordena os grupos
    },
    select: {
      id: true,
      title: true,
      links: {
        where: {
          visible: true, // Apenas links visíveis dentro do grupo
        },
        orderBy: {
          order: 'asc', // Ordena os links dentro de cada grupo
        },
        select: {
          id: true,
          label: true,
          href: true,
          external: true,
          rel: true,
        },
      },
    },
  });

  return groups;
}