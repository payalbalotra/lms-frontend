'use client';

// Role-aware chrome: when the viewer is an admin the surrounding AdminShell
// (see /procedures/layout.tsx) already provides the sidebar + sticky top bar,
// so the page skips the employee `<TabBar>` and swaps the sticky `<DocBar>`
// for an inline "back" link above the article. Employees get the full DocBar
// and bottom TabBar unchanged.
//
// `effectiveRole` and `viewAs` come from the server: they reflect the
// `?as=` query-param override on top of the real session role, so both
// chomes can be demoed without changing the seed session. See lib/view-as.

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getProcedureBySlug, getQuizById, updateQuiz } from '@/lib/api';
import type { Employee, Procedure, ProcedureBlock } from '@/lib/types';
import { withAs, type ViewAs } from '@/lib/view-as';
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
  /** The role the page is rendering as — `?as=` override applied on top of
   *  the session role. Drives chrome (DocBar vs inline back) and back link. */
  effectiveRole: 'admin' | 'employee';
  /** The active view-as override, kept so the back link can carry it forward. */
  viewAs: ViewAs | null;
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
  effectiveRole,
  viewAs,
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
    if (!proc || !proc.quizId) return;
    const quiz = getQuizById(proc.quizId);
    if (!quiz || quiz.attached) return;
    setIsAttaching(true);
    try {
      // Flip the quiz's attached flag in the mock store. The read side
      // resolves `procedure.quizId` to its quiz row on every render, so
      // bumping the procedure's `updatedAt` here forces a re-render and
      // the new flag is picked up next tick. The backend will replace
      // this with a PATCH on `/api/admin/quizzes/:id`.
      await updateQuiz(proc.quizId, { attached: true });
      setProc({ ...proc, updatedAt: new Date().toISOString() });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('lms_procedures_updated'));
      }
    } finally {
      setIsAttaching(false);
    }
  }, [proc]);

  // Back navigation: when the user navigates *forward* to a procedure
  // (e.g. from a category detail page), the previous URL is in
  // `document.referrer`. Returning via `router.back()` preserves scroll
  // position and any in-flight filter state on the source page.
  // Deep links (new tab, shared URL) have no referrer — fall back to
  // the role-specific landing.
  const router = useRouter();
  const fallbackHref = withAs(
    effectiveRole === 'admin' ? `/${locale}/admin/library` : `/${locale}/procedures`,
    viewAs,
  );
  const [hasReferrer, setHasReferrer] = React.useState(false);
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const ref = document.referrer;
    if (!ref) return;
    try {
      const url = new URL(ref);
      // Same-origin only — a foreign referrer (search engine, share link
      // opened externally) should not hijack the back button.
      if (url.origin === window.location.origin) setHasReferrer(true);
    } catch {
      // Malformed referrer — leave hasReferrer false and use the fallback.
    }
  }, []);
  const onBack = React.useCallback(() => {
    router.back();
  }, [router]);
  const backHref = fallbackHref;

  // Admins come in through the AdminShell (see /procedures/layout.tsx) which
  // already supplies the surrounding chrome (sidebar + sticky top bar). They
  // do not need the employee `<TabBar>`; padding matches the shell's main
  // column so the doc sits flush rather than reserving space for a bar that
  // isn't there.
  //
  // The admin branch sits on the bone canvas (--bg-admin, the same ground the
  // AdminShell paints behind every admin page) so the white
  // <article className="doc"> has something to lift off of. The employee
  // branch keeps --bg because the phone shell already runs edge-to-edge
  // white and the doc fills the viewport.
  const isAdmin = effectiveRole === 'admin';
  const wrapperClass = isAdmin
    ? 'min-h-screen bg-[var(--color-bg-admin)]'
    : 'min-h-screen bg-[var(--color-bg)] pb-20';
  // Loading / 404 use the same canvas as the loaded page so they don't flash
  // white while the procedure resolves.
  const stageClass = isAdmin
    ? 'flex min-h-screen items-center justify-center bg-[var(--color-bg-admin)]'
    : 'flex min-h-screen items-center justify-center bg-[var(--color-bg)]';
  const notFoundClass = isAdmin
    ? 'flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg-admin)] p-6 text-center'
    : 'flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] p-6 text-center';

  if (isLoading) {
    return (
      <div className={stageClass}>
        <p className="text-sm font-medium text-[var(--color-ink-2)] animate-pulse">Loading procedure...</p>
      </div>
    );
  }

  if (notFoundState || !proc) {
    return (
      <div className={notFoundClass}>
        <div className="mx-auto max-w-card space-y-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-ink)]">
            404 — Procedure Not Found
          </h1>
          <p className="text-sm text-[var(--color-ink-2)]">
            The procedure <code className="font-mono">{slugOrId}</code> could not be found or may have been deleted.
          </p>
          <div className="pt-4">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-600)] px-5 py-3 text-sm font-semibold text-white shadow-e1 hover:bg-[var(--color-brand-hover)]"
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
  // mirrors the patched procedure so we don't re-fetch on click. The read
  // side resolves `procedure.quizId` to its quiz row via `getQuizById`
  // on every render (no inline quiz on the procedure shape any more).
  const quiz = proc.quizId ? getQuizById(proc.quizId) : null;
  const quizExists = Boolean(quiz && quiz.questions.length > 0);
  const quizVisible = Boolean(quiz && (quiz.attached || proc.attachedToTraining));
  const showAttachBanner = quizExists && !quizVisible && effectiveRole === 'admin';

  return (
    <div className={wrapperClass}>
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
        {/* The sticky DocBar carries the per-page chrome (back, where, more)
            for cooks reading on a phone. Inside the AdminShell the shell's own
            sticky top bar already serves as the surrounding chrome, so we
            swap the DocBar for an inline "back" link that sits above the
            article — the same shape other admin detail pages use to climb
            back out to the list. */}
        {isAdmin ? (
          <div className="px-4 pt-6 sm:px-6">
            <Link
              href={backHref}
              onClick={(e) => {
                if (hasReferrer) {
                  e.preventDefault();
                  onBack();
                }
              }}
              className="inline-flex min-h-tap-admin items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
            >
              <LuArrowLeft aria-hidden="true" />
              {labels.back}
            </Link>
          </div>
        ) : (
          <DocBar
            backHref={backHref}
            backLabel={labels.back}
            onBack={hasReferrer ? onBack : undefined}
            title={title || 'Untitled Procedure'}
            category={categoryLabel}
          />
        )}

        {cover ? <Cover src={cover.src} alt={cover.alt} /> : null}

        <DocHead
          icon={iconName}
          category={categoryLabel}
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
        {quiz && (quiz.attached || proc.attachedToTraining) ? (
          <QuizReader quiz={quiz} locale={isEs ? 'es' : 'en'} />
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

      {isAdmin ? null : (
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
