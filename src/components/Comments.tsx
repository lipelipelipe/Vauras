// src/components/Comments.tsx
// ============================================================================
// Comments (Client Component) — elegante, leve e 100% traduzido (fi/en)
// ----------------------------------------------------------------------------
// Mantém implementação original. Uso:
//   <Comments postId={postId} locale={locale} />
// ============================================================================

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type CommentItem = {
  id: string;
  displayName: string;
  content: string;
  createdAt: string;
};

type FetchResp = {
  ok: boolean;
  page: number;
  perPage: number;
  total: number;
  items: CommentItem[];
};

const L = (l: 'fi' | 'en') =>
  l === 'fi'
    ? {
        title: 'Kommentit',
        nameLabel: 'Nimesi',
        emailLabel: 'Sähköposti (valinnainen)',
        emailPlaceholder: 'you@example.com',
        messageLabel: 'Viesti',
        send: 'Lähetä',
        sending: 'Lähetetään…',
        none: 'Ei kommentteja vielä.',
        prev: 'Edellinen',
        next: 'Seuraava',
        errorLoad: 'Kommenttien lataaminen epäonnistui.',
        errorSend: 'Kommentin lähettäminen epäonnistui.',
      }
    : {
        title: 'Comments',
        nameLabel: 'Name',
        emailLabel: 'Email (optional)',
        emailPlaceholder: 'you@example.com',
        messageLabel: 'Message',
        send: 'Send',
        sending: 'Sending…',
        none: 'No comments yet.',
        prev: 'Prev',
        next: 'Next',
        errorLoad: 'Failed to load comments.',
        errorSend: 'Failed to send comment.',
      };

function sid(): string {
  try {
    const k = 'sid';
    let s = localStorage.getItem(k);
    if (!s) {
      s = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(k, s);
    }
    return s;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function fmtDate(iso: string, locale: 'fi' | 'en') {
  try {
    const d = new Date(iso);
    return d.toLocaleString(locale === 'fi' ? 'fi-FI' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const EMOJIS = ['😀', '😂', '❤️', '🔥', '👍', '👎', '👏', '😮', '😢', '🎉'];

export default function Comments({ postId, locale }: { postId: string; locale: 'fi' | 'en' }) {
  const T = L(locale);

  const [items, setItems] = useState<CommentItem[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  // form
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const honeyRef = useRef<HTMLInputElement | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);

  async function load(p = 1) {
    setLoading(true);
    setErr('');
    try {
      const sp = new URLSearchParams({ postId, page: String(p), perPage: String(perPage) });
      const res = await fetch(`/api/comments?${sp.toString()}`, { cache: 'no-store' });
      const j: FetchResp = await res.json();
      if (!res.ok || !j?.ok) throw new Error((j as any)?.error || `HTTP ${res.status}`);
      setItems(j.items || []);
      setTotal(j.total || 0);
      setPage(j.page || p);
    } catch (e: any) {
      setErr(e?.message || T.errorLoad);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    try {
      setErr('');
      setBusy(true);
      const hp = honeyRef.current?.value || '';
      const payload = {
        postId,
        locale,
        displayName: displayName.trim(),
        email: email.trim(),
        content: content.trim(),
        sid: sid(),
        honeypot: hp,
      };
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);

      const it: CommentItem = j.item;
      setItems((arr) => [it, ...arr]);
      setTotal((n) => n + 1);
      setContent('');
    } catch (e: any) {
      setErr(e?.message || T.errorSend);
    } finally {
      setBusy(false);
    }
  }

  function addEmoji(em: string) {
    setContent((c) => (c ? c + ' ' + em : em));
  }

  return (
    <section aria-label={T.title} className="mt-10">
      <h3 className="mb-3 text-lg font-semibold text-slate-900">{T.title}</h3>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">{T.nameLabel}</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              maxLength={40}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
              placeholder={locale === 'fi' ? 'Nimesi' : 'Your name'}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">{T.emailLabel}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
              placeholder={T.emailPlaceholder}
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">{T.messageLabel}</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            minLength={2}
            maxLength={2000}
            rows={5}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
            placeholder={locale === 'fi' ? 'Kirjoita kommenttisi...' : 'Write your comment...'}
          />
        </label>

        {/* Emoji helper */}
        <div className="flex flex-wrap items-center gap-1.5">
          {EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => addEmoji(em)}
              className="inline-flex items-center justify-center rounded-md bg-white px-2 py-1 text-sm shadow ring-1 ring-gray-200 hover:bg-gray-50"
              aria-label={`Insert ${em}`}
              title={`Insert ${em}`}
            >
              {em}
            </button>
          ))}
        </div>

        {/* honeypot invisível */}
        <input ref={honeyRef} type="text" name="website" autoComplete="off" tabIndex={-1} className="hidden" />

        <div className="flex items-center justify-between">
          {err ? <div className="text-sm text-rose-700">{err}</div> : <div className="text-sm text-gray-500" />}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-60"
          >
            {busy ? T.sending : T.send}
          </button>
        </div>
      </form>

      {/* Lista */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {loading ? (
          <ul className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="animate-pulse">
                <div className="h-4 w-40 rounded bg-gray-100" />
                <div className="mt-2 h-3 w-4/5 rounded bg-gray-100" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-600">{T.none}</div>
        ) : (
          <ul className="space-y-4">
            {items.map((c) => (
              <li key={c.id} className="border-b border-gray-100 pb-4 last:border-none last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{c.displayName}</span>
                  <span className="text-xs text-gray-500">{fmtDate(c.createdAt, locale)}</span>
                </div>
                <div className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-900">
                  {c.content}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {locale === 'fi'
                ? `Sivu ${page} / ${totalPages}`
                : `Page ${page} of ${totalPages}`}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void load(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm disabled:opacity-60 hover:bg-gray-50"
              >
                {T.prev}
              </button>
              <button
                onClick={() => void load(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loading}
                className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm disabled:opacity-60 hover:bg-gray-50"
              >
                {T.next}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}