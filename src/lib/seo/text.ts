// src/lib/seo/text.ts
// ============================================================================
// Utilitários de texto e i18n para análise SEO — nível PhD
// ----------------------------------------------------------------------------
// Este módulo NÃO usa APIs de Node, podendo ser usado no client e no server.
// Fornece funções de normalização, tokenização, segmentação de sentenças,
// leitura de markdown leve e heurísticas de legibilidade para EN/FI.
// ============================================================================

export type SupportedLocale = 'en' | 'fi';

// ----------------------------------------------------------------------------
// Normalização e tokenização
// ----------------------------------------------------------------------------

/**
 * Remove diacríticos (acentos) de uma string.
 */
export function stripDiacritics(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza texto: minúsculas, remove diacríticos, compacta espaços e trim.
 */
export function normalizeText(s: string): string {
  return stripDiacritics(String(s || ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokeniza palavras (heurística robusta para EN/FI).
 * - Mantém números e palavras alfanuméricas.
 * - Remove pontuações comuns.
 */
export function tokenizeWords(text: string): string[] {
  const norm = normalizeText(text);
  const tokens = norm.match(/\b[0-9a-zäöåüß]+(?:-[0-9a-zäöåüß]+)?\b/gi);
  return tokens ? tokens.map((t) => t.toLowerCase()) : [];
}

/**
 * Conta palavras por tokenização.
 */
export function countWords(text: string): number {
  return tokenizeWords(text).length;
}

/**
 * Tempo de leitura estimado (padrão: 200 wpm).
 */
export function readingTime(text: string, wpm = 200): { words: number; minutes: number } {
  const words = countWords(text);
  return { words, minutes: Math.max(1, Math.round(words / Math.max(120, wpm))) };
}

/**
 * Segmenta sentenças de forma simples (., !, ?).
 * Heurística: considera separadores usuais e ignora múltiplos espaços.
 */
export function splitSentences(text: string): string[] {
  return (String(text || ''))
    .split(/(?<=[\.\!\?])\s+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * Conta ocorrências NÃO sobrepostas de uma frase (keyphrase) no texto normalizado.
 * Usa busca de substring com margens (evita matches parciais simples em extremos).
 */
export function countOccurrences(text: string, phrase: string): number {
  const t = ' ' + normalizeText(text) + ' ';
  const p = ' ' + normalizeText(phrase) + ' ';
  if (!p.trim()) return 0;
  let idx = 0;
  let count = 0;
  while (true) {
    const found = t.indexOf(p, idx);
    if (found === -1) break;
    count++;
    idx = found + p.length;
  }
  return count;
}

/**
 * Densidade de keyphrase em relação ao total de palavras do corpo do texto.
 */
export function keyphraseDensity(bodyText: string, keyphrase: string) {
  const totalWords = countWords(bodyText);
  if (!totalWords || !keyphrase.trim()) return { density: 0, totalWords, occurrences: 0 };
  const occurrences = countOccurrences(bodyText, keyphrase);
  const density = (occurrences / totalWords) * 100;
  return { density, totalWords, occurrences };
}

// ----------------------------------------------------------------------------
// Markdown leve: extrações úteis para SEO
// ----------------------------------------------------------------------------

export type MarkdownFacts = {
  firstParagraph: string;
  paragraphs: string[];
  headings: string[];  // somente H2/H3 (linhas começando com ## ou ###)
  imageAlts: string[]; // alt de imagens markdown (![alt](url))
  linksInternal: number;
  linksExternal: number;
};

/**
 * Extrai fatos de um markdown leve:
 * - Parágrafos (linhas não vazias agrupadas).
 * - Primeiro parágrafo com texto.
 * - Headings H2/H3 (##, ###).
 * - Alts de imagens (![alt](url)).
 * - Contagem de links internos/externos ([text](url)).
 */
export function parseMarkdownFacts(md: string): MarkdownFacts {
  const src = String(md || '');
  const lines = src.split(/\r?\n/);

  const paragraphs: string[] = [];
  const headings: string[] = [];
  const imageAlts: string[] = [];
  let linksInternal = 0;
  let linksExternal = 0;

  let buf: string[] = [];
  const flush = () => {
    const p = buf.join(' ').trim();
    if (p) paragraphs.push(p);
    buf = [];
  };

  for (const raw of lines) {
    const line = raw.trim();

    // Headings H2/H3
    if (/^#{2,3}\s+/.test(line)) {
      headings.push(line.replace(/^#{2,3}\s+/, '').trim());
      flush();
      continue;
    }

// Imagens ![alt](url)
// Pode haver mais de uma imagem por linha
const imgRx = /!\[([^\]]*)\]\([^)]+\)/g;
let im: RegExpExecArray | null;
// eslint-disable-next-line no-cond-assign
while ((im = imgRx.exec(line))) {
  imageAlts.push((im[1] || '').trim());
}

// Links [text](url)
const linkRx = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lk: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((lk = linkRx.exec(line))) {
      const url = (lk[2] || '').trim();
      if (/^https?:\/\//i.test(url)) linksExternal++;
      else linksInternal++;
    }

    // Parágrafo: linhas em branco quebram, outras acumulam
    if (line === '') {
      flush();
    } else {
      buf.push(line);
    }
  }
  flush();

  const firstParagraph = paragraphs.find((p) => p.trim().length > 0) || '';

  return { firstParagraph, paragraphs, headings, imageAlts, linksInternal, linksExternal };
}

// ----------------------------------------------------------------------------
// Legibilidade e heurísticas por idioma
// ----------------------------------------------------------------------------

export const TRANSITION_WORDS: Record<SupportedLocale, string[]> = {
  en: [
    'however', 'therefore', 'moreover', 'furthermore', 'in addition', 'consequently',
    'meanwhile', 'nevertheless', 'for example', 'thus', 'hence', 'additionally',
  ],
  fi: [
    'kuitenkin', 'lisäksi', 'siksi', 'toisaalta', 'esimerkiksi',
    'täten', 'siten', 'sen vuoksi', 'tästä syystä', 'samalla',
  ],
};

/**
 * Proporção de sentenças que contêm ao menos uma transition word.
 */
export function transitionSentenceRatio(sentences: string[], locale: SupportedLocale): number {
  const list = TRANSITION_WORDS[locale] || [];
  if (!sentences.length || !list.length) return 0;
  const hits = sentences.reduce((acc, s) => {
    const norm = normalizeText(s);
    const found = list.some((w) => norm.includes(` ${normalizeText(w)} `) || norm.startsWith(normalizeText(w) + ' '));
    return acc + (found ? 1 : 0);
  }, 0);
  return (hits / sentences.length) * 100;
}

/**
 * Heurística de voz passiva:
 * - EN: "be" forms + particípio (-ed ou irregulares comuns), opcional "by".
 * - FI: terminações -taan/-tään e locuções com "on/oli" + particípio passivo comum.
 */
export function passiveVoiceRatio(sentences: string[], locale: SupportedLocale): number {
  if (!sentences.length) return 0;

  if (locale === 'en') {
    const be = /\b(am|is|are|was|were|be|been|being)\b/i;
    const participleEd = /\b\w+(ed|en)\b/i; // simplificado (inclui muitos regulares e alguns irregulares)
    const by = /\bby\b/i;

    const passives = sentences.filter((s) => {
      const hasBe = be.test(s);
      const hasPart = participleEd.test(s);
      // A presença de "by" fortalece o indício, mas não é obrigatória
      return hasBe && hasPart || (hasPart && by.test(s));
    }).length;

    return (passives / sentences.length) * 100;
  }

  // Finnish (FI)
  // Padrões comuns: terminações "-taan/-tään" (passiva impessoal), "on/oli + tehty/annettu/nähty/..." etc.
  const endings = /(taan|tään)\b/i;
  const aux = /\b(on|oli|ollaan|on ollut)\b/i;
  const participles = /\b(tehty|annettu|nähty|sanottu|kirjoitettu|päätetty|valittu|löydetty|muutettu)\b/i;

  const passives = sentences.filter((s) => {
    const hasEnding = endings.test(s);
    const hasChain = aux.test(s) && participles.test(s);
    return hasEnding || hasChain;
  }).length;

  return (passives / sentences.length) * 100;
}

/**
 * Distribuição de subtítulos (H2/H3) — mede o maior "gap" de palavras entre subtítulos.
 * Entrada: lista de parágrafos; heurística simples sem AST rico.
 */
export function worstHeadingGap(paragraphs: string[]): number {
  if (!paragraphs.length) return 0;
  // Nesta heurística, consideramos que headings reais foram removidos na extração,
  // então consideramos o corpo contínuo. Em um editor com AST, medir entre nós heading.
  // Para efeito prático, usamos o tamanho total se não houver headings.
  const total = paragraphs.reduce((acc, p) => acc + countWords(p), 0);
  return total; // com AST, devolveríamos o maior gap entre dois headings
}