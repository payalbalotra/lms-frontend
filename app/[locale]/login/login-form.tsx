'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { login, ApiException } from '@/lib/api';
import Link from 'next/link';

interface LoginFormProps {
  locale: string;
}

export function LoginForm({ locale }: LoginFormProps): React.ReactElement {
  const t = useTranslations('login');
  const tApp = useTranslations('app');
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [locationId, setLocationId] = useState('loc-main');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await login({ name: name.trim(), password, locationId: locationId.trim() });
        router.replace(`/${locale}/employee/assigned`);
        router.refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'ACCOUNT_LOCKED') setError(t('errorLocked'));
          else if (err.code === 'INVALID_CREDENTIALS') setError(t('errorInvalid'));
          else setError(err.message);
        } else {
          setError(t('errorGeneric'));
        }
      }
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{tApp('title')}</CardTitle>
        <CardDescription>{t('heading')}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t('nameLabel')}</Label>
            <Input
              id="name"
              name="name"
              autoComplete="username"
              placeholder={t('namePlaceholder')}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="locationId">{t('locationLabel')}</Label>
            <Input
              id="locationId"
              name="locationId"
              autoComplete="off"
              placeholder={t('locationPlaceholder')}
              required
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">{t('passwordLabel')}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={t('passwordPlaceholder')}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? t('submitting') : t('submit')}
          </Button>
          <p className="text-xs text-[var(--color-muted-foreground)] text-center">
            {t('footerHint')}
          </p>
          <Link
            href={`/${locale}/activate`}
            className="text-xs text-center underline-offset-4 hover:underline"
          >
            {t('haveInvite')}
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}