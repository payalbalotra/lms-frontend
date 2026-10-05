'use client';

import * as React from 'react';
import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  LuArrowLeft,
  LuCircleCheck,
  LuCircleAlert,
  LuLoader,
  LuKeyRound,
  LuClock,
  LuExternalLink,
} from 'react-icons/lu';
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
import { requestPasswordReset } from '@/lib/api';

interface ForgotPasswordFormProps {
  locale: string;
}

export function ForgotPasswordForm({ locale }: ForgotPasswordFormProps): React.ReactElement {
  const t = useTranslations('forgotPassword');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  function handleSendReset(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError(t('errorInvalid'));
      return;
    }

    startTransition(async () => {
      try {
        await requestPasswordReset({ email: trimmed });
        setSubmittedEmail(trimmed);
        setResendCooldown(60);
      } catch {
        setError(t('errorGeneric'));
      }
    });
  }

  function handleResend(): void {
    if (resendCooldown > 0 || !submittedEmail) return;
    startTransition(async () => {
      try {
        await requestPasswordReset({ email: submittedEmail });
        setResendCooldown(60);
      } catch {
        setError(t('errorGeneric'));
      }
    });
  }

  return (
    <Card
      className="flex-1 w-full border-t border-x sm:border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl flex flex-col justify-between rounded-b-none sm:rounded-b-[32px] overflow-hidden pb-1 mb-0 sm:mb-20 backdrop-blur-sm"
      style={{
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px',
      }}
    >
      {/* Decorative top accent line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-brand)] via-[var(--color-brand-600)] to-[var(--color-brand-700)] shrink-0" />

      <CardHeader className="text-center pt-6 pb-1 px-6 sm:px-7 sm:mt-12 shrink-0">
        {/* Mobile-only logo and restaurant name inside form */}
        <div className="flex sm:hidden items-center justify-center gap-2 mb-3">
          <div
            className="flex items-center justify-center rounded-full bg-white shadow-sm border border-[var(--color-line-2)] p-1 shrink-0"
            style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
          >
            <img
              src="/brand-mark.png"
              alt="Alimentaria Mexicana"
              className="object-contain rounded-full w-full h-full"
            />
          </div>
          <span className="font-[family-name:var(--font-display)] text-base font-bold tracking-tight text-[var(--color-ink)] leading-tight">
            Alimentaria Mexicana
          </span>
        </div>

        <div className="p-3 mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-tint)]/60 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-brand-700)] border border-[var(--color-brand)]/20">
          <LuKeyRound className="text-xs" />
          <span>{t('badge')}</span>
        </div>

        <CardTitle className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-ink)] leading-tight">
          {submittedEmail ? t('successTitle') : t('title')}
        </CardTitle>
        <CardDescription className="text-xs text-[var(--color-ink-2)] mt-1 max-w-xs mx-auto leading-relaxed">
          {submittedEmail
            ? t('successBody', { email: submittedEmail })
            : t('subtitle')}
        </CardDescription>
      </CardHeader>

      {!submittedEmail ? (
        /* Form view: Enter email */
        <form onSubmit={handleSendReset} noValidate className="flex-1 flex flex-col justify-between">
          <CardContent className="grid gap-3.5 px-6 sm:px-7 pb-2">
            {error ? (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl bg-[var(--color-bad-tint)]/70 border border-[var(--color-bad)]/30 px-3 py-2 text-xs font-medium text-[var(--color-bad-hover)] animate-in fade-in duration-150"
              >
                <LuCircleAlert className="shrink-0 text-sm text-[var(--color-bad)]" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="grid mt-6 gap-1.5">
              <Label htmlFor="forgot-email" className="text-xs sm:text-sm font-semibold text-[var(--color-ink)]">
                {t('emailLabel')}
              </Label>
              <Input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={t('emailPlaceholder')}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                className="h-11 sm:h-12 rounded-xl sm:rounded-2xl border-[var(--color-line-2)] bg-[var(--color-field)] px-4 text-sm focus:border-[var(--color-brand-600)] transition-all"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 px-6 sm:px-7 pb-6 sm:pb-8 shrink-0">
            <Button
              type="submit"
              className="w-full h-12 rounded-full font-semibold text-sm sm:text-base bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white shadow-md shadow-[var(--color-brand-600)]/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <LuLoader className="animate-spin text-base" />
                  <span>{t('submitting')}</span>
                </>
              ) : (
                <span>{t('submit')}</span>
              )}
            </Button>

            <Link
              href={`/${locale}/login`}
              className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors py-1 cursor-pointer"
            >
              <LuArrowLeft className="text-sm" />
              <span>{t('backToLogin')}</span>
            </Link>

            <p className="text-[11px] text-center text-[var(--color-ink-3)]/80 pt-1">
              &copy; {new Date().getFullYear()} Alimentaria Mexicana &bull; Culinary Learning &amp; SOPs
            </p>
          </CardFooter>
        </form>
      ) : (
        /* Sent Confirmation View */
        <div className="flex flex-col px-6 sm:px-7 pt-1 pb-4">
          <CardContent className="flex flex-col items-center text-center p-0 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-ok-tint)] text-[var(--color-ok)] border border-[var(--color-ok)]/20 shadow-xs animate-in zoom-in-75 duration-300">
              <LuCircleCheck className="text-2xl" />
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-3)] bg-[var(--color-panel)] px-2.5 py-1 rounded-full border border-[var(--color-line)]">
              <LuClock className="text-xs" />
              <span>{t('expiryNote')}</span>
            </div>

            {/* Direct testing helper link */}
            <div className="w-full rounded-xl border border-dashed border-[var(--color-brand)]/40 bg-[var(--color-brand-tint)]/30 p-2.5 text-center mt-0.5">
              <p className="text-[11px] font-medium text-[var(--color-ink-2)] mb-1">
                Staff Email Simulation
              </p>
              <Link
                href={`/${locale}/reset-password?token=demo-token-better-auth&email=${encodeURIComponent(
                  submittedEmail,
                )}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-700)] hover:underline"
              >
                <span>{t('testLink')}</span>
                <LuExternalLink className="text-xs" />
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 p-0 mt-3">
            {/* Resend button */}
            <div className="flex items-center justify-center gap-1 text-[11px] text-[var(--color-ink-2)]">
              <span>{t('didNotReceive')}</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isPending}
                className={`font-semibold transition-colors ${
                  resendCooldown > 0
                    ? 'text-[var(--color-ink-3)] cursor-not-allowed'
                    : 'text-[var(--color-brand-600)] hover:underline'
                }`}
              >
                {resendCooldown > 0
                  ? t('resendCooldown', { seconds: resendCooldown })
                  : t('resendButton')}
              </button>
            </div>

            <Link
              href={`/${locale}/login`}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors py-1 mt-1"
            >
              <LuArrowLeft className="text-sm" />
              <span>{t('backToLogin')}</span>
            </Link>
          </CardFooter>
        </div>
      )}
    </Card>
  );
}
