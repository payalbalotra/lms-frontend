import * as React from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AssignedPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AssignedPage({ params }: AssignedPageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('employee');

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>{t('assignedHeading')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t('assignedPlaceholder')}
        </p>
      </CardContent>
    </Card>
  );
}