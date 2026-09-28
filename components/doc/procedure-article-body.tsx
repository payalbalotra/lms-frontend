'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Allergen,
  Cover,
  DocControl,
  DocHead,
  DocPurpose,
  Facts,
} from '@/components/doc';
import { DocBehaviour } from '@/components/doc/doc-behaviour';
import { BlockRenderer, findAllergen } from '@/components/doc/block-renderer';
import { QuizAttachBanner, QuizReader } from '@/components/doc/quiz-reader';
import { Watermark } from '@/components/doc/watermark';
import { getQuizById } from '@/lib/api';
import type { Employee, Procedure, ProcedureBlock } from '@/lib/types';

interface ProcedureArticleBodyProps {
  proc: Procedure;
  employee: Employee;
  effectiveRole: 'admin' | 'employee';
  locale: string;
  /** Admin-only: wires the QuizAttachBanner attach button. */
  onAttachQuiz?: () => void;
  isAttaching?: boolean;
  bannerDismissed?: boolean;
  onDismissBanner?: () => void;
}

function splitCover(blocks: ProcedureBlock[]): {
  cover?: { src: string; alt: string };
  rest: ProcedureBlock[];
} {
  const i = blocks.findIndex((b) => b.kind === 'image' && b.src);
  if (i === -1) return { rest: blocks };
  const b = blocks[i] as Extract<ProcedureBlock, { kind: 'image' }>;
  return {
    cover: { src: b.src, alt: b.alt?.en || b.alt?.es || '' },
    rest: blocks.filter((_, n) => n !== i),
  };
}

/**
 * The body of a procedure page: cover, header, allergen, purpose, facts (admin),
 * body blocks, quiz reader, and doc-control (admin). Both the cook read page
 * (`/procedures/[id]`) and the admin detail page (`/admin/library/[id]`) render
 * this — only their surrounding chrome differs.
 *
 * Pulled out of `procedure-view-client.tsx` so the read body has exactly one
 * source of truth. Role-aware chrome (DocBar vs back link, TabBar, wrapper
 * background) stays at the call site; this component renders the same thing
 * for both roles, gating the admin-only blocks on `effectiveRole`.
 */
