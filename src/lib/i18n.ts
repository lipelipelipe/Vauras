// src/lib/i18n.ts
// ============================================================================
// Utilitários de i18n (Server-only)
// ----------------------------------------------------------------------------
// Responsabilidades:
// - Resolver/validar o locale de uma rota.
// - Carregar dicionários JSON do filesystem com fallback para o DEFAULT_LOCALE.
// - Oferecer helper t() para busca de chaves com fallback.
// - Tornar o parâmetro "namespaces" flexível (readonly string[]) para aceitar
//   listas como ['common','nav','footer','home'] sem erro de tupla.
// ============================================================================

import 'server-only';
import fs from 'fs';
import path from 'path';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/config/locales';

// Namespaces padrão (mantemos como tupla para melhor DX, mas o getMessages aceita string[])
export const DEFAULT_NAMESPACES = ['common', 'nav', 'footer'] as const;

// Merge profundo simples (objetos), preservando estruturas aninhadas
function deepMerge<T extends Record<string, any>>(base: T, extra: T): T {
  const out: any = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge(out[k] || {}, v as any);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Diretório raiz de locales: src/locales/<locale>/<namespace>.json
const LOCALES_DIR = path.join(process.cwd(), 'src', 'locales');

// Carrega um namespace sincronicamente do disco; em caso de erro, retorna objeto vazio
function loadNamespaceSync(locale: Locale, namespace: string): Record<string, any> {
  const file = path.join(LOCALES_DIR, locale, `${namespace}.json`);
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Normaliza/valida o locale recebido; se inválido, retorna DEFAULT_LOCALE
export function resolveLocale(input?: string | null): Locale {
  if (isLocale(input || '')) return input as Locale;
  return DEFAULT_LOCALE;
}

// Carrega mensagens para um conjunto de namespaces, aplicando fallback no DEFAULT_LOCALE
// Nota: "namespaces" agora é "readonly string[]" — permite passar qualquer lista de strings.
export async function getMessages(
  locale: Locale,
  namespaces: readonly string[] = DEFAULT_NAMESPACES
) {
  const messages: Record<string, Record<string, any>> = {};

  for (const ns of namespaces) {
    // Fallback no DEFAULT_LOCALE (ex.: 'fi'), se o locale atual não for o default
    const base = locale === DEFAULT_LOCALE ? {} : loadNamespaceSync(DEFAULT_LOCALE, ns);
    const current = loadNamespaceSync(locale, ns);
    messages[ns] = deepMerge(base as any, current as any);
  }

  return messages;
}

// Helper para buscar uma chave "ns.path.to.key" dentro do objeto messages.
// - Retorna fallback (se fornecido) ou a própria key quando não encontrar.
export function t(messages: Record<string, any>, key: string, fallback?: string): string {
  const [ns, ...rest] = key.split('.');
  const obj = (messages as any)[ns] || {};
  let cur: any = obj;
  for (const part of rest) {
    if (cur && typeof cur === 'object' && part in cur) cur = cur[part];
    else return fallback ?? key;
  }
  if (typeof cur === 'string') return cur;
  return fallback ?? key;
}