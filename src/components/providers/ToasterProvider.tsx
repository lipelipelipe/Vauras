// src/components/providers/ToasterProvider.tsx
// ============================================================================
// ToasterProvider — sonner (toasts modernos) para o Admin
// ----------------------------------------------------------------------------
// - Posição: top-right
// - Cores ricas ativadas
// - Botão de fechar em cada toast
// - Estilo sutil, sem poluição visual
// ============================================================================
'use client';

import { Toaster } from 'sonner';

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          // Aparência limpa e consistente com o Admin
          background: '#ffffff',
          color: '#0f172a',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          fontSize: '13px',
        },
      }}
    />
  );
}