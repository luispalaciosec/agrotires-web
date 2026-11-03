import type { MetadataRoute } from 'next';
import { INDEXABLE, absolute } from '@/lib/seo';

const PRIVATE = ['/checkout', '/account', '/wishlist', '/setup'];

export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: [...PRIVATE, ...PRIVATE.map((p) => `/es${p}`), '/admin', '/api'] },
    sitemap: absolute('/sitemap.xml'),
  };
}
