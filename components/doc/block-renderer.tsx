import * as React from 'react';
import type {
  Localised,
  LocalisedOptional,
  ProcedureBlock,
  ProcedureMethodStep,
  ProcedureNoteKind,
} from '@/lib/types';
import { classifyVideoUrl } from '@/lib/procedure-media';
import {
  Allergen,
  CriticalLimitFull,
  MethodSteps,
  NoteBlock,
  Section,
  Shot,
  Triggers,
  type MethodStep,
  type ChapterRow,
} from './index';
import { LuCheck, LuCircle, LuDownload, LuFileText } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import { RecipeBody } from './recipe-body';
import { cn } from '@/lib/utils';

/**
 * The block stream, laid out as the templates in /sop-template.html and
 * /sop-recipe-format.html lay a document out.
 *
 * Those templates are not a wall of blocks: they are a run of
 * `<section class="doc-sec">`, each with one h2 and the paragraphs, lists, photos
 * and notes that belong under it. The API sends a flat list, so this groups it —
 * a heading opens a section, everything after it falls inside — which is what
 * gives the page its left margin, its section rhythm, and callouts that sit
 * inside the text column instead of running the full width of the sheet.
 *
 * Everything below uses the document's own classes (.triggers, .shot, .ing,
 * .note-block). No Tailwind is added here: a change to the template's CSS has to
 * land on this page too, and it cannot if the page has restyled it.
 */

const NOTE_KINDS: ProcedureNoteKind[] = ['warn', 'tip', 'alt', 'equip', 'allergen'];

const LABELS = {
  en: { yieldTitle: 'Yield', method: 'Method', steps: (n: number) => `${n} steps`, batch: 'Batch', attachments: 'Attachments' },
  es: { yieldTitle: 'Rendimiento', method: 'Método', steps: (n: number) => `${n} pasos`, batch: 'Lote', attachments: 'Archivos adjuntos' },
} as const;

function pickText(value: Localised, locale: 'en' | 'es'): string {
  return value[locale];
}
function pickOpt(value: LocalisedOptional | undefined, locale: 'en' | 'es'): string | undefined {
  if (!value) return undefined;
  const v = value[locale];
  return v && v.length > 0 ? v : undefined;
}

function toMethodStep(step: ProcedureMethodStep, locale: 'en' | 'es'): MethodStep {
  const out: MethodStep = {
    body: <p>{pickText(step.body, locale)}</p>,
    critical: step.critical,
  };
  if (step.criticalLimit) {
    const l = step.criticalLimit;
    out.body = (
      <>
        <p>{pickText(step.body, locale)}</p>
        <CriticalLimitFull
          icon={l.icon}
          label={l.label}
          value={l.value}
          subtitle={l.subtitle}
          howToCheck={l.howToCheck}
          breachLabel={l.breachLabel}
          breachResponse={l.breachResponse}
        />
      </>
    );
  }
  if (step.videoSegment) {
    out.clip = step.videoSegment;
  }
  return out;
}

/** The allergen banner belongs under the title, above the purpose — see the
 *  recipe template. The page renders the first one there; the id comes back with
 *  it so only that block's banner is skipped below. A document with a sauce and
 *  its base has two recipe blocks and two sets of allergens, and the second one
 *  is not less dangerous for being second. */
export function findAllergen(
  blocks: ProcedureBlock[],
): { id: string; allergen: { summary: string; detail: string; selectedAllergens?: readonly string[] } } | null {
  for (const [i, b] of blocks.entries()) {
    if (b.kind === 'recipe' && b.allergen) return { id: b.id ?? String(i), allergen: b.allergen };
  }
  return null;
}

export function BlockRenderer({
  blocks,
  locale,
  hoistedAllergenId,
}: {
  blocks: ProcedureBlock[];
  locale: 'en' | 'es';
  /** The block whose allergen banner the page has already rendered at the head. */
  hoistedAllergenId?: string;
}): React.ReactElement {
  const t = LABELS[locale];
  const attachmentRows: ChapterRow[] = [];
  const out: React.ReactNode[] = [];

  // The section being filled. A heading opens one; a method or a recipe closes it,
  // because those bring their own heading with them.
  let open: { key: string; title?: string; nodes: React.ReactNode[] } | null = null;

  const flush = (): void => {
    if (!open) return;
    if (open.title || open.nodes.length > 0) {
      out.push(
        <Section key={open.key} title={open.title}>
          {open.nodes}
        </Section>,
      );
    }
    open = null;
  };
  const add = (key: string, node: React.ReactNode): void => {
    if (!open) open = { key: `sec-${key}`, nodes: [] };
    open.nodes.push(<React.Fragment key={key}>{node}</React.Fragment>);
  };

  blocks.forEach((block, i) => {
    const key = block.id ?? String(i);
    switch (block.kind) {
      case 'heading': {
        const text = pickText(block.text, locale);
        // h1 and h2 are the document's sections; anything deeper is a subheading
        // inside the section that is already open. Deeper-but-first opens a
        // section anyway: an h3 with no h2 above it is a hole in the outline, and
        // the fix belongs here rather than in every document that has one.
        if (block.level >= 3 && open && open.title) {
          add(key, <h3>{text}</h3>);
          return;
        }
        flush();
        open = { key: `sec-${key}`, title: text, nodes: [] };
        return;
      }
      case 'text': {
        // A body written as one line per item is a list — the template's
        // .triggers, a row of dot-marked lines, not a paragraph of sentences.
        const body = pickText(block.body, locale);
        const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
        add(key, lines.length > 1 ? <Triggers items={lines} /> : <p>{body}</p>);
        return;
      }
      case 'warning': {
        // A severity this build does not know about still has something to say,
        // so it is shown as a warning rather than thrown at the reader as a 500.
        const kind: ProcedureNoteKind = NOTE_KINDS.includes(block.severity as ProcedureNoteKind)
          ? (block.severity as ProcedureNoteKind)
          : 'warn';
        add(key, <NoteBlock kind={kind}>{pickText(block.body, locale)}</NoteBlock>);
        return;
      }
      case 'image': {
        add(key, <Shot src={block.src} alt={pickText(block.alt, locale)} caption={pickOpt(block.caption, locale)} />);
        return;
      }
      case 'video': {
        const caption = pickOpt(block.caption, locale);
        const videoClass = classifyVideoUrl(block.src);
        add(
          key,
          <figure className="shot">
            {videoClass.provider === 'file' ? (
              <video controls src={block.src} />
            ) : videoClass.embedUrl ? (
              <iframe
                src={videoClass.embedUrl}
                title={caption ?? 'video'}
                className="aspect-video w-full rounded-[var(--radius-md)]"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            ) : null}
            {caption ? <figcaption>{caption}</figcaption> : null}
          </figure>,
        );
        return;
      }
      case 'table': {
        // The recipe's ingredient table frame, with prose cells: same document,
        // same table, but these cells are sentences rather than quantities.
        add(
          key,
          <table className="dtable">
            <thead>
              <tr>
                {block.headers.map((h, j) => (
                  <th key={j} scope="col">
                    {pickText(h, locale)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, j) => (
                    <td key={j}>{pickText(cell, locale)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>,
        );
        return;
      }
      case 'attachment': {
        attachmentRows.push({
          icon: LuFileText,
          title: pickText(block.title, locale),
          meta: block.meta,
          href: block.href,
          kind: 'attachment',
        });
        return;
      }
      case 'method': {
        flush();
        const steps = block.steps.map((s) => toMethodStep(s, locale));
        out.push(
          <Section key={key} title={t.method} count={t.steps(steps.length)}>
            <MethodSteps steps={steps} />
          </Section>,
        );
        return;
      }
      case 'recipe': {
        flush();
        const steps = block.steps.map((s) => toMethodStep(s, locale));
        out.push(
          <React.Fragment key={key}>
            {block.allergen && key !== hoistedAllergenId ? (
              <Allergen
                summary={block.allergen.summary}
                detail={block.allergen.detail}
                selectedAllergens={block.allergen.selectedAllergens}
                locale={locale}
              />
            ) : null}
            <RecipeBody
              factors={block.factors ?? []}
              yieldItems={block.yieldItems ?? []}
              ingredients={(block.ingredients ?? []).map((ing) => ({
                name: ing.name,
                form: ing.form,
                allergen: ing.allergen,
                amounts: ing.amounts,
              }))}
              steps={steps}
              batchLabel={t.batch}
              yieldTitle={t.yieldTitle}
              methodTitle={t.method}
              stepsCount={t.steps(steps.length)}
            />
          </React.Fragment>,
        );
        return;
      }
      case 'checklist': {
        const heading = pickOpt(block.title, locale);
        add(
          key,
          <ChecklistBlock blockId={block.id} title={heading} items={block.items} locale={locale} />,
        );
        return;
      }
    }
  });
  flush();

  return (
    <>
      {out}
      {attachmentRows.length > 0 && (
        <Section title={t.attachments}>
          <div className="chapters">
            {attachmentRows.map((r, i) => (
              <a key={i} className="chapter" href={r.href}>
                <span className="idx">
                  <Icon icon={r.icon} className="i i-sm" />
                </span>
                <div>
                  <div className="title">{r.title}</div>
                  {r.meta && <div className="meta">{r.meta}</div>}
                </div>
                <span className="tail">
                  <LuDownload aria-hidden="true" className="i" />
                </span>
              </a>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

/** Interactive checklist rendered on the procedure detail page.
 *  Employees tap to tick items off as they work; the box fills with ok-green
 *  and the label strikes through. State is per-block so two checklists on
 *  the same page don't bleed into each other. */
function ChecklistBlock({
  blockId,
  title,
  items,
  locale,
}: {
  blockId: string;
  title: string | undefined;
  items: { id: string; text: Localised }[];
  locale: 'en' | 'es';
}): React.ReactElement {
  const [picked, setPicked] = React.useState<Record<string, boolean>>({});

  const toggle = (itemId: string): void => {
    setPicked((p) => ({ ...p, [itemId]: !p[itemId] }));
  };

  const done = items.reduce((n, it) => (picked[it.id] ? n + 1 : n), 0);
  const displayTitle = title?.trim() || (locale === 'es' ? 'Lista de verificación' : 'Checklist');

  return (
    <div className="checklist-block space-y-3 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 shadow-e1">
      <div className="flex items-center justify-between">
        <h3 className="checklist-title text-base font-bold text-[var(--color-ink)]">{displayTitle}</h3>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-wash)] text-[var(--color-ink-2)]">
          {done}/{items.length}
        </span>
      </div>
      <ul className="checklist space-y-2" role="list">
        {items.map((it, i) => {
          const checked = !!picked[it.id];
          const label = it.text[locale] || it.text.en || it.text.es;
          return (
            <li key={it.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(it.id)}
                className={cn(
                  'checklist-row group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
                  checked ? 'checklist-row--done bg-[var(--color-ok-tint)]/40' : 'hover:bg-[var(--color-wash)]',
                )}
              >
                <span
                  className={cn(
                    'checklist-box flex size-5 shrink-0 items-center justify-center rounded border transition-colors',
                    checked
                      ? 'checklist-box--on border-[var(--color-ok)] bg-[var(--color-ok)] text-white'
                      : 'checklist-box--off border-[var(--color-line-2)] bg-[var(--color-surface)] text-transparent group-hover:border-[var(--color-ink-3)]',
                  )}
                  aria-hidden="true"
                >
                  <LuCheck className="size-3.5 stroke-[3]" />
                </span>
                <span className="checklist-num text-xs font-mono text-[var(--color-ink-3)]" aria-hidden="true">{i + 1}</span>
                <span
                  className={cn(
                    'checklist-text flex-1 text-sm font-medium transition-colors',
                    checked ? 'text-[var(--color-ink-3)] line-through' : 'text-[var(--color-ink)]',
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="checklist-progress text-xs text-[var(--color-ink-3)] font-medium pt-1">
        {locale === 'es' ? 'Marca cada elemento al completarlo.' : 'Check each item as you complete it.'}
      </p>
    </div>
  );
}
