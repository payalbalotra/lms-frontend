import * as React from 'react';
import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/auth-shell';
import { lookupInvite } from '@/lib/api';
import { SetPasswordForm } from './set-password-form';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function SetPasswordLandingPage({ params, searchParams }: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('activate');

  if (token) {
    let employeeName = 'Demo Employee';
    try {
      const info = await lookupInvite(token);
      employeeName = info.employeeName;
    } catch {
      // fallback
    }
    return (
      <AuthShell locale={locale}>
        <SetPasswordForm locale={locale} token={token} employeeName={employeeName} />
      </AuthShell>
    );
  }

  return (
    <AuthShell locale={locale}>
      <Card
        className="flex-1 w-full border-t border-x sm:border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl flex flex-col justify-between rounded-b-none sm:rounded-b-[32px] overflow-hidden pb-1 mb-0 sm:mb-20 text-center"
        style={{
          borderTopLeftRadius: '32px',
          borderTopRightRadius: '32px',
        }}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-brand-700)] shrink-0" />
        <CardHeader className="pt-8 pb-3 px-6 sm:px-8">
          <CardTitle className="font-[family-name:var(--font-display)] text-2xl font-bold">{t('noTokenHeading')}</CardTitle>
          <CardDescription className="text-sm text-[var(--color-ink-2)] mt-2">{t('noTokenBody')}</CardDescription>
        </CardHeader>
        <CardContent className="mt-4 px-6 sm:px-8">
          <Link href={`/${locale}/login`} className="w-full">
            <Button className="w-full h-12 rounded-full font-semibold">{t('backToLogin')}</Button>
          </Link>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
