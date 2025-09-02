// app/[locale]/(admin)/admin/menu/page.tsx
// ============================================================================
// Gerenciador do Menu Principal (Server) — nível PhD
// ----------------------------------------------------------------------------

import MenuManagerClient from '@/components/admin/menu/MenuManagerClient';

type PageProps = {
  params: { locale: string };
};

export default function AdminMenuPage({ params }: PageProps) {
  const locale = params.locale || 'fi';
  return (
    <div className="space-y-6">
      <MenuManagerClient locale={locale} />
    </div>
  );
}