'use client';

import * as React from 'react';
import Link from 'next/link';
import { getProcedureBySlug } from '@/lib/api';
import type { Employee, Procedure, ProcedureBlock } from '@/lib/types';
import { BlockRenderer, findAllergen } from '@/components/doc/block-renderer';
import { QuizAttachBanner, QuizReader } from '@/components/doc/quiz-reader';
import { Allergen, Cover, DocActs, DocBar, DocControl, DocHead, DocPurpose, Facts } from '@/components/doc';
import { DocBehaviour } from '@/components/doc/doc-behaviour';
import { TabBar } from '@/components/employee/tab-bar';
import { LuArrowLeft } from 'react-icons/lu';

interface ProcedureViewClientProps {
  slugOrId: string;
  initialProcedure: Procedure | null;
  employee: Employee;
  locale: string;
  labels: {
    back: string;
    uncategorised: string;
    factCategory: string;
    factStatus: string;
    factUpdated: string;
    factLanguages: string;
    published: string;
    draft: string;
    englishOnly: string;
    ctlReference: string;
    ctlUpdated: string;
    ctlStatus: string;
    ctlLanguages: string;
    tabAsk: string;
    tabProcedures: string;
    tabTraining: string;
    tabSoon: string;
    tabsNav: string;
  };
}

function splitCover(blocks: ProcedureBlock[]): { cover?: { src: string; alt: string }; rest: ProcedureBlock[] } {
  const i = blocks.findIndex((b) => b.kind === 'image' && b.src);
  if (i === -1) return { rest: blocks };
  const b = blocks[i] as Extract<ProcedureBlock, { kind: 'image' }>;
  return { cover: { src: b.src, alt: b.alt?.en || b.alt?.es || '' }, rest: blocks.filter((_, n) => n !== i) };
}

