// src/lib/service/serialize.ts
// ============================================================================
/**
 * Serialização "service-only" — nível PhD
 * ----------------------------------------------------------------------------
 * Entrega ao serviço (Node) um "snapshot" completo e coerente do Post, pronto
 * para a geração de Web Stories, reaproveitando:
 *  - Mesmas imagens: coverUrl e imagens extraídas do conteúdo
 *  - SEO já existente: seoTitle/seoDescription/canonical/focusKeyphrase/indexable/follow
 *  - Conteúdo "mastigado": plain/firstParagraph/paragraphs/headings + métricas
 *  - URLs úteis: article/story/canonical + siteBase
 *  - Brand/Site (publisher do AMP): siteName por locale, siteUrl e logoUrl
 *
 * Modo:
 *  - 'list': payload leve para listagem; paragraphs e imagesFromContent limitados
 *  - 'detail': payload completo; inclui content.markdown e story.storyOptions
 */
// ============================================================================

import 'server-only';
import { readingTime, parseMarkdownFacts } from '@/lib/seo/text';
import { getSiteSettings } from '@/lib/settings';
import type { Prisma } from '@prisma/client';

// --------------------------- Tipos de saída ---------------------------------

export type ServicePost = {
  id: string;
  locale: string;
  title: string;
  slug: string;
  category: string;
  status: 'draft' | 'published' | 'scheduled';
  tags: string[];
  publishedAt: string | null;
  updatedAt: string;

  urls: {
    article: string;     // /{locale}/category/{category}/{slug}
    story: string;       // /{locale}/story/{slug}
    canonical: string | null;
    siteBase: string;    // origem absoluta inferida/env (ex.: https://site.com)
  };

  seo: {
    seoTitle: string | null;
    seoDescription: string | null;
    canonicalUrl: string | null;
    focusKeyphrase: string | null;
    indexable: boolean;
    follow: boolean;
    ogImage: string | null;
  };

  brand: {
    siteName: { fi: string; en: string };
    siteUrl: string | null;
    logoUrl: string | null;
  };

  media: {
    coverUrl: string | null;
    imagesFromContent: { src: string; alt: string }[];
    imageCandidates: string[]; // prioriza cover + imagens extraídas
  };

  content: {
    markdown?: string;      // apenas no modo 'detail'
    plain: string;          // derivado do markdown (facts.paragraphs join ' ')
    firstParagraph: string;
    paragraphs: string[];   // limitado no modo 'list'
    headings: string[];
  };

  metrics: {
    words: number;
    readMinutes: number;
  };

  story: {
    isWebStory: boolean;
    hasStoryContent: boolean;
    storyOptions?: any;     // apenas no modo 'detail'
  };
};

export type SerializeMode = 'list' | 'detail';

export type SerializeOptions = {
  baseUrl: string;             // origem absoluta (https://dominio)
  settings: Awaited<ReturnType<typeof getSiteSettings>>;
  mode: SerializeMode;
  listLimits?: {
    paragraphsMax?: number;      // default: 8
    imagesMax?: number;          // default: 10
    candidatesMax?: number;      // default: 6
  };
};

// --------------------------- Utils internas ---------------------------------

function pickOgImage(coverUrl?: string | null, defaultMetaImage?: string | null): string | null {
  const c = String(coverUrl || '').trim();
  if (c) return c;
  const d = String(defaultMetaImage || '').trim();
  return d || null;
}

function extractMdImages(md: string | null | undefined): { src: string; alt: string }[] {
    // Garante que sempre será string
    const src = String(md || '');
  
    // Regex para capturar alt e url — suporta múltiplos por linha
    const rx = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  
    const out: { src: string; alt: string }[] = [];
    let m: RegExpExecArray | null;
  
    // eslint-disable-next-line no-cond-assign
    while ((m = rx.exec(src))) {
      const alt = (m[1] || '').trim(); // texto dentro de [ ]
      const url = (m[2] || '').trim(); // URL dentro de ( )
      if (!url) continue;
      out.push({ src: url, alt });
    }
  
    return out;
  }

function toStringOrNull(x: any): string | null {
  if (x == null) return null;
  const s = String(x).trim();
  return s.length ? s : null;
}

function ensureArray<T>(arr: any, coerce: (v: any) => T): T[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(coerce);
}

function trimMap(arr: string[]): string[] {
  return arr.map((s) => String(s || '').trim()).filter(Boolean);
}

function buildArticleUrl(locale: string, category: string, slug: string) {
  return `/${locale}/category/${category}/${slug}`;
}

function buildStoryUrl(locale: string, slug: string) {
  return `/${locale}/story/${slug}`;
}

// ---------------------- Serialização principal ------------------------------

export async function serializePostForService(
  post: Pick<
    Prisma.PostGetPayload<object>,
    | 'id' | 'locale' | 'title' | 'slug' | 'coverUrl' | 'excerpt' | 'content'
    | 'category' | 'tags' | 'status' | 'publishedAt' | 'updatedAt'
    | 'seoTitle' | 'seoDescription' | 'canonicalUrl' | 'focusKeyphrase'
    | 'indexable' | 'follow' | 'isWebStory' | 'storyContent' | 'storyOptions'
  >,
  opts: SerializeOptions
): Promise<ServicePost> {
  const { baseUrl, settings, mode, listLimits } = opts;
  const limits = {
    paragraphsMax: listLimits?.paragraphsMax ?? 8,
    imagesMax: listLimits?.imagesMax ?? 10,
    candidatesMax: listLimits?.candidatesMax ?? 6,
  };

  // Brand/site (publisher)
  const siteNameObj = (settings?.siteName as any) || {};
  const titleTemplate = (settings?.titleTemplate as any) || {};
  const defaultMetaDesc = (settings?.defaultMetaDescription as any) || {};

  const brand = {
    siteName: {
      fi: String(siteNameObj.fi || '').trim(),
      en: String(siteNameObj.en || '').trim(),
    },
    siteUrl: toStringOrNull(settings?.siteUrl),
    logoUrl: toStringOrNull(settings?.logoUrl),
  };

  // SEO
  const seo = {
    seoTitle: toStringOrNull(post.seoTitle),
    seoDescription: toStringOrNull(post.seoDescription),
    canonicalUrl: toStringOrNull(post.canonicalUrl),
    focusKeyphrase: toStringOrNull(post.focusKeyphrase),
    indexable: !!post.indexable,
    follow: !!post.follow,
    ogImage: pickOgImage(toStringOrNull(post.coverUrl), toStringOrNull(settings?.defaultMetaImage)),
  };

  // URLs
  const urls = {
    article: buildArticleUrl(post.locale, post.category, post.slug),
    story: buildStoryUrl(post.locale, post.slug),
    canonical: toStringOrNull(post.canonicalUrl),
    siteBase: String(baseUrl || '').replace(/\/+$/, ''),
  };

  // Conteúdo / imagens
  const md = String(post.content || '');
  const facts = parseMarkdownFacts(md);
  const imgs = extractMdImages(md);

  const wordsInfo = readingTime(md);
  const paragraphsAll = facts.paragraphs || [];
  const paragraphs = mode === 'list' ? paragraphsAll.slice(0, limits.paragraphsMax) : paragraphsAll;

  const imagesFromContentAll = imgs;
  const imagesFromContent =
    mode === 'list' ? imagesFromContentAll.slice(0, limits.imagesMax) : imagesFromContentAll;

  const candidatesSet: string[] = [];
  if (post.coverUrl) candidatesSet.push(String(post.coverUrl).trim());
  for (const im of imagesFromContentAll) {
    if (im?.src) candidatesSet.push(String(im.src).trim());
  }
  const imageCandidates = Array.from(new Set(trimMap(candidatesSet))).slice(0, limits.candidatesMax);

  const servicePost: ServicePost = {
    id: post.id,
    locale: post.locale,
    title: post.title,
    slug: post.slug,
    category: post.category,
    status: post.status as ServicePost['status'],
    tags: ensureArray<string>(post.tags || [], (v) => String(v || '').trim()),
    publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : null,
    updatedAt: new Date(post.updatedAt).toISOString(),

    urls,
    seo,
    brand,

    media: {
      coverUrl: toStringOrNull(post.coverUrl),
      imagesFromContent,
      imageCandidates,
    },

    content: {
      ...(mode === 'detail' ? { markdown: md } : {}),
      plain: paragraphsAll.join(' '),
      firstParagraph: String(facts.firstParagraph || ''),
      paragraphs,
      headings: ensureArray<string>(facts.headings || [], (v) => String(v || '').trim()),
    },

    metrics: {
      words: wordsInfo.words,
      readMinutes: wordsInfo.minutes,
    },

    story: {
      isWebStory: !!post.isWebStory,
      hasStoryContent: !!post.storyContent && String(post.storyContent).trim().length > 0,
      ...(mode === 'detail' ? { storyOptions: post.storyOptions ?? null } : {}),
    },
  };

  return servicePost;
}