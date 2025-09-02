// src/components/admin/menu/MenuManagerClient.tsx
// ============================================================================
// Gerenciador de Menu Principal — Modo simples (sem números de ordem)
// ----------------------------------------------------------------------------
// O que faz:
// - Lista itens do menu (label, href, visível) e permite mover ↑/↓, alternar visível e excluir.
// - Não mostra números de ordem (internamente ainda usa 'order', mas a UI esconde).
// - Ao mover ↑/↓, faz "swap" dos valores de order e recarrega.
// - Ao editar label/href, salva no blur (perde foco).
// - href relativo recomendado (ex.: "sobre") — o Header prefixa com /{locale}/.
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

type MenuItem = {
  id: string;
  locale: string;
  label: string;
  href: string;
  order: number;
  visible: boolean;
  updatedAt?: string;
};

type Props = {
  locale: string;
};

function normalizeRelativeHref(href: string) {
  const h = String(href || '').trim();
  if (!h) return '';
  if (h.startsWith('/')) return h.replace(/\/+$/, '');
  return h.replace(/^\/*/, '').replace(/\/+$/, '');
}

export default function MenuManagerClient({ locale }: Props) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Form de novo item
  const [nLabel, setNLabel] = useState('');
  const [nHref, setNHref] = useState('');

  useEffect(() => {
    void fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function fetchItems() {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/admin/menu?locale=${encodeURIComponent(locale)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setItems((data.items || []) as MenuItem[]);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar menu.');
    } finally {
      setLoading(false);
    }
  }

  async function addItem() {
    try {
      setError('');
      const hrefNorm = normalizeRelativeHref(nHref);
      if (!nLabel.trim() || !hrefNorm) {
        setError('Preencha label e href.');
        return;
      }
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, label: nLabel.trim(), href: hrefNorm }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setNLabel(''); setNHref('');
      await fetchItems();
    } catch (e: any) {
      setError(e?.message || 'Falha ao adicionar item.');
    }
  }

  async function updateItem(id: string, patch: Partial<MenuItem>) {
    const res = await fetch(`/api/admin/menu/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
  }

  async function removeItem(id: string) {
    const ok = confirm('Excluir este item do menu?');
    if (!ok) return;
    try {
      setError('');
      const res = await fetch(`/api/admin/menu/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      await fetchItems();
    } catch (e: any) {
      setError(e?.message || 'Falha ao excluir item.');
    }
  }

  function findIdx(id: string) {
    return items.findIndex((x) => x.id === id);
  }

  // Troca as ordens (swap) entre dois itens por índice e persiste
  async function swapOrders(idxA: number, idxB: number) {
    if (idxA < 0 || idxB < 0 || idxA >= items.length || idxB >= items.length) return;
    const a = items[idxA];
    const b = items[idxB];
    if (!a || !b) return;

    try {
      // Atualiza localmente (feedback instantâneo)
      const draft = [...items];
      const tmp = draft[idxA].order;
      draft[idxA].order = draft[idxB].order;
      draft[idxB].order = tmp;
      setItems(draft);

      // Persiste — duas chamadas em paralelo
      await Promise.all([
        updateItem(a.id, { order: b.order }),
        updateItem(b.id, { order: a.order }),
      ]);

      // Recarrega para manter consistência
      await fetchItems();
    } catch (e: any) {
      setError(e?.message || 'Falha ao reordenar.');
      await fetchItems();
    }
  }

  async function moveUp(id: string) {
    const idx = findIdx(id);
    if (idx <= 0) return;
    await swapOrders(idx, idx - 1);
  }

  async function moveDown(id: string) {
    const idx = findIdx(id);
    if (idx < 0 || idx >= items.length - 1) return;
    await swapOrders(idx, idx + 1);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Menu principal</h1>
        <p className="text-sm text-gray-600">Locale atual: <strong>{locale.toUpperCase()}</strong></p>
      </div>

      {/* Novo item */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label>
            <span className="mb-1 block text-xs font-medium text-gray-600">Label</span>
            <input
              type="text"
              value={nLabel}
              onChange={(e) => setNLabel(e.target.value)}
              placeholder="Ex.: Sobre"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
            />
          </label>
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-600">Href</span>
            <input
              type="text"
              value={nHref}
              onChange={(e) => setNHref(e.target.value)}
              placeholder="Ex.: sobre (relativo) ou /fi/sobre (absoluto)"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
            />
          </label>
        </div>
        <div className="mt-3">
          <button
            onClick={addItem}
            className="inline-flex items-center rounded-lg bg-black px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
          >
            Adicionar item
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Dica: prefira href relativo (ex.: “sobre”). O Header prefixa com /{locale}/.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {/* Lista (modo simples) */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Href</th>
              <th className="px-4 py-3">Visível</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={`sk-${i}`}>
                  <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded bg-gray-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-64 animate-pulse rounded bg-gray-100" /></td>
                  <td className="px-4 py-3"><div className="h-6 w-10 animate-pulse rounded bg-gray-100" /></td>
                  <td className="px-4 py-3 text-right"><div className="h-8 w-28 animate-pulse rounded bg-gray-100 inline-block" /></td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-500">Menu vazio.</td></tr>
            ) : (
              items.map((it, idx) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={it.label}
                      onChange={(e) => setItems((arr) => arr.map((x) => x.id === it.id ? { ...x, label: e.target.value } : x))}
                      onBlur={async () => {
                        try {
                          const cur = items.find((x) => x.id === it.id);
                          await updateItem(it.id, { label: cur?.label?.trim() || it.label });
                          await fetchItems();
                        } catch (e: any) {
                          setError(e?.message || 'Falha ao atualizar label.');
                        }
                      }}
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={it.href}
                      onChange={(e) => setItems((arr) => arr.map((x) => x.id === it.id ? { ...x, href: e.target.value } : x))}
                      onBlur={async () => {
                        try {
                          const cur = items.find((x) => x.id === it.id);
                          const nh = normalizeRelativeHref(cur?.href || '');
                          await updateItem(it.id, { href: nh || it.href });
                          await fetchItems();
                        } catch (e: any) {
                          setError(e?.message || 'Falha ao atualizar href.');
                        }
                      }}
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={it.visible}
                        onChange={async (e) => {
                          try {
                            await updateItem(it.id, { visible: e.target.checked });
                            await fetchItems();
                          } catch (err: any) {
                            setError(err?.message || 'Falha ao atualizar visibilidade.');
                          }
                        }}
                      />
                      <span className="text-sm text-gray-700">Visível</span>
                    </label>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => moveUp(it.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100"
                        title="Subir"
                        aria-label="Subir"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 14l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                      <button
                        onClick={() => moveDown(it.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100"
                        title="Descer"
                        aria-label="Descer"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 10l-6 6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                      <button
                        onClick={() => removeItem(it.id)}
                        className="inline-flex h-8 items-center justify-center rounded px-3 text-sm text-red-600 hover:bg-red-50"
                        title="Excluir"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500">
        Observação: href relativo (ex.: “sobre”) será prefixado no Header por /{locale}/.
      </div>
    </div>
  );
}