// src/lib/seo/site.ts
import { DEFAULT_LOCALE } from '@/config/locales';

export function trimSlash(u?: string | null) {
  return String(u || '').replace(/\/+$/, '');
}

export function detectBaseUrl(siteUrl?: string | null) {
  if (siteUrl) {
    try { return trimSlash(new URL(siteUrl).origin); } catch {}
  }
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  if (envUrl) {
    try { return trimSlash(new URL(envUrl).origin); } catch {}
  }
  return 'http://localhost:3000';
}

export function pickByLocale(obj: any, locale: string): string {
  if (!obj) return '';
  return String(obj?.[locale] ?? obj?.[DEFAULT_LOCALE] ?? '').trim();
}