// app/[locale]/(admin)/admin/layout.tsx
// ============================================================================
// Layout PROTEGIDO do Dashboard Administrativo (Server Component) — nível PhD
// ----------------------------------------------------------------------------
// Por que este caminho?
// - Usamos um "route group" (pasta entre parênteses) para aplicar este layout
//   SOMENTE às rotas do Admin, sem afetar /[locale]/admin/login.
// - Assim, /[locale]/admin/login fica fora deste layout e NÃO entra no loop.
// 
// Responsabilidades:
// - Checar sessão (NextAuth) + role admin.
// - Redirecionar para /{locale}/admin/login se não autenticado.
// - Renderizar o shell do Admin (Topbar + Sidebar).
//
// Importante:
// - Remova o antigo arquivo app/[locale]/admin/layout.tsx para evitar conflitos.
// ============================================================================

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AdminLayoutShell from '@/components/admin/AdminLayoutShell';

type AdminLayoutProps = {
  children: React.ReactNode;
  params: { locale: string };
};

// SEO: Admin não deve ser indexado
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Admin • Uutiset',
};

export default async function ProtectedAdminLayout({ children, params }: AdminLayoutProps) {
  const locale = params.locale || 'fi';

  // Sessão no servidor
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role || 'guest';

  // Proteção da área admin (somente usuários com role 'admin')
  if (!session || role !== 'admin') {
    const cb = encodeURIComponent(`/${locale}/admin`);
    redirect(`/${locale}/admin/login?callbackUrl=${cb}`);
  }

  // Envolve o conteúdo com o shell (Topbar + Sidebar)
  return <AdminLayoutShell locale={locale}>{children}</AdminLayoutShell>;
}