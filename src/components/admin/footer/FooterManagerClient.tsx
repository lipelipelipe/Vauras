// src/components/admin/footer/FooterManagerClient.tsx
// ============================================================================
// Gerenciador do Footer — nível PhD (Client Component)
// ----------------------------------------------------------------------------
// - Grupos por locale: criar, editar título/visível, mover ↑/↓, excluir, normalizar ordem.
// - Links por grupo: criar, editar label/href/external/rel/visível, mover ↑/↓, excluir, normalizar ordem.
// - UI simples (sem números), swaps de ordem e persistência via APIs.
// - Correção: remove setState durante render (initLinkState no JSX) e inicializa
//   estados de novos links via useEffect, evitando o erro de tipo ReactNode/void.
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

type FooterLink = {
  id: string;
  label: string;
  href: string;
  external: boolean;
  rel?: string | null;
  order: number;
  visible: boolean;
  updatedAt?: string;
};

type FooterGroup = {
  id: string;
  locale: string;
  title: string;
  order: number;
  visible: boolean;
  updatedAt?: string;
  links: FooterLink[];
};

type Props = {
  locale: string;
};

function normHref(href: string) {
  const h = String(href || '').trim();
  if (!h) return '';
  if (h.startsWith('/')) return h.replace(/\/+$/, '');
  return h.replace(/^\/*/, '').replace(/\/+$/, '');
}

export default function FooterManagerClient({ locale }: Props) {
  const [groups, setGroups] = useState<FooterGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Novo grupo
  const [gTitle, setGTitle] = useState<string>('');

  useEffect(() => {
    void fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function fetchGroups() {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/admin/footer/groups?locale=${encodeURIComponent(locale)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setGroups((data.items || []) as FooterGroup[]);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar footer.');
    } finally {
      setLoading(false);
    }
  }

  // Groups CRUD
  async function addGroup() {
    try {
      setError('');
      const title = (gTitle || '').trim();
      if (!title) {
        setError('Informe um título para o grupo.');
        return;
      }
      const res = await fetch('/api/admin/footer/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, title }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setGTitle('');
      await fetchGroups();
    } catch (e: any) {
      setError(e?.message || 'Falha ao criar grupo.');
    }
  }

  async function patchGroup(id: string, patch: Partial<FooterGroup>) {
    const res = await fetch(`/api/admin/footer/groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  }

  async function deleteGroup(id: string) {
    const ok = confirm('Excluir este grupo (e todos os links)?');
    if (!ok) return;
    const res = await fetch(`/api/admin/footer/groups/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    await fetchGroups();
  }

  // swap group order
  async function swapGroup(idxA: number, idxB: number) {
    if (idxA < 0 || idxB < 0 || idxA >= groups.length || idxB >= groups.length) return;
    const a = groups[idxA];
    const b = groups[idxB];
    // feedback
    const draft = [...groups];
    const tmp = draft[idxA].order;
    draft[idxA].order = draft[idxB].order;
    draft[idxB].order = tmp;
    setGroups(draft);
    // persist
    await Promise.all([
      patchGroup(a.id, { order: b.order }),
      patchGroup(b.id, { order: a.order }),
    ]).catch(() => {});
    await fetchGroups();
  }

  function moveGroupUp(id: string) {
    const idx = groups.findIndex(g => g.id === id);
    if (idx <= 0) return;
    void swapGroup(idx, idx - 1);
  }

  function moveGroupDown(id: string) {
    const idx = groups.findIndex(g => g.id === id);
    if (idx < 0 || idx >= groups.length - 1) return;
    void swapGroup(idx, idx + 1);
  }

  async function resequenceGroups() {
    // Renumera 10, 20, 30...
    try {
      let order = 0;
      for (const g of [...groups].sort((a, b) => a.order - b.order)) {
        order += 10;
        await patchGroup(g.id, { order });
      }
      await fetchGroups();
    } catch (e: any) {
      setError(e?.message || 'Falha ao normalizar ordem de grupos.');
    }
  }

  // Links CRUD
  async function addLink(groupId: string, payload: { label: string; href: string; external?: boolean; rel?: string }) {
    const body = {
      label: payload.label.trim(),
      href: normHref(payload.href),
      external: !!payload.external,
      rel: (payload.rel || '').trim() || undefined,
    };
    const res = await fetch(`/api/admin/footer/groups/${groupId}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    await fetchGroups();
  }

  async function patchLink(id: string, patch: Partial<FooterLink>) {
    const res = await fetch(`/api/admin/footer/links/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  }

  async function deleteLink(id: string) {
    const ok = confirm('Excluir este link?');
    if (!ok) return;
    const res = await fetch(`/api/admin/footer/links/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    await fetchGroups();
  }

  async function swapLink(groupId: string, idxA: number, idxB: number) {
    const g = groups.find(x => x.id === groupId);
    if (!g) return;
    const links = g.links;
    if (idxA < 0 || idxB < 0 || idxA >= links.length || idxB >= links.length) return;
    const a = links[idxA];
    const b = links[idxB];

    // feedback
    const draft = groups.map(gr => gr.id === groupId ? { ...gr, links: [...gr.links] } : gr);
    const gi = draft.findIndex(gr => gr.id === groupId);
    const tmp = draft[gi].links[idxA].order;
    draft[gi].links[idxA].order = draft[gi].links[idxB].order;
    draft[gi].links[idxB].order = tmp;
    setGroups(draft);

    // persist
    await Promise.all([
      patchLink(a.id, { order: b.order }),
      patchLink(b.id, { order: a.order }),
    ]).catch(() => {});
    await fetchGroups();
  }

  async function resequenceLinks(groupId: string) {
    const g = groups.find(x => x.id === groupId);
    if (!g) return;
    try {
      let order = 0;
      for (const li of [...g.links].sort((a, b) => a.order - b.order)) {
        order += 10;
        await patchLink(li.id, { order });
      }
      await fetchGroups();
    } catch (e: any) {
      setError(e?.message || 'Falha ao normalizar ordem dos links.');
    }
  }

  // UI Helpers: estados locais para criação de link por grupo
  const [newLinks, setNewLinks] = useState<Record<string, { label: string; href: string; external: boolean; rel: string }>>({});

  // Inicializa estados de novos links quando os grupos são carregados/alterados
  useEffect(() => {
    if (!groups.length) return;
    setNewLinks((prev) => {
      // evita setState em render; garante entradas para todos os grupos
      const next = { ...prev };
      for (const g of groups) {
        if (!next[g.id]) {
          next[g.id] = { label: '', href: '', external: false, rel: '' };
        }
      }
      // remove chaves de grupos que não existem mais
      for (const k of Object.keys(next)) {
        if (!groups.some((g) => g.id === k)) {
          delete next[k];
        }
      }
      return next;
    });
  }, [groups]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Footer</h1>
          <p className="text-sm text-gray-600">Locale: <strong>{locale.toUpperCase()}</strong></p>
        </div>
        <button
          onClick={resequenceGroups}
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-gray-50"
        >
          Normalizar ordem dos grupos
        </button>
      </div>

      {/* Novo grupo */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr,1fr,auto]">
          <label>
            <span className="mb-1 block text-xs font-medium text-gray-600">Título do grupo</span>
            <input
              type="text"
              value={gTitle}
              onChange={(e) => setGTitle(e.target.value)}
              placeholder="Ex.: Editorial, Institucional, Explorar"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
            />
          </label>
          <div className="hidden md:block"></div>
          <div className="flex items-end">
            <button
              onClick={addGroup}
              className="inline-flex items-center rounded-lg bg-black px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
            >
              Adicionar grupo
            </button>
          </div>
        </div>
      </div>

      {/* Erros */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {/* Grupos */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-sm text-gray-600">
          Carregando...
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-sm text-gray-600">
          Nenhum grupo. Crie um grupo acima.
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            {/* Cabeçalho do grupo */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={g.title}
                    onChange={(e) => setGroups(arr => arr.map(x => x.id === g.id ? { ...x, title: e.target.value } : x))}
                    onBlur={async () => {
                      try {
                        const cur = groups.find(x => x.id === g.id);
                        await patchGroup(g.id, { title: (cur?.title || '').trim() || g.title });
                        await fetchGroups();
                      } catch (e: any) {
                        setError(e?.message || 'Falha ao atualizar título.');
                      }
                    }}
                    className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm font-semibold"
                  />
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={g.visible}
                      onChange={async (e) => {
                        try {
                          await patchGroup(g.id, { visible: e.target.checked });
                          await fetchGroups();
                        } catch (err: any) {
                          setError(err?.message || 'Falha ao atualizar visibilidade.');
                        }
                      }}
                    />
                    Visível
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => moveGroupUp(g.id)} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100" title="Subir">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 14l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
                <button onClick={() => moveGroupDown(g.id)} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100" title="Descer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 10l-6 6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
                <button onClick={() => deleteGroup(g.id)} className="inline-flex h-8 items-center justify-center rounded px-3 text-sm text-red-600 hover:bg-red-50" title="Excluir">Excluir</button>
                <button onClick={() => resequenceLinks(g.id)} className="inline-flex h-8 items-center justify-center rounded px-3 text-sm text-gray-700 hover:bg-gray-50" title="Normalizar links">Normalizar links</button>
              </div>
            </div>

            {/* Links do grupo */}
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    <th className="px-4 py-3">Label</th>
                    <th className="px-4 py-3">Href</th>
                    <th className="px-4 py-3">Extern.</th>
                    <th className="px-4 py-3">Rel</th>
                    <th className="px-4 py-3">Visível</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {g.links.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Nenhum link. Crie abaixo.</td>
                    </tr>
                  ) : (
                    g.links.map((li, idx) => (
                      <tr key={li.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={li.label}
                            onChange={(e) => setGroups(arr => arr.map(x => x.id === g.id ? { ...x, links: x.links.map(y => y.id === li.id ? { ...y, label: e.target.value } : y) } : x))}
                            onBlur={async () => {
                              try {
                                const curG = groups.find(x => x.id === g.id)!;
                                const curLi = curG.links.find(y => y.id === li.id)!;
                                await patchLink(li.id, { label: (curLi.label || '').trim() || li.label });
                                await fetchGroups();
                              } catch (e: any) {
                                setError(e?.message || 'Falha ao atualizar label.');
                              }
                            }}
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                          />
                        </td>

                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={li.href}
                            onChange={(e) => setGroups(arr => arr.map(x => x.id === g.id ? { ...x, links: x.links.map(y => y.id === li.id ? { ...y, href: e.target.value } : y) } : x))}
                            onBlur={async () => {
                              try {
                                const cur = groups.find(x => x.id === g.id)!.links.find(y => y.id === li.id)!;
                                await patchLink(li.id, { href: normHref(cur.href || '') || li.href });
                                await fetchGroups();
                              } catch (e: any) {
                                setError(e?.message || 'Falha ao atualizar href.');
                              }
                            }}
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                          />
                        </td>

                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={li.external}
                            onChange={async (e) => {
                              try {
                                await patchLink(li.id, { external: e.target.checked });
                                await fetchGroups();
                              } catch (err: any) {
                                setError(err?.message || 'Falha ao atualizar external.');
                              }
                            }}
                          />
                        </td>

                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={li.rel || ''}
                            onChange={(e) => setGroups(arr => arr.map(x => x.id === g.id ? { ...x, links: x.links.map(y => y.id === li.id ? { ...y, rel: e.target.value } : y) } : x))}
                            onBlur={async () => {
                              try {
                                const cur = groups.find(x => x.id === g.id)!.links.find(y => y.id === li.id)!;
                                await patchLink(li.id, { rel: (cur.rel || '').trim() || null });
                                await fetchGroups();
                              } catch (e: any) {
                                setError(e?.message || 'Falha ao atualizar rel.');
                              }
                            }}
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                          />
                        </td>

                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={li.visible}
                            onChange={async (e) => {
                              try {
                                await patchLink(li.id, { visible: e.target.checked });
                                await fetchGroups();
                              } catch (err: any) {
                                setError(err?.message || 'Falha ao atualizar visibilidade.');
                              }
                            }}
                          />
                        </td>

                        <td className="px-4 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button onClick={() => swapLink(g.id, idx, idx - 1)} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100" title="Subir">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 14l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            </button>
                            <button onClick={() => swapLink(g.id, idx, idx + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100" title="Descer">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 10l-6 6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            </button>
                            <button onClick={() => deleteLink(li.id)} className="inline-flex h-8 items-center justify-center rounded px-3 text-sm text-red-600 hover:bg-red-50" title="Excluir">Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Linha para novo link */}
                  <tr>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={newLinks[g.id]?.label || ''}
                        onChange={(e) =>
                          setNewLinks(prev => ({
                            ...prev,
                            [g.id]: { ...(prev[g.id] || { label: '', href: '', external: false, rel: '' }), label: e.target.value }
                          }))
                        }
                        placeholder="Label"
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={newLinks[g.id]?.href || ''}
                        onChange={(e) =>
                          setNewLinks(prev => ({
                            ...prev,
                            [g.id]: { ...(prev[g.id] || { label: '', href: '', external: false, rel: '' }), href: e.target.value }
                          }))
                        }
                        placeholder="sobre, /fi/sobre ou https://..."
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={newLinks[g.id]?.external || false}
                        onChange={(e) =>
                          setNewLinks(prev => ({
                            ...prev,
                            [g.id]: { ...(prev[g.id] || { label: '', href: '', external: false, rel: '' }), external: e.target.checked }
                          }))
                        }
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={newLinks[g.id]?.rel || ''}
                        onChange={(e) =>
                          setNewLinks(prev => ({
                            ...prev,
                            [g.id]: { ...(prev[g.id] || { label: '', href: '', external: false, rel: '' }), rel: e.target.value }
                          }))
                        }
                        placeholder="noopener noreferrer"
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={async () => {
                          const state = newLinks[g.id] || { label: '', href: '', external: false, rel: '' };
                          if (!state.label.trim() || !state.href.trim()) { setError('Preencha label e href do link.'); return; }
                          try {
                            await addLink(g.id, state);
                            setNewLinks(prev => ({ ...prev, [g.id]: { label: '', href: '', external: false, rel: '' } }));
                          } catch (e: any) {
                            setError(e?.message || 'Falha ao adicionar link.');
                          }
                        }}
                        className="inline-flex items-center rounded-lg bg-black px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
                      >
                        Adicionar link
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}