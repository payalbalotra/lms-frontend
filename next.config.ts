import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Backend origin (rewrite proxy keeps Set-Cookie on the page origin).
const BACKEND_ORIGIN =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);