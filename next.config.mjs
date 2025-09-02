// next.config.mjs
// ============================================================================
// Next.js Config — foco absoluto em performance de runtime e bundle
// ----------------------------------------------------------------------------
// - images.remotePatterns: libera hosts remotos usados por <Image>.
// - rewrites: mapeia sitemaps de webstories .xml.
// - headers: headers de segurança leves (mantendo compat performance).
// - compiler: remove console e props do React em produção (bytes a menos).
// - experimental.optimizePackageImports: melhora tree-shaking de libs pesadas.
// - modularizeImports (fallback): força importes modulares para lucide-react.
// - compress + poweredByHeader: micro gains.
// ============================================================================

import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,

  images: {
    remotePatterns: [
      // Vercel Blob (public)
      { protocol: 'https', hostname: 'public.blob.vercel-storage.com' },

      // Fontes de imagens realmente usadas
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.cdn.yle.fi' },
      { protocol: 'https', hostname: 'assets.apu.fi' },
      { protocol: 'https', hostname: 'media.istockphoto.com' },
    ],
  },

  async rewrites() {
    return [
      // Sitemaps Web Stories com sufixo .xml
      { source: '/sitemaps/webstories/:locale.xml', destination: '/sitemaps/webstories/:locale' },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=()' },
        ],
      },
    ];
  },

  compiler: {
    // Remove console.* em produção (exceto warnings e errors)
    removeConsole: { exclude: ['error', 'warn'] },
    // Remove props de dev do React (menor bundle)
    reactRemoveProperties: true,
  },

  experimental: {
    // Otimiza imports de pacotes para reduzir bundle (quando suportado)
    optimizePackageImports: [
      'lucide-react',
      'react-markdown',
      'remark-gfm',
    ],
  },

  // Fallback para modularizar imports em libs com muitos exports (melhor tree-shaking)
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
      skipDefaultConversion: true,
    },
  },
};

export default withBundleAnalyzer(nextConfig);