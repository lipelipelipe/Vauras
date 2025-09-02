// src/lib/seo/analyzer.ts
// ============================================================================
// SEO Analyzer estilo Yoast — nível PhD (client/server safe)
// ----------------------------------------------------------------------------
// Fornece uma análise completa baseada em heurísticas para:
// - Presença da keyphrase (1º parágrafo, H2/H3, alt de imagem).
// - Densidade de keyphrase.
// - Limites de caracteres: título SEO, meta description e slug.
// - Legibilidade: tamanho de sentença/parágrafo, voz passiva, palavras de transição.
// - Links internos/externos (contagem).
// - Snippet (SERP) e score agregado.
//
// Observações:
// - Não depende de Node APIs. Pode ser usado no editor (client).
// - MarkdownFacts é leve; para editores ricos, substitua por AST real.
//
// Integração:
// - Chame analyzeSEO(input) no onChange do editor (com debounce).
// - Exiba checks e metrics; use o score como indicador geral.
// ============================================================================

import {
    normalizeText,
    parseMarkdownFacts,
    keyphraseDensity,
    countWords,
    splitSentences,
    transitionSentenceRatio,
    passiveVoiceRatio,
    readingTime,
    countOccurrences,          // IMPORTANTE: usar a função compartilhada
    type SupportedLocale,
  } from './text';
  import { slugify } from '../slug';
  
  // ----------------------------------------------------------------------------
  // Tipos e thresholds
  // ----------------------------------------------------------------------------
  
  export type CheckLevel = 'good' | 'warn' | 'bad' | 'info';
  
  export type SEOCheck = {
    key: string;               // chave estável da checagem (ex.: 'firstParagraph', 'density')
    ok: boolean;               // passou no critério principal
    level: CheckLevel;         // severidade (usa semáforo)
    message: string;           // mensagem amigável
    details?: Record<string, any>;
  };
  
  export type AnalyzerInput = {
    locale: SupportedLocale | string; // 'fi' | 'en' (outros tratam default EN para heurísticas)
    title: string;                    // título do post (H1)
    seoTitle?: string;                // título SEO (fallback para title)
    seoDescription?: string;          // meta description (fallback para excerpt)
    slug?: string;                    // slug atual
    content: string;                  // corpo (markdown leve)
    excerpt?: string;                 // resumo auxiliar
    focusKeyphrase?: string;          // keyphrase
    categorySlug?: string;            // opcional; montar URL
  };
  
  export type AnalyzerThresholds = {
    titleMin: number;       // 35 (abaixo vira bad)
    titleIdealMin: number;  // 50 (verde min)
    titleIdealMax: number;  // 60 (verde max)
    titleWarnMax: number;   // 70 (acima vira warn; > bad)
    descMin: number;        // 90 (abaixo vira bad)
    descIdealMin: number;   // 120
    descIdealMax: number;   // 160
    descWarnMax: number;    // 180
    slugMax: number;        // 60
    densityOkMin: number;   // 0.5
    densityOkMax: number;   // 2.5
    densityBadMax: number;  // 4
    headingGapGoodMax: number; // ~350
    headingGapWarnMax: number; // ~600
    passiveWarn: number;    // 15 (%)
    passiveBad: number;     // 30 (%)
    transitionGood: number; // 25 (%)
    transitionWarn: number; // 10 (%)
    sentenceGoodMax: number; // EN: 20; FI: 25 (ajustado dinamicamente)
    sentenceWarnMax: number; // EN: 25; FI: 30
    paragraphGoodMax: number; // 5 sentenças
    paragraphWarnMax: number; // 6-7 sentenças
  };
  
  export const DEFAULT_THRESHOLDS: AnalyzerThresholds = {
    titleMin: 35,
    titleIdealMin: 50,
    titleIdealMax: 60,
    titleWarnMax: 70,
  
    descMin: 90,
    descIdealMin: 120,
    descIdealMax: 160,
    descWarnMax: 180,
  
    slugMax: 60,
  
    densityOkMin: 0.5,
    densityOkMax: 2.5,
    densityBadMax: 4,
  
    headingGapGoodMax: 350,
    headingGapWarnMax: 600,
  
    passiveWarn: 15,
    passiveBad: 30,
  
    transitionGood: 25,
    transitionWarn: 10,
  
    sentenceGoodMax: 20, // base EN
    sentenceWarnMax: 25, // base EN
  
    paragraphGoodMax: 5,
    paragraphWarnMax: 7,
  };
  
  export type AnalyzerMetrics = {
    // Contadores básicos
    words: number;
    readMinutes: number;
  
    // Keyphrase
    keyphrase: string;
    keyOccurrences: number;
    density: number;
    totalWords: number;
  
    // Presenças
    firstParagraphHasKeyphrase: boolean;
    headingsWithKeyphrase: number;
    imagesAltWithKeyphrase: number;
  
    // Comprimentos
    titleLength: number;
    descLength: number;
    slugLength: number;
  
    // Legibilidade
    avgSentenceLength: number;
    avgParagraphSentences: number;
    passiveRatio: number;
    transitionRatio: number;
    worstHeadingGap: number;
  
    // Links
    linksInternal: number;
    linksExternal: number;
  };
  
  export type AnalyzerResult = {
    metrics: AnalyzerMetrics;
    checks: SEOCheck[];
    score: number; // 0..100 (indicativo)
    serp: {
      title: string;
      description: string;
      urlPath: string; // ex.: /fi/politiikka/slug
    };
  };
  
  // ----------------------------------------------------------------------------
  // Funções auxiliares internas
  // ----------------------------------------------------------------------------
  
  function clamp(n: number, a: number, b: number) {
    return Math.min(b, Math.max(a, n));
  }
  
  function toSupportedLocale(l: string | undefined): SupportedLocale {
    return l === 'fi' ? 'fi' : 'en';
  }
  
  /**
   * Média de palavras por sentença e média de sentenças por parágrafo.
   */
  function readabilityAverages(content: string) {
    const sentences = splitSentences(content);
    const wordsPerSentence = sentences.map((s) => countWords(s)).filter((n) => n > 0);
    const avgSentenceLength = wordsPerSentence.length
      ? wordsPerSentence.reduce((a, b) => a + b, 0) / wordsPerSentence.length
      : 0;
  
    const paragraphs = (content || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const sentencesPerParagraph = paragraphs.map((p) => splitSentences(p).length);
    const avgParagraphSentences = sentencesPerParagraph.length
      ? sentencesPerParagraph.reduce((a, b) => a + b, 0) / sentencesPerParagraph.length
      : 0;
  
    return { sentences, avgSentenceLength, paragraphs, avgParagraphSentences };
  }
  
  /**
   * Score agregado (0..100) ponderado por importância.
   */
  function aggregateScore(checks: SEOCheck[]): number {
    // Ponderações simples: good +2, warn +1, info +0, bad -2.
    // Normalizamos pelo total de checks relevantes.
    const weights: Record<CheckLevel, number> = { good: 2, warn: 1, info: 0, bad: -2 };
    const considered = checks.filter((c) => c.key !== 'altOptional'); // alt pode ser opcional
    const raw = considered.reduce((acc, c) => acc + weights[c.level], 0);
    const max = considered.length * 2;
    const score = max ? ((raw / max) * 100) : 0;
    return clamp(Math.round(score), 0, 100);
  }
  
  // ----------------------------------------------------------------------------
  // Analisador principal
  // ----------------------------------------------------------------------------
  
  export type AnalyzeOptions = {
    thresholds?: Partial<AnalyzerThresholds>;
    siteBasePath?: string; // ex.: '' ou '/news'
    categoryFallback?: string; // ex.: 'news'
  };
  
  export function analyzeSEO(input: AnalyzerInput, options?: AnalyzeOptions): AnalyzerResult {
    const t = { ...DEFAULT_THRESHOLDS, ...(options?.thresholds || {}) };
  
    const locale = toSupportedLocale(input.locale);
    const key = normalizeText(input.focusKeyphrase || '');
    const titleSEO = (input.seoTitle || input.title || '').trim();
    const metaDesc = (input.seoDescription || input.excerpt || '').trim();
    const slugRaw = String(input.slug || '');
    const slug = slugify(slugRaw || input.title || '').slice(0, t.slugMax);
    const categorySlug = input.categorySlug || 'category';
  
    // Leitura base do conteúdo (markdown leve)
    const facts = parseMarkdownFacts(input.content || '');
  
    // Métricas básicas
    const { words, minutes } = readingTime(input.content || '');
  
    // Keyphrase presence/density
    const firstParaHit = key ? key.length > 0 && countOccurrences(facts.firstParagraph, key) > 0 : false;
    const headingsHitCount = key ? facts.headings.filter((h) => countOccurrences(h, key) > 0).length : 0;
    const imagesAltHitCount = key ? facts.imageAlts.filter((a) => countOccurrences(a, key) > 0).length : 0;
  
    const { density, totalWords, occurrences } = keyphraseDensity(input.content || '', key);
  
    // Readability
    const { sentences, avgSentenceLength, paragraphs, avgParagraphSentences } = readabilityAverages(input.content || '');
    const transitions = transitionSentenceRatio(sentences, locale);
    const passive = passiveVoiceRatio(sentences, locale);
  
    // Headings spacing — sem AST real, usamos um proxy (pior gap = total words)
    // Observação: com AST rico, mediríamos o maior trecho entre H2/H3.
    const worstGap = facts.headings.length ? Math.round(Math.max(0, totalWords / (facts.headings.length + 1))) : totalWords;
  
    // Comprimentos
    const titleLen = titleSEO.length;
    const descLen = metaDesc.length;
    const slugLen = slug.length;
  
    // Checks
    const checks: SEOCheck[] = [];
  
    // 1) Keyphrase no primeiro parágrafo
    checks.push({
      key: 'firstParagraph',
      ok: !!firstParaHit,
      level: firstParaHit ? 'good' : 'warn',
      message: firstParaHit ? 'Keyphrase no primeiro parágrafo' : 'Inclua a keyphrase no primeiro parágrafo',
    });
  
    // 2) Keyphrase em H2/H3
    checks.push({
      key: 'headings',
      ok: headingsHitCount > 0,
      level: headingsHitCount > 0 ? 'good' : 'warn',
      message: headingsHitCount > 0 ? 'Keyphrase presente em H2/H3' : 'Inclua a keyphrase em pelo menos um H2/H3',
      details: { count: headingsHitCount },
    });
  
    // 3) Keyphrase em alt de imagem (opcional)
    checks.push({
      key: 'altOptional',
      ok: imagesAltHitCount > 0,
      level: imagesAltHitCount > 0 ? 'good' : 'info',
      message: imagesAltHitCount > 0 ? 'Keyphrase em alt de imagem' : 'Considere incluir a keyphrase em um alt de imagem relevante',
      details: { count: imagesAltHitCount },
    });
  
    // 4) Densidade
    let densityLevel: CheckLevel = 'warn';
    if (density > t.densityBadMax) densityLevel = 'bad';
    else if (density >= t.densityOkMin && density <= t.densityOkMax) densityLevel = 'good';
  
    checks.push({
      key: 'density',
      ok: density >= t.densityOkMin && density <= t.densityOkMax,
      level: densityLevel,
      message: `Densidade ${density.toFixed(2)}% (${occurrences} ocorrências em ${totalWords} palavras)`,
    });
  
    // 5) Título SEO: comprimento e presença da keyphrase
    const titleHasKey = key ? countOccurrences(titleSEO, key) > 0 : true;
    let titleLevel: CheckLevel = 'warn';
    if (titleLen >= t.titleIdealMin && titleLen <= t.titleIdealMax) titleLevel = 'good';
    else if (titleLen > t.titleWarnMax || titleLen < t.titleMin) titleLevel = 'bad';
  
    checks.push({
      key: 'title',
      ok: titleLen >= t.titleIdealMin && titleLen <= t.titleIdealMax && titleHasKey,
      level: titleLevel,
      message: `Título SEO ${titleLen} chars${key ? titleHasKey ? ' • contém keyphrase' : ' • sem keyphrase' : ''}`,
    });
  
    // 6) Meta description: comprimento e presença da keyphrase
    const descHasKey = key ? countOccurrences(metaDesc, key) > 0 : true;
    let descLevel: CheckLevel = 'warn';
    if (descLen >= t.descIdealMin && descLen <= t.descIdealMax) descLevel = 'good';
    else if (descLen > t.descWarnMax || descLen < t.descMin) descLevel = 'bad';
  
    checks.push({
      key: 'description',
      ok: descLen >= t.descIdealMin && descLen <= t.descIdealMax && descHasKey,
      level: descLevel,
      message: `Meta description ${descLen} chars${key ? descHasKey ? ' • contém keyphrase' : ' • sem keyphrase' : ''}`,
    });
  
    // 7) Slug: limite + normalização + presença da keyphrase
    const slugClean = slug === slugify(slug);
    const slugHasKey = key ? countOccurrences(slug, key) > 0 : true;
    let slugLevel: CheckLevel = 'warn';
    if (slugLen <= t.slugMax && slugClean) slugLevel = 'good';
  
    checks.push({
      key: 'slug',
      ok: slugLen <= t.slugMax && slugClean && slugHasKey,
      level: slugLevel,
      message: `Slug ${slugLen} chars${slugClean ? '' : ' • normalizar'}${key ? slugHasKey ? ' • contém keyphrase' : ' • sem keyphrase' : ''}`,
    });
  
    // 8) Legibilidade — frases longas
    // Ajuste de limiar por idioma (FI aceita frases um pouco mais longas)
    const sentenceGood = locale === 'fi' ? Math.max(DEFAULT_THRESHOLDS.sentenceGoodMax, 25) : DEFAULT_THRESHOLDS.sentenceGoodMax;
    const sentenceWarn = locale === 'fi' ? Math.max(DEFAULT_THRESHOLDS.sentenceWarnMax, 30) : DEFAULT_THRESHOLDS.sentenceWarnMax;
  
    let sentLevel: CheckLevel = 'warn';
    if (avgSentenceLength <= sentenceGood) sentLevel = 'good';
    else if (avgSentenceLength > sentenceWarn) sentLevel = 'bad';
  
    checks.push({
      key: 'sentences',
      ok: avgSentenceLength <= sentenceWarn,
      level: sentLevel,
      message: `Média de ${avgSentenceLength.toFixed(1)} palavras por sentença`,
    });
  
    // 9) Legibilidade — tamanho de parágrafos
    let paraLevel: CheckLevel = 'warn';
    if (avgParagraphSentences <= DEFAULT_THRESHOLDS.paragraphGoodMax) paraLevel = 'good';
    else if (avgParagraphSentences > DEFAULT_THRESHOLDS.paragraphWarnMax) paraLevel = 'bad';
  
    checks.push({
      key: 'paragraphs',
      ok: avgParagraphSentences <= DEFAULT_THRESHOLDS.paragraphWarnMax,
      level: paraLevel,
      message: `Média de ${avgParagraphSentences.toFixed(1)} sentenças por parágrafo`,
    });
  
    // 10) Passiva
    let passiveLevel: CheckLevel = 'warn';
    if (passive < DEFAULT_THRESHOLDS.passiveWarn) passiveLevel = 'good';
    else if (passive > DEFAULT_THRESHOLDS.passiveBad) passiveLevel = 'bad';
  
    checks.push({
      key: 'passive',
      ok: passive <= DEFAULT_THRESHOLDS.passiveBad,
      level: passiveLevel,
      message: `Voz passiva ~${passive.toFixed(1)}%`,
    });
  
    // 11) Transition words
    let transLevel: CheckLevel = 'warn';
    if (transitions >= DEFAULT_THRESHOLDS.transitionGood) transLevel = 'good';
    else if (transitions < DEFAULT_THRESHOLDS.transitionWarn) transLevel = 'bad';
  
    checks.push({
      key: 'transitions',
      ok: transitions >= DEFAULT_THRESHOLDS.transitionWarn,
      level: transLevel,
      message: `Sentenças com palavras de transição ~${transitions.toFixed(1)}%`,
    });
  
    // 12) Distribuição de headings
    let gapLevel: CheckLevel = 'warn';
    if (worstGap <= DEFAULT_THRESHOLDS.headingGapGoodMax) gapLevel = 'good';
    else if (worstGap > DEFAULT_THRESHOLDS.headingGapWarnMax) gapLevel = 'bad';
  
    checks.push({
      key: 'headingsSpacing',
      ok: worstGap <= DEFAULT_THRESHOLDS.headingGapWarnMax,
      level: gapLevel,
      message: `Maior trecho sem subtítulo ~${worstGap} palavras`,
    });
  
    // 13) Links internos/externos (informativo)
    checks.push({
      key: 'links',
      ok: true,
      level: 'info',
      message: `Links internos: ${facts.linksInternal} • externos: ${facts.linksExternal}`,
    });
  
    // Métricas compiladas
    const metrics = {
      words,
      readMinutes: minutes,
  
      keyphrase: key,
      keyOccurrences: occurrences,
      density,
      totalWords,
  
      firstParagraphHasKeyphrase: firstParaHit,
      headingsWithKeyphrase: headingsHitCount,
      imagesAltWithKeyphrase: imagesAltHitCount,
  
      titleLength: titleLen,
      descLength: descLen,
      slugLength: slugLen,
  
      avgSentenceLength,
      avgParagraphSentences,
      passiveRatio: passive,
      transitionRatio: transitions,
      worstHeadingGap: worstGap,
  
      linksInternal: facts.linksInternal,
      linksExternal: facts.linksExternal,
    };
  
    // Score e snippet
    const score = aggregateScore(checks);
  
    const urlPath = `/${locale}/${categorySlug}/${slug || 'post'}`;
    const serp = {
      title: (titleSEO || input.title || '').trim(),
      description: metaDesc,
      urlPath: (options?.siteBasePath ? options.siteBasePath.replace(/\/+$/, '') : '') + urlPath,
    };
  
    return { metrics, checks, score, serp };
  }