/**
 * View-as override for the shared /procedures routes.
 *
 * Until the real login flow lands, every demo session resolves as the seed
 * admin (Chef Raúl Medina). Procedures are reading content, so the routes
 * default to employee chrome — `?as=admin` opts a procedure page into the
 * `AdminShell` when the admin wants the library nav context while reading:
 *
 *   /en/procedures/grill-station-safety            → employee chrome (default)
 *   /en/procedures/grill-station-safety?as=admin   → admin chrome (explicit)
 *   /en/procedures/grill-station-safety?as=employee → employee chrome (explicit)
 *
 * `proxy.ts` reads `?as=` from the URL, copies it into the request headers
 * (so layouts that only receive `params` can still see it) and stamps it on
 * a cookie so the choice survives relative-link navigation. This module is
 * the typed, client-safe handle — it has no server-only imports so client
 * components (e.g. `procedure-view-client`) can use `parseAsParam` and
 * `withAs` without dragging `next/headers` into the browser bundle.
 *
 * Server components that need to read the override live should import
 * `readViewAs` from `@/lib/view-as-server` instead.
 */

export type ViewAs = 'admin' | 'employee';

export function parseAsParam(raw: string | string[] | undefined | null): ViewAs | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'admin' || value === 'employee') return value;
  return null;
}

export function withAs(href: string, current: ViewAs | null): string {
  if (!current) return href;
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}as=${current}`;
}

