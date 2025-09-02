// src/components/admin/ui/Icon.tsx
// ============================================================================
// Icon (lucide-react wrapper) — catálogo curado + API estável
// ----------------------------------------------------------------------------
// - name: união de nomes comuns (home, edit, trash, settings, etc.)
// - size/strokeWidth/className personalizáveis
// - Fallback leve se nome não existir
// ============================================================================
'use client';

import * as React from 'react';
import {
  Home, Edit3, Trash2, Settings, Menu, X, Search, Bell, FileText, List,
  LayoutPanelLeft, Image as ImageIcon, Globe, Link as LinkIcon, Eye, ExternalLink,
  Calendar, Clock, Tag, BookText, Languages, HelpCircle, Sparkles, Upload, Download,
  Plus, Minus, Check, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/ui/cn';

export type IconName =
  | 'home'
  | 'edit'
  | 'trash'
  | 'settings'
  | 'menu'
  | 'close'
  | 'search'
  | 'bell'
  | 'file-text'
  | 'list'
  | 'sidebar'
  | 'image'
  | 'globe'
  | 'link'
  | 'eye'
  | 'external-link'
  | 'calendar'
  | 'clock'
  | 'tag'
  | 'book'
  | 'languages'
  | 'help'
  | 'sparkles'
  | 'upload'
  | 'download'
  | 'plus'
  | 'minus'
  | 'check'
  | 'alert';

const Registry: Record<IconName, React.FC<any>> = {
  home: Home,
  edit: Edit3,
  trash: Trash2,
  settings: Settings,
  menu: Menu,
  close: X,
  search: Search,
  bell: Bell,
  'file-text': FileText,
  list: List,
  sidebar: LayoutPanelLeft,
  image: ImageIcon,
  globe: Globe,
  link: LinkIcon,
  eye: Eye,
  'external-link': ExternalLink,
  calendar: Calendar,
  clock: Clock,
  tag: Tag,
  book: BookText,
  languages: Languages,
  help: HelpCircle,
  sparkles: Sparkles,
  upload: Upload,
  download: Download,
  plus: Plus,
  minus: Minus,
  check: Check,
  alert: AlertTriangle,
};

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function Icon({
  name,
  size = 18,
  strokeWidth = 2,
  className,
  ...rest
}: IconProps) {
  const Cmp = Registry[name];
  if (!Cmp) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={cn('text-slate-600', className)}
        {...rest}
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={strokeWidth} fill="none" />
      </svg>
    );
  }
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} {...rest} />;
}