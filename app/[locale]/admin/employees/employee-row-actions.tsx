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
import { Button } from '@/components/ui/button';
import type { AdminEmployee, InviteResult } from '@/lib/types';
import { LuBan, LuPencil, LuRotateCw, LuSend } from 'react-icons/lu';

interface EmployeeRowActionsProps {
  locale: string;
  employee: AdminEmployee;
  /** When provided, the kebab's Edit item calls this instead of
   *  navigating. The detail page passes its `openEdit` so the kebab Edit
   *  opens the modal directly — without it, clicking Edit on a page
   *  you're already on would just re-route to itself. The list page
   *  omits this and falls back to navigation. */
  onEdit?: () => void;
}

export function EmployeeRowActions({ locale, employee, onEdit }: EmployeeRowActionsProps): React.ReactElement {
  const t = useTranslations('admin');
  const router = useRouter();
  const [_pending, startTransition] = useTransition();
  const [resendError, setResendError] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<InviteResult | null>(null);

  function refresh(): void {
    router.refresh();
  }

  function handleEdit(): void {
    if (onEdit) {
      onEdit();
      return;
    }
    // No callback provided — assume the caller is the list and the user
    // needs to navigate to the detail page. Use the locale-aware path
    // so the same row in the EN and ES routes lands on the right page.
    router.push(`/${locale}/admin/employees/${employee.id}`);
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
    // Edit is always the first item — non-destructive, navigation. The
    // pending/active/deactivated paths keep their existing kebab items.
    const editItem: RowActionItem = {
      label: t('actionsEdit'),
      icon: LuPencil,
      onSelect: handleEdit,
    };

    if (employee.status === 'pending') {
      return [
        editItem,
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
        editItem,
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
      editItem,
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
        triggerLabel={`${t('rowActionsLabel')}: ${employee.name}`}
      />
      {resendError ? (
        <p role="alert" className="text-sm text-[var(--color-bad)]">
          {resendError}
        </p>
      ) : null}
      {lastInvite ? (
        <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-panel)] p-3 text-sm text-[var(--color-ink)] max-w-xs shadow-sm">
          <p className="mb-1 font-semibold text-[var(--color-ink)]">{t('inviteEmailSent')}</p>
          <p className="mb-2 text-xs text-[var(--color-ink-2)]">{t('inviteUrlLabel')}</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={lastInvite.url}
              className="flex-1 rounded border border-[var(--color-line-2)] bg-[var(--color-surface)] px-2 py-1 text-xs font-mono text-[var(--color-ink)] select-all truncate"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  void navigator.clipboard.writeText(lastInvite.url);
                }
              }}
            >
              {t('copyUrl')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
