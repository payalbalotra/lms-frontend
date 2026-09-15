import * as React from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function TrainingPlaceholderPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('navTraining')}</CardTitle>
        <CardDescription>{t('phase2')}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t('trainingPlaceholderBody')}
        </p>
      </CardContent>
    </Card>
  );
}