// app/[locale]/(admin)/admin/pages/page.tsx
// ============================================================================
// Lista de Páginas (Server Component) — nível PhD
// ----------------------------------------------------------------------------
// - SSR inicial para velocidade e UX.
// - Usa PagesListClient para filtros/paginação.
// ============================================================================

import { prisma } from '@/lib/prisma';
import PagesListClient from '@/components/admin/pages/PagesListClient';

type PageProps = {
  params: { locale: string };
};

export default async function AdminPagesListPage({ params }: PageProps) {
  const locale = params.locale || 'fi';

  const page = 1;
  const perPage = 20;
  const skip = (page - 1) * perPage;

  const [rows, total] = await Promise.all([
    prisma.page.findMany({
      where: { locale },
      orderBy: [{ updatedAt: 'desc' }],
      skip,
      take: perPage,
      select: { id: true, title: true, path: true, status: true, updatedAt: true },
    }),
    prisma.page.count({ where: { locale } }),
  ]);

  const items = rows.map((p) => ({
    id: p.id,
    title: p.title,
    path: p.path,
    status: p.status as 'draft' | 'published' | 'scheduled',
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Páginas</h1>
      </div>
      <PagesListClient
        locale={locale}
        initial={{ items, total, page, perPage }}
      />
    </div>
  );
}