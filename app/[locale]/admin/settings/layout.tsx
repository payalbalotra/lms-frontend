'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({
  children,
}: SettingsLayoutProps): React.ReactElement {
  const t = useTranslations('admin');
  const pathname = usePathname() ?? '';
  // /<locale>/admin/settings/<tab>
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] ?? 'en';
  const activeTab = segments[2] ?? '';

  const tabs: ReadonlyArray<{ key: string; href: string; label: string }> = [
    { key: 'stations', href: `/${locale}/admin/settings/stations`, label: t('settingsTabStations') },
    { key: 'roles', href: `/${locale}/admin/settings/roles`, label: t('settingsTabRoles') },
    { key: 'locations', href: `/${locale}/admin/settings/locations`, label: t('settingsTabLocations') },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('settingsHeading')}</h1>

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Settings tabs">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={
                active
                  ? 'rounded-full bg-[var(--color-primary)] px-3 py-1 text-[var(--color-primary-foreground)]'
                  : 'rounded-full border border-[var(--color-border)] px-3 py-1 hover:bg-[var(--color-muted)]'
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}