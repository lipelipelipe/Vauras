// app/[locale]/admin/posts/[id]/page.tsx
// ============================================================================
// Página: Editar Post por ID (Server Component) — nível PhD
// ----------------------------------------------------------------------------
// Responsabilidade:
// - Renderizar o EditorPost em modo "edit", fornecendo "postId".
// - O EditorPost faz o fetch inicial em /api/admin/posts/[id] (GET)
//   e permite salvar via PATCH.
//
// Observações:
// - Esta página não realiza fetch server-side para manter o MVP simples.
//   Toda a lógica de carregamento acontece no Client Component.
// - Futuramente, podemos pré-carregar o post no servidor e passar como "initial"
//   para diminuir TTFB e habilitar caching.
// ============================================================================

import EditorPost from '@/components/admin/EditorPost';

type PageProps = {
  params: { locale: string; id: string };
};

export default function AdminEditPostPage({ params }: PageProps) {
  const locale = params.locale || 'fi';
  const { id } = params;

  return (
    <div className="space-y-6">
      <EditorPost locale={locale} postId={id} />
    </div>
  );
}