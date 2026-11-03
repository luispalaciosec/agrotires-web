import type { Metadata, Viewport } from 'next';
import { DM_Sans, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import { StoreChrome } from '@/components/chrome';
import { SiteFooter } from '@/components/footer';
import { StoreProvider } from '@/components/store';
import { JsonLd } from '@/components/ui';
import { getPublicProducts } from '@/lib/products';
import { INDEXABLE, SITE_DESCRIPTION, SITE_URL, organizationLd, websiteLd } from '@/lib/seo';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', weight: ['400', '500', '600', '700'], display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', weight: ['400', '500', '600', '700', '800'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Instant Solution | AGROTIRES', template: '%s | AGROTIRES' },
  description: SITE_DESCRIPTION,
  robots: INDEXABLE ? undefined : { index: false, follow: false },
  openGraph: { siteName: 'AGROTIRES', type: 'website', description: SITE_DESCRIPTION, images: ['/assets/agrotires-farm-hero.webp'] },
};

export const viewport: Viewport = { themeColor: '#064b3e', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const products = await getPublicProducts();
  return (
    <html lang="en" className={`${dmSans.variable} ${manrope.variable}`} data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <JsonLd data={organizationLd} />
        <JsonLd data={websiteLd} />
        <StoreProvider products={products}>
          <div id="app">
            <StoreChrome footer={<SiteFooter />}>{children}</StoreChrome>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
