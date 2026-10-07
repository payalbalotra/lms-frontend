'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  deactivateEmployee,
  reactivateEmployee,
} from '@/services/employees/api';
import { RowActions, type RowActionItem } from '@/components/ui/row-actions';
import type { AdminEmployee } from '@/lib/types';
import { LuBan, LuPencil, LuRotateCw, LuSend } from 'react-icons/lu';
import { ResendInviteModal } from './resend-invite-modal';

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
  const [isResendOpen, setIsResendOpen] = useState(false);

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
    setIsResendOpen(true);
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
    <>
      <RowActions
        items={buildItems()}
        triggerLabel={`${t('rowActionsLabel')}: ${employee.name}`}
      />
      {employee.status === 'pending' ? (
        <ResendInviteModal
          open={isResendOpen}
          onClose={() => setIsResendOpen(false)}
          employee={employee}
          locale={locale}
        />
      ) : null}
    </>
  );
}
