// app/[locale]/(admin)/admin/posts/page.tsx
// ============================================================================
// Lista de Posts (Server Component) — nível PhD
// ----------------------------------------------------------------------------
// Agora conectado ao banco de dados (Prisma) para render inicial (SSR).
// - Busca a primeira página com filtros padrão (locale, sem status/categoria).
// - Passa os dados iniciais para o Client Component (PostsListClient),
//   que controla filtros, paginação e exclusão.
// - Mantém o layout protegido via route group (admin).
// ============================================================================

import { prisma } from '@/lib/prisma';
import PostsListClient from '@/components/admin/PostsListClient';

type PageProps = {
  params: { locale: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function AdminPostsListPage({ params }: PageProps) {
  const locale = params.locale || 'fi';

  // Render inicial: página 1, perPage 20
  const page = 1;
  const perPage = 20;
  const skip = (page - 1) * perPage;

  const [rows, total] = await Promise.all([
    prisma.post.findMany({
      where: { locale },
      orderBy: [{ updatedAt: 'desc' }],
      skip,
      take: perPage,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        category: true,
        updatedAt: true,
      },
    }),
    prisma.post.count({ where: { locale } }),
  ]);

  const items = rows.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status as 'draft' | 'published' | 'scheduled',
    category: p.category,
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Posts</h1>
      </div>

      <PostsListClient
        locale={locale}
        initial={{
          items,
          total,
          page,
          perPage,
        }}
      />
    </div>
  );
}