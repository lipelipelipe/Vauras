// src/components/admin/webstories/SingleStoryManagerClient.tsx
// ============================================================================
// Admin • Web Story (por Post) — Client Manager (Nível PhD, UX aprimorada)
// ----------------------------------------------------------------------------
// Melhorias nesta versão:
// - Toasts de sucesso/erro após ações (Publicar / Agendar / Rascunho / Remover / Gerar).
// - Indicador “Story” no cabeçalho (Pronto | Sem Story).
// - Atualização otimista do estado do Story (remove → Sem Story imediatamente).
// - Recarregamento seguro com AbortController.
// ============================================================================

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

type Status = 'draft' | 'published' | 'scheduled';

type PostData = {
  id: string;
  locale: string;
  title: string;
  slug: string;
  coverUrl?: string | null;
  excerpt?: string | null;
  category: string;
  status: Status;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  focusKeyphrase?: string | null;
  indexable: boolean;
  follow: boolean;
  updatedAt?: string;

  // Novos campos (vindos do GET /api/admin/posts/:id)
  isWebStory?: boolean | null;
  storyContent?: string | null;
};

type Props = {
  locale: string;
  postId: string;
};

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

function isValidId(id?: string | null) {
  const s = String(id ?? '').trim();
  if (!s) return false;
  if (s === 'undefined' || s === 'null') return false;
  return true;
}

