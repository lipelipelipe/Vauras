// app/[locale]/(admin)/admin/posts/new/page.tsx
// ============================================================================
// Página: Criar novo Post (Server Component) — nível PhD
// ----------------------------------------------------------------------------
// Correção importante:
// - NÃO passar callbacks (funções) como props para Client Components a partir
//   de Server Components. Isso causou o erro "Event handlers cannot be passed..."
// - Aqui, apenas renderizamos <EditorPost locale={...}/> e o próprio EditorPost
//   fará o redirecionamento pós-criação.
//
// Segurança:
// - Esta rota está sob o layout protegido do admin (route group (admin)/admin),
//   portanto só admins autenticados chegam aqui.
// ============================================================================

import EditorPost from '@/components/admin/EditorPost';

type PageProps = {
  params: { locale: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function AdminNewPostPage({ params }: PageProps) {
  const locale = params.locale || 'fi';

  return (
    <div className="space-y-6">
      {/* Importante: não passe callbacks aqui. O EditorPost cuida do redirect após criar. */}
      <EditorPost locale={locale} />
    </div>
  );
}