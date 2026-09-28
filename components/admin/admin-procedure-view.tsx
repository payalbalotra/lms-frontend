'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LuArchive,
  LuArchiveRestore,
  LuArrowLeft,
  LuCircleCheck,
  LuCircleDashed,
  LuPencil,
  LuTrash2,
} from 'react-icons/lu';
import { ApiException, deleteProcedure, getQuizById, setProcedureState, updateQuiz } from '@/lib/api';
import type { Employee, Procedure, ProcedureStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { RowActions, type RowActionItem } from '@/components/ui/row-actions';
import { ProcedureArticleBody } from '@/components/doc/procedure-article-body';

interface AdminProcedureViewProps {
  locale: string;
  procedure: Procedure;
  employee: Employee;
}


export function AdminProcedureView({
  locale,
  procedure: initial,
  employee,
}: AdminProcedureViewProps): React.ReactElement {
  const t = useTranslations('admin.library.detail');
  const tRow = useTranslations('admin');
  const router = useRouter();

  const [proc, setProc] = React.useState<Procedure>(initial);
  const [error, setError] = React.useState<string | null>(null);

  // Quiz attach banner state. The banner is shown by `<ProcedureArticleBody>`
  // when a procedure has an authored quiz that isn't yet attached and isn't
  // gated by training. Admin-only state, mirrors the cook route's wiring.
  const [bannerDismissed, setBannerDismissed] = React.useState(false);
  const [isAttaching, setIsAttaching] = React.useState(false);

  const isEs = locale === 'es';
  const title = isEs ? proc.titleEs || proc.titleEn : proc.titleEn || proc.titleEs;
  const categoryLabel = proc.category
    ? isEs
      ? proc.category.nameEs || proc.category.nameEn
      : proc.category.nameEn || proc.category.nameEs
    : '';
  const statusLabel = proc.isArchived
    ? t('statusArchived')
    : proc.status === 'published'
      ? t('statusPublished')
      : t('statusDraft');
  const subtitle = categoryLabel ? `${categoryLabel} · ${statusLabel}` : statusLabel;

  const transition = React.useCallback(
    async (change: { status?: ProcedureStatus; isArchived?: boolean }): Promise<void> => {
      setError(null);
      try {
        const updated = await setProcedureState(proc.id, change);
        setProc(updated);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('lms_procedures_updated'));
        }
      } catch (err) {
        setError(t('errorTransition'));
        if (!(err instanceof ApiException)) throw err;
      }
    },
    [proc.id, t],
  );

  const handleDelete = React.useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await deleteProcedure(proc.id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('lms_procedures_updated'));
      }
      router.push(`/${locale}/admin/library`);
      router.refresh();
    } catch (err) {
      setError(t('errorDelete'));
      if (!(err instanceof ApiException)) throw err;
    }
  }, [proc.id, locale, router, t]);

  const handleAttach = React.useCallback(async (): Promise<void> => {
    if (!proc.quizId) return;
    const quiz = getQuizById(proc.quizId);
    if (!quiz || quiz.attached) return;
    setIsAttaching(true);
    try {
      await updateQuiz(proc.quizId, { attached: true });
      setProc({ ...proc, updatedAt: new Date().toISOString() });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('lms_procedures_updated'));
      }
    } finally {
      setIsAttaching(false);
    }
  }, [proc]);

  // The kebab's three items follow the same shape as the explorer's row
  // kebab, so the manager learns one menu and meets it twice.
  const actionItems = React.useMemo<RowActionItem[]>(() => {
    const items: (RowActionItem | null)[] = [
      // 1. Status toggle: hidden while archived — restore first, status flips
      //    after. Same ordering as the list-row kebab.
      proc.isArchived
        ? null
        : proc.status === 'draft'
          ? {
              label: t('actionsPublish'),
              icon: LuCircleCheck,
              onSelect: () => void transition({ status: 'published' }),
            }
          : {
              label: t('actionsMoveToDraft'),
              icon: LuCircleDashed,
              onSelect: () => void transition({ status: 'draft' }),
            },
      // 2. Archive / Restore
      proc.isArchived
        ? {
            label: t('actionsRestore'),
            icon: LuArchiveRestore,
            onSelect: () => void transition({ isArchived: false }),
          }
        : {
            label: t('actionsArchive'),
            icon: LuArchive,
            onSelect: () => void transition({ isArchived: true }),
          },
      // 3. Delete — destructive, gets the inline-confirm panel from RowActions.
      {
        label: t('actionsDelete'),
        icon: LuTrash2,
        destructive: true,
        onSelect: () => void handleDelete(),
      },
    ];
    return items.filter((item): item is RowActionItem => item !== null);
  }, [proc.isArchived, proc.status, t, transition, handleDelete]);

  return (
    <div className="space-y-6">
      {/* Top chrome bar: back arrow + breadcrumb on the left, Edit + kebab on
          the right. Spans the full page width so the actions pin to the
          top-right corner of the AdminShell's main column, not the right
          edge of the reading column below. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('back')}
            onClick={() => router.push(`/${locale}/admin/library`)}
          >
            <LuArrowLeft aria-hidden="true" />
          </Button>
          <Link
            href={`/${locale}/admin/library`}
            className="text-sm font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            {t('eyebrow')}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={LuPencil}
            onClick={() => router.push(`/${locale}/admin/library/${proc.id}/edit`)}
          >
            {t('actionsEdit')}
          </Button>
          <RowActions triggerLabel={tRow('rowActionsLabel')} items={actionItems} />
        </div>
      </div>

      {/* Title block in the reading column so it lines up vertically with
          the article body's own DocHead. */}
      <div className="mx-auto max-w-doc space-y-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-display tracking-tight text-[var(--color-ink)]">
          {title || 'Untitled procedure'}
        </h1>
        {subtitle ? (
          <p className="text-sm leading-body text-[var(--color-ink-2)]">{subtitle}</p>
        ) : null}
      </div>

      {error ? (
        <div className="mx-auto max-w-doc">
          <p
            role="alert"
            className="rounded-md border border-[var(--color-line)] bg-[var(--color-bad-tint)] px-4 py-2 text-sm font-semibold text-[var(--color-bad)]"
          >
            {error}
          </p>
        </div>
      ) : null}

      <div className="mx-auto max-w-doc">
        <ProcedureArticleBody
          proc={proc}
          employee={employee}
          effectiveRole="admin"
          locale={locale}
          onAttachQuiz={handleAttach}
          isAttaching={isAttaching}
          bannerDismissed={bannerDismissed}
          onDismissBanner={() => setBannerDismissed(true)}
        />
      </div>
    </div>
  );
}
