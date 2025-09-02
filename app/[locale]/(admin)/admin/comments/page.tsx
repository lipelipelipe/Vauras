// app/[locale]/(admin)/admin/comments/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type PostMin = {
  id: string;
  title: string;
  slug: string;
  category: string;
  locale: string;
  status: 'draft' | 'published' | 'scheduled' | string;
  publishedAt: string | null;
};

type CommentRow = {
  id: string;
  postId: string;
  post: { title: string; slug: string; category: string; locale: string } | null;
  displayName: string;
  content: string;
  status: 'approved' | 'pending' | 'blocked' | 'deleted';
  isFake: boolean;
  createdAt: string;
  updatedAt: string;
};

type CommentsResp = {
  ok: boolean;
  mode: 'comments';
  page: number;
  perPage: number;
  total: number;
  items: CommentRow[];
};

type RuleRow = {
  id: string;
  kind: 'ip' | 'email' | 'nick' | string;
  value: string | null;
  valueHash: string | null;
  reason: string | null;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
};

type BlocklistResp = {
  ok: boolean;
  mode: 'blocklist';
  page: number;
  perPage: number;
  total: number;
  items: RuleRow[];
};

type Tab = 'comments' | 'blocklist';

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

export default function AdminCommentsPage({ params }: { params: { locale: string } }) {
  const localeParam = params.locale || 'fi';
  const [tab, setTab] = useState<Tab>('comments');

  // posts para selects
  const [postList, setPostList] = useState<PostMin[]>([]);
  const [postFilterQuery, setPostFilterQuery] = useState('');
  const filteredPostList = useMemo(() => {
    const q = postFilterQuery.trim().toLowerCase();
    if (!q) return postList;
    return postList.filter((p) =>
      `${p.title} ${p.slug} ${p.category} ${p.locale}`.toLowerCase().includes(q)
    );
  }, [postFilterQuery, postList]);

  // comments state
  const [status, setStatus] = useState<'all'|'approved'|'pending'|'blocked'|'deleted'>('all');
  const [q, setQ] = useState('');
  const [postId, setPostId] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<CommentRow[]>([]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // blocklist state
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [rulesTotal, setRulesTotal] = useState(0);
  const [rulesPage, setRulesPage] = useState(1);
  const [rulesPerPage, setRulesPerPage] = useState(20);
  const [ruleKind, setRuleKind] = useState<'all'|'ip'|'email'|'nick'>('all');
  const [ruleActive, setRuleActive] = useState<'all'|'active'|'inactive'>('all');
  const [ruleQ, setRuleQ] = useState('');
  const rulesTotalPages = useMemo(() => Math.max(1, Math.ceil(rulesTotal / rulesPerPage)), [rulesTotal, rulesPerPage]);

  // fake comment state
  const [fakePostId, setFakePostId] = useState('');
  const [fakeName, setFakeName] = useState('Admin');
  const [fakeContent, setFakeContent] = useState('');
  const [busyFake, setBusyFake] = useState(false);

  async function loadPostsMin() {
    setErr('');
    try {
      const res = await fetch(`/api/admin/posts/min?locale=all&status=published&limit=2000`, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      setPostList(j.items || []);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao carregar lista de posts.');
      setPostList([]);
    }
  }

  async function loadComments(p = 1) {
    setLoading(true);
    setErr('');
    try {
      const sp = new URLSearchParams();
      sp.set('mode', 'comments');
      if (status !== 'all') sp.set('status', status);
      if (q.trim()) sp.set('q', q.trim());
      if (postId.trim()) sp.set('postId', postId.trim());
      sp.set('excludeDeleted', '1'); // <- não traz deletados por padrão
      sp.set('page', String(p));
      sp.set('perPage', String(perPage));
      const res = await fetch(`/api/admin/comments?${sp.toString()}`, { cache: 'no-store' });
      const j: CommentsResp = await res.json();
      if (!res.ok || !j?.ok) throw new Error((j as any)?.error || `HTTP ${res.status}`);
      setItems(j.items || []);
      setTotal(j.total || 0);
      setPage(j.page || p);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao carregar comentários.');
    } finally {
      setLoading(false);
    }
  }

  async function loadBlocklist(p = 1) {
    setLoading(true);
    setErr('');
    try {
      const sp = new URLSearchParams();
      sp.set('mode', 'blocklist');
      if (ruleKind !== 'all') sp.set('kind', ruleKind);
      if (ruleQ.trim()) sp.set('q', ruleQ.trim());
      if (ruleActive !== 'all') sp.set('active', ruleActive === 'active' ? '1' : '0');
      sp.set('page', String(p));
      sp.set('perPage', String(rulesPerPage));
      const res = await fetch(`/api/admin/comments?${sp.toString()}`, { cache: 'no-store' });
      const j: BlocklistResp = await res.json();
      if (!res.ok || !j?.ok) throw new Error((j as any)?.error || `HTTP ${res.status}`);
      setRules(j.items || []);
      setRulesTotal(j.total || 0);
      setRulesPage(j.page || p);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao carregar blocklist.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPostsMin(); }, []);
  useEffect(() => { if (tab === 'comments') void loadComments(1); else void loadBlocklist(1); }, [tab]); // eslint-disable-line

  // Debounce filtros de comments
  useEffect(() => {
    const t = setTimeout(() => { if (tab === 'comments') void loadComments(1); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, postId, perPage]);

  // Debounce filtros de blocklist
  useEffect(() => {
    const t = setTimeout(() => { if (tab === 'blocklist') void loadBlocklist(1); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleKind, ruleActive, ruleQ, rulesPerPage]);

  async function doAction(action: string, payload: any) {
    setErr('');
    const res = await fetch('/api/admin/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);
    return j;
  }

  // Ações de comentário (otimistas, com remoção imediata do item)
  async function approve(id: string) {
    try {
      await doAction('approve', { id });
      setItems(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));
    } catch (e: any) {
      setErr(e?.message || 'Falha ao aprovar.');
      await loadComments(page);
    }
  }
  async function del(id: string) {
    try {
      await doAction('delete', { id });
      setItems(prev => {
        const next = prev.filter(c => c.id !== id);
        // se esvaziou a página e há anterior, volta automaticamente
        if (next.length === 0 && page > 1) {
          setTimeout(() => void loadComments(page - 1), 0);
        }
        return next;
      });
      setTotal(t => Math.max(0, t - 1));
    } catch (e: any) {
      setErr(e?.message || 'Falha ao excluir.');
      await loadComments(page);
    }
  }
  async function restore(id: string) {
    try {
      await doAction('restore', { id });
      setItems(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));
    } catch (e: any) {
      setErr(e?.message || 'Falha ao restaurar.');
      await loadComments(page);
    }
  }
  async function toggleFake(id: string) {
    try {
      const j = await doAction('toggle_fake', { id });
      const isFake = !!j?.isFake;
      setItems(prev => prev.map(c => c.id === id ? { ...c, isFake } : c));
    } catch (e: any) {
      setErr(e?.message || 'Falha ao alternar fake.');
      await loadComments(page);
    }
  }

  // Fake create
  async function createFake() {
    if (!fakePostId || !fakeContent.trim()) return;
    try {
      setBusyFake(true);
      await doAction('fake_create', { postId: fakePostId, displayName: fakeName.trim() || 'Admin', content: fakeContent.trim() });
      setFakeContent('');
      await loadComments(1);
    } catch (e: any) {
      setErr(e?.message || 'Falha ao criar fake.');
    } finally {
      setBusyFake(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Comentários</h1>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          <button
            className={`px-3 py-1.5 text-sm rounded ${tab === 'comments' ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}
            onClick={() => setTab('comments')}
          >
            Comentários
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded ${tab === 'blocklist' ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}
            onClick={() => setTab('blocklist')}
          >
            Blocklist
          </button>
        </div>
      </div>

      {err ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</div>
      ) : null}

      {tab === 'comments' ? (
        <>
          {/* Filtros */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="approved">Aprovados</option>
                  <option value="pending">Pendentes</option>
                  <option value="blocked">Bloqueados</option>
                  <option value="deleted">Excluídos</option>
                </select>
              </label>

              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-gray-600">Buscar (nome ou conteúdo)</span>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>

              {/* Seleção de post */}
              <div className="md:col-span-3">
                <div className="mb-1 text-sm text-gray-600">Post</div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr,auto]">
                  <input
                    type="text"
                    value={postFilterQuery}
                    onChange={(e) => setPostFilterQuery(e.target.value)}
                    placeholder="Filtrar posts por título/slug/categoria"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => { setPostId(''); setPostFilterQuery(''); }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Limpar
                  </button>
                </div>
                <select
                  value={postId}
                  onChange={(e) => setPostId(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  size={6}
                >
                  <option value="">— Todos os posts —</option>
                  {filteredPostList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — /{p.locale}/category/{p.category}/{p.slug}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Ações rápidas: criar fake */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-slate-900">Criar comentário fake</div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="md:col-span-2">
                <div className="mb-1 text-sm text-gray-600">Post</div>
                <select
                  value={fakePostId}
                  onChange={(e) => setFakePostId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">— selecione um post —</option>
                  {postList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — /{p.locale}/category/{p.category}/{p.slug}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                value={fakeName}
                onChange={(e) => setFakeName(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Nome"
              />
              <input
                type="text"
                value={fakeContent}
                onChange={(e) => setFakeContent(e.target.value)}
                className="md:col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Conteúdo"
              />
            </div>

            <div className="mt-3">
              <button
                onClick={() => void createFake()}
                disabled={busyFake || !fakePostId || !fakeContent.trim()}
                className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-60"
              >
                {busyFake ? 'Criando…' : 'Criar fake'}
              </button>
            </div>
          </div>

          {/* Tabela de comentários */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2">Autor</th>
                  <th className="px-3 py-2">Conteúdo</th>
                  <th className="px-3 py-2">Post</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && items.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2"><div className="h-4 w-24 animate-pulse rounded bg-gray-100" /></td>
                      <td className="px-3 py-2"><div className="h-4 w-64 animate-pulse rounded bg-gray-100" /></td>
                      <td className="px-3 py-2"><div className="h-4 w-40 animate-pulse rounded bg-gray-100" /></td>
                      <td className="px-3 py-2"><div className="h-4 w-16 animate-pulse rounded bg-gray-100" /></td>
                      <td className="px-3 py-2 text-right"><div className="inline-block h-8 w-40 animate-pulse rounded bg-gray-100" /></td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr><td className="px-3 py-8 text-center text-gray-500" colSpan={5}>Nada por aqui.</td></tr>
                ) : (
                  items.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-900">{c.displayName}</div>
                        <div className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="line-clamp-2 max-w-[560px]">{c.content}</div>
                      </td>
                      <td className="px-3 py-2">
                        {c.post ? (
                          <div className="text-xs">
                            <div className="font-semibold text-slate-900">{c.post.title}</div>
                            <Link href={`/${c.post.locale}/category/${c.post.category}/${c.post.slug}`} className="text-blue-700 hover:underline">
                              /{c.post.locale}/category/{c.post.category}/{c.post.slug}
                            </Link>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                          c.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'blocked'
                            ? 'bg-rose-100 text-rose-800'
                            : c.status === 'deleted'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.status}
                        </span>
                        {c.isFake ? (
                          <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 ring-1 ring-purple-200">
                            fake
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <button onClick={() => approve(c.id)} className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-50">Aprovar</button>
                          <button onClick={() => del(c.id)} className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-50">Excluir</button>
                          <button onClick={() => restore(c.id)} className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-50">Restaurar</button>
                          <button onClick={() => toggleFake(c.id)} className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-50">Fake</button>
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
              Página {page} de {totalPages} • {total} item(s)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void loadComments(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm disabled:opacity-60 hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                onClick={() => void loadComments(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loading}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm disabled:opacity-60 hover:bg-gray-50"
              >
                Próxima
              </button>
              <select
                value={perPage}
                onChange={(e) => setPerPage(clamp(parseInt(e.target.value || '20', 10) || 20, 1, 100))}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm"
                title="Itens por página"
              >
                {[10, 20, 30, 50, 100].map((n) => <option key={n} value={n}>{n}/pág</option>)}
              </select>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Blocklist */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Tipo</span>
                <select
                  value={ruleKind}
                  onChange={(e) => setRuleKind(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="ip">IP</option>
                  <option value="email">Email</option>
                  <option value="nick">Nickname</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Ativo</span>
                <select
                  value={ruleActive}
                  onChange={(e) => setRuleActive(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </label>
              <label className="text-sm md:col-span-3">
                <span className="mb-1 block text-gray-600">Buscar</span>
                <input
                  type="search"
                  value={ruleQ}
                  onChange={(e) => setRuleQ(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </div>

          {/* Lista de regras */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Motivo</th>
                  <th className="px-3 py-2">Ativo</th>
                  <th className="px-3 py-2">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && rules.length === 0 ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={`sk-r-${i}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2"><div className="h-4 w-10 animate-pulse rounded bg-gray-100" /></td>
                      <td className="px-3 py-2"><div className="h-4 w-64 animate-pulse rounded bg-gray-100" /></td>
                      <td className="px-3 py-2"><div className="h-4 w-32 animate-pulse rounded bg-gray-100" /></td>
                      <td className="px-3 py-2"><div className="h-4 w-10 animate-pulse rounded bg-gray-100" /></td>
                      <td className="px-3 py-2"><div className="h-4 w-20 animate-pulse rounded bg-gray-100" /></td>
                    </tr>
                  ))
                ) : rules.length === 0 ? (
                  <tr><td className="px-3 py-8 text-center text-gray-500" colSpan={5}>Sem regras.</td></tr>
                ) : (
                  rules.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{r.kind}</td>
                      <td className="px-3 py-2">{r.kind === 'nick' ? (r.value || '—') : (r.valueHash || '—')}</td>
                      <td className="px-3 py-2">{r.reason || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${r.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                          {r.active ? 'ativo' : 'inativo'}
                        </span>
                      </td>
                      <td className="px-3 py-2">{r.expiresAt ? new Date(r.expiresAt).toLocaleString() : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação blocklist */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Página {rulesPage} de {rulesTotalPages} • {rulesTotal} regra(s)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void loadBlocklist(Math.max(1, rulesPage - 1))}
                disabled={rulesPage <= 1 || loading}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm disabled:opacity-60 hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                onClick={() => void loadBlocklist(Math.min(rulesTotalPages, rulesPage + 1))}
                disabled={rulesPage >= rulesTotalPages || loading}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm disabled:opacity-60 hover:bg-gray-50"
              >
                Próxima
              </button>
              <select
                value={rulesPerPage}
                onChange={(e) => setRulesPerPage(clamp(parseInt(e.target.value || '20', 10) || 20, 1, 100))}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm"
                title="Itens por página"
              >
                {[10, 20, 30, 50, 100].map((n) => <option key={n} value={n}>{n}/pág</option>)}
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  );
}