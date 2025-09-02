// app/[locale]/layout.tsx

import { getMessages, resolveLocale } from '@/lib/i18n';
import LocaleLayoutClient from './LocaleLayoutClient';
import { getPublicMenu } from '@/lib/menu';
import { getPublicFooter } from '@/lib/footer';
import { getSiteSettings } from '@/lib/settings';
import { DEFAULT_LOCALE } from '@/config/locales';

type LayoutProps = {
  children: React.ReactNode;
  params: { locale: string };
};

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const locale = resolveLocale(params.locale);

  // 1) Carrega mensagens usuais (namespaces) para a UI
  const messages = await getMessages(locale, ['common', 'nav', 'footer', 'home', 'post']);

  // 2) Carrega Settings (SSR) e injeta siteName no namespace "brand" (para consumo no Header/Footer)
  const settings = await getSiteSettings();
  const siteNameObj = (settings?.siteName as any) || {};
  const brandSiteName =
    (siteNameObj?.[locale] as string) ||
    (siteNameObj?.[DEFAULT_LOCALE] as string) ||
    'Uutiset';

  const messagesWithBrand = {
    ...messages,
    brand: {
      siteName: brandSiteName,
    },
  };

  // 3) Menu e Footer públicos por locale
  const menu = await getPublicMenu(locale);
  const footerData = await getPublicFooter(locale);

  return (
    <LocaleLayoutClient locale={locale} messages={messagesWithBrand} menu={menu} footer={footerData}>
      {children}
    </LocaleLayoutClient>
  );
}