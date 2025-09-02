// app/[locale]/(admin)/admin/pages/new/page.tsx
// ============================================================================
// Nova Página (Server) — nível PhD
// ----------------------------------------------------------------------------

import EditorPage from '@/components/admin/pages/EditorPage';

type PageProps = {
  params: { locale: string };
};

export default function AdminNewPage({ params }: PageProps) {
  const locale = params.locale || 'fi';
  return (
    <div className="space-y-6">
      <EditorPage locale={locale} />
    </div>
  );
}