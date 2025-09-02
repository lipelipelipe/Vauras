// app/[locale]/(admin)/admin/pages/[id]/page.tsx
// ============================================================================
// Editar Página (Server) — nível PhD
// ----------------------------------------------------------------------------

import EditorPage from '@/components/admin/pages/EditorPage';

type PageProps = {
  params: { locale: string; id: string };
};

export default function AdminEditPage({ params }: PageProps) {
  const locale = params.locale || 'fi';
  const { id } = params;
  return (
    <div className="space-y-6">
      <EditorPage locale={locale} pageId={id} />
    </div>
  );
}