// src/components/admin/settings/SettingsManagerClient.tsx
// ============================================================================
// Formulário de Configurações (Client Component) — Nível PhD
// ----------------------------------------------------------------------------
// Responsabilidades:
// - Receber as configurações iniciais do Server Component.
// - Gerenciar o estado do formulário (`useState`).
// - Fornecer campos de entrada para todos os dados de configuração, incluindo
//   os campos JSON bilíngues (Nome do Site, Template de Título) e novos campos
//   de SEO da Home (siteUrl, logoUrl).
// - Ao submeter, enviar uma requisição PATCH para a API `/api/admin/settings`.
// - Exibir mensagens de sucesso ou erro para o usuário.
// - Invalidar o cache do Redis (feito pela API) para que as mudanças
//   sejam refletidas imediatamente no site público.
// ============================================================================

'use client';

import { useState } from 'react';
import type { SiteSettings } from '@/lib/settings';
import clsx from 'clsx';
import { Prisma } from '@prisma/client';

// Um tipo local para facilitar o manuseio dos campos JSON no estado do formulário.
type FormState = Omit<SiteSettings, 'siteName' | 'titleTemplate' | 'defaultMetaDescription'> & {
  siteName: { fi: string; en: string };
  titleTemplate: { fi: string; en: string };
  defaultMetaDescription: { fi: string; en: string };
};

