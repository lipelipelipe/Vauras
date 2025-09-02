// app/[locale]/(admin)/admin/page.tsx
// ============================================================================
// Dashboard Overview (Server Component) — conectado ao Analytics
// ----------------------------------------------------------------------------
// - Mantém layout protegido via route group
// - Renderiza AdminOverviewClient (KPIs, série 30d, top posts, categorias)
// ============================================================================

type PageProps = { params: { locale: string } };
import AdminOverviewClient from '@/components/admin/dashboard/AdminOverviewClient';

export default async function AdminOverviewPage({ params }: PageProps) {
  const locale = params.locale || 'fi';

  return (
    <div className="space-y-8">
      {/* Título + filtros simples (placeholder) */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <div className="hidden items-center gap-2 md:flex">
          <button
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-gray-50"
            title="Período: últimos 7 dias"
          >
            7d
          </button>
          <button
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-gray-50"
            title="Período: últimos 30 dias"
          >
            30d
          </button>
        </div>
      </div>

      {/* Overview (client-side) */}
      <AdminOverviewClient locale={locale} />
    </div>
  );
}