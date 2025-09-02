// src/components/admin/pages/PagesTable.tsx
// ============================================================================
// Tabela de Páginas (CMS) — nível PhD (Client Component)
// ----------------------------------------------------------------------------
// - Lista páginas com Título, Path, Status, Última atualização.
// - Ações: editar (link) e excluir (callback).
// - Skeletons e estado vazio.
// ============================================================================

'use client';

import Link from 'next/link';

export type PageRow = {
  id: string;
  title: string;
  path: string;
  status: 'draft' | 'published' | 'scheduled';
  updatedAt: string; // ISO
};

type Props = {
  locale: string;
  items: PageRow[];
  loading?: boolean;
  perPage?: number;
  onDelete?: (id: string) => void | Promise<void>;
};

function StatusPill({ status }: { status: PageRow['status'] }) {
  const map: Record<PageRow['status'], { text: string; cls: string }> = {
    draft:     { text: 'Rascunho',  cls: 'bg-gray-100 text-gray-700' },
    scheduled: { text: 'Agendado', cls: 'bg-amber-100 text-amber-800' },
    published: { text: 'Publicado', cls: 'bg-emerald-100 text-emerald-800' },
  };
  const cfg = map[status];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${cfg.cls}`}>{cfg.text}</span>;
}

export default function PagesTable({ locale, items, loading, perPage = 20, onDelete }: Props) {
  const skeletonRows = Array.from({ length: Math.min(perPage, 6) }, (_, i) => i);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
            <th className="px-4 py-3">Título</th>
            <th className="px-4 py-3">Path</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Atualizado</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading && skeletonRows.map((i) => (
            <tr key={`sk-${i}`} className="hover:bg-gray-50">
              <td className="px-4 py-3"><div className="h-4 w-64 animate-pulse rounded bg-gray-100" /></td>
              <td className="px-4 py-3"><div className="h-4 w-48 animate-pulse rounded bg-gray-100" /></td>
              <td className="px-4 py-3"><span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">—</span></td>
              <td className="px-4 py-3"><div className="h-4 w-36 animate-pulse rounded bg-gray-100" /></td>
              <td className="px-4 py-3 text-right"><div className="h-8 w-16 animate-pulse rounded bg-gray-100 inline-block" /></td>
            </tr>
          ))}

          {!loading && items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">
                Nenhuma página encontrada.
              </td>
            </tr>
          )}

          {!loading && items.map((p) => {
            const d = new Date(p.updatedAt);
            const updated = isNaN(+d) ? '—' : d.toLocaleString();
            return (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{p.title}</div>
                  <div className="mt-0.5 text-xs text-gray-500 break-all">
                    /{locale}/{p.path}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.path}</td>
                <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                <td className="px-4 py-3 text-sm text-gray-700">{updated}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <Link
                      href={`/${locale}/admin/pages/${p.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100"
                      title="Editar"
                      aria-label={`Editar ${p.title}`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.8"/></svg>
                    </Link>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(p.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100"
                        title="Excluir"
                        aria-label={`Excluir ${p.title}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6h10z" stroke="currentColor" strokeWidth="1.8"/></svg>
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