// src/components/admin/dashboard/AdminOverviewClient.tsx
// ============================================================================
// Pequena tradução dos rótulos de "Novos comentários" no Dashboard (fi/en)
// ----------------------------------------------------------------------------
// - Usa o locale já recebido como prop para exibir textos no idioma bruto.
// - Não altera backend nem lógica (apenas rótulos).
// ============================================================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import KpiCard from '@/components/admin/KpiCard';

type Overview = {
  ok: boolean;
  kpis: { visits24h: number; postsPublished: number; growth7d: number };
  series30d: { day: string; value: number }[];
  hotNow: { id: string; score: number; title: string }[];
  topPosts24h: { id: string; score: number; title: string; slug: string; category: string }[];
  topCategories7d: { category: string; views: number }[];
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

const L = (l: string) =>
  l === 'fi'
    ? {
        recentComments: 'Uudet kommentit',
        viewAll: 'Näytä kaikki',
        none: 'Ei kommentteja.',
        approve: 'Hyväksy',
        remove: 'Poista',
        fake: 'Fake',
      }
    : {
        recentComments: 'New comments',
        viewAll: 'View all',
        none: 'No comments.',
        approve: 'Approve',
        remove: 'Delete',
        fake: 'Fake',
      };

export default function AdminOverviewClient({ locale }: { locale: string }) {
  const T = L(locale);

  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string>('');

  const [recentComments, setRecentComments] = useState<CommentRow[]>([]);
  const [loadingComments, setLoadingComments] = useState<boolean>(true);

  async function loadOverview() {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`/api/admin/analytics/overview?locale=${encodeURIComponent(locale)}`, { cache: 'no-store' });
      const j: Overview = await res.json();
      if (!res.ok || !(j as any)?.ok) throw new Error((j as any)?.error || `HTTP ${res.status}`);
      setData(j);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }

  async function loadRecentComments() {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/admin/comments?mode=comments&status=all&excludeDeleted=1&page=1&perPage=5`, { cache: 'no-store' });
      const j: CommentsResp = await res.json();
      if (!res.ok || !j?.ok) throw new Error((j as any)?.error || `HTTP ${res.status}`);
      setRecentComments((j.items || []).filter(c => c.status !== 'deleted' && c.status !== 'blocked'));
    } catch {
      setRecentComments([]);
    } finally {
      setLoadingComments(false);
    }
  }

  useEffect(() => {
    void loadOverview();
    void loadRecentComments();
    const t = setInterval(() => {
      void loadOverview();
      void loadRecentComments();
    }, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const maxSeries = useMemo(() => {
    const vals = (data?.series30d || []).map((p) => p.value);
    return Math.max(1, ...(vals.length ? vals : [1]));
  }, [data?.series30d]);

  async function doAction(action: string, payload: any) {
    const res = await fetch('/api/admin/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);
    return j;
  }

  async function approve(id: string) {
    try {
      await doAction('approve', { id });
      setRecentComments(prev => prev.filter(c => c.id !== id));
    } catch {
      await loadRecentComments();
    }
  }
  async function del(id: string) {
    try {
      await doAction('delete', { id });
      setRecentComments(prev => prev.filter(c => c.id !== id));
    } catch {
      await loadRecentComments();
    }
  }
  async function toggleFake(id: string) {
    try {
      await doAction('toggle_fake', { id });
      // mantém na lista, só alterna flag se quiser exibir
      // setRecentComments(prev => prev.map(c => c.id === id ? { ...c, isFake: !c.isFake } : c));
    } catch {
      await loadRecentComments();
    }
  }

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Visitas (24h)" value={data?.kpis?.visits24h ?? '—'} loading={loading} />
        <KpiCard label="Posts publicados" value={data?.kpis?.postsPublished ?? '—'} loading={loading} />
        <KpiCard
          label="Crescimento (7d)"
          value={typeof data?.kpis?.growth7d === 'number' ? `${data.kpis.growth7d}%` : '—'}
          delta={data?.kpis?.growth7d ?? 0}
          loading={loading}
        />
        <KpiCard label="Em alta agora" value={data?.hotNow?.[0]?.title ?? '—'} loading={loading} />
      </section>

      {/* Série 30 dias (barras simples) */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Visitas recentes</h2>
          <span className="text-xs text-gray-500">Últimos 30 dias</span>
        </div>
        <div className="relative h-44 overflow-hidden rounded-lg bg-gradient-to-b from-gray-50 to-white ring-1 ring-black/5 p-2">
          <div className="flex h-full items-end gap-1">
            {(data?.series30d || []).map((p, i) => {
              const h = Math.round((p.value / maxSeries) * 100);
              return (
                <div
                  key={`${p.day}-${i}`}
                  title={`${p.day}: ${p.value}`}
                  className="flex-1 rounded-sm bg-blue-200/80"
                  style={{ height: `${h}%` }}
                />
              );
            })}
            {!loading && (data?.series30d || []).length === 0 ? (
              <div className="m-auto text-sm text-gray-600">Sem dados</div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Novos comentários (traduzido) */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{T.recentComments}</h2>
          <Link
            href={`/${locale}/admin/comments`}
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            {T.viewAll}
          </Link>
        </div>

        {loadingComments ? (
          <ul className="divide-y divide-gray-200">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={`sk-c-${i}`} className="py-3">
                <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
                <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-gray-100" />
              </li>
            ))}
          </ul>
        ) : recentComments.length === 0 ? (
          <div className="text-sm text-gray-600">{T.none}</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {recentComments.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {c.displayName}{' '}
                      <span className="ml-2 text-xs text-gray-500">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-[14px] text-slate-800">
                      {c.content}
                    </div>
                    {c.post ? (
                      <div className="mt-1 text-xs text-gray-600">
                        <Link
                          href={`/${c.post.locale}/category/${c.post.category}/${c.post.slug}`}
                          className="text-blue-700 hover:underline"
                        >
                          /{c.post.locale}/category/{c.post.category}/{c.post.slug}
                        </Link>
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0 space-x-1">
                    <button
                      onClick={() => approve(c.id)}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                      title={T.approve}
                    >
                      {T.approve}
                    </button>
                    <button
                      onClick={() => del(c.id)}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                      title={T.remove}
                    >
                      {T.remove}
                    </button>
                    <button
                      onClick={() => toggleFake(c.id)}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                      title={T.fake}
                    >
                      {T.fake}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {err ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {err}
        </div>
      ) : null}
    </div>
  );
}