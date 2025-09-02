// src/components/admin/webstories/WebStoriesManagerClient.tsx
// ============================================================================
// Admin • Web Stories — Client Manager (Nível PhD, UX aprimorada — toasts + otimista)
// ----------------------------------------------------------------------------
// - Ações individuais com atualização otimista e toasts:
//   • Gerar (rascunho)      → marca story pronto
//   • Publicar              → status publicado, gera se necessário (se tiver capa)
//   • Agendar               → status agendado
//   • Rascunho              → status draft
//   • Remover Story         → "Sem Story" imediato
// - Ações em lote preservam barra de mensagens e recarregam (payload de contadores).
// - Indicador Story (Pronto/Sem Story) em cada linha.
// ============================================================================

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

type Status = 'draft' | 'published' | 'scheduled';

type Row = {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: Status;
  updatedAt: string;           // ISO
  coverUrl?: string | null;
  isWebStory: boolean;
  hasStory: boolean;
};

type Props = { locale: string };

function Pill({ text, color }: { text: string; color: 'emerald' | 'amber' | 'slate' | 'rose' }) {
  const map = {
    emerald: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    slate: 'bg-gray-100 text-gray-700',
    rose: 'bg-rose-100 text-rose-800',
  };
  return <span className={clsx('inline-flex rounded-full px-2 py-0.5 text-xs', map[color])}>{text}</span>;
}
function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { text: string; cls: string }> = {
    draft:     { text: 'Rascunho',  cls: 'bg-gray-100 text-gray-700' },
    scheduled: { text: 'Agendado', cls: 'bg-amber-100 text-amber-800' },
    published: { text: 'Publicado', cls: 'bg-emerald-100 text-emerald-800' },
  };
  const cfg = map[status];
  return <span className={clsx('inline-flex rounded-full px-2 py-0.5 text-xs', cfg.cls)}>{cfg.text}</span>;
}

