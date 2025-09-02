// app/[locale]/(admin)/layout.tsx
// ============================================================================
// Layout do Route Group (admin) — injeta apenas providers do Admin
// ----------------------------------------------------------------------------
// - Não inclui Header/Footer públicos
// - Inclui ToasterProvider (sonner) para toasts do Admin
// ============================================================================
import type { ReactNode } from 'react';
import ToasterProvider from '@/components/providers/ToasterProvider';

export default function AdminGroupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ToasterProvider />
      {children}
    </>
  );
}