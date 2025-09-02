// app/[locale]/(admin)/admin/posts/[id]/story/page.tsx
// ============================================================================
// Redireciona qualquer acesso ao editor antigo de Web Story para a tela central
// de gestão em /{locale}/admin/webstories.
// ============================================================================

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Web Stories • Admin',
};

type PageProps = { params: { locale: string; id: string } };

export default function RedirectToWebStories({ params }: PageProps) {
  const locale = params?.locale || 'fi';
  redirect(`/${locale}/admin/webstories`);
}