import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Backend API origin (used only by the Next.js rewrite proxy). Browser-side
// fetches go through the relative `/api/*` path so the Set-Cookie from
// Better Auth is scoped to the page origin (localhost:3000) instead of the
// API origin (localhost:4000). Without this proxy, cross-origin cookies
// drop on every navigation and the session guard bounces to /login.
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