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
import { CookBarAction } from '@/components/doc/cook-bar-action';
import type { ProcedureBlock } from '@/lib/types';

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

  // The cook-mode CTA in the top chrome bar belongs to the page's first
  // recipe block. We compute it from the loaded `proc` so a freshly-edited
  // procedure re-evaluates on save without unmounting the chrome.
  const cookBlockId = React.useMemo<string | null>(() => {
    const blocks = proc.bodyEn.blocks.length ? proc.bodyEn.blocks : proc.bodyEs.blocks;
    const recipe = blocks.find((b): b is Extract<ProcedureBlock, { kind: 'recipe' }> => b.kind === 'recipe');
    if (recipe) return recipe.id ?? `recipe-${recipe.factors?.length ?? 0}`;
    const hasMethod = blocks.some((b) => b.kind === 'method');
    if (hasMethod) return `steps-${proc.id}`;
    return null;
  }, [proc]);

  return (
    <div className="mx-auto w-full max-w-doc space-y-6">
      {/* Top chrome bar: back arrow + breadcrumb on the left, Edit + kebab on the right */}
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
          {cookBlockId ? (
            <CookBarAction
              procedureId={proc.id}
              recipeBlockId={cookBlockId}
              locale={locale === 'es' ? 'es' : 'en'}
            />
          ) : null}
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

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-bad-tint)] px-4 py-2 text-sm font-semibold text-[var(--color-bad)]"
        >
          {error}
        </p>
      ) : null}

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
  );
}
