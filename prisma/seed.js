// prisma/seed.js
// ============================================================================
// Seed do banco — nível PhD (robusto e idempotente)
// ----------------------------------------------------------------------------
// Objetivos:
// - Garantir usuário admin padrão (NextAuth Credentials).
// - Garantir Settings singleton com valores padrão (siteName/titleTemplate/etc).
// - Popular traduções básicas de UI (compatível com seu seed original).
// - Criar categorias padrão para 'fi' e 'en' (slugs por idioma).
//
// Como executar:
// - npx prisma migrate dev
// - npm run prisma:seed
//
// Notas:
// - Este seed é idempotente (upsert em todas as entidades).
// - Mantém nomes de constraints compostas consistentes com o schema:
//   • UITranslation: where.locale_namespace
//   • Category:      where.category_locale_slug
// ============================================================================

/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // ---------------------------------------------------------------------------
  // 1) Usuário admin padrão (NextAuth Credentials)
  // ---------------------------------------------------------------------------
  const email = 'admin@local';
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password: hash, role: 'admin' },
  });

  // ---------------------------------------------------------------------------
  // 2) Settings (singleton) — defaults seguros
  //    Evita 500 no primeiro boot: siteName/titleTemplate são JSON obrigatórios.
  // ---------------------------------------------------------------------------
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      siteName: { fi: 'Uutiset', en: 'Uutiset' },
      titleTemplate: { fi: '%s • Uutiset', en: '%s • Uutiset' },
      defaultMetaDescription: { fi: 'Ajankohtaiset uutiset', en: 'Latest news' },
      defaultMetaImage: null,
      siteUrl: null,
      logoUrl: null,
      twitterHandle: null,
    },
  });

  // ---------------------------------------------------------------------------
  // 3) UI Translations (mesmo padrão do seu seed original)
  //    Observação: o front atual lê JSON do filesystem; mantemos aqui para
  //    compatibilidade futura caso queira migrar para DB.
  // ---------------------------------------------------------------------------
  await prisma.uITranslation.upsert({
    where: { locale_namespace: { locale: 'fi', namespace: 'nav' } },
    update: {},
    create: {
      locale: 'fi',
      namespace: 'nav',
      data: {
        home: 'Etusivu',
        politics: 'Politiikka',
        business: 'Talous',
        sports: 'Urheilu',
        culture: 'Kulttuuri',
        tech: 'Teknologia',
        language: 'Kieli',
      },
      published: true,
    },
  });

  await prisma.uITranslation.upsert({
    where: { locale_namespace: { locale: 'fi', namespace: 'footer' } },
    update: {},
    create: {
      locale: 'fi',
      namespace: 'footer',
      data: { powered: 'Rakennettu Next.js:llä' },
      published: true,
    },
  });

  await prisma.uITranslation.upsert({
    where: { locale_namespace: { locale: 'fi', namespace: 'common' } },
    update: {},
    create: {
      locale: 'fi',
      namespace: 'common',
      data: { search: 'Haku', readMore: 'Lue lisää' },
      published: true,
    },
  });

  // ---------------------------------------------------------------------------
  // 4) Categorias padrão por idioma
  //    - FI: slugs em finlandês (consistentes com o site)
  //    - EN: slugs em inglês
  //    - upsert por (locale, slug) usando a constraint "category_locale_slug"
  // ---------------------------------------------------------------------------
  const categoriesFI = [
    { slug: 'politiikka', name: 'Politiikka', order: 1 },
    { slug: 'talous', name: 'Talous', order: 2 },
    { slug: 'urheilu', name: 'Urheilu', order: 3 },
    { slug: 'kulttuuri', name: 'Kulttuuri', order: 4 },
    { slug: 'teknologia', name: 'Teknologia', order: 5 },
  ];

  const categoriesEN = [
    { slug: 'politics', name: 'Politics', order: 1 },
    { slug: 'business', name: 'Business', order: 2 },
    { slug: 'sports', name: 'Sports', order: 3 },
    { slug: 'culture', name: 'Culture', order: 4 },
    { slug: 'technology', name: 'Technology', order: 5 },
  ];

  for (const c of categoriesFI) {
    await prisma.category.upsert({
      where: { category_locale_slug: { locale: 'fi', slug: c.slug } },
      update: { name: c.name, order: c.order },
      create: { locale: 'fi', slug: c.slug, name: c.name, order: c.order },
    });
  }

  for (const c of categoriesEN) {
    await prisma.category.upsert({
      where: { category_locale_slug: { locale: 'en', slug: c.slug } },
      update: { name: c.name, order: c.order },
      create: { locale: 'en', slug: c.slug, name: c.name, order: c.order },
    });
  }

  // ---------------------------------------------------------------------------
  // 5) Log amigável
  // ---------------------------------------------------------------------------
  console.log('Seed concluído com sucesso.');
  console.log('Admin:', email, '/', password);
  console.log('Categorias (fi):', categoriesFI.map((c) => c.slug).join(', '));
  console.log('Categorias (en):', categoriesEN.map((c) => c.slug).join(', '));
}

main()
  .catch((e) => {
    console.error('Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });