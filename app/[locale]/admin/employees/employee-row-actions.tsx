'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  deactivateEmployee,
  reactivateEmployee,
  resendInvite,
  ApiException,
} from '@/lib/api';
import type { AdminEmployee, InviteResult } from '@/lib/types';

interface EmployeeRowActionsProps {
  locale: string;
  employee: AdminEmployee;
}

export function EmployeeRowActions({ locale, employee }: EmployeeRowActionsProps): React.ReactElement {
  const t = useTranslations('admin');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resendError, setResendError] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<InviteResult | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmReactivate, setConfirmReactivate] = useState(false);

  function refresh(): void {
    router.refresh();
  }

  function onResend(): void {
    setResendError(null);
    setLastInvite(null);
    startTransition(async () => {
      try {
        const { invite } = await resendInvite(employee.id);
        setLastInvite(invite);
        refresh();
      } catch (err) {
        if (err instanceof ApiException) setResendError(err.message);
        else setResendError(t('errorGeneric'));
      }
    });
  }

  function onDeactivate(): void {
    if (!confirmDeactivate) {
      setConfirmDeactivate(true);
      return;
    }
    startTransition(async () => {
      try {
        await deactivateEmployee(employee.id);
        setConfirmDeactivate(false);
        refresh();
      } catch {
        // ignore — page refresh will reflect error state
      }
    });
  }

  function onReactivate(): void {
    if (!confirmReactivate) {
      setConfirmReactivate(true);
      return;
    }
    startTransition(async () => {
      try {
        await reactivateEmployee(employee.id);
        setConfirmReactivate(false);
        refresh();
      } catch {
        // ignore
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {employee.status === 'pending' ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={onResend}>
            {t('actionsResend')}
          </Button>
        ) : null}

        {employee.status === 'active' ? (
          confirmDeactivate ? (
            <>
              <Button size="sm" variant="destructive" disabled={pending} onClick={onDeactivate}>
                {t('confirmYes')}
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => setConfirmDeactivate(false)}>
                {t('confirmNo')}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" disabled={pending} onClick={onDeactivate}>
              {t('actionsDeactivate')}
            </Button>
          )
        ) : null}

        {employee.status === 'deactivated' ? (
          confirmReactivate ? (
            <>
              <Button size="sm" variant="default" disabled={pending} onClick={onReactivate}>
                {t('confirmYes')}
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => setConfirmReactivate(false)}>
                {t('confirmNo')}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" disabled={pending} onClick={onReactivate}>
              {t('actionsReactivate')}
            </Button>
          )
        ) : null}
      </div>

      {resendError ? (
        <p role="alert" className="text-xs text-red-600">
          {resendError}
        </p>
      ) : null}

      {lastInvite ? (
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-muted)] p-2 text-xs">
          <p className="mb-1 font-medium">{t('inviteCreatedHeading')}</p>
          <p className="mb-1 break-all">
            <span className="text-[var(--color-muted-foreground)]">{t('inviteUrlLabel')}</span>{' '}
            <a
              href={`/${locale}/admin/employees/new#${employee.id}`}
              className="font-mono underline-offset-2 hover:underline"
            >
              {lastInvite.code}
            </a>
          </p>
          <p className="break-all">
            <a
              href={lastInvite.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono underline-offset-2 hover:underline"
            >
              {lastInvite.url}
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
}