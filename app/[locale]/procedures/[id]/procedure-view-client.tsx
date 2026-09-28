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
import { deleteProcedure, getProcedureBySlug, getQuizById, logRestrictedView, updateQuiz } from '@/lib/api';
import type { Employee, Procedure } from '@/lib/types';
import { withAs, type ViewAs } from '@/lib/view-as';
import { DocBar } from '@/components/doc';
import { ProcedureArticleBody } from '@/components/doc/procedure-article-body';
import { TabBar } from '@/components/employee/tab-bar';
import { recordRecentView } from '@/lib/recent-views';
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
    tabHome: string;
    tabProcedures: string;
    tabTraining: string;
    tabSoon: string;
    tabsNav: string;
  };
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

  // Remembered on this device, so the home can offer the way back to it.
  React.useEffect(() => {
    if (!proc) return;
    const blocks = proc.bodyEn.blocks.length ? proc.bodyEn.blocks : proc.bodyEs.blocks;
    const img = blocks.find((b) => b.kind === 'image' && b.src);
    recordRecentView({
      slug: proc.slug,
      titleEn: proc.titleEn,
      titleEs: proc.titleEs,
      cover: img && img.kind === 'image' ? img.src : undefined,
    });
    // Once per procedure opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proc?.id]);

  // A confidential or master recipe records who opened it, once per visit.
  const protectedId = proc && (proc.protection === 'confidential' || proc.protection === 'master') ? proc.id : null;
  React.useEffect(() => {
    if (protectedId && proc) logRestrictedView(proc, employee);
    // Once per procedure opened, not on every re-render of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protectedId, employee.id]);

  const handleAttach = React.useCallback(async () => {
    if (!proc || !proc.quizId) return;
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

  // Delete modal state — admin only (placed after router so the callback can use it)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = React.useCallback(async () => {
    if (!proc) return;
    setIsDeleting(true);
    try {
      await deleteProcedure(proc.id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('lms_procedures_updated'));
      }
      // Navigate away — the procedure no longer exists.
      router.push(`/${locale}/admin/library`);
      router.refresh();
    } catch {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  }, [proc, locale, router]);

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
          {/* The same words whether it was deleted or is not this person's to
              read: a restricted document must not be known to exist. In the
              reader's language, and without the URL's slug. */}
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-ink)]">
            {locale === 'es' ? 'Este procedimiento no está disponible' : 'This procedure isn’t available'}
          </h1>
          <p className="text-base text-[var(--color-ink-2)]">
            {locale === 'es'
              ? 'Puede que se haya quitado o movido. Pregunta a tu gerente si lo necesitas.'
              : 'It may have been removed or moved. Ask your manager if you need it.'}
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
  const bodyEsBlocks = proc.bodyEs?.blocks ?? [];
  const categoryLabel = proc.category
    ? isEs
      ? proc.category.nameEs || proc.category.nameEn
      : proc.category.nameEn || proc.category.nameEs
    : '';

  return (
    <div className={wrapperClass}>
      {/* The sticky DocBar carries the per-page chrome (back, where, more)
          for cooks reading on a phone. Inside the AdminShell the shell's own
          sticky top bar already serves as the surrounding chrome, so we
          swap the DocBar for an inline "back" link above the article —
          the same shape other admin detail pages use to climb back out to
          the list. */}
      {isAdmin ? (
        <div className="flex items-center justify-between gap-3 px-4 pt-6 sm:px-6">
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

      <ProcedureArticleBody
        proc={proc}
        employee={employee}
        effectiveRole={effectiveRole}
        locale={locale}
        onAttachQuiz={handleAttach}
        isAttaching={isAttaching}
        bannerDismissed={bannerDismissed}
        onDismissBanner={() => setBannerDismissed(true)}
      />

      {isAdmin ? null : (
        <TabBar
          locale={locale}
          active="procedures"
          labels={{
            home: labels.tabHome,
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