export default function SettingsManagerClient({ initial }: { initial: SiteSettings }) {
  // Função para parsear com segurança os campos JSON do DB, com fallback.
  const parseJsonField = (field: Prisma.JsonValue | null, fallback = { fi: '', en: '' }) => {
    if (typeof field === 'object' && field !== null && !Array.isArray(field)) {
      return { fi: (field as any).fi || '', en: (field as any).en || '' };
    }
    return fallback;
  };

  const [form, setForm] = useState<FormState>({
    ...initial,
    siteName: parseJsonField(initial.siteName),
    titleTemplate: parseJsonField(initial.titleTemplate),
    defaultMetaDescription: parseJsonField(initial.defaultMetaDescription),
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Helper para atualizar campos aninhados (os JSON)
  const setJsonField = (key: 'siteName' | 'titleTemplate' | 'defaultMetaDescription', lang: 'fi' | 'en', value: string) => {
    setForm(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [lang]: value,
      },
    }));
  };

  // Helper para atualizar campos de nível superior
  const setField = (key: keyof FormState, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // Normaliza strings vazias -> null para campos URL (evitar erro no Zod .url())
  const normalizePayload = (f: FormState) => {
    const toNull = (v: string | null | undefined) => {
      const t = (v ?? '').trim();
      return t.length ? t : null;
    };
    return {
      ...f,
      defaultMetaImage: toNull(f.defaultMetaImage || ''),
      siteUrl: toNull(f.siteUrl || ''),
      logoUrl: toNull(f.logoUrl || ''),
      // twitterHandle pode ficar string vazia (Zod aceita string), mas podemos opcionalmente normalizar:
      // twitterHandle: toNull(f.twitterHandle || '') ?? undefined,
    };
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload = normalizePayload(form);

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Falha ao salvar as configurações.');
      }
      setMessage({ text: 'Configurações salvas com sucesso!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
      {/* --- Identidade do Site (Bilíngue) --- */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Identidade do Site</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="siteNameFi" className="block text-sm font-medium text-slate-900">Nome do Site (FI)</label>
            <input
              id="siteNameFi"
              type="text"
              value={form.siteName.fi}
              onChange={(e) => setJsonField('siteName', 'fi', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Talousuutiset"
            />
          </div>
          <div>
            <label htmlFor="siteNameEn" className="block text-sm font-medium text-slate-900">Nome do Site (EN)</label>
            <input
              id="siteNameEn"
              type="text"
              value={form.siteName.en}
              onChange={(e) => setJsonField('siteName', 'en', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="FinanceNews"
            />
          </div>
        </div>
      </div>

      {/* --- SEO Global (Bilíngue e Geral) --- */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">SEO Global</h2>

        {/* Templates de título por idioma */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="titleTemplateFi" className="block text-sm font-medium text-slate-900">Template do Título (FI)</label>
            <input
              id="titleTemplateFi"
              type="text"
              value={form.titleTemplate.fi}
              onChange={(e) => setJsonField('titleTemplate', 'fi', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              placeholder="%s | Talousuutiset"
            />
          </div>
          <div>
            <label htmlFor="titleTemplateEn" className="block text-sm font-medium text-slate-900">Template do Título (EN)</label>
            <input
              id="titleTemplateEn"
              type="text"
              value={form.titleTemplate.en}
              onChange={(e) => setJsonField('titleTemplate', 'en', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              placeholder="%s | FinanceNews"
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">Use <strong>%s</strong> para representar o título da página (ex: %s | FinanceNews).</p>

        {/* Meta description padrão por idioma */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="descFi" className="block text-sm font-medium text-slate-900">Meta Descrição Padrão (FI)</label>
            <textarea
              id="descFi"
              rows={3}
              value={form.defaultMetaDescription.fi}
              onChange={(e) => setJsonField('defaultMetaDescription', 'fi', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              maxLength={160}
              placeholder="Kuvaus etusivulle..."
            />
          </div>
          <div>
            <label htmlFor="descEn" className="block text-sm font-medium text-slate-900">Meta Descrição Padrão (EN)</label>
            <textarea
              id="descEn"
              rows={3}
              value={form.defaultMetaDescription.en}
              onChange={(e) => setJsonField('defaultMetaDescription', 'en', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              maxLength={160}
              placeholder="Homepage default description..."
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">Descrição para a página inicial e como fallback para outras páginas.</p>

        {/* Imagem padrão de compartilhamento (OG:image) */}
        <div>
          <label htmlFor="defaultMetaImage" className="block text-sm font-medium text-slate-900">Imagem Padrão (Open Graph)</label>
          <input
            id="defaultMetaImage"
            type="url"
            value={form.defaultMetaImage || ''}
            onChange={(e) => setField('defaultMetaImage', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="https://seu-site.com/imagem-social.jpg"
          />
          <p className="mt-1 text-xs text-gray-500">Imagem usada ao compartilhar links nas redes sociais (tamanho recomendado: 1200x630px).</p>
        </div>

        {/* Novos: Site URL e Logo URL (JSON-LD da Home) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="siteUrl" className="block text-sm font-medium text-slate-900">Site URL</label>
            <input
              id="siteUrl"
              type="url"
              value={form.siteUrl || ''}
              onChange={(e) => setField('siteUrl', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              placeholder="https://www.seu-dominio.com"
            />
            <p className="mt-1 text-xs text-gray-500">
              Usado no JSON-LD (WebSite/Organization) da Home. Se vazio, será inferido pelos cabeçalhos do request.
            </p>
          </div>
          <div>
            <label htmlFor="logoUrl" className="block text-sm font-medium text-slate-900">Logo URL (SEO)</label>
            <input
              id="logoUrl"
              type="url"
              value={form.logoUrl || ''}
              onChange={(e) => setField('logoUrl', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              placeholder="https://www.seu-dominio.com/logo-112x112.png"
            />
            <p className="mt-1 text-xs text-gray-500">
              Logo recomendado para JSON-LD (mín. 112×112). Não é exibido na UI; apenas para crawlers (Google).
            </p>
          </div>
        </div>

        {/* Twitter */}
        <div>
          <label htmlFor="twitterHandle" className="block text-sm font-medium text-slate-900">Twitter Handle (Opcional)</label>
          <input
            id="twitterHandle"
            type="text"
            value={form.twitterHandle || ''}
            onChange={(e) => setField('twitterHandle', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="@FinanceNews"
          />
        </div>
      </div>

      {/* --- Ações --- */}
      <div className="flex items-center gap-4 border-t pt-4">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
        {message && (
          <div className={clsx('text-sm', message.type === 'success' ? 'text-emerald-600' : 'text-red-600')}>
            {message.text}
          </div>
        )}
      </div>
    </form>
  );
}