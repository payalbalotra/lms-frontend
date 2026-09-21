'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/admin/page-header';
import { FilterChips } from '@/components/ui/filter-chips';

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
  // /<locale>/admin/settings/<tab> — segments[2] is the word "settings" itself,
  // so the current tab was never marked.
  const activeTab = segments[3] ?? '';

  const tabs: ReadonlyArray<{ key: string; href: string; label: string }> = [
    { key: 'stations', href: `/${locale}/admin/settings/stations`, label: t('settingsTabStations') },
    { key: 'roles', href: `/${locale}/admin/settings/roles`, label: t('settingsTabRoles') },
    { key: 'locations', href: `/${locale}/admin/settings/locations`, label: t('settingsTabLocations') },
  ];

  return (
    <div className="mx-auto max-w-page space-y-6">
      <PageHeader title={t('settingsHeading')} subtitle={t('settingsSubtitle')} />

      <FilterChips
        label={t('settingsHeading')}
        value={activeTab}
        chips={tabs.map((tab) => ({ value: tab.key, label: tab.label, href: tab.href }))}
      />

      {children}
    </div>
  );
}