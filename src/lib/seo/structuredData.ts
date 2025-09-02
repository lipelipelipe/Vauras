// src/lib/seo/structuredData.ts
// ============================================================================
// Structured Data (JSON-LD) helpers — nível PhD
// ----------------------------------------------------------------------------
// Objetivo:
// - Gerar blocos JSON-LD de Organization e WebSite para a Home.
// - Baseado em Settings: siteName (por locale), siteUrl e logoUrl.
// - Seguro para uso em server ou client (apenas funções puras).
// ============================================================================

type CommonOpts = {
    name: string;          // siteName no idioma atual
    url: string;           // base absoluta (https://dominio)
  };
  
  export type OrganizationOpts = CommonOpts & {
    logo?: string | null;  // URL absoluta (>=112x112 recomendado)
    sameAs?: string[];     // redes sociais (opcional)
  };
  
  export type WebSiteOpts = CommonOpts & {
    inLanguage?: string;   // 'fi-FI' | 'en-US' | etc (opcional)
    potentialSearchUrl?: string; // /search?q={search_term_string} (opcional)
  };
  
  function trimSlash(u?: string | null): string | undefined {
    if (!u) return undefined;
    return String(u).replace(/\/+$/, '');
  }
  
  // Organization
  export function buildOrganizationLD(opts: OrganizationOpts) {
    const org: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: String(opts.name || '').trim(),
      url: trimSlash(opts.url),
    };
    const logo = opts.logo && String(opts.logo || '').trim();
    if (logo) org.logo = logo;
    if (Array.isArray(opts.sameAs) && opts.sameAs.length > 0) {
      org.sameAs = opts.sameAs;
    }
    return org;
  }
  
  // WebSite (com potencial SearchAction opcional)
  export function buildWebSiteLD(opts: WebSiteOpts) {
    const site: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: String(opts.name || '').trim(),
      url: trimSlash(opts.url),
    };
    const lang = String(opts.inLanguage || '').trim();
    if (lang) site.inLanguage = lang;
  
    const searchUrl = String(opts.potentialSearchUrl || '').trim();
    if (searchUrl) {
      site.potentialAction = {
        '@type': 'SearchAction',
        target: `${trimSlash(opts.url)}/${searchUrl}`,
        'query-input': 'required name=search_term_string',
      };
    }
  
    return site;
  }