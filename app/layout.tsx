// app/layout.tsx
// ============================================================================
// Root Layout — Defaults globais de SEO (metadataBase + robots)
// ----------------------------------------------------------------------------
// - metadataBase: garante URLs absolutas (canonical/alternates).
// - robots: default explícito index/follow (override por página quando preciso).
// - ROBOTS_DISALLOW_ALL: se ligado (1/true/yes/on), força noindex,nofollow no site todo.
// ============================================================================

import './globals.css';
import type { Metadata } from 'next';

const siteOrigin =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  'http://localhost:3000';

function envBool(v?: string | null, def = false) {
  if (!v) return def;
  return ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase());
}

const disallowAll = envBool(process.env.ROBOTS_DISALLOW_ALL, false);

export const metadata: Metadata = {
  // Garante URLs absolutas em canonical/alternates
  metadataBase: new URL(siteOrigin),

  // Default global de robots; cada rota pode sobrescrever via generateMetadata
  robots: {
    index: !disallowAll,
    follow: !disallowAll,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi">
      <body>{children}</body>
    </html>
  );
}