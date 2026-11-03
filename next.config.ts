import type { NextConfig } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const dev = process.env.NODE_ENV === 'development';

// Next.js prerendered pages need inline scripts, so scripts stay limited by origin rather than by nonce.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://*.paypal.com https://*.paypalobjects.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.paypal.com https://*.paypalobjects.com${supabaseUrl ? ` ${new URL(supabaseUrl).origin}` : ''}`,
  "font-src 'self'",
  `connect-src 'self' https://*.paypal.com https://*.paypalobjects.com${dev ? ' ws:' : ''}`,
  'frame-src https://*.paypal.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

// Same route aliases the prototype's hash router accepted.
const aliases: [string, string][] = [
  ['/categories', '/shop'],
  ['/category/:id', '/shop?category=:id'],
  ['/contact', '/help'],
  ['/login', '/account'],
  ['/register', '/account'],
];

const config: NextConfig = {
  poweredByHeader: false,
  // Just under Vercel's 4.5 MB request limit.
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  // A stray lockfile in the home folder must not be mistaken for the project root.
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400,
    remotePatterns: supabaseUrl ? [{ protocol: 'https', hostname: new URL(supabaseUrl).hostname, pathname: '/storage/v1/object/public/product-photos/**' }] : [],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    return [
      ...aliases.flatMap(([source, destination]) => [
        { source, destination, permanent: false },
        { source: `/es${source}`, destination: `/es${destination}`, permanent: false },
      ]),
      // English lives at the root, so /en would only duplicate it.
      { source: '/en', destination: '/', permanent: true },
      { source: '/en/:path*', destination: '/:path*', permanent: true },
    ];
  },
  // afterFiles: real routes such as /admin, /api and public files are matched first.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: '/', destination: '/en' },
        // Rewrites run before dynamic routes, so /admin and /api must be left out or their [id] pages answer 404.
        { source: '/:path((?!es(?:/|$)|admin(?:/|$)|api(?:/|$)).*)', destination: '/en/:path' },
      ],
      fallback: [],
    };
  },
};

export default config;
