// app/[locale]/(admin)/admin/webstories/page.tsx
// ============================================================================
// Admin • Web Stories — Página de Gestão (Server Component)
// ----------------------------------------------------------------------------
// - Requer layout protegido já existente ((admin)/admin/layout.tsx).
// - Renderiza o Client Component WebStoriesManagerClient para ações
//   individuais e em lote: gerar, publicar, agendar, despublicar, remover.
// ============================================================================

import WebStoriesManagerClient from '@/components/admin/webstories/WebStoriesManagerClient';

type PageProps = {
  params: { locale: string };
};

export default function AdminWebStoriesPage({ params }: PageProps) {
  const locale = params.locale || 'fi';

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Web Stories</h1>
          <p className="text-sm text-gray-600">
            Gerencie a criação, publicação, agendamento e remoção de Web Stories. Locale:{' '}
            <strong>{locale.toUpperCase()}</strong>
          </p>
        </div>
      </div>

      <WebStoriesManagerClient locale={locale} />
    </div>
  );
}