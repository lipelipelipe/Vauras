// app/[locale]/head.tsx
// ============================================================================
// Head para /[locale] — maximiza performance (pré-conexões enxutas)
// ----------------------------------------------------------------------------
// - DNS Prefetch + Preconnect somente para hosts realmente usados por imagens.
// - Opt-out do auto-dark do UA e theme-color consistente.
// - Mantém o head minimalista para reduzir bloqueio do FCP.
// ============================================================================

export default function Head() {
  return (
    <>
      {/* Habilita DNS Prefetch global */}
      <meta httpEquiv="x-dns-prefetch-control" content="on" />

      {/* Opt-out de auto-dark do UA (Chrome/Android, Safari/iOS) */}
      <meta name="color-scheme" content="light" />
      <meta name="supported-color-schemes" content="light" />
      <meta name="theme-color" content="#ffffff" />

      {/* Vercel Blob (uploads públicos) */}
      <link
        rel="preconnect"
        href="https://public.blob.vercel-storage.com"
        crossOrigin="anonymous"
      />
      <link rel="dns-prefetch" href="https://public.blob.vercel-storage.com" />

      {/* Imagens externas comuns (capas/trending) — mantenha apenas o que usa */}
      <link
        rel="preconnect"
        href="https://images.unsplash.com"
        crossOrigin="anonymous"
      />
      <link rel="dns-prefetch" href="https://images.unsplash.com" />

      <link
        rel="preconnect"
        href="https://images.cdn.yle.fi"
        crossOrigin="anonymous"
      />
      <link rel="dns-prefetch" href="https://images.cdn.yle.fi" />

      <link
        rel="preconnect"
        href="https://assets.apu.fi"
        crossOrigin="anonymous"
      />
      <link rel="dns-prefetch" href="https://assets.apu.fi" />

      <link
        rel="preconnect"
        href="https://media.istockphoto.com"
        crossOrigin="anonymous"
      />
      <link rel="dns-prefetch" href="https://media.istockphoto.com" />
    </>
  );
}