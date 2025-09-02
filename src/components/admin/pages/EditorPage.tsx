// src/components/admin/pages/EditorPage.tsx
// ============================================================================
// Editor de Página (CMS) — nível PhD (URLs sanitizadas + SEO Analyzer)
// ----------------------------------------------------------------------------
// Novidades:
// - Integração com SEO Analyzer (Yoast-like) usando analyzeSEO + SeoGauge/SeoChecks.
// - Score 0..100, checks de densidade/títulos/legibilidade e métricas.
// - Mantém CRUD, import/upload de capa, publicação e campos de SEO (title/desc/canonical).
// ============================================================================

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { analyzeSEO } from '@/lib/seo/analyzer';
import SeoGauge from '@/components/admin/seo/SeoGauge';
import SeoChecks from '@/components/admin/seo/SeoChecks';

type PageStatus = 'draft' | 'published' | 'scheduled';

type PageForm = {
  title: string;
  path: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  status: PageStatus;
  publishedAt?: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  indexable: boolean;
  follow: boolean;
};

type Props = {
  locale: string;
  pageId?: string;
  initial?: Partial<PageForm>;
};

const RESERVED = new Set(['admin', 'category']);

function normalizePath(input: string) {
  let p = String(input || '').trim().toLowerCase().replace(/^\/*/, '').replace(/\/*$/, '').replace(/\/+/, '/');
  return p;
}

function normalizeUrlField(v?: string): string | undefined {
  const t = (v || '').trim();
  if (!t || t.includes('...')) return undefined;
  try { new URL(t); return t; } catch { return undefined; }
}

// Extrai um "slug" amigável para fins de SEO a partir do path (último segmento)
function slugFromPath(p: string): string {
  const n = normalizePath(p);
  if (!n) return '';
  const parts = n.split('/').filter(Boolean);
  return parts[parts.length - 1] || n;
}

export default function EditorPage({ locale, pageId, initial }: Props) {
  const router = useRouter();
  const normLocale = (locale || 'fi').toLowerCase() as 'fi' | 'en';

  const [form, setForm] = useState<PageForm>(() => ({
    title: '',
    path: '',
    excerpt: '',
    content: '',
    coverUrl: '',
    status: 'draft',
    publishedAt: undefined,
    seoTitle: '',
    seoDescription: '',
    canonicalUrl: '',
    indexable: true,
    follow: true,
    ...(initial || {}),
  }));

  const [loading, setLoading] = useState<boolean>(!!pageId);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [imgBusy, setImgBusy] = useState(false);
  const [imgMsg, setImgMsg] = useState<string>('');
  const [imageImportUrl, setImageImportUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!pageId) return;
      setLoading(true);
      setStatusMsg('');
      try {
        const res = await fetch(`/api/admin/pages/${pageId}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (ignore) return;

        const next: PageForm = {
          title: data.title || '',
          path: data.path || '',
          excerpt: data.excerpt || '',
          content: data.content || '',
          coverUrl: data.coverUrl || '',
          status: (data.status as PageStatus) || 'draft',
          publishedAt: data.publishedAt || undefined,
          seoTitle: data.seoTitle || '',
          seoDescription: data.seoDescription || '',
          canonicalUrl: data.canonicalUrl || '',
          indexable: data.indexable ?? true,
          follow: data.follow ?? true,
        };
        setForm(next);
      } catch (e: any) {
        setStatusMsg(`Falha ao carregar página: ${e?.message || 'erro'}`);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [pageId]);

  const urlPreview = useMemo(() => `/${normLocale}/${normalizePath(form.path)}`, [form.path, normLocale]);

  // SEO Analyzer — cálculo reativo para páginas
  const pageSlug = useMemo(() => slugFromPath(form.path), [form.path]);
  const analysis = useMemo(() => {
    return analyzeSEO({
      locale: normLocale,
      title: form.title,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      slug: pageSlug,
      content: form.content,
      excerpt: form.excerpt,
      // Sem categorySlug para páginas; não usamos focusKeyphrase aqui (pode ser futuro)
    });
  }, [
    normLocale,
    form.title,
    form.seoTitle,
    form.seoDescription,
    pageSlug,
    form.content,
    form.excerpt,
  ]);

  function validatePathOrThrow(p: string) {
    const n = normalizePath(p);
    if (!n) throw new Error('Path não pode ser vazio.');
    const first = n.split('/')[0] || '';
    if (RESERVED.has(first)) throw new Error(`Path reservado: não pode começar com "${first}"`);
    return n;
  }

  async function saveDraft() { await persist('draft'); }
  async function publishNow() { await persist('published'); }
  async function schedule() {
    if (!form.publishedAt) { setStatusMsg('Defina uma data/hora para agendar.'); return; }
    await persist('scheduled');
  }

  async function persist(nextStatus: PageStatus) {
    setSaving(true);
    setStatusMsg('');
    try {
      const npath = validatePathOrThrow(form.path);
      const payload: any = {
        ...form,
        path: npath,
        status: nextStatus,
        locale: normLocale,
      };

      const coverUrl = normalizeUrlField(form.coverUrl);
      if (coverUrl) payload.coverUrl = coverUrl; else delete payload.coverUrl;

      const canonicalUrl = normalizeUrlField(form.canonicalUrl);
      if (canonicalUrl) payload.canonicalUrl = canonicalUrl; else delete payload.canonicalUrl;

      let res: Response;
      if (pageId) {
        res = await fetch(`/api/admin/pages/${pageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let msg = data?.error || `HTTP ${res.status}`;
        if (data?.details?.fieldErrors) {
          const errs = Object.entries<any>(data.details.fieldErrors)
            .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
            .join(' • ');
          if (errs) msg += ` • ${errs}`;
        }
        throw new Error(msg);
      }

      setStatusMsg('Salvo com sucesso.');
      if (!pageId && data?.id) {
        router.push(`/${normLocale}/admin/pages/${data.id}`);
        return;
      }
    } catch (e: any) {
      setStatusMsg(`Falha ao salvar: ${e?.message || 'erro'}`);
    } finally {
      setSaving(false);
    }
  }

  async function importFromUrl() {
    try {
      setImgMsg('');
      const u = (imageImportUrl || '').trim();
      if (!u) { setImgMsg('Informe uma URL de imagem válida.'); return; }
      setImgBusy(true);
      const res = await fetch('/api/admin/images/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: u, postId: pageId, field: 'coverUrl' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.url) throw new Error(data?.error || 'Falha ao importar imagem.');
      setForm((f) => ({ ...f, coverUrl: data.url }));
      setImgMsg('Imagem importada com sucesso.');
    } catch (e: any) {
      setImgMsg(e?.message || 'Falha ao importar imagem.');
    } finally {
      setImgBusy(false);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setImgMsg('');
      const f = e.target.files?.[0];
      if (!f) return;
      setImgBusy(true);
      const fd = new FormData();
      fd.append('file', f);
      if (pageId) fd.append('postId', pageId);
      fd.append('field', 'coverUrl');
      const res = await fetch('/api/admin/images/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.url) throw new Error(data?.error || 'Falha ao enviar imagem.');
      setForm((f) => ({ ...f, coverUrl: data.url }));
      setImgMsg('Upload concluído com sucesso.');
    } catch (e: any) {
      setImgMsg(e?.message || 'Falha no upload.');
    } finally {
      setImgBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{pageId ? 'Editar Página' : 'Nova Página'}</h1>
          <p className="text-sm text-gray-500">
            Locale: <strong>{normLocale.toUpperCase()}</strong> • URL final: <span className="font-mono">{urlPreview}</span>
            {analysis?.metrics ? (
              <> • {analysis.metrics.words.toLocaleString()} palavras • ~{analysis.metrics.readMinutes} min</>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={saveDraft} disabled={saving} className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-gray-50 disabled:opacity-60">Salvar rascunho</button>
          <button onClick={publishNow} disabled={saving} className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-60">Publicar</button>
        </div>
      </div>

      {statusMsg ? (
        <div className={clsx('rounded-lg px-3 py-2 text-sm', statusMsg.startsWith('Falha') ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-gray-200 bg-gray-50 text-gray-700')}>
          {statusMsg}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="block text-sm font-medium text-slate-900">Título</label>
            <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Digite o título da página" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400" />

            <div className="mt-3 grid gap-3 md:grid-cols-[2fr,1fr]">
              <div>
                <label className="block text-sm font-medium text-slate-900">Path (sem / inicial)</label>
                <input type="text" value={form.path} onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))} placeholder="sobre, company/equipe..." className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400" />
                <p className="mt-1 text-xs text-gray-500">URL: /{normLocale}/<strong>{normalizePath(form.path) || 'path'}</strong></p>
                <p className="mt-1 text-xs text-gray-500">Não pode começar com “admin” ou “category”.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PageStatus }))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400">
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="scheduled">Agendado</option>
                </select>
                <label className="mt-3 block text-sm font-medium text-slate-900">Data/hora (para agendar)</label>
                <input type="datetime-local" value={form.publishedAt ? form.publishedAt.slice(0, 16) : ''} onChange={(e) => setForm((f) => ({ ...f, publishedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
              <div>
                <label className="block text-sm font-medium text-slate-900">URL da capa (opcional)</label>
                <input type="url" value={form.coverUrl} onChange={(e) => setForm((f) => ({ ...f, coverUrl: e.target.value }))} placeholder="https://public.blob.vercel-storage.com/arquivo.jpg" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400" />
                <div className="mt-3">
                  <label className="block text-sm font-medium text-slate-900">Importar da URL externa</label>
                  <div className="mt-1 flex gap-2">
                    <input type="url" value={imageImportUrl} onChange={(e) => setImageImportUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400" />
                    <button type="button" onClick={importFromUrl} disabled={imgBusy} className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-60">{imgBusy ? 'Importando...' : 'Importar'}</button>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-slate-900">Upload manual</label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-800" />
                  {imgMsg ? (
                    <div className={clsx('mt-2 rounded px-2 py-1 text-xs', imgMsg.toLowerCase().includes('sucesso') || imgMsg.toLowerCase().includes('conclu') || imgMsg.toLowerCase().includes('importada') ? 'border border-emerald-200 bg-emerald-50 text-emerald-800' : 'border border-gray-200 bg-gray-50 text-gray-700')}>
                      {imgMsg}
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900">Preview da capa</label>
                <div className="mt-1 overflow-hidden rounded-lg border bg-gray-50">
                  {form.coverUrl ? (
                    <img src={form.coverUrl} alt="Capa" className="block h-40 w-full object-cover" />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center text-xs text-gray-500">Sem capa</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-900">Resumo (excerpt)</label>
              <textarea value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} rows={3} placeholder="Resumo curto da página..." className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400" />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="block text-sm font-medium text-slate-900">Conteúdo (Markdown opcional)</label>
            <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={16} placeholder={`Use markdown para headings e imagens, por exemplo:\n\n## Seção\n\nTexto do parágrafo...\n\n![alt](https://example.com/image.jpg)\n\n### Sub-seção\n\nMais texto...`} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400 font-mono" />
          </div>
        </div>

        <div className="space-y-4">
          {/* SEO Analyzer (gauge + checks) */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <SeoGauge score={analysis.score} />
              <div className="flex-1">
                <SeoChecks checks={analysis.checks} metrics={analysis.metrics} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">SEO</h2>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-900">Título SEO</span>
                <input type="text" value={form.seoTitle} onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-400 outline-none" />
                <p className="mt-1 text-xs text-gray-500">{analysis.metrics.titleLength} caracteres (ideal: 50–60)</p>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-900">Meta description</span>
                <textarea value={form.seoDescription} onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-400 outline-none" />
                <p className="mt-1 text-xs text-gray-500">{analysis.metrics.descLength} caracteres (ideal: 120–160)</p>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-900">Canonical URL (opcional)</span>
                <input type="url" value={form.canonicalUrl} onChange={(e) => setForm((f) => ({ ...f, canonicalUrl: e.target.value }))} placeholder="https://seu-dominio/pagina" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-400 outline-none" />
              </label>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.indexable} onChange={(e) => setForm((f) => ({ ...f, indexable: e.target.checked }))} />
                  Indexável
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.follow} onChange={(e) => setForm((f) => ({ ...f, follow: e.target.checked }))} />
                  Follow
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Publicação</h2>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="flex items-center gap-2">
                <button onClick={schedule} disabled={saving} className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-gray-50 disabled:opacity-60">Agendar</button>
                <button onClick={saveDraft} disabled={saving} className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-gray-50 disabled:opacity-60">Salvar rascunho</button>
                <button onClick={publishNow} disabled={saving} className="inline-flex items-center rounded-lg bg-black px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-60">Publicar</button>
              </div>

              {pageId ? (
                <a href={`/${normLocale}/${normalizePath(form.path)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline">Ver no site ↗</a>
              ) : null}
            </div>

            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
              <p className="mb-1 font-semibold">Dicas</p>
              <ul className="list-disc pl-5">
                <li>Evite paths genéricos (use slugs claros: sobre, contato, empresa/press).</li>
                <li>Não inicie o path com “admin” ou “category”.</li>
                <li>Use capa grande (&gt;= 1200px) se quiser destaque visual.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        </div>
      )}
    </div>
  );
}