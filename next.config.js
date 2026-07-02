const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix for Vercel ENOENT lstat error with parenthesized route groups like (dashboard).
  // Explicitly tells Next.js/Vercel where to root the output file tracing.
  outputFileTracingRoot: path.join(__dirname),

  experimental: {
    // Prevents Prisma from being bundled into the server bundle, avoiding
    // manifest generation conflicts in route groups with parentheses.
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },

  async headers() {
    return [
      // Service Worker — allow root scope
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      // Manifest — correct content type
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      // Security headers for all routes
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
