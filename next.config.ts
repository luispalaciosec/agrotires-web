import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const config: NextConfig = {
  poweredByHeader: false,
  // A stray lockfile in the home folder must not be mistaken for the project root.
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  images: { formats: ['image/avif', 'image/webp'], minimumCacheTTL: 2678400 },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Same route aliases the prototype's hash router accepted.
  async redirects() {
    return [
      { source: '/categories', destination: '/shop', permanent: false },
      { source: '/category/:id', destination: '/shop?category=:id', permanent: false },
      { source: '/contact', destination: '/help', permanent: false },
      { source: '/login', destination: '/account', permanent: false },
      { source: '/register', destination: '/account', permanent: false },
    ];
  },
};

export default config;