export default function WebStoriesManagerClient({ locale }: Props) {
  // Dados
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string>('');
  const [msg, setMsg] = useState<string>('');

  // Seleção
  const [sel, setSel] = useState<Record<string, boolean>>({});

  // Filtros
  const [q, setQ] = useState<string>('');
  const [status, setStatus] = useState<'all' | Status>('all');
  const [onlyStories, setOnlyStories] = useState<boolean>(false);

  // Paginação
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);

  // Agendamento
  const [scheduleAt, setScheduleAt] = useState<string>(''); // datetime-local

  // Toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  function showToast(text: string, type: 'success' | 'error' = 'success') {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  }

  const selectedIds = useMemo(() => Object.keys(sel).filter(id => sel[id]), [sel]);

  async function load() {
    setLoading(true);
    setErr('');
    setMsg('');
    try {
      const sp = new URLSearchParams();
      sp.set('locale', locale);
      sp.set('page', String(page));
      sp.set('perPage', String(perPage));
      if (q.trim()) sp.set('q', q.trim());
      if (status !== 'all') sp.set('status', status);
      if (onlyStories) sp.set('onlyStories', '1');

      const res = await fetch(`/api/admin/webstories?${sp.toString()}`, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      setItems(j.items || []);
      setTotal(j.total || 0);
      setSel({});
    } catch (e: any) {
      setErr(e?.message || 'Falha ao carregar lista.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, page, perPage, status, onlyStories]);

  // debounce p/ busca
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      void load();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function toggleAll(checked: boolean) {
    if (checked) {
      const next: Record<string, boolean> = {};
      items.forEach(it => (next[it.id] = true));
      setSel(next);
    } else {
      setSel({});
    }
  }

  // Atualização otimista de 1 linha
  function updateRow(id: string, patch: Partial<Row>) {
    setItems(arr => arr.map(it => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function actionOne(id: string, action: 'generate'|'publish'|'draft'|'schedule'|'remove') {
    setErr('');
    setMsg('');
    try {
      if (action === 'remove') {
        // otimista
        updateRow(id, { isWebStory: false, hasStory: false });
        const res = await fetch(`/api/admin/webstories/${id}`, { method: 'DELETE' });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);
        showToast('Story removido.', 'success');
        return;
      }

      const body: any = { action };
      if (action === 'schedule') {
        if (!scheduleAt) throw new Error('Defina data/hora para agendar.');
        const d = new Date(scheduleAt);
        if (!Number.isFinite(+d)) throw new Error('Data/hora inválida.');
        body.publishedAt = d.toISOString();
        // otimista de status
        updateRow(id, { status: 'scheduled' });
      } else if (action === 'publish') {
        updateRow(id, { status: 'published' });
      } else if (action === 'draft') {
        updateRow(id, { status: 'draft' });
      } else if (action === 'generate') {
        updateRow(id, { isWebStory: true, hasStory: true });
      }

      const res = await fetch(`/api/admin/webstories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);

      if (action === 'generate') showToast('Story gerado (rascunho).', 'success');
      if (action === 'publish') showToast('Publicado com sucesso.', 'success');
      if (action === 'draft') showToast('Voltado para rascunho.', 'success');
      if (action === 'schedule') showToast('Agendado com sucesso.', 'success');
    } catch (e: any) {
      setErr(e?.message || 'Falha na ação');
      showToast(e?.message || 'Falha na ação', 'error');
      // Em erro, recarrega para estado consistente
      await load();
    }
  }

  async function actionBulk(action: 'generate_publish'|'generate_schedule'|'publish'|'schedule'|'draft'|'remove') {
    setErr('');
    setMsg('');
    try {
      if (selectedIds.length === 0) {
        throw new Error('Selecione ao menos um item.');
      }
      const body: any = { action, ids: selectedIds };
      if (action.includes('schedule')) {
        if (!scheduleAt) throw new Error('Defina data/hora para agendar.');
        body.publishedAt = new Date(scheduleAt).toISOString();
      }
      const res = await fetch('/api/admin/webstories/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);

      setMsg(`OK • processados ${j.processed}, gerados ${j.generated}, removidos ${j.removed}, erros ${j.errors}`);
      showToast('Ação em lote concluída.', j.errors > 0 ? 'error' : 'success');
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Falha no lote');
      showToast(e?.message || 'Falha no lote', 'error');
      await load();
    }
  }

  function fmtDate(iso?: string) {
    try {
      if (!iso) return '—';
      const d = new Date(iso);
      if (!Number.isFinite(+d)) return '—';
      return d.toLocaleString();
    } catch {
      return '—';
    }
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast ? (
        <div
          className={clsx(
            'fixed right-4 top-4 z-50 rounded-lg px-4 py-2 text-sm shadow-lg ring-1',
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
              : 'bg-rose-50 text-rose-800 ring-rose-200'
          )}
          role="status"
          aria-live="polite"
        >
          {toast.text}
        </div>
      ) : null}

      {/* Filtros e Ações Globais */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-600">Buscar por título</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex.: inflação, tokmanni..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-medium text-gray-600">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
            >
              <option value="all">Todos</option>
              <option value="draft">Rascunho</option>
              <option value="scheduled">Agendado</option>
              <option value="published">Publicado</option>
            </select>
          </label>

          <label className="flex items-end gap-2">
            <input
              type="checkbox"
              checked={onlyStories}
              onChange={(e) => setOnlyStories(e.target.checked)}
            />
            <span className="text-sm text-gray-700">Somente com Story</span>
          </label>

          <label>
            <span className="mb-1 block text-xs font-medium text-gray-600">Agendar (data/hora)</span>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
            />
          </label>
        </div>

        {/* Ações em lote */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-700">Selecionados: {selectedIds.length}</span>
          <button onClick={() => actionBulk('generate_publish')} className="rounded bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">Gerar+Publicar (sel.)</button>
          <button onClick={() => actionBulk('generate_schedule')} className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">Gerar+Agendar (sel.)</button>
          <button onClick={() => actionBulk('publish')} className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">Publicar (sel.)</button>
          <button onClick={() => actionBulk('schedule')} className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">Agendar (sel.)</button>
          <button onClick={() => actionBulk('draft')} className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">Rascunho (sel.)</button>
          <button onClick={() => actionBulk('remove')} className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50">Remover Story (sel.)</button>
          <div className="ml-auto">
            <button onClick={() => load()} className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">Recarregar</button>
          </div>
        </div>
      </div>

      {/* Mensagens */}
      {err ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</div> : null}
      {msg ? <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{msg}</div> : null}

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2">
                <input type="checkbox" onChange={(e) => toggleAll(e.target.checked)} aria-label="Selecionar todos" />
              </th>
              <th className="px-3 py-2">Título</th>
              <th className="px-3 py-2">Story</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Atualizado</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && items.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className="hover:bg-gray-50">
                  <td className="px-3 py-2"><div className="h-4 w-4 animate-pulse rounded bg-gray-100" /></td>
                  <td className="px-3 py-2">
                    <div className="h-4 w-64 animate-pulse rounded bg-gray-100" />
                    <div className="mt-1 h-3 w-40 animate-pulse rounded bg-gray-100" />
                  </td>
                  <td className="px-3 py-2"><div className="h-4 w-16 animate-pulse rounded bg-gray-100" /></td>
                  <td className="px-3 py-2"><div className="h-4 w-20 animate-pulse rounded bg-gray-100" /></td>
                  <td className="px-3 py-2"><div className="h-4 w-28 animate-pulse rounded bg-gray-100" /></td>
                  <td className="px-3 py-2 text-right"><div className="inline-block h-8 w-40 animate-pulse rounded bg-gray-100" /></td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500" colSpan={6}>
                  Nada por aqui ainda.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!!sel[it.id]}
                      onChange={(e) => setSel(prev => ({ ...prev, [it.id]: e.target.checked }))}
                      aria-label={`Selecionar ${it.title}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{it.title}</div>
                    <div className="text-xs text-gray-500 break-all">
                      /{locale}/category/{it.category}/{it.slug}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {it.isWebStory && it.hasStory ? <Pill text="Pronto" color="emerald" /> : <Pill text="Sem Story" color="slate" />}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={it.status} />
                  </td>
                  <td className="px-3 py-2">
                    {fmtDate(it.updatedAt)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button onClick={() => actionOne(it.id, 'generate')} className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-50">Gerar</button>
                      <button onClick={() => actionOne(it.id, 'publish')} className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-50">Publicar</button>
                      <button onClick={() => actionOne(it.id, 'draft')} className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-50">Rascunho</button>
                      <button onClick={() => actionOne(it.id, 'schedule')} className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-50">Agendar</button>
                      <button onClick={() => actionOne(it.id, 'remove')} className="rounded border border-gray-300 bg-white px-2 py-1 text-rose-700 hover:bg-rose-50">Remover</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
        </div>
      </div>
    </div>
  );
}