export function ProcedureViewClient({
  slugOrId,
  initialProcedure,
  employee,
  locale,
  labels,
}: ProcedureViewClientProps): React.ReactElement {
  const [proc, setProc] = React.useState<Procedure | null>(initialProcedure);
  const [isLoading, setIsLoading] = React.useState(!initialProcedure);
  const [notFoundState, setNotFoundState] = React.useState(false);

  const [bannerDismissed, setBannerDismissed] = React.useState(false);
  const [isAttaching, setIsAttaching] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    async function loadProcedure() {
      try {
        const result = await getProcedureBySlug(slugOrId);
        if (isMounted && result.procedure) {
          setProc(result.procedure);
          setNotFoundState(false);
        }
      } catch {
        if (isMounted && !proc) {
          setNotFoundState(true);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (!proc) {
      loadProcedure();
    } else {
      setIsLoading(false);
    }
  }, [slugOrId, proc]);

  const handleAttach = React.useCallback(async () => {
    if (!proc || !proc.quiz) return;
    setIsAttaching(true);
    try {
      const next = { ...proc, quiz: { ...proc.quiz, attached: true } };
      setProc(next);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('lms_procedures_updated'));
      }
    } finally {
      setIsAttaching(false);
    }
  }, [proc]);

  const backHref = employee.role === 'admin' ? `/${locale}/admin/library` : `/${locale}/procedures`;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <p className="text-sm font-medium text-[var(--color-ink-2)] animate-pulse">Loading procedure...</p>
      </div>
    );
  }

  if (notFoundState || !proc) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] p-6 text-center">
        <div className="mx-auto max-w-md space-y-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-ink)]">
            404 — Procedure Not Found
          </h1>
          <p className="text-sm text-[var(--color-ink-2)]">
            The procedure <code className="font-mono">{slugOrId}</code> could not be found or may have been deleted.
          </p>
          <div className="pt-4">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-600)] px-5 py-2.5 text-sm font-semibold text-white shadow-e1 hover:bg-[var(--color-brand-700)]"
            >
              <LuArrowLeft aria-hidden="true" />
              {labels.back}
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
  const categoryLabel = cat ? (isEs ? cat.nameEs || cat.nameEn : cat.nameEn || cat.nameEs) : labels.uncategorised;
  const iconName = cat?.slug ? `category-${cat.slug}` : 'file-text';

  let updated = '—';
  try {
    const rawDate = proc.updatedAt || proc.createdAt;
    if (rawDate) {
      updated = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(rawDate),
      );
    }
  } catch {
    updated = '—';
  }

  const languages = [proc.titleEn?.trim() ? 'EN' : null, bodyEsBlocks.length > 0 ? 'ES' : null]
    .filter(Boolean)
    .join(' · ');
  const englishOnly = isEs && bodyEsBlocks.length === 0;

  // Quiz attach banner: shown to admins when the procedure has a quiz but
  // neither `quiz.attached` nor `attachedToTraining` is on. Local state
  // mirrors the patched procedure so we don't re-fetch on click.
  const quizExists = Boolean(proc.quiz && proc.quiz.questions.length > 0);
  const quizVisible = Boolean(proc.quiz && (proc.quiz.attached || proc.attachedToTraining));
  const showAttachBanner = quizExists && !quizVisible && employee.role === 'admin';

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-20">
      {showAttachBanner && !bannerDismissed ? (
        <div className="mx-auto w-full max-w-doc px-4 pt-6 sm:px-6">
          <QuizAttachBanner
            onAttach={handleAttach}
            onDismiss={() => setBannerDismissed(true)}
            isAttaching={isAttaching}
          />
        </div>
      ) : null}
      <article className="doc">
        <DocBehaviour />
        <DocBar backHref={backHref} backLabel={labels.back} title={title || 'Untitled Procedure'} category={categoryLabel} />

        {cover ? <Cover src={cover.src} alt={cover.alt} /> : null}

        <DocHead icon={iconName} category={categoryLabel} title={title || 'Untitled Procedure'} withCover={Boolean(cover)} />

        {allergen ? (
          <Allergen
            summary={allergen.summary}
            detail={allergen.detail}
            selectedAllergens={allergen.selectedAllergens}
            locale={isEs ? 'es' : 'en'}
          />
        ) : null}

        {purpose ? <DocPurpose>{purpose}</DocPurpose> : null}

        <Facts
          items={[
            { icon: 'folder', label: labels.factCategory, value: categoryLabel },
            {
              icon: proc.status === 'published' ? 'check' : 'draft',
              label: labels.factStatus,
              value: proc.status === 'published' ? labels.published : labels.draft,
              kind: proc.status === 'published' ? 'ok' : 'default',
            },
            { icon: 'clock', label: labels.factUpdated, value: updated },
            { icon: 'languages', label: labels.factLanguages, value: languages || 'EN' },
          ]}
        />

        {englishOnly ? (
          <p className="doc-sec">
            <span className="pill pill-due">{labels.englishOnly}</span>
          </p>
        ) : null}

        <BlockRenderer blocks={rest} locale={isEs ? 'es' : 'en'} hoistedAllergenId={hoisted?.id} />

        {/* Quiz: visible when manually attached OR when the procedure is part
         *  of training. Admin-only banner when authored but neither flag is on. */}
        {proc.quiz && (proc.quiz.attached || proc.attachedToTraining) ? (
          <QuizReader quiz={proc.quiz} locale={isEs ? 'es' : 'en'} />
        ) : null}

        <DocActs />

        <DocControl
          entries={[
            { label: labels.ctlReference, value: proc.slug },
            { label: labels.ctlUpdated, value: updated },
            { label: labels.ctlStatus, value: proc.status === 'published' ? labels.published : labels.draft },
            { label: labels.ctlLanguages, value: languages || 'EN' },
          ]}
        />
      </article>

      {employee.role === 'admin' ? null : (
        <TabBar
          locale={locale}
          active="procedures"
          labels={{
            ask: labels.tabAsk,
            procedures: labels.tabProcedures,
            training: labels.tabTraining,
            soon: labels.tabSoon,
            nav: labels.tabsNav,
          }}
        />
      )}
    </div>
  );
}
