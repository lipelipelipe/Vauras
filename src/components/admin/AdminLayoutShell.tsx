// src/components/admin/AdminLayoutShell.tsx
// ============================================================================
// Shell do Dashboard Administrativo (Client Component) — nível PhD
// ----------------------------------------------------------------------------
// Responsabilidade:
// - Compor a estrutura do painel: Topbar + Sidebar + Conteúdo.
// - Controlar o estado do menu lateral no mobile (abrir/fechar).
// - Entregar um layout branco, minimalista, com microinterações sutis.
// - Receber "locale" e repassar para a Sidebar construir os links corretos.
//
// Observações de UX:
// - No desktop, a Sidebar fica fixa à esquerda.
// - No mobile, a Sidebar vira um Drawer deslizante com overlay clicável.
// - O conteúdo central tem um container fluido e espaçamento confortável.
// - Animações suaves com Tailwind (transition, transform, backdrop).
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import AdminTopbar from './AdminTopbar';
import AdminSidebar from './AdminSidebar';

type AdminLayoutShellProps = {
  locale: string;           // idioma atual (ex.: 'fi' ou 'en')
  children: React.ReactNode;
};

export default function AdminLayoutShell({ locale, children }: AdminLayoutShellProps) {
  // Estado do Drawer (aparece no mobile)
  const [open, setOpen] = useState(false);

  // Bloqueia scroll do body quando o drawer está aberto (UX melhor em mobile)
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Topbar fixa: busca, usuário e botão de menu (mobile) */}
      <AdminTopbar onMenuOpen={() => setOpen(true)} />

      {/* Área principal: Sidebar (fixa no desktop; drawer no mobile) + Conteúdo */}
      <div className="relative flex">
        {/* Sidebar: no desktop fixa, no mobile é um drawer controlado por "open" */}
        <AdminSidebar locale={locale} open={open} onClose={() => setOpen(false)} />

        {/* Conteúdo: ocupa o espaço restante. 
            Observação: padding-top para não ficar sob a Topbar (h-14). */}
        <main className="flex-1 min-w-0">
          <div className="pt-16 px-4 md:px-6 lg:px-8">
            {/* Container do conteúdo com largura máxima confortável */}
            <div className="mx-auto w-full max-w-[1200px]">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}