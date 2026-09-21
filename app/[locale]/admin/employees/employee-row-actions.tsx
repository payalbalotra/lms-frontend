'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  deactivateEmployee,
  reactivateEmployee,
  resendInvite,
  ApiException,
} from '@/lib/api';
import { RowActions, type RowActionItem } from '@/components/ui/row-actions';
import type { AdminEmployee, InviteResult } from '@/lib/types';
import { LuBan, LuRotateCw, LuSend } from 'react-icons/lu';

interface EmployeeRowActionsProps {
  locale: string;
  employee: AdminEmployee;
}

export function EmployeeRowActions({ locale, employee }: EmployeeRowActionsProps): React.ReactElement {
  const t = useTranslations('admin');
  const router = useRouter();
  const [_pending, startTransition] = useTransition();
  const [resendError, setResendError] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<InviteResult | null>(null);

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
    startTransition(async () => {
      try {
        await deactivateEmployee(employee.id);
        refresh();
      } catch {
        // page refresh reflects the error
      }
    });
  }

  function onReactivate(): void {
    startTransition(async () => {
      try {
        await reactivateEmployee(employee.id);
        refresh();
      } catch {
        // page refresh reflects the error
      }
    });
  }

  function buildItems(): RowActionItem[] {
    if (employee.status === 'pending') {
      return [
        {
          label: t('actionsResend'),
          icon: LuSend,
          onSelect: onResend,
        },
        {
          label: t('actionsDeactivate'),
          icon: LuBan,
          destructive: true,
          onSelect: onDeactivate,
        },
      ];
    }
    if (employee.status === 'active') {
      return [
        {
          label: t('actionsDeactivate'),
          icon: LuBan,
          destructive: true,
          onSelect: onDeactivate,
        },
      ];
    }
    // deactivated
    return [
      {
        label: t('actionsReactivate'),
        icon: LuRotateCw,
        onSelect: onReactivate,
      },
    ];
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <RowActions
        items={buildItems()}
        triggerLabel={`${t('rowActionsLabel')} — ${employee.name}`}
      />
      {resendError ? (
        <p role="alert" className="text-sm text-[var(--color-bad)]">
          {resendError}
        </p>
      ) : null}
      {lastInvite ? (
        <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-panel)] p-2 text-sm text-[var(--color-ink)]">
          <p className="mb-1 font-medium">{t('inviteCreatedHeading')}</p>
          <p className="mb-1 break-all">
            <span className="text-[var(--color-muted-foreground)]">{t('inviteUrlLabel')}</span>{' '}
            <a
              href={`/${locale}/admin/employees/new#${employee.id}`}
              className="font-mono text-[var(--color-brand-700)] underline-offset-2 hover:underline"
            >
              {lastInvite.code}
            </a>
          </p>
          <p className="break-all">
            <a
              href={lastInvite.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[var(--color-brand-700)] underline-offset-2 hover:underline"
            >
              {lastInvite.url}
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
}