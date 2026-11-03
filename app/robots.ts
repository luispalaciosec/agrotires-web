import type { MetadataRoute } from 'next';
import { INDEXABLE, absolute } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/checkout', '/account', '/wishlist', '/setup', '/admin', '/api'] },
    sitemap: absolute('/sitemap.xml'),
  };
}
