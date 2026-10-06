'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  LuLock,
  LuEye,
  LuEyeOff,
  LuCircleCheck,
  LuCircleAlert,
  LuLoader,
  LuArrowLeft,
  LuCheck,
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
import { resetPassword, verifyResetToken } from '@/lib/api';

interface ResetPasswordFormProps {
  locale: string;
  initialToken?: string;
}

export function ResetPasswordForm({ locale, initialToken }: ResetPasswordFormProps): React.ReactElement {
  const t = useTranslations('resetPassword');
  const searchParams = useSearchParams();
  const token = initialToken || searchParams?.get('token') || '';
  const emailQuery = searchParams?.get('email');

  // Flow states: 'verifying' -> 'verified' (opens reset screen) | 'invalid' | 'success'
  const [status, setStatus] = useState<'verifying' | 'verified' | 'invalid' | 'success'>('verifying');
  const [verifiedEmail, setVerifiedEmail] = useState<string>(emailQuery || '');
  const [verifiedName, setVerifiedName] = useState<string>('');

  const [code, setCode] = useState('');
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 1. Verify user & link token upon opening
  useEffect(() => {
    let isMounted = true;

    async function checkToken() {
      if (!token) {
        if (isMounted) setStatus('invalid');
        return;
      }

      try {
        // Brief artificial micro-delay so the staff user clearly sees token verification
        await new Promise((r) => setTimeout(r, 600));
        const res = await verifyResetToken(token);

        if (!isMounted) return;

        if (res.valid) {
          if (res.email) setVerifiedEmail(res.email);
          if (res.employeeName) setVerifiedName(res.employeeName);
          setStatus('verified'); // User is verified -> Opens reset password screen!
        } else {
          setStatus('invalid');
        }
      } catch {
        if (isMounted) setStatus('invalid');
      }
    }

    checkToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const isCodeComplete = /^\d{6}$/.test(code);
  const isMinLength = password.length >= 8;
  const isMatching = password.length > 0 && password === confirmPassword;

  // Strip everything but digits, cap at 6. The keypad shown on a phone is the
  // numeric one; the form rejects paste of letters without nagging the user.
  function onCodeChange(next: string): void {
    const cleaned = next.replace(/\D/g, '').slice(0, 6);
    setCode(cleaned);
    // After a paste/auto-fill that lands more than one digit, jump focus to
    // the box the user is now typing into.
    requestAnimationFrame(() => {
      const nextIndex = Math.min(cleaned.length, 5);
      codeRefs.current[nextIndex]?.focus();
    });
  }

  function onCodeBoxChange(index: number, raw: string): void {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const chars = code.padEnd(6, '').split('');
    chars[index] = digit;
    const next = chars.join('').replace(/ /g, '').slice(0, 6);
    setCode(next);
    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus();
      codeRefs.current[index + 1]?.select();
    }
  }

  function onCodeBoxKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Backspace' && !event.currentTarget.value && index > 0) {
      event.preventDefault();
      codeRefs.current[index - 1]?.focus();
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);

    if (!code) {
      setError(t('errorCodeRequired'));
      return;
    }

    if (!isCodeComplete) {
      setError(t('errorCodeInvalid'));
      return;
    }

    if (!isMinLength) {
      setError(t('errorLength'));
      return;
    }

    if (!isMatching) {
      setError(t('errorMismatch'));
      return;
    }

    startTransition(async () => {
      try {
        await resetPassword({ token, code, password, email: verifiedEmail });
        setStatus('success');
      } catch {
        setError(t('errorGeneric'));
      }
    });
  }

  // --------------------------------------------------------------------------
  // STATE 1: VERIFYING TOKEN
  // --------------------------------------------------------------------------
  if (status === 'verifying') {
    return (
      <Card className="w-full rounded-3xl border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-xl overflow-hidden backdrop-blur-sm text-center py-12 px-6">
        <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-brand)] via-[var(--color-brand-600)] to-[var(--color-brand-700)] absolute top-0 left-0" />
        <CardContent className="flex flex-col items-center justify-center gap-4 py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand-tint)] text-[var(--color-brand-600)] animate-pulse">
            <LuLoader className="animate-spin text-3xl" />
          </div>
          <CardTitle className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-ink)]">
            {t('verifyingTitle')}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-[var(--color-ink-2)] max-w-xs">
            {t('verifyingSubtitle')}
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // STATE 2: INVALID OR EXPIRED TOKEN
  // --------------------------------------------------------------------------
  if (status === 'invalid') {
    return (
      <Card className="w-full rounded-3xl border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-xl overflow-hidden backdrop-blur-sm text-center">
        <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-bad)] via-[var(--color-bad-hover)] to-[var(--color-bad-fill)]" />
        <CardHeader className="pt-8 pb-3 px-6 sm:px-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bad-tint)] text-[var(--color-bad)]">
            <LuCircleAlert className="text-3xl" />
          </div>
          <CardTitle className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-ink)]">
            {t('invalidTokenTitle')}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-[var(--color-ink-2)] mt-1.5 max-w-sm mx-auto leading-relaxed">
            {t('invalidTokenBody')}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3 px-6 sm:px-8 pb-8 pt-4">
          <Link href={`/${locale}/forgot-password`} className="w-full">
            <Button className="w-full h-12 rounded-full font-semibold text-sm bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white">
              {t('requestNewLink')}
            </Button>
          </Link>
          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors py-1"
          >
            <LuArrowLeft className="text-sm" />
            <span>{t('backToLogin')}</span>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // STATE 3: SUCCESS (PASSWORD RESET COMPLETE)
  // --------------------------------------------------------------------------
  if (status === 'success') {
    return (
      <Card className="w-full rounded-3xl border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-xl overflow-hidden backdrop-blur-sm text-center">
        <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-ok)] to-[var(--color-ok-700)]" />
        <CardHeader className="pt-8 pb-3 px-6 sm:px-8">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-ok-tint)] text-[var(--color-ok)] border border-[var(--color-ok)]/20 shadow-xs animate-in zoom-in-75 duration-300">
            <LuCircleCheck className="text-3xl" />
          </div>
          <CardTitle className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
            {t('successTitle')}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-[var(--color-ink-2)] mt-1.5 max-w-sm mx-auto leading-relaxed">
            {t('successBody')}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3 px-6 sm:px-8 pb-8 pt-4">
          <Link href={`/${locale}/login`} className="w-full">
            <Button
              type="button"
              className="w-full h-12 rounded-full font-semibold text-sm bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white shadow-md shadow-[var(--color-brand-600)]/20 active:scale-[0.99] transition-all"
            >
              {t('signInButton')}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // STATE 4: VERIFIED! RESET PASSWORD SCREEN OPENS
  // --------------------------------------------------------------------------
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

      <CardHeader className="text-center pt-6 pb-2 px-5 sm:px-8 sm:mt-12 shrink-0">
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

        <CardTitle
          className="font-[family-name:var(--font-display)] text-xl sm:text-[26px] tracking-tight text-[var(--color-ink)] leading-tight"
          style={{ fontWeight: 500 }}
        >
          {t('title')}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-[var(--color-ink-2)] mt-1.5 max-w-sm mx-auto leading-relaxed">
          {verifiedName ? `${verifiedName} • ` : ''}
          {t('subtitle')}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col justify-between">
        <CardContent className="flex flex-col gap-4 px-5 sm:px-8 pt-2 pb-4">
          {error ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl bg-[var(--color-bad-tint)]/70 border border-[var(--color-bad)]/30 px-3 py-2 text-xs font-medium text-[var(--color-bad-hover)] animate-in fade-in duration-150"
            >
              <LuCircleAlert className="shrink-0 text-sm text-[var(--color-bad)]" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* 6-digit code — Better Auth sends a one-time code in addition to the
              link; both are required to prove the user controls the inbox. The
              helper line below the field tells them where the code came from so
              they don't go looking for it in the link. */}
          <div className="grid gap-1.5">
            <Label className="text-sm font-medium text-[var(--color-ink)]">
              {t('codeLabel')}
            </Label>
            {/* Six separate boxes so the digits read at a glance and so a phone's
                SMS suggestion can drop straight into the first box. `code` is still
                the single source of truth — each box only owns one slot. */}
            <div
              role="group"
              aria-label={t('codeLabel')}
              className="grid grid-cols-6 gap-1.5 sm:gap-2"
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Input
                  key={i}
                  ref={(el) => {
                    codeRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  pattern="\d{1}"
                  maxLength={1}
                  value={code[i] ?? ''}
                  onChange={(e) => onCodeBoxChange(i, e.target.value)}
                  onKeyDown={(e) => onCodeBoxKeyDown(i, e)}
                  onPaste={i === 0 ? (e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (/\d{6}/.test(pasted)) {
                      e.preventDefault();
                      onCodeChange(pasted);
                    }
                  } : undefined}
                  disabled={isPending}
                  aria-label={t('codeLabel')}
                  className="h-12 w-full rounded-xl sm:rounded-2xl border-[var(--color-line-2)] bg-[var(--color-field)] text-center text-xl sm:text-2xl font-semibold tabular-nums focus:border-[var(--color-brand-600)] focus:ring-2 focus:ring-[var(--color-brand-600)]/30 transition-all p-0"
                />
              ))}
            </div>
            <p className="text-xs text-[var(--color-ink-3)]">{t('codeHelper')}</p>
          </div>

          {/* New Password */}
          <div className="grid gap-1.5">
            <Label htmlFor="new-password" className="text-sm font-medium text-[var(--color-ink)]">
              {t('newPasswordLabel')}
            </Label>
            <div className="relative w-full flex items-center">
              <Input
                id="new-password"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t('newPasswordPlaceholder')}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                className="h-12 w-full rounded-xl sm:rounded-2xl border-[var(--color-line-2)] bg-[var(--color-field)] text-sm sm:text-base focus:border-[var(--color-brand-600)] transition-all"
                style={{ paddingLeft: '16px', paddingRight: '48px' }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                className="text-[var(--color-ink-3)] hover:text-[var(--color-ink)] transition-colors focus:outline-none cursor-pointer"
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  zIndex: 10,
                }}
              >
                {showPassword ? <LuEyeOff style={{ width: '20px', height: '20px' }} /> : <LuEye style={{ width: '20px', height: '20px' }} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="grid gap-1.5">
            <Label
              htmlFor="confirm-password"
              className="text-sm font-medium text-[var(--color-ink)]"
            >
              {t('confirmPasswordLabel')}
            </Label>
            <div className="relative w-full flex items-center">
              <Input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t('confirmPasswordPlaceholder')}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isPending}
                className="h-12 w-full rounded-xl sm:rounded-2xl border-[var(--color-line-2)] bg-[var(--color-field)] text-sm sm:text-base focus:border-[var(--color-brand-600)] transition-all"
                style={{ paddingLeft: '16px', paddingRight: '48px' }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? t('hidePassword') : t('showPassword')}
                className="text-[var(--color-ink-3)] hover:text-[var(--color-ink)] transition-colors focus:outline-none cursor-pointer"
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  zIndex: 10,
                }}
              >
                {showConfirm ? <LuEyeOff style={{ width: '20px', height: '20px' }} /> : <LuEye style={{ width: '20px', height: '20px' }} />}
              </button>
            </div>
          </div>

          {/* Hide native browser password reveal icon in Edge/IE */}
          <style>{`
            input[type="password"]::-ms-reveal,
            input[type="password"]::-ms-clear {
              display: none !important;
              width: 0 !important;
              height: 0 !important;
            }
          `}</style>

          {/* Real-time Password checklist with generous padding */}
          <div
            className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] flex flex-col gap-2"
            style={{ padding: '14px 16px' }}
          >
            <div
              className={`flex items-center gap-2.5 transition-colors ${
                isCodeComplete ? 'text-[var(--color-ok)] font-medium' : 'text-[var(--color-ink-3)]'
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  isCodeComplete
                    ? 'bg-[var(--color-ok-tint)] text-[var(--color-ok)] font-bold'
                    : 'bg-[var(--color-line-2)] text-[var(--color-ink-3)]'
                }`}
              >
                {isCodeComplete ? <LuCheck /> : '•'}
              </div>
              <span className="pl-1 text-xs sm:text-sm">{t('codeRule')}</span>
            </div>

            <div
              className={`flex items-center gap-2.5 transition-colors ${
                isMinLength ? 'text-[var(--color-ok)] font-medium' : 'text-[var(--color-ink-3)]'
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  isMinLength
                    ? 'bg-[var(--color-ok-tint)] text-[var(--color-ok)] font-bold'
                    : 'bg-[var(--color-line-2)] text-[var(--color-ink-3)]'
                }`}
              >
                {isMinLength ? <LuCheck /> : '•'}
              </div>
              <span className="ml-1 text-xs sm:text-sm">{t('ruleLength')}</span>
            </div>

            <div
              className={`flex items-center gap-2.5 transition-colors ${
                isMatching ? 'text-[var(--color-ok)] font-medium' : 'text-[var(--color-ink-3)]'
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  isMatching
                    ? 'bg-[var(--color-ok-tint)] text-[var(--color-ok)] font-bold'
                    : 'bg-[var(--color-line-2)] text-[var(--color-ink-3)]'
                }`}
              >
                {isMatching ? <LuCheck /> : '•'}
              </div>
              <span className="pl-2 text-xs sm:text-sm">{t('ruleMatch')}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 px-5 sm:px-8 pb-6 sm:pb-8 pt-2 shrink-0">
          <Button
            type="submit"
            className="w-full h-12 rounded-full font-semibold text-base bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white shadow-md shadow-[var(--color-brand-600)]/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            disabled={isPending || !isCodeComplete || !isMinLength || !isMatching}
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
    </Card>
  );
}
