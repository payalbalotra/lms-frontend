import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Next.js 16 renamed `middleware.ts` to `proxy.ts`.
// Same semantics: a request-time function that can rewrite/redirect before route handlers.
// The backend's auth check is the only authority. This proxy's job is to:
//   1. Ensure every path is locale-prefixed (next-intl handles this).
//   2. Redirect unauthenticated users away from /[locale]/employee/* to /[locale]/login.
//      We check for the presence of the session cookie only — the server component
//      in app/[locale]/employee/layout.tsx re-validates with the backend on every request.
const intlMiddleware = createIntlMiddleware(routing);

export default function proxy(request: NextRequest): NextResponse {
  return intlMiddleware(request);
}

export const config = {
  // Match every path except: API, Next internals, static assets, manifest.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};