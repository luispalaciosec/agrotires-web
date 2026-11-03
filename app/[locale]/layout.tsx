import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { StoreChrome } from '@/components/chrome';
import { SiteFooter } from '@/components/footer';
import { StoreProvider } from '@/components/store';
import { JsonLd } from '@/components/ui';
import { fontClasses } from '@/lib/fonts';
import { localeStaticParams, resolveLocale, type LocaleParams } from '@/lib/locale-params';
import { getPublicProducts } from '@/lib/products';
import { baseMetadata, organizationLd, websiteLd } from '@/lib/seo';
import '../globals.css';

export const generateStaticParams = localeStaticParams;

export async function generateMetadata(props: LocaleParams): Promise<Metadata> {
  const { locale } = await resolveLocale(props);
  return baseMetadata(locale);
}

export const viewport: Viewport = { themeColor: '#064b3e', width: 'device-width', initialScale: 1 };

export default async function StoreLayout({ children, ...props }: LocaleParams & { children: ReactNode }) {
  const { locale, t } = await resolveLocale(props);
  const products = await getPublicProducts(locale);
  return (
    <html lang={locale} className={fontClasses} data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">{locale === 'es' ? 'Saltar al contenido principal' : 'Skip to main content'}</a>
        <JsonLd data={organizationLd} />
        <JsonLd data={websiteLd(locale)} />
        <StoreProvider products={products} locale={locale}>
          <div id="app">
            <StoreChrome footer={<SiteFooter locale={locale} />}>{children}</StoreChrome>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
