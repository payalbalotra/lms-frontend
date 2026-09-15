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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { activate, ApiException } from '@/lib/api';

interface ActivateFormProps {
  locale: string;
  token: string;
  employeeName: string;
}

export function ActivateForm({ locale, token, employeeName }: ActivateFormProps): React.ReactElement {
  const t = useTranslations('activate');
  const router = useRouter();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t('errorPassword'));
      return;
    }
    if (password !== confirm) {
      setError(t('errorMismatch'));
      return;
    }
    if (!/^\d{5}$/.test(code)) {
      setError(t('errorInvalidCode'));
      return;
    }

    startTransition(async () => {
      try {
        await activate({ token, code, password });
        router.replace(`/${locale}/employee/assigned`);
        router.refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'INVALID_CODE') setError(t('errorInvalidCode'));
          else if (err.code === 'ACCOUNT_LOCKED') setError(t('errorLocked'));
          else if (err.code === 'INVITE_EXPIRED') setError(t('errorExpired'));
          else if (err.code === 'INVITE_ALREADY_USED') setError(t('errorUsed'));
          else if (err.code === 'INVITE_CANCELLED') setError(t('errorCancelled'));
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
        <CardTitle>{employeeName}</CardTitle>
        <CardDescription>{t('intro')}</CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="code">{t('codeLabel')}</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{5}"
              maxLength={5}
              required
              placeholder={t('codePlaceholder')}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">{t('passwordLabel')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm">{t('confirmLabel')}</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              placeholder={t('confirmPlaceholder')}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={isPending}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-[var(--color-bad)]">
              {error}
            </p>
          ) : null}
        </CardContent>

        <div className="flex flex-col gap-2 px-6 pb-5">
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? t('submitting') : t('submit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}