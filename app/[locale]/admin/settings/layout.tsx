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
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.02em] text-[var(--color-ink)]">
        {t('settingsHeading')}
      </h1>

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Settings tabs">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={
                active
                  ? 'inline-flex items-center rounded-full bg-[var(--color-brand-600)] px-3 py-1 text-xs font-medium text-white'
                  : 'inline-flex items-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-panel)]'
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