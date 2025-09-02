'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { analyzeSEO } from '@/lib/seo/analyzer';
import SeoGauge from '@/components/admin/seo/SeoGauge';
import SeoChecks from '@/components/admin/seo/SeoChecks';
import { slugify } from '@/lib/slug';

type PostStatus = 'draft' | 'published' | 'scheduled';
type SourceTag = 'db' | 'menu';

export type PostForm = {
  title: string;
  slug: string;
  coverUrl: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  status: PostStatus;
  publishedAt?: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  focusKeyphrase: string;
  indexable: boolean;
  follow: boolean;
  authorName?: string;
  imageAlt?: string;
};

type EditorPostProps = {
  locale: string;
  postId?: string;
  initial?: Partial<PostForm>;
};

type Cat = { slug: string; name: string; order?: number; source?: SourceTag };

export default function EditorPost({ locale, postId, initial }: EditorPostProps) {
  const router = useRouter();
  const normLocale = (locale || 'fi').toLowerCase() as 'fi' | 'en';

  const [categories, setCategories] = useState<Cat[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [catsError, setCatsError] = useState('');

  const [form, setForm] = useState<PostForm>(() => {
    const base: PostForm = {
      title: '',
      slug: '',
      coverUrl: '',
      excerpt: '',
      content: '',
      category: (initial?.category || '').trim(),
      tags: [],
      status: 'draft',
      publishedAt: undefined,
      seoTitle: '',
      seoDescription: '',
      canonicalUrl: '',
      focusKeyphrase: '',
      indexable: true,
      follow: true,
      authorName: '',
      imageAlt: '',
    };
    return { ...base, ...(initial || {}) };
  });

  const [loading, setLoading] = useState<boolean>(!!postId);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [imgBusy, setImgBusy] = useState(false);
  const [imgMsg, setImgMsg] = useState<string>('');
  const [imageImportUrl, setImageImportUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [transBusy, setTransBusy] = useState(false);
  const [transMsg, setTransMsg] = useState<string>('');

  // Carregar post existente (edição)
  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!postId) return;
      setLoading(true);
      setStatusMsg('');
      try {
        const res = await fetch(`/api/admin/posts/${postId}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (ignore) return;
        const next: PostForm = {
          title: data.title || '',
          slug: data.slug || '',
          coverUrl: data.coverUrl || '',
          excerpt: data.excerpt || '',
          content: data.content || '',
          category: data.category || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          status: (data.status as PostStatus) || 'draft',
          publishedAt: data.publishedAt || undefined,
          seoTitle: data.seoTitle || '',
          seoDescription: data.seoDescription || '',
          canonicalUrl: data.canonicalUrl || '',
          focusKeyphrase: data.focusKeyphrase || '',
          indexable: data.indexable ?? true,
          follow: data.follow ?? true,
          authorName: data.authorName || '',
          imageAlt: data.imageAlt || '',
        };
        setForm(next);
      } catch (e: any) {
        setStatusMsg(`Falha ao carregar post: ${e?.message || 'erro'}`);
      } finally {
        setLoading(false);
      }
    }
    void load();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Slug auto a partir do título
  useEffect(() => {
    if (!form.title) return;
    if (!form.slug || form.slug === slugify(form.title)) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title]);

  // Carregar categorias (DB + Menu) em uma só chamada
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoadingCats(true);
        setCatsError('');
        const r = await fetch(`/api/admin/categories?locale=${normLocale}&mergeMenu=1`, {
          cache: 'no-store',
          signal: ac.signal,
        });
        const j = await r.json().catch(() => ({}));
        const arr: Cat[] = r.ok && j?.ok ? (j.items || []) : [];
        // DB primeiro (já ordenado), depois menu (com order alto); garantimos consistência
        setCategories(arr);
        if (!form.category && arr[0]?.slug) {
          setForm((f) => ({ ...f, category: arr[0].slug }));
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setCatsError(e?.message || 'Falha ao carregar categorias.');
          setCategories([]);
        }
      } finally {
        setLoadingCats(false);
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normLocale]);

  const analysis = useMemo(
    () =>
      analyzeSEO({
        locale: normLocale,
        title: form.title,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        slug: form.slug,
        content: form.content,
        excerpt: form.excerpt,
        focusKeyphrase: form.focusKeyphrase,
        categorySlug: form.category,
      }),
    [normLocale, form.title, form.seoTitle, form.seoDescription, form.slug, form.content, form.excerpt, form.focusKeyphrase, form.category]
  );

  function set<K extends keyof PostForm>(key: K, value: PostForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function onChangeTags(s: string) {
    const arr = s.split(',').map((x) => x.trim()).filter(Boolean);
    set('tags', arr);
  }

  function normalizeUrlField(v?: string): string | null | undefined {
    const t = (v || '').trim();
    if (!t || t.includes('...')) return null;
    try { new URL(t); return t; } catch { return undefined; }
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
        body: JSON.stringify({ url: u, postId, field: 'coverUrl' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.url) throw new Error(data?.error || 'Falha ao importar imagem.');
      set('coverUrl', data.url);
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
      if (postId) fd.append('postId', postId);
      fd.append('field', 'coverUrl');
      const res = await fetch('/api/admin/images/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.url) throw new Error(data?.error || 'Falha ao enviar imagem.');
      set('coverUrl', data.url);
      setImgMsg('Upload concluído com sucesso.');
    } catch (e: any) {
      setImgMsg(e?.message || 'Falha no upload.');
    } finally {
      setImgBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function createOrOpenTranslation() {
    if (!postId) {
      setTransMsg('Salve o post primeiro para criar a tradução.');
      return;
    }
    try {
      setTransMsg('');
      setTransBusy(true);
      const target = normLocale === 'fi' ? 'en' : 'fi';
      const res = await fetch(`/api/admin/posts/${postId}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLocale: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.id) throw new Error(data?.error || 'Falha ao criar/abrir tradução.');
      setTransMsg('Tradução pronta. Abrindo editor...');
      router.push(`/${target}/admin/posts/${data.id}`);
    } catch (e: any) {
      setTransMsg(e?.message || 'Falha ao criar/abrir tradução.');
    } finally {
      setTransBusy(false);
    }
  }

  async function saveDraft() { await persist('draft'); }
  async function publishNow() { await persist('published'); }
  async function schedule() {
    if (!form.publishedAt) { setStatusMsg('Defina uma data/hora para agendar.'); return; }
    await persist('scheduled');
  }

  function strOrNull(s?: string): string | null | undefined {
    if (s === undefined) return undefined;
    const t = (s || '').trim();
    return t.length ? t : null;
  }

  async function persist(nextStatus: PostStatus) {
    setSaving(true);
    setStatusMsg('');
    try {
      if (!form.category) throw new Error('Selecione uma categoria.');

      const payload: any = { ...form, status: nextStatus, locale: normLocale };

      const coverField = normalizeUrlField(form.coverUrl);
      if (coverField !== undefined) payload.coverUrl = coverField;

      const canonicalField = normalizeUrlField(form.canonicalUrl);
      if (canonicalField !== undefined) payload.canonicalUrl = canonicalField;

      const authorField = strOrNull(form.authorName);
      if (authorField !== undefined) payload.authorName = authorField;

      const imageAltField = strOrNull(form.imageAlt);
      if (imageAltField !== undefined) payload.imageAlt = imageAltField;

      let res: Response;
      if (postId) {
        res = await fetch(`/api/admin/posts/${postId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/posts', {
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
      if (!postId && data?.id) {
        router.push(`/${normLocale}/admin/posts/${data.id}`);
        return;
      }
    } catch (e: any) {
      setStatusMsg(`Falha ao salvar: ${e?.message || 'erro'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {postId ? 'Editar Post' : 'Novo Post'}
          </h1>
          <p className="text-sm text-gray-500">
            Locale: <strong>{normLocale.toUpperCase()}</strong>
            {analysis?.metrics
              ? ` • ${analysis.metrics.words.toLocaleString()} palavras • ~${analysis.metrics.readMinutes} min leitura`
              : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={saveDraft}
            disabled={saving}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-gray-50 disabled:opacity-60"
          >
            Salvar Rascunho
          </button>
          <button
            onClick={publishNow}
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-60"
          >
            Publicar
          </button>
        </div>
      </div>

      {statusMsg ? (
        <div
          className={clsx(
            'rounded-lg px-3 py-2 text-sm',
            statusMsg.startsWith('Falha')
              ? 'border border-red-200 bg-red-50 text-red-700'
              : 'border border-gray-200 bg-gray-50 text-gray-700'
          )}
        >
          {statusMsg}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="block text-sm font-medium text-slate-900">Título</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Digite o título do post"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
            />
            <div className="mt-3 grid gap-3 md:grid-cols-[2fr,1fr]">
              <div>
                <label className="block text-sm font-medium text-slate-900">Slug</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => set('slug', slugify(e.target.value))}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => set('slug', slugify(form.title || form.slug))}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
                  >
                    Gerar
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  /{normLocale}/category/{form.category || 'categoria'}/{form.slug || 'slug'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900">Categoria</label>
                <select
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
                  disabled={loadingCats}
                >
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}{c.source === 'menu' ? ' (menu)' : ''}
                    </option>
                  ))}
                </select>

                {loadingCats ? (
                  <p className="mt-1 text-xs text-gray-500">Carregando categorias…</p>
                ) : catsError ? (
                  <p className="mt-1 text-xs text-rose-700">{catsError}</p>
                ) : categories.length > 0 ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Fonte: {categories.every((c) => c.source === 'db') ? 'DB (Category)' : 'DB + Menu'}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-amber-700">Nenhuma categoria encontrada.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
              <div>
                <label className="block text-sm font-medium text-slate-900">URL da capa (manual)</label>
                <input
                  type="url"
                  value={form.coverUrl}
                  onChange={(e) => set('coverUrl', e.target.value)}
                  placeholder="https://public.blob.vercel-storage.com/arquivo.jpg"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
                />
                <div className="mt-3">
                  <label className="block text-sm font-medium text-slate-900">Importar da URL externa</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="url"
                      value={imageImportUrl}
                      onChange={(e) => setImageImportUrl(e.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg"
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
                    />
                    <button
                      type="button"
                      onClick={importFromUrl}
                      disabled={imgBusy}
                      className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-60"
                    >
                      {imgBusy ? 'Importando...' : 'Importar'}
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-slate-900">Upload manual</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-800"
                  />
                  {imgMsg ? (
                    <div
                      className={clsx(
                        'mt-2 rounded px-2 py-1 text-xs',
                        imgMsg.toLowerCase().includes('sucesso') ||
                          imgMsg.toLowerCase().includes('conclu') ||
                          imgMsg.toLowerCase().includes('importada')
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border border-gray-200 bg-gray-50 text-gray-700'
                      )}
                    >
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

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-900">Tags (separe por vírgulas)</label>
              <input
                type="text"
                value={form.tags.join(', ')}
                onChange={(e) => onChangeTags(e.target.value)}
                placeholder="política, economia"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
              />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-900">Resumo (excerpt)</label>
              <textarea
                value={form.excerpt}
                onChange={(e) => set('excerpt', e.target.value)}
                placeholder="Resumo do post para listagens e SEO"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
                rows={3}
              />
              <p className="mt-1 text-xs text-gray-500">Use um resumo objetivo (120–160 caracteres para SEO ideal).</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="block text-sm font-medium text-slate-900">Conteúdo (Markdown opcional)</label>
            <textarea
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              rows={16}
              placeholder="Use markdown para headings..."
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400 font-mono"
            />
            <p className="mt-2 text-xs text-gray-500">
              Dica: inclua a keyphrase no primeiro parágrafo e em pelo menos um H2/H3.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <SeoGauge score={analysis.score} />
              <div className="flex-1">
                <SeoChecks checks={analysis.checks} metrics={analysis.metrics} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-900">Autor (opcional)</label>
              <input
                type="text"
                value={form.authorName || ''}
                onChange={(e) => set('authorName', e.target.value)}
                placeholder="Nome do autor do artigo"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-400 outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">Quando preenchido, o JSON-LD usará um Person como autor.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">ALT padrão das imagens (opcional)</label>
              <input
                type="text"
                value={form.imageAlt || ''}
                onChange={(e) => set('imageAlt', e.target.value)}
                placeholder="Texto alternativo padrão para as imagens do artigo"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-400 outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                Aplicado como ALT padrão para todas as imagens do conteúdo (não altera o markdown).
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-900">Título SEO</label>
              <input
                type="text"
                value={form.seoTitle}
                onChange={(e) => set('seoTitle', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-400 outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">{analysis.metrics.titleLength} caracteres (ideal: 50–60)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">Meta description</label>
              <textarea
                value={form.seoDescription}
                onChange={(e) => set('seoDescription', e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-400 outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">{analysis.metrics.descLength} caracteres (ideal: 120–160)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">Keyphrase principal</label>
              <input
                type="text"
                value={form.focusKeyphrase}
                onChange={(e) => set('focusKeyphrase', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">Canonical URL</label>
              <input
                type="url"
                value={form.canonicalUrl}
                onChange={(e) => set('canonicalUrl', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-400 outline-none"
              />
            </div>
            <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 ring-1 ring-black/5">
              <div className="text-[#1a0dab] text-sm leading-tight line-clamp-2">
                {(form.seoTitle || form.title || 'Título de exemplo') + ' - Uutiset'}
              </div>
              <div className="text-[#202124] text-xs mt-1 break-all">
                https://uutiset.local/{normLocale}/category/{form.category || 'categoria'}/{form.slug || 'slug-de-exemplo'}
              </div>
              <div className="text-[#4d5156] text-sm mt-1 line-clamp-2">
                {form.seoDescription || form.excerpt || 'Descrição de exemplo...'}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <input type="checkbox" checked={form.indexable} onChange={(e) => set('indexable', e.target.checked)} className="rounded border-gray-300" />
                Indexável
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <input type="checkbox" checked={form.follow} onChange={(e) => set('follow', e.target.checked)} className="rounded border-gray-300" />
                Follow
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-900">Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as PostStatus)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
              >
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="scheduled">Agendado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">Data/hora de publicação</label>
              <input
                type="datetime-local"
                value={form.publishedAt ? form.publishedAt.slice(0, 16) : ''}
                onChange={(e) => set('publishedAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={async () => await persist('scheduled')} disabled={saving} className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-gray-50 disabled:opacity-60">Agendar</button>
              <button onClick={async () => await persist('draft')} disabled={saving} className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-gray-50 disabled:opacity-60">Rascunho</button>
              <button onClick={async () => await persist('published')} disabled={saving} className="inline-flex items-center rounded-lg bg-black px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-60">Publicar</button>
            </div>
            {postId ? (
              <Link href={`/${normLocale}/admin/posts/${postId}/story`} prefetch={false} className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline">
                Criar / Editar Web Story ↗
              </Link>
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-slate-900">Ações Rápidas</h2>
            {postId && (
              <Link href={`/${normLocale}/admin/posts/${postId}/story`} prefetch={false} className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 w-full justify-center">
                Criar / Editar Web Story
              </Link>
            )}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!postId) { setTransMsg('Salve o post primeiro para criar a tradução.'); return; }
                  try {
                    setTransMsg(''); setTransBusy(true);
                    const target = normLocale === 'fi' ? 'en' : 'fi';
                    const res = await fetch(`/api/admin/posts/${postId}/translate`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetLocale: target })
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok || !data?.ok || !data?.id) throw new Error(data?.error || 'Falha ao criar/abrir tradução.');
                    setTransMsg('Tradução pronta. Abrindo editor...');
                    router.push(`/${target}/admin/posts/${data.id}`);
                  } catch (e: any) {
                    setTransMsg(e?.message || 'Falha ao criar/abrir tradução.');
                  } finally {
                    setTransBusy(false);
                  }
                }}
                disabled={transBusy || !postId}
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-200 disabled:opacity-60"
              >
                {transBusy ? 'Processando...' : `Tradução ${normLocale === 'fi' ? 'EN' : 'FI'}`}
              </button>
              {!postId && <span className="text-xs text-gray-500 flex-1 text-center">Salve para habilitar ações</span>}
            </div>
            {transMsg ? <div className="mt-2 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700">{transMsg}</div> : null}
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