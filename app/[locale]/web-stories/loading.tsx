// app/[locale]/web-stories/loading.tsx
// ============================================================================
// Skeleton de carregamento para /{locale}/web-stories — nível PhD
// ----------------------------------------------------------------------------
// - Mantém o layout responsivo enquanto a página SSR carrega do DB.
// - Usa o mesmo grid planejado para os cards reais (3–6 colunas em telas maiores).
// ============================================================================

export default function LoadingWebStories() {
  const placeholders = Array.from({ length: 12 });

  return (
    <div className="space-y-6">
      <header>
        <div className="h-7 w-40 animate-pulse rounded bg-gray-100" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded bg-gray-100" />
      </header>

      <section>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {placeholders.map((_, i) => (
            <li key={i} className="overflow-hidden rounded-2xl ring-1 ring-black/5 bg-white shadow-sm">
              <div className="aspect-[9/16] w-full animate-pulse bg-gray-100" />
              <div className="p-3">
                <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
                <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-gray-100" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}