export function ProcedureArticleBody({
  proc,
  employee,
  effectiveRole,
  locale,
  onAttachQuiz,
  isAttaching,
  bannerDismissed,
  onDismissBanner,
}: ProcedureArticleBodyProps): React.ReactElement {
  const t = useTranslations('employee.doc');
  const labels = {
    updatedOn: t.raw('updatedOn') as string,
    uncategorised: t('uncategorised'),
    factCategory: t('factCategory'),
    factStatus: t('factStatus'),
    factUpdated: t('factUpdated'),
    factLanguages: t('factLanguages'),
    published: t('published'),
    draft: t('draft'),
    englishOnly: t('englishOnly'),
    ctlReference: t('ctlReference'),
    ctlUpdated: t('ctlUpdated'),
    ctlStatus: t('ctlStatus'),
    ctlLanguages: t('ctlLanguages'),
  };

  const isAdmin = effectiveRole === 'admin';
  const isEs = locale === 'es';

  const title = isEs ? proc.titleEs || proc.titleEn : proc.titleEn || proc.titleEs;
  const purpose = isEs ? proc.purposeEs || proc.purposeEn : proc.purposeEn || proc.purposeEs;
  const bodyEsBlocks = proc.bodyEs?.blocks ?? [];
  const bodyEnBlocks = proc.bodyEn?.blocks ?? [];
  const chosen = isEs && bodyEsBlocks.length > 0 ? proc.bodyEs : proc.bodyEn;
  const { cover, rest } = splitCover(chosen?.blocks ?? []);
  const hoisted = findAllergen(rest);
  const allergen = hoisted?.allergen;

  const cat = proc.category;
  const categoryLabel = cat
    ? isEs
      ? cat.nameEs || cat.nameEn
      : cat.nameEn || cat.nameEs
    : labels.uncategorised;
  const iconName = cat?.slug ? `category-${cat.slug}` : 'file-text';

  let updated = '';
  try {
    const rawDate = proc.updatedAt || proc.createdAt;
    if (rawDate) {
      updated = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(rawDate));
    }
  } catch {
    updated = '';
  }

  const languages = [proc.titleEn?.trim() ? 'EN' : null, bodyEsBlocks.length > 0 ? 'ES' : null]
    .filter(Boolean)
    .join(' · ');
  const englishOnly = isEs && bodyEsBlocks.length === 0;

  // Quiz attach banner: shown to admins when the procedure has a quiz but
  // neither `quiz.attached` nor `attachedToTraining` is on. The read side
  // resolves `procedure.quizId` to its quiz row via `getQuizById` on every
  // render.
  const quiz = proc.quizId ? getQuizById(proc.quizId) : null;
  const quizExists = Boolean(quiz && quiz.questions.length > 0);
  const quizVisible = Boolean(quiz && (quiz.attached || proc.attachedToTraining));
  const showAttachBanner = isAdmin && quizExists && !quizVisible;

  const factsItems = [
      { icon: 'folder', label: labels.factCategory, value: categoryLabel },
      {
        icon: proc.status === 'published' ? 'check' : 'draft',
        label: labels.factStatus,
        value: proc.status === 'published' ? labels.published : labels.draft,
        kind: (proc.status === 'published' ? 'ok' : 'default') as 'ok' | 'default',
      },
      { icon: 'clock', label: labels.factUpdated, value: updated },
      { icon: 'languages', label: labels.factLanguages, value: languages || 'EN' },
    ];

  const docControlEntries = [
      { label: labels.ctlReference, value: proc.slug },
      { label: labels.ctlUpdated, value: updated },
      { label: labels.ctlStatus, value: proc.status === 'published' ? labels.published : labels.draft },
      { label: labels.ctlLanguages, value: languages || 'EN' },
    ];

  return (
    <article className="doc">
      <DocBehaviour />
      {proc.protection === 'confidential' || proc.protection === 'master' ? (
        <Watermark name={employee.name} locale={locale} />
      ) : null}
      {showAttachBanner && !bannerDismissed ? (
        <div className="mx-auto w-full max-w-doc px-4 pt-6 sm:px-6">
          <QuizAttachBanner
            onAttach={onAttachQuiz ?? ((): void => {})}
            onDismiss={onDismissBanner ?? ((): void => {})}
            isAttaching={Boolean(isAttaching)}
          />
        </div>
      ) : null}

      {cover ? <Cover src={cover.src} alt={cover.alt} /> : null}

      {/* For a cook: the category once, with when it last changed, and no tile.
          The status, the languages and the document control are the manager's
          facts; they stay on the admin's view. */}
      <DocHead
        icon={isAdmin ? iconName : undefined}
        category={
          isAdmin
            ? categoryLabel
            : `${categoryLabel} · ${labels.updatedOn.replace('{date}', updated)}`
        }
        title={title || 'Untitled Procedure'}
        withCover={Boolean(cover)}
      />

      {allergen ? (
        <Allergen
          summary={allergen.summary}
          detail={allergen.detail}
          selectedAllergens={allergen.selectedAllergens}
          locale={isEs ? 'es' : 'en'}
        />
      ) : null}

      {purpose ? <DocPurpose>{purpose}</DocPurpose> : null}

      {isAdmin ? <Facts items={factsItems} /> : null}

      {englishOnly ? (
        <p className="doc-sec">
          <span className="pill pill-due">{labels.englishOnly}</span>
        </p>
      ) : null}

      <BlockRenderer blocks={rest} locale={isEs ? 'es' : 'en'} hoistedAllergenId={hoisted?.id} />

      {/* Quiz: visible when manually attached OR when the procedure is part of
       *  training. Admin-only banner when authored but neither flag is on. */}
      {quiz && (quiz.attached || proc.attachedToTraining) ? (
        <QuizReader quiz={quiz} locale={isEs ? 'es' : 'en'} />
      ) : null}

      {isAdmin ? <DocControl entries={docControlEntries} /> : null}
    </article>
  );
}