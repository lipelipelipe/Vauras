// src/components/admin/AdminSidebar.tsx
// ============================================================================
// Sidebar do Dashboard (Client Component) — Nível PhD
// ----------------------------------------------------------------------------
// Atualização: adiciona item "Comentários" (/ {locale} /admin/comments)
// ============================================================================

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

type Props = {
  locale: string;    // usado para montar hrefs "/{locale}/admin/..."
  open: boolean;     // estado do drawer no mobile
  onClose: () => void;
};

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

// Ícone monocromático genérico
function Icon({ path }: { path: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AdminSidebar({ locale, open, onClose }: Props) {
  const pathname = usePathname() || '/';

  const NAV: NavItem[] = [
    {
      label: 'Dashboard',
      href: `/${locale}/admin`.replace(/\/+$/, ''),
      icon: <Icon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11l2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0h6" />,
    },
    {
      label: 'Posts',
      href: `/${locale}/admin/posts`.replace(/\/+$/, ''),
      icon: <Icon path="M4 6h16M4 12h16M4 18h7" />,
    },
    {
      label: 'Páginas',
      href: `/${locale}/admin/pages`.replace(/\/+$/, ''),
      icon: <Icon path="M4 6h16M4 12h10M4 18h8" />,
    },
    {
      label: 'Comentários',
      href: `/${locale}/admin/comments`.replace(/\/+$/, ''),
      // balão de conversa estilizado com strokes
      icon: <Icon path="M21 15a4 4 0 0 1-4 4H8l-5 3V5a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10z" />,
    },
    {
      label: 'Menu',
      href: `/${locale}/admin/menu`.replace(/\/+$/, ''),
      icon: <Icon path="M3 12h18M3 6h18M3 18h18" />,
    },
    {
      label: 'Footer',
      href: `/${locale}/admin/footer`.replace(/\/+$/, ''),
      icon: <Icon path="M3 6h18M3 12h18M3 18h18" />,
    },
    {
      label: 'Web Stories',
      href: `/${locale}/admin/webstories`.replace(/\/+$/, ''),
      icon: <Icon path="M4 4h16v16H4z M10 8l6 4-6 4V8z" />,
    },
    {
      label: 'Configurações',
      href: `/${locale}/admin/settings`.replace(/\/+$/, ''),
      icon: <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
    },
  ];

  function isActive(href: string): boolean {
    if (href.endsWith('/admin') && pathname === href) return true;
    if (href.endsWith('/admin')) return false;
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Overlay (mobile) */}
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 md:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden={!open}
      />

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed z-50 h-full w-[82vw] max-w-[290px] border-r border-gray-200 bg-white shadow-md transition-transform duration-300 md:static md:z-auto md:w-[260px] md:translate-x-0 md:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Menu lateral"
      >
        {/* Cabeçalho (mobile) */}
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 md:hidden">
          <span className="text-base font-semibold">Menu</span>
          <button
            aria-label="Fechar menu"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded hover:bg-gray-100"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex h-[calc(100%-56px)] flex-col gap-6 px-3 py-4 md:h-full md:px-4 md:py-6">
          {/* Branding (desktop) */}
          <div className="hidden select-none px-1 text-sm font-semibold text-slate-800 md:block">
            FinanceNews • Admin
          </div>

          {/* Navegação */}
          <nav className="flex-1 space-y-1">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition',
                    active ? 'bg-gray-900 text-white shadow-sm' : 'text-slate-700 hover:bg-gray-100 hover:text-slate-900'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <span
                    className={clsx(
                      'inline-flex h-8 w-8 items-center justify-center rounded-md ring-1 ring-black/5 transition',
                      active ? 'bg-white/10 text-white' : 'bg-white text-slate-700 group-hover:text-slate-900'
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Rodapé (desktop) */}
          <div className="hidden select-none px-2 text-xs text-gray-500 md:block">
            v0.2 • Dashboard
          </div>
        </div>
      </aside>
    </>
  );
}