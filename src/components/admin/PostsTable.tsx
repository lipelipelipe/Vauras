// src/components/admin/PostsTable.tsx
// ============================================================================
// Tabela de Posts — nível PhD (Client Component)
// ----------------------------------------------------------------------------
// Objetivo:
// - Exibir uma lista de posts com colunas essenciais e ações (editar/excluir).
// - Suportar estado de loading (skeleton) e estado vazio.
// - Integrar facilmente no Admin (lista e buscas).
//
// Props:
// - items: PostRow[] (linhas a exibir)
// - loading?: boolean (renderiza skeletons quando true)
// - locale: string (para montar links de edição)
// - onEdit?: (id: string) => void | Promise<void> (opcional; se ausente, usa link)
// - onDelete?: (id: string) => void | Promise<void> (opcional; exibe botão apagar)
// - showViews?: boolean (se true, mostra coluna Views (7d))
// - perPage?: number (somente para layout/skeletons; paginação real fica no server)
//
// Notas:
// - A tabela se mantém sem estado próprio de paginação/filtros (controlados fora).
// - Formatação de datas simples (toLocaleString); pode ser trocado por Intl.DateTimeFormat.
// ============================================================================

'use client';

import Link from 'next/link';

export type PostRow = {
  id: string;
  title: string;
  slug?: string;
  status: 'draft' | 'published' | 'scheduled';
  category: string;           // slug da categoria principal
  updatedAt: string;          // ISO
  publishedAt?: string | null;
  tags?: string[];
  coverUrl?: string;
  views7d?: number;           // opcional (quando disponível)
};

type Props = {
  items: PostRow[];
  loading?: boolean;
  locale: string;
  onEdit?: (id: string) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  showViews?: boolean;
  perPage?: number;
};

function StatusPill({ status }: { status: PostRow['status'] }) {
  const map: Record<PostRow['status'], { text: string; cls: string }> = {
    draft:     { text: 'Rascunho',  cls: 'bg-gray-100 text-gray-700' },
    scheduled: { text: 'Agendado', cls: 'bg-amber-100 text-amber-800' },
    published: { text: 'Publicado', cls: 'bg-emerald-100 text-emerald-800' },
  };
  const cfg = map[status];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${cfg.cls}`}>{cfg.text}</span>;
}

export default function PostsTable({
  items,
  loading,
  locale,
  onEdit,
  onDelete,
  showViews = true,
  perPage = 20
}: Props) {
  const skeletonRows = Array.from({ length: Math.min(perPage, 6) }, (_, i) => i);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
            <th className="px-4 py-3">Título</th>
            <th className="px-4 py-3">Status</th>
            {showViews && <th className="px-4 py-3">Views (7d)</th>}
            <th className="px-4 py-3">Categoria</th>
            <th className="px-4 py-3">Atualizado</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {/* Loading state (skeletons) */}
          {loading && skeletonRows.map((i) => (
            <tr key={`sk-${i}`} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="h-4 w-64 animate-pulse rounded bg-gray-100" aria-hidden />
                <div className="mt-1 h-3 w-28 animate-pulse rounded bg-gray-100" aria-hidden />
              </td>
              <td className="px-4 py-3"><span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">—</span></td>
              {showViews && <td className="px-4 py-3 text-sm text-gray-700">—</td>}
              <td className="px-4 py-3 text-sm text-gray-700">—</td>
              <td className="px-4 py-3 text-sm text-gray-700">—</td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex items-center gap-2">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded bg-gray-100" />
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded bg-gray-100" />
                </div>
              </td>
            </tr>
          ))}

          {/* Empty state */}
          {!loading && items.length === 0 && (
            <tr>
              <td colSpan={showViews ? 6 : 5} className="px-4 py-12 text-center text-sm text-gray-500">
                Nenhum post encontrado.
              </td>
            </tr>
          )}

          {/* Rows */}
          {!loading && items.map((row) => {
            const updated = new Date(row.updatedAt);
            const updatedAtStr = isNaN(+updated) ? '—' : updated.toLocaleString();

            return (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{row.title}</div>
                  <div className="mt-0.5 text-xs text-gray-500 break-all">
                    /{locale}/category/{row.category}/{row.slug || '—'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={row.status} />
                </td>
                {showViews && (
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {typeof row.views7d === 'number' ? row.views7d.toLocaleString() : '—'}
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-gray-700">{row.category}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{updatedAtStr}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    {onEdit ? (
                      <button
                        onClick={() => onEdit(row.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100"
                        title="Editar"
                        aria-label={`Editar ${row.title}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      </button>
                    ) : (
                      <Link
                        href={`/${locale}/admin/posts/${row.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100"
                        title="Editar"
                        aria-label={`Editar ${row.title}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      </Link>
                    )}

                    {onDelete && (
                      <button
                        onClick={() => onDelete(row.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100"
                        title="Excluir"
                        aria-label={`Excluir ${row.title}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6h10z" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}