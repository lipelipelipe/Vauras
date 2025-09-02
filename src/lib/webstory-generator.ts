// src/lib/webstory-generator.ts
// ============================================================================
// Gerador de Web Story (AMP) — Server-safe — nível PhD (revisado)
// ----------------------------------------------------------------------------
// - Gera HTML AMP com meta robots dinâmico (index/follow) a partir do Post.
// - Reaproveita SEO do post: seoTitle/seoDescription (fallback title/excerpt).
// - CTA para o artigo original (/locale/category/slug).
// ============================================================================

import { Post } from '@prisma/client';

// Tipos de opções (mantidos como no projeto; pode unificar com webstory-types)
export type StoryOptions = {
  duration: number;
  colors: {
    heading: string;
    paragraph: string;
    subheading: string;
    secondary: string;
    buttonStart: string;
    buttonEnd: string;
    scrimTop: string;
    scrimBottom: string;
  };
  shadows: {
    heading: number;
    paragraph: number;
    subheading: number;
  };
  fontSizes: {
    heading: number;
    subheading: number;
    paragraph: number;
  };
  headingGradient: boolean;
  subheadingGradient: boolean;
  paragraphGradient: boolean;
  animations: {
    preset: string;
    textMode: 'cycle_all' | 'single' | 'cycle_custom';
    textEffect: string;
    textEffects: string[];
    textDuration: number;
    bgDuration?: number;
  };
  parallax: {
    effect: string;
    alternateDirection: boolean;
    startDirection: 'left' | 'right';
    duration: number;
  };
  fonts: {
    heading: string;
    paragraph: string;
    subheading: string;
  };
  cta: {
    showSharePrompt: boolean;
    showBottomLine: boolean;
    shareMessage: string;
    bottomMessage: string;
    buttonLabel: string;
  };
  cover: {
    badgeText: string;
  };
};

// Utils
function escapeHtml(s: string = ''): string {
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function stripHtml(html: string = ''): string {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Gerador principal (mínimo viável com SEO do post)
export function generateWebStoryHtml({ post, options }: { post: Post; options: StoryOptions }): string {
  // SEO do post
  const title = stripHtml(post.seoTitle || post.title || '');
  const description = stripHtml(post.seoDescription || post.excerpt || '');
  const articleUrl = `/${post.locale}/category/${post.category}/${post.slug}`;

  // Publisher (pode ser puxado do Settings futuramente)
  const publisherName = 'Uutiset';
  const publisherLogo = 'https://via.placeholder.com/96x96.png?text=Logo';

  if (!post.coverUrl) {
    throw new Error('Post não possui imagem de capa (coverUrl) para gerar um Web Story.');
  }
  const posterUrl = String(post.coverUrl).trim();

  // Meta robots com base nas flags do Post (fallback seguro)
  const robots = `${(post as any).indexable ? 'index' : 'noindex'}, ${(post as any).follow ? 'follow' : 'nofollow'}`;

  // Páginas simples: Capa + Conteúdo/CTA
  const pagesHtml = `
    <amp-story-page id="cover">
      <amp-story-grid-layer template="fill">
        <amp-img src="${escapeHtml(posterUrl)}" layout="fill" alt="${escapeHtml(title)}"></amp-img>
      </amp-story-grid-layer>
      <amp-story-grid-layer template="vertical" class="cover-layer">
        ${options?.cover?.badgeText ? `<span class="badge">${escapeHtml(options.cover.badgeText)}</span>` : ''}
        <h1 class="heading">${escapeHtml(title)}</h1>
      </amp-story-grid-layer>
      <amp-story-grid-layer template="fill" class="scrim"></amp-story-grid-layer>
    </amp-story-page>

    <amp-story-page id="page1">
      <amp-story-grid-layer template="vertical" class="content-layer">
        <p class="excerpt">${escapeHtml(description || 'Leia o artigo completo no site.')}</p>
      </amp-story-grid-layer>
      <amp-story-cta-layer>
        <a href="${escapeHtml(articleUrl)}" class="cta-btn" target="_blank" rel="noopener">
          ${escapeHtml(options?.cta?.buttonLabel || 'Abrir Artigo')}
        </a>
      </amp-story-cta-layer>
    </amp-story-page>
  `;

  // Estilos mínimos (respeita algumas opções se vierem)
  const fHeading = options?.fonts?.heading || 'Lato';
  const fPara = options?.fonts?.paragraph || 'Merriweather';
  const cHeading = options?.colors?.heading || '#FFFFFF';
  const cPara = options?.colors?.paragraph || '#E5E7EB';
  const cBtnStart = options?.colors?.buttonStart || '#FF1E56';
  const cBtnEnd = options?.colors?.buttonEnd || '#FF5E7E';
  const scrimTop = options?.colors?.scrimTop || 'rgba(0,0,0,0.0)';
  const scrimBottom = options?.colors?.scrimBottom || 'rgba(0,0,0,0.7)';
  const headingSize = `${options?.fontSizes?.heading ?? 38}px`;
  const paraSize = `${options?.fontSizes?.paragraph ?? 20}px`;

  const styles = `
    <style amp-custom>
      amp-story {
        font-family: '${fPara}', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        color: #fff;
      }
      .cover-layer {
        padding: 24px;
        justify-content: flex-end;
        align-items: flex-start;
      }
      .scrim {
        background: linear-gradient(180deg, ${scrimTop} 0%, ${scrimBottom} 100%);
      }
      .badge {
        display: inline-block;
        background: rgba(0,0,0,0.6);
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 12px;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: .06em;
      }
      .heading {
        font-family: '${fHeading}', sans-serif;
        font-size: ${headingSize};
        line-height: 1.15;
        color: ${cHeading};
        margin: 0;
        text-shadow: 0 6px 28px rgba(0,0,0,0.7);
      }
      .content-layer {
        padding: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .excerpt {
        font-family: '${fPara}', serif;
        font-size: ${paraSize};
        color: ${cPara};
        text-shadow: 0 4px 18px rgba(0,0,0,0.9);
        margin: 0;
        text-align: center;
      }
      .cta-btn {
        display: inline-block;
        min-width: 140px;
        text-align: center;
        font-weight: 700;
        font-size: 13px;
        padding: 10px 16px;
        color: #111;
        background: linear-gradient(135deg, ${cBtnStart}, ${cBtnEnd});
        border-radius: 999px;
        text-decoration: none;
        box-shadow: 0 4px 14px rgba(0,0,0,0.75);
      }
    </style>
  `;

  // HTML AMP completo
  const html = `
    <!doctype html>
    <html amp lang="${post.locale}">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)}</title>
      <meta name="description" content="${escapeHtml(description)}" />
      <meta name="robots" content="${escapeHtml(robots)}" />
      <link rel="canonical" href="${escapeHtml(articleUrl)}">
      <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
      <script async src="https://cdn.ampproject.org/v0.js"></script>
      <script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>
      ${styles}
      <style amp-boilerplate>
        body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;
             -moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;
             -ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;
             animation:-amp-start 8s steps(1,end) 0s 1 normal both}
        @-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}
        @-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}
        @-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}
        @-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}
        @keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}
      </style>
      <noscript><style amp-boilerplate>
        body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}
      </style></noscript>
    </head>
    <body>
      <amp-story standalone
        title="${escapeHtml(title)}"
        publisher="${escapeHtml(publisherName)}"
        publisher-logo-src="${escapeHtml(publisherLogo)}"
        poster-portrait-src="${escapeHtml(posterUrl)}">
        ${pagesHtml}
      </amp-story>
    </body>
    </html>
  `;

  return html;
}