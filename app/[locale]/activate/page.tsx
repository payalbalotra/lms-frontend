import * as React from 'react';
import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ActivateLandingPage({ params }: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('activate');

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('noTokenHeading')}</CardTitle>
          <CardDescription>{t('noTokenBody')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/${locale}/login`}>
            <Button variant="neutral" className="w-full">
              {t('backToLogin')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}