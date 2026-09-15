import * as React from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';

interface AssignedPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AssignedPage({ params }: AssignedPageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('employee');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.02em] text-[var(--color-ink)]">
          {t('assignedHeading')}
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t('assignedPlaceholder')}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('assignedHeading')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <StatusPill tone="progress">{t('assignedStatusEmpty')}</StatusPill>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
