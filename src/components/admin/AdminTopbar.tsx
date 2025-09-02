// src/components/admin/AdminTopbar.tsx
// ============================================================================
// Topbar do Dashboard (Client Component)
// ----------------------------------------------------------------------------
// Responsabilidade:
// - Exibir o título/branding do admin e ações globais (busca, perfil).
// - Oferecer botão de menu no mobile para abrir o Drawer da Sidebar.
// - Design branco (clean), microinterações e foco em acessibilidade.
//
// Notas:
// - É autônoma: não depende de i18n para o MVP. Textos podem ser traduzidos depois.
// - O campo de busca pode ser integrado ao filtro global futuramente.
// ============================================================================

'use client';

import Link from 'next/link';

type Props = {
  onMenuOpen: () => void; // chamado ao clicar no hambúrguer em telas pequenas
};

export default function AdminTopbar({ onMenuOpen }: Props) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 md:px-6 lg:px-8">
        {/* Esquerda: Brand + Botão de Menu (mobile) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={onMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded hover:bg-gray-100 md:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Branding do painel (link volta à Home do admin) */}
          <Link
            href="#"
            onClick={(e) => e.preventDefault()}
            className="select-none text-base font-semibold tracking-tight text-slate-900"
            aria-label="Dashboard administrativo"
            title="Dashboard"
          >
            Admin
          </Link>
        </div>

        {/* Centro: Busca (desktop) */}
        <div className="hidden flex-1 px-6 md:block">
          <div className="relative mx-auto max-w-xl">
            <input
              type="search"
              placeholder="Buscar no dashboard..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-gray-400"
              aria-label="Buscar no dashboard"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M21 21l-4.35-4.35M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          </div>
        </div>

        {/* Direita: Ações (ex.: perfil do usuário) */}
        <div className="flex items-center gap-2">
          {/* Placeholder para notificações (futuro) */}
          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded hover:bg-gray-100 md:inline-flex"
            aria-label="Notificações"
            title="Notificações"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Avatar simples (pode integrar com sessão do NextAuth) */}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm hover:shadow"
            aria-label="Conta do usuário"
            title="Conta"
          >
            {/* Placeholder: iniciais do usuário */}
            <span className="text-xs font-semibold text-slate-700">AD</span>
          </button>
        </div>
      </div>
    </header>
  );
}