import * as React from 'react';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ApiException, fetchMe, getProcedureBySlug } from '@/lib/api';
import type { Procedure, ProcedureBlock } from '@/lib/types';
import { BlockRenderer, findAllergen } from '@/components/doc/block-renderer';
import { Allergen, Cover, DocActs, DocBar, DocControl, DocHead, DocPurpose, Facts } from '@/components/doc';
import { DocBehaviour } from '@/components/doc/doc-behaviour';
import { TabBar } from '@/components/employee/tab-bar';

/**
 * A procedure, as it was designed in /sop-template.html and
 * /sop-recipe-format.html: the `.doc` sheet — bar, cover, icon over the crumb and
 * title, purpose, the facts readout, then the body — rather than a generic card
 * with a metadata grid on top.
 *
 * The page used to build its own header and a four-box "quick info" panel, which
 * is why it did not match the templates the design system documents. The parts
 * here are the same components the prototypes are made of, so a change to the
 * template lands on this page too.
 */

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export const dynamic = 'force-dynamic';

/** The first image is the cover; the body then renders without it, so the
 *  photograph does not appear twice. */
function splitCover(blocks: ProcedureBlock[]): { cover?: { src: string; alt: string }; rest: ProcedureBlock[] } {
  const i = blocks.findIndex((b) => b.kind === 'image' && b.src);
  if (i === -1) return { rest: blocks };
  const b = blocks[i] as Extract<ProcedureBlock, { kind: 'image' }>;
  return { cover: { src: b.src, alt: b.alt.en || b.alt.es }, rest: blocks.filter((_, n) => n !== i) };
}

export default async function ProcedurePage({ params }: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('employee.doc');

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let employee;
  try {
    const me = await fetchMe(cookieHeader);
    employee = me.employee;
  } catch (err) {
    if (err instanceof ApiException) redirect(`/${locale}/login`);
    throw err;
  }

  let proc: Procedure | null = null;
  try {
    const result = await getProcedureBySlug(id, cookieHeader);
    proc = result.procedure;
  } catch (err) {
    if (err instanceof ApiException && err.status === 404) notFound();
    throw err;
  }
  if (!proc) notFound();

  const isEs = locale === 'es';
  const title = isEs ? proc.titleEs || proc.titleEn : proc.titleEn || proc.titleEs;
  const purpose = isEs ? proc.purposeEs || proc.purposeEn : proc.purposeEn || proc.purposeEs;
  const chosen = isEs && proc.bodyEs.blocks.length > 0 ? proc.bodyEs : proc.bodyEn;
  const { cover, rest } = splitCover(chosen.blocks);
  // The recipe template puts the allergen banner between the title and the
  // purpose — the first thing read, before anything about the dish.
  const hoisted = findAllergen(rest);
  const allergen = hoisted?.allergen;

  const cat = proc.category;
  const categoryLabel = cat ? (isEs ? cat.nameEs || cat.nameEn : cat.nameEn || cat.nameEs) : t('uncategorised');
  // The head takes an icon name, because it renders inside a client component.
  const iconName = cat?.slug ? `category-${cat.slug}` : 'file-text';

  const updated = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(proc.updatedAt || proc.createdAt),
  );
  const languages = [proc.titleEn.trim() ? 'EN' : null, proc.bodyEs.blocks.length > 0 ? 'ES' : null]
    .filter(Boolean)
    .join(' · ');
  // Reading in Spanish, but only English exists: say so at the top rather than
  // letting a cook find out three steps in.
  const englishOnly = isEs && proc.bodyEs.blocks.length === 0;

  // White, edge to edge, like the templates: --bg is the reading plane and the
  // sheet is the same white. Standing the sheet on the bone ground gave the page
  // two backgrounds and, where they met, a line that reads as a border nobody
  // drew.
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-20">
      <article className="doc">
        <DocBehaviour />
        <DocBar backHref={`/${locale}/procedures`} backLabel={t('back')} title={title} category={categoryLabel} />

        {cover ? <Cover src={cover.src} alt={cover.alt} /> : null}

        <DocHead icon={iconName} category={categoryLabel} title={title} withCover={Boolean(cover)} />

        {/* .allergen carries its own inset, so it sits directly on the sheet. */}
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
            { icon: 'folder', label: t('factCategory'), value: categoryLabel },
            {
              icon: proc.status === 'published' ? 'check' : 'draft',
              label: t('factStatus'),
              value: proc.status === 'published' ? t('published') : t('draft'),
              kind: proc.status === 'published' ? 'ok' : 'default',
            },
            { icon: 'clock', label: t('factUpdated'), value: updated },
            { icon: 'languages', label: t('factLanguages'), value: languages || 'EN' },
          ]}
        />

        {englishOnly ? (
          <p className="doc-sec">
            <span className="pill pill-due">{t('englishOnly')}</span>
          </p>
        ) : null}

        <BlockRenderer blocks={rest} locale={isEs ? 'es' : 'en'} hoistedAllergenId={hoisted?.id} />

        <DocActs />

        <DocControl
          entries={[
            { label: t('ctlReference'), value: proc.slug },
            { label: t('ctlUpdated'), value: updated },
            { label: t('ctlStatus'), value: proc.status === 'published' ? t('published') : t('draft') },
            { label: t('ctlLanguages'), value: languages || 'EN' },
          ]}
        />
      </article>

      {employee.clearanceLevel === 'master' ? null : (
        <TabBar
          locale={locale}
          active="procedures"
          labels={{ ask: t('tabAsk'), procedures: t('tabProcedures'), training: t('tabTraining'), soon: t('tabSoon'), nav: t('tabsNav') }}
        />
      )}
    </div>
  );
}
