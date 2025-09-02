// src/lib/webstory-client.ts
// ============================================================================
// Gerador de Web Story (AMP) — client-safe (preview ao vivo)
// ----------------------------------------------------------------------------
// - Não usa Prisma. Usa um "MinimalPost" só com o necessário.
// - Usa StoryOptions (compartilhado em src/lib/webstory-types.ts).
// - Foca em visual sólido (tipografia, cores, sombras, gradientes).
// ============================================================================

import type { StoryOptions } from './webstory-types';

export type MinimalPost = {
  title: string;
  slug: string;
  locale: string;
  coverUrl?: string | null;
  excerpt?: string | null;
  category: string;
};

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

function makeShadow(alpha: number = 0.7, px: number[] = [0, 6, 28]): string {
  const a = Math.max(0, Math.min(alpha, 1));
  return `${px[0]}px ${px[1]}px ${px[2]}px rgba(0,0,0,${a})`;
}

function googleFontsLink(opts: StoryOptions) {
  // Normaliza nomes para Google Fonts (sem espaços)
  const families = new Set<string>([
    (opts.fonts.heading || 'Lato').replace(/\s+/g, '+') + ':wght@400;600;700',
    (opts.fonts.paragraph || 'Merriweather').replace(/\s+/g, '+') + ':wght@400;600;700',
    (opts.fonts.subheading || 'Lato').replace(/\s+/g, '+') + ':wght@400;600;700',
  ]);
  const family = Array.from(families).join('&family=');
  return `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
}

export function generateWebStoryHtmlClient(input: { post: MinimalPost; options: StoryOptions }): string {
  const { post, options } = input;
  const title = stripHtml(post.title || 'Untitled');
  const cover = (post.coverUrl || '').trim();
  const excerpt = stripHtml(post.excerpt || '');
  const articleHref = `/${post.locale}/category/${post.category}/${post.slug}`;

  // Fontes/cores
  const fHeading = options.fonts.heading || 'Lato';
  const fPara = options.fonts.paragraph || 'Merriweather';
  const fSub = options.fonts.subheading || 'Lato';

  const cHeading = options.colors.heading || '#FFFFFF';
  const cPara = options.colors.paragraph || '#E5E7EB';
  const cSub = options.colors.subheading || '#FFD166';
  const cBtnStart = options.colors.buttonStart || '#FF1E56';
  const cBtnEnd = options.colors.buttonEnd || '#FF5E7E';
  const scrimTop = options.colors.scrimTop || 'rgba(0,0,0,0.0)';
  const scrimBottom = options.colors.scrimBottom || 'rgba(0,0,0,0.7)';

  const shHeading = makeShadow(options.shadows.heading ?? 0.7);
  const shPara = makeShadow(options.shadows.paragraph ?? 0.9, [0, 4, 18]);
  const shSub = makeShadow(options.shadows.subheading ?? 0.75, [0, 4, 14]);

  const headingSize = `${options.fontSizes.heading || 38}px`;
  const subSize = `${options.fontSizes.subheading || 16}px`;
  const paraSize = `${options.fontSizes.paragraph || 20}px`;

  const gf = googleFontsLink(options);

  // Páginas (mínimo 2)
  const coverPage = `
    <amp-story-page id="cover">
      <amp-story-grid-layer template="fill">
        ${cover ? `<amp-img src="${escapeHtml(cover)}" layout="fill" alt="${escapeHtml(title)}"></amp-img>` : `<div style="background: linear-gradient(135deg, #111, #333); width:100%; height:100%"></div>`}
      </amp-story-grid-layer>
      <amp-story-grid-layer template="vertical" class="cover-layer">
        ${options.cover.badgeText ? `<span class="badge">${escapeHtml(options.cover.badgeText)}</span>` : ''}
        <h1 class="heading">${escapeHtml(title)}</h1>
      </amp-story-grid-layer>
      <amp-story-grid-layer template="fill" class="scrim"></amp-story-grid-layer>
    </amp-story-page>
  `;

  const page1 = `
    <amp-story-page id="page1">
      <amp-story-grid-layer template="vertical" class="content-layer">
        ${excerpt ? `<p class="excerpt">${escapeHtml(excerpt)}</p>` : `<p class="excerpt">No excerpt provided. Use this to summarize the article.</p>`}
      </amp-story-grid-layer>
      <amp-story-cta-layer>
        <a href="${escapeHtml(articleHref)}" class="cta-btn" target="_blank" rel="noopener"> ${escapeHtml(options.cta.buttonLabel || 'Abrir Artigo')} </a>
      </amp-story-cta-layer>
    </amp-story-page>
  `;

  const styles = `
    <style amp-custom>
      @import url('${gf}');
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
        text-shadow: ${shHeading};
        margin: 0;
        ${options.headingGradient ? `background: linear-gradient(135deg, ${cHeading}, ${cSub}); -webkit-background-clip: text; -webkit-text-fill-color: transparent;` : ''}
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
        text-shadow: ${shPara};
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
        box-shadow: ${shSub};
      }
      h2, h3 {
        font-family: '${fSub}', sans-serif;
        color: ${cSub};
        font-size: ${subSize};
        margin: 0 0 6px 0;
        text-shadow: ${shSub};
        ${options.subheadingGradient ? `background: linear-gradient(180deg, ${cSub}, ${cHeading}); -webkit-background-clip: text; -webkit-text-fill-color: transparent;` : ''}
      }
    </style>
  `;

  const html = `
    <!doctype html>
    <html amp lang="${escapeHtml(post.locale)}">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
      <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1" />
      <script async src="https://cdn.ampproject.org/v0.js"></script>
      <script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>
      <link rel="canonical" href="${escapeHtml(articleHref)}" />
      ${styles}
      <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
    </head>
    <body>
      <amp-story standalone
        title="${escapeHtml(title)}"
        publisher="Uutiset"
        publisher-logo-src="https://via.placeholder.com/96x96.png?text=Logo"
        poster-portrait-src="${escapeHtml(cover || 'https://via.placeholder.com/720x1280.png?text=No+Cover')}">
        ${coverPage}
        ${page1}
      </amp-story>
    </body>
    </html>
  `;

  return html;
}