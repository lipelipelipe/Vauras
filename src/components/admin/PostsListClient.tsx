// src/components/admin/PostsListClient.tsx
// ============================================================================
// Lista de Posts (Client Component) — nível PhD
// ----------------------------------------------------------------------------
// Responsável por:
// - Buscar posts reais via API /api/admin/posts (com filtros e paginação).
// - Exibir tabela usando PostsTable (client) e permitir excluir posts.
// - Controlar filtros (q, status, categoria) e paginação, com debounce de busca.
// - Atualizar a lista após excluir (refetch).
//
// Observações importantes:
// - Não recebe handlers do Server Component (evita "Event handlers cannot be passed...").
// - Recebe somente dados serializáveis: estado inicial (itens/paginação) e locale.
// - A coluna "Views (7d)" está desativada (showViews={false}) no MVP.
// - Categorias: usa slugs por locale (FI/EN) conforme o seed atual.
// ============================================================================

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import PostsTable, { type PostRow } from '@/components/admin/PostsTable';

type InitialPage = {
  items: PostRow[];
  total: number;
  page: number;
  perPage: number;
};

type Props = {
  locale: string;
  initial: InitialPage;
};

type StatusFilter = 'all' | 'draft' | 'published' | 'scheduled';

const CAT_FI = [
  { slug: 'politiikka', name: 'Politiikka' },
  { slug: 'talous', name: 'Talous' },
  { slug: 'urheilu', name: 'Urheilu' },
  { slug: 'kulttuuri', name: 'Kulttuuri' },
  { slug: 'teknologia', name: 'Teknologia' },
];
const CAT_EN = [
  { slug: 'politics', name: 'Politics' },
  { slug: 'business', name: 'Business' },
  { slug: 'sports', name: 'Sports' },
  { slug: 'culture', name: 'Culture' },
  { slug: 'technology', name: 'Technology' },
];

export default function PostsListClient({ locale, initial }: Props) {
  // Estado principal
  const [items, setItems] = useState<PostRow[]>(initial.items || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Filtros e paginação
  const [q, setQ] = useState<string>('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<string>('all');
  const [page, setPage] = useState<number>(initial.page || 1);
  const [perPage, setPerPage] = useState<number>(initial.perPage || 20);
  const [total, setTotal] = useState<number>(initial.total || 0);

  // Debounce da busca
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lista de categorias por locale
  const CATS = useMemo(() => (locale === 'en' ? CAT_EN : CAT_FI), [locale]);

  // Refetch (com debounce para busca)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchData(1); // ao mudar filtros, volta para a página 1
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, category]);

  // Mudança de página
  useEffect(() => {
    void fetchData(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  async function fetchData(nextPage: number) {
    try {
      setLoading(true);
      setError('');

      const sp = new URLSearchParams();
      sp.set('locale', locale);
      sp.set('page', String(nextPage));
      sp.set('perPage', String(perPage));
      if (q.trim()) sp.set('q', q.trim());
      if (status !== 'all') sp.set('status', status);
      if (category !== 'all') sp.set('category', category);

      const res = await fetch(`/api/admin/posts?${sp.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setItems(
        (data.items || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          status: p.status,
          category: p.category,
          updatedAt: p.updatedAt, // já vem como ISO do Prisma/Next
          views7d: undefined,
        })) as PostRow[]
      );
      setTotal(data.total || 0);
      setPage(data.page || nextPage);
      setPerPage(data.perPage || perPage);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar posts.');
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    const ok = confirm('Deseja realmente excluir este post? Esta ação não pode ser desfeita.');
    if (!ok) return;
    try {
      setLoading(true);
      setError('');

      const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      // Se era o último item da página e não estamos na primeira, retrocede uma página
      const isLastOnPage = items.length <= 1 && page > 1;
      await fetchData(isLastOnPage ? page - 1 : page);
    } catch (e: any) {
      setError(e?.message || 'Falha ao excluir post.');
    } finally {
      setLoading(false);
    }
  }

  // UI dos filtros + tabela + paginação
  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {/* Busca */}
          <label className="col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-600">Buscar</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Título do post..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
              aria-label="Buscar por título"
            />
          </label>

          {/* Status */}
          <label>
            <span className="mb-1 block text-xs font-medium text-gray-600">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
              aria-label="Filtrar por status"
            >
              <option value="all">Todos</option>
              <option value="draft">Rascunho</option>
              <option value="scheduled">Agendado</option>
              <option value="published">Publicado</option>
            </select>
          </label>

          {/* Categoria */}
          <label>
            <span className="mb-1 block text-xs font-medium text-gray-600">Categoria</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
              aria-label="Filtrar por categoria"
            >
              <option value="all">Todas</option>
              {CATS.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Erros */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Tabela de posts */}
      <PostsTable
        items={items}
        loading={loading}
        locale={locale}
        onDelete={onDelete}
        showViews={false}
        perPage={perPage}
      />

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Página {page} de {Math.max(1, Math.ceil(total / perPage))} • {total} item(s)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm disabled:opacity-60 hover:bg-gray-50"
          >
            Anterior
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / perPage) || loading}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm disabled:opacity-60 hover:bg-gray-50"
          >
            Próxima
          </button>
          <select
            value={perPage}
            onChange={(e) => setPerPage(Math.max(1, Math.min(100, parseInt(e.target.value || '20', 10))))}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm"
            title="Itens por página"
          >
            {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}/pág</option>)}
          </select>
          <Link
            href={`/${locale}/admin/posts/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Novo Post
          </Link>
        </div>
      </div>
    </div>
  );
}