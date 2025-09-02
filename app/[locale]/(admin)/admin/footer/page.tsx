// app/[locale]/(admin)/admin/footer/page.tsx
// ============================================================================
// Gerenciador do Footer (Server) — PhD Level
// ----------------------------------------------------------------------------

import FooterManagerClient from '@/components/admin/footer/FooterManagerClient';

export default function AdminFooterPage({ params }: { params: { locale: string } }) {
  const locale = params.locale || 'fi';
  return (
    <div className="space-y-6">
      <FooterManagerClient locale={locale} />
    </div>
  );
}