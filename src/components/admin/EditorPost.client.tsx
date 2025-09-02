// src/components/admin/PostsListClient.tsx
// ============================================================================
// Lista de Posts (Client Component) — nível PhD (categorias dinâmicas)
// ----------------------------------------------------------------------------
// - Busca categorias reais do DB (/api/admin/categories).
// - Fallback do Menu (category/<slug> ou único segmento) quando DB vazio.
// - Remove arrays fixos, mantém filtros/paginação e UX.
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
type Cat = { slug: string; name: string };

function extractCategorySlugFromHref(href: string, locale: 'fi' | 'en'): string | null {
  try {
    const h = String(href || '').trim();
    if (!h) return null;

    const rx1 = /^\/?category\/([a-z0-9-]+)\/?$/i;
    const m1 = rx1.exec(h);
    if (m1?.[1]) return m1[1].toLowerCase();

    const rx2 = new RegExp(`^\\/?${locale}\\/category\\/([a-z0-9-]+)\\/?$`, 'i');
    const m2 = rx2.exec(h);
    if (m2?.[1]) return m2[1].toLowerCase();

    const rx3 = /^\/?([a-z0-9-]+)\/?$/i;
    const m3 = rx3.exec(h);
    if (m3?.[1]) return m3[1].toLowerCase();

    return null;
  } catch {
    return null;
  }
}

export default function PostsListClient({ locale, initial }: Props) {
  const normLocale = (locale || 'fi').toLowerCase() as 'fi' | 'en';

  // Estado principal
  const [items, setItems] = useState<PostRow[]>(initial.items || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Filtros e paginação
  const [q, setQ] = useState<string>('');
  const [status, setStatus] = useState<StatusFilter>('all');

  // Categorias dinâmicas
  const [cats, setCats] = useState<Cat[]>([]);
  const [catValue, setCatValue] = useState<string>('all');
  const [catsLoading, setCatsLoading] = useState<boolean>(true);

  const [page, setPage] = useState<number>(initial.page || 1);
  const [perPage, setPerPage] = useState<number>(initial.perPage || 20);
  const [total, setTotal] = useState<number>(initial.total || 0);

  // Debounce da busca
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carregar categorias do DB + fallback do Menu
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setCatsLoading(true);
        const r = await fetch(`/api/admin/categories?locale=${normLocale}`, { cache: 'no-store', signal: ac.signal });
        const j = await r.json().catch(() => ({}));
        let arr: Cat[] = r.ok && j?.ok ? (j.items || []) : [];

        if (arr.length === 0) {
          const m = await fetch(`/api/admin/menu?locale=${normLocale}`, { cache: 'no-store', signal: ac.signal });
          const mj = await m.json().catch(() => ({}));
          const menuItems: any[] = m.ok && mj?.ok ? (mj.items || []) : [];
          const derived: Cat[] = [];
          for (const it of menuItems) {
            const s = extractCategorySlugFromHref(String(it.href || ''), normLocale);
            if (s) derived.push({ slug: s, name: it.label || s });
          }
          const seen = new Set<string>();
          arr = derived.filter((c) => (seen.has(c.slug) ? false : (seen.add(c.slug), true)));
        }

        setCats(arr);
        // mantém seleção atual; se seleção for inválida, volta para 'all'
        setCatValue((cur) => (cur !== 'all' && !arr.some((c) => c.slug === cur) ? 'all' : cur));
      } catch {
        setCats([]);
      } finally {
        setCatsLoading(false);
      }
    })();
    return () => ac.abort();
  }, [normLocale]);

  // Refetch (com debounce para busca)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void fetchData(1); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, catValue]);

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
      sp.set('locale', normLocale);
      sp.set('page', String(nextPage));
      sp.set('perPage', String(perPage));
      if (q.trim()) sp.set('q', q.trim());
      if (status !== 'all') sp.set('status', status);
      if (catValue !== 'all') sp.set('category', catValue);

      const res = await fetch(`/api/admin/posts?${sp.toString()}`, { method: 'GET', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setItems(
        (data.items || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          status: p.status,
          category: p.category,
          updatedAt: p.updatedAt, // ISO
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

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {/* Busca */}
          <label className="md:col-span-2">
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

          {/* Categoria dinâmica */}
          <label>
            <span className="mb-1 block text-xs font-medium text-gray-600">Categoria</span>
            <select
              value={catValue}
              onChange={(e) => setCatValue(e.target.value)}
              disabled={catsLoading}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
              aria-label="Filtrar por categoria"
            >
              <option value="all">Todas</option>
              {cats.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
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
        locale={normLocale}
        onDelete={async (id) => {
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
            const isLastOnPage = items.length <= 1 && page > 1;
            await fetchData(isLastOnPage ? page - 1 : page);
          } catch (e: any) {
            setError(e?.message || 'Falha ao excluir post.');
          } finally {
            setLoading(false);
          }
        }}
        showViews={false}
        perPage={perPage}
      />

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Página {page} de {totalPages} • {total} item(s)
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
            disabled={page >= totalPages || loading}
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
            href={`/${normLocale}/admin/posts/new`}
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