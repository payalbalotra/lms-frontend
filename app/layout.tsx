import type { ReactNode } from 'react';
import * as React from 'react';

// The real <html>/<body> live in [locale]/layout.tsx so next-intl can set lang.
// This root layout only exists to satisfy Next.js requirements.
export default function RootLayout({ children }: { children: ReactNode }): React.ReactElement {
  return children as React.ReactElement;
}