export default function SingleStoryManagerClient({ locale, postId }: Props) {
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string>('');
  const [msg, setMsg] = useState<string>('');
  const [scheduleAt, setScheduleAt] = useState<string>(''); // datetime-local
  const [busy, setBusy] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  function showToast(text: string, type: 'success' | 'error' = 'success') {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  }

  const mounted = useRef(true);

  const articleUrl = useMemo(() => {
    if (!post) return '';
    return `/${post.locale}/category/${post.category}/${post.slug}`;
  }, [post]);

  const storyUrl = useMemo(() => {
    if (!post) return '';
    return `/${post.locale}/story/${post.slug}`;
  }, [post]);

  const hasStory = useMemo(() => {
    if (!post) return false;
    return !!post.isWebStory && !!(post.storyContent && String(post.storyContent).trim().length > 0);
  }, [post]);

  async function loadSafe(pId: string) {
    const ac = new AbortController();
    try {
      setLoading(true);
      setErr('');
      setMsg('');
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(pId)}`, {
        cache: 'no-store',
        signal: ac.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      const p: PostData = {
        id: data.id,
        locale: data.locale,
        title: data.title,
        slug: data.slug,
        coverUrl: data.coverUrl || null,
        excerpt: data.excerpt || '',
        category: data.category,
        status: data.status,
        publishedAt: data.publishedAt || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        canonicalUrl: data.canonicalUrl || null,
        focusKeyphrase: data.focusKeyphrase || null,
        indexable: !!data.indexable,
        follow: !!data.follow,
        updatedAt: data.updatedAt,
        isWebStory: data.isWebStory ?? null,
        storyContent: data.storyContent ?? null,
      };
      if (mounted.current) setPost(p);
    } catch (e: any) {
      if (mounted.current) {
        setErr(e?.message || 'Falha ao carregar post.');
        setPost(null);
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
    return () => ac.abort();
  }

  useEffect(() => {
    mounted.current = true;
    if (!isValidId(postId)) {
      setLoading(false);
      setPost(null);
      setErr('ID do post ausente ou inválido. Abra esta página a partir de um post salvo.');
      return () => {
        mounted.current = false;
      };
    }

    let cleanup: any = null;
    (async () => {
      cleanup = await loadSafe(postId);
    })();

    return () => {
      mounted.current = false;
      try { if (typeof cleanup === 'function') cleanup(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function doAction(action: 'generate' | 'publish' | 'draft' | 'schedule' | 'remove') {
    if (!post) return;
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      if (action === 'remove') {
        // otimista
        setPost((p) => (p ? { ...p, isWebStory: false, storyContent: '' } : p));
        const res = await fetch(`/api/admin/webstories/${post.id}`, { method: 'DELETE' });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);
        showToast('Web Story removido.', 'success');
      } else {
        const body: any = { action };
        if (action === 'schedule') {
          if (!scheduleAt) throw new Error('Defina data/hora para agendar.');
          const d = new Date(scheduleAt);
          if (!Number.isFinite(+d)) throw new Error('Data/hora inválida.');
          body.publishedAt = d.toISOString();
        }
        const res = await fetch(`/api/admin/webstories/${post.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);

        if (action === 'generate') showToast('Web Story gerado (rascunho).', 'success');
        if (action === 'publish') showToast('Publicado com sucesso.', 'success');
        if (action === 'draft') showToast('Voltado para rascunho.', 'success');
        if (action === 'schedule') showToast('Agendado com sucesso.', 'success');
      }
      // Recarrega dados para refletir status/publishedAt/flags
      await loadSafe(post.id);
    } catch (e: any) {
      setErr(e?.message || 'Falha na ação.');
      showToast(e?.message || 'Falha na ação.', 'error');
    } finally {
      setBusy(false);
    }
  }

  // UI
  if (!isValidId(postId)) {
    return (
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
        ID do post ausente ou inválido. Abra esta página a partir de um post já salvo.
      </div>
    );
  }

  if (loading && !post) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="h-5 w-56 animate-pulse rounded bg-gray-100" />
        <div className="mt-3 h-4 w-96 animate-pulse rounded bg-gray-100" />
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="h-28 rounded bg-gray-100" />
          <div className="h-28 rounded bg-gray-100" />
          <div className="h-28 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Post não encontrado (404).
        </div>
        {err ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
            Detalhes: {err}
          </div>
        ) : null}
        <button
          onClick={() => isValidId(postId) && loadSafe(postId)}
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
        >
          Tentar novamente
        </button>
      </div>
    );
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

      {/* Cabeçalho */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{post.title}</h2>
            <div className="mt-1 text-xs text-gray-600 break-all">
              <div>
                Artigo:{' '}
                <a href={articleUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                  {articleUrl}
                </a>
              </div>
              <div>
                Story:{' '}
                <a href={storyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                  {storyUrl}
                </a>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Indicador de Story */}
            {hasStory ? <Pill text="Story: Pronto" color="emerald" /> : <Pill text="Story: Sem Story" color="slate" />}
            {/* Status do Post */}
            <StatusPill status={post.status} />
            {post.publishedAt ? (
              <span className="text-xs text-gray-600">
                Publicado em {new Date(post.publishedAt).toLocaleString()}
              </span>
            ) : (
              <span className="text-xs text-gray-600">Sem data de publicação</span>
            )}
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr,auto]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => doAction('generate')}
                disabled={busy}
                className="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                Gerar (rascunho)
              </button>
              <button
                onClick={() => doAction('publish')}
                disabled={busy}
                className="rounded bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                Publicar agora
              </button>
              <button
                onClick={() => doAction('draft')}
                disabled={busy}
                className="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                Rascunho
              </button>
              <button
                onClick={() => doAction('remove')}
                disabled={busy}
                className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                Remover Story
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-gray-700">Agendar (data/hora)</label>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <button
                onClick={() => doAction('schedule')}
                disabled={busy}
                className="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                Agendar
              </button>
            </div>
          </div>
        </div>

        {/* Mensagens (legacy) */}
        <div className="mt-3 space-y-2">
          {err ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</div>
          ) : null}
          {msg ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{msg}</div>
          ) : null}
        </div>
      </div>

      {/* Preview da capa e SEO para referência */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:col-span-1">
          <div className="text-sm font-semibold text-slate-900">Capa</div>
          <div className="mt-2 overflow-hidden rounded border bg-gray-50">
            {post.coverUrl ? (
              <img src={post.coverUrl} alt="Capa" className="block h-48 w-full object-cover" />
            ) : (
              <div className="flex h-48 w-full items-center justify-center text-xs text-gray-500">Sem capa</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:col-span-2">
          <div className="text-sm font-semibold text-slate-900">SEO do Post (referência)</div>
          <div className="mt-2 text-xs text-gray-700">
            <div><span className="font-semibold">SEO Title:</span> {post.seoTitle || post.title}</div>
            <div className="mt-1"><span className="font-semibold">Meta Description:</span> {post.seoDescription || post.excerpt || '—'}</div>
            <div className="mt-1 break-all"><span className="font-semibold">Canonical:</span> {post.canonicalUrl || articleUrl}</div>
            <div className="mt-1"><span className="font-semibold">Keyphrase:</span> {post.focusKeyphrase || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}