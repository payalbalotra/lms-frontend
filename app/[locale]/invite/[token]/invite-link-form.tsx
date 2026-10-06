'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LuLoader } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type VerifyState = 'verifying' | 'verified' | 'error';

interface InviteLinkFormProps {
  locale: string;
  token: string;
}

export function InviteLinkForm({ locale, token }: InviteLinkFormProps): React.ReactElement {
  const t = useTranslations('inviteLink');
  const tActivate = useTranslations('activate');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<VerifyState>('verifying');

  useEffect(() => {
    const queryToken = searchParams.get('token');
    const actualToken = (token && token !== 'token' ? token : queryToken) || queryToken || token;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
    if (actualToken && locale) {
      // Full browser redirect so backend can set the secure HttpOnly cookie
      window.location.href = `${backendUrl}/api/v1/auth/invites/${locale}/${actualToken}`;
    } else {
      router.replace(`/${locale}/login`);
    }
  }, [locale, token, searchParams, router]);

  if (state === 'verifying' || state === 'verified') {
    return (
      <Card
        className="flex-1 w-full border-t border-x sm:border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl flex flex-col justify-between rounded-b-none sm:rounded-b-[32px] overflow-hidden pb-1 mb-0 sm:mb-20 text-center"
        style={{
          borderTopLeftRadius: '32px',
          borderTopRightRadius: '32px',
        }}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-brand)] via-[var(--color-brand-600)] to-[var(--color-brand-700)] shrink-0" />
        <CardHeader className="pt-10 pb-3 px-6 sm:px-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-tint)]">
            <LuLoader className="h-6 w-6 animate-spin text-[var(--color-brand-700)]" />
          </div>
          <CardTitle className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            {t('verifyingTitle')}
          </CardTitle>
          <CardDescription className="text-sm text-[var(--color-ink-2)] mt-2">
            {t('verifyingSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 sm:px-8 pb-8" />
      </Card>
    );
  }

  return (
    <Card
      className="flex-1 w-full border-t border-x sm:border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl flex flex-col justify-between rounded-b-none sm:rounded-b-[32px] overflow-hidden pb-1 mb-0 sm:mb-20 text-center"
      style={{
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px',
      }}
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-bad)] to-[var(--color-bad-fill)] shrink-0" />
      <CardHeader className="pt-8 pb-3 px-6 sm:px-8">
        <CardTitle className="font-[family-name:var(--font-display)] text-2xl font-bold">
          {tActivate('invalidHeading')}
        </CardTitle>
        <CardDescription className="text-sm text-[var(--color-ink-2)] mt-2">
          {t('errorGeneric')}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-4 px-6 sm:px-8">
        <Link href={`/${locale}/login`} className="w-full">
          <Button className="w-full h-12 rounded-full font-semibold">
            {tActivate('backToLogin')}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
