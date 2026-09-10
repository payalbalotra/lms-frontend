import * as React from 'react';
import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { lookupInvite, ApiException } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActivateForm } from './activate-form';

interface PageProps {
  params: Promise<{ locale: string; token: string }>;
}

export default async function ActivateTokenPage({ params }: PageProps): Promise<React.ReactElement> {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('activate');

  let info: { employeeName: string; expiresAt: string } | null = null;
  let errorCode: 'INVITE_NOT_FOUND' | 'INVITE_EXPIRED' | 'INVITE_ALREADY_USED' | 'INVITE_CANCELLED' | null = null;
  try {
    info = await lookupInvite(token);
  } catch (err) {
    if (err instanceof ApiException) {
      if (
        err.code === 'INVITE_NOT_FOUND' ||
        err.code === 'INVITE_EXPIRED' ||
        err.code === 'INVITE_ALREADY_USED' ||
        err.code === 'INVITE_CANCELLED'
      ) {
        errorCode = err.code;
      } else {
        errorCode = 'INVITE_NOT_FOUND';
      }
    } else {
      throw err;
    }
  }

  if (!info) {
    const message =
      errorCode === 'INVITE_EXPIRED'
        ? t('errorExpired')
        : errorCode === 'INVITE_ALREADY_USED'
          ? t('errorUsed')
          : errorCode === 'INVITE_CANCELLED'
            ? t('errorCancelled')
            : t('errorNotFound');
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>{t('invalidHeading')}</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${locale}/login`}>
              <Button variant="outline" className="w-full">
                {t('backToLogin')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <ActivateForm locale={locale} token={token} employeeName={info.employeeName} />
    </main>
  );
}