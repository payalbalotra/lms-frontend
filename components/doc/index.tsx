'use client';

import * as React from 'react';
import { ALLERGEN_LABELS, type AllergenKey } from '@/lib/allergens';
import { LuArrowLeft, LuArrowLeftRight, LuBadgeCheck, LuCheck, LuChevronDown, LuChevronRight, LuCircleAlert, LuDownload, LuFocus, LuImage, LuLightbulb, LuLock, LuPlay, LuTestTube, LuTriangleAlert, LuUtensils, LuWrench, LuX } from 'react-icons/lu';
import { Icon, iconByName } from '@/components/ui/icon';
import type { IconType } from 'react-icons';

/**
 * The vocabulary of an SOP / recipe / training chapter page.
 *
 * Every component in this file maps 1:1 to a CSS class in /lms.css and a
 * pattern in /design-system.html. The lms.css class names are used directly
 * (via `clsx`-style merging) so that a static HTML SOP and a React SOP render
 * to the same pixels.
 *
 * Authoritative reference: /DESIGN.md at the repo root.
 */

const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');

/* ----------------------------------------------------------------
   Page chrome
   ---------------------------------------------------------------- */

/** Persistent bar: back, where, more. Sticks to the top. */
export function DocBar({
  backHref,
  backLabel,
  title,
  category,
  onBack,
  action,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  category: string;
  /** When provided, the back control calls this instead of following
   *  `backHref`. Used to wire `router.back()` so deep-linked procedures
   *  (e.g. opened from a category detail page) return to the previous
   *  page rather than a hard-coded landing. */
  onBack?: () => void;
  /** The one thing to do with the page, on the bar's right: printing it for
   *  the station. It replaced a "More options" button that opened nothing. */
  action?: { label: string; icon: IconType; onClick: () => void };
}) {
  return (
    <div className="doc-bar" id="bar">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="btn btn-ghost btn-icon btn-lg"
        >
          <LuArrowLeft aria-hidden="true" className="i" />
        </button>
      ) : (
        <a
          className="btn btn-ghost btn-icon btn-lg"
          href={backHref}
          aria-label={backLabel}
        >
          <LuArrowLeft aria-hidden="true" className="i" />
        </a>
      )}
      <div className="where">
        <b>{title}</b>
        <span>{category}</span>
      </div>
      {action ? (
        <button type="button" className="btn btn-ghost btn-lg" onClick={action.onClick}>
          <action.icon aria-hidden="true" className="i" />
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------
   Header
   ---------------------------------------------------------------- */

/** 168 px banner above the page, 16:9 cropped. No text on the image. */
export function Cover({ src, alt }: { src?: string; alt?: string }) {
  if (!src) {
    return (
      <div className="cover is-empty">
        <div>
          <LuImage aria-hidden="true" className="i" />
          <div>No cover image</div>
        </div>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <div className="cover"><img src={src} alt={alt ?? ''} width={1600} height={900} /></div>;
}

/** Page icon (straddles the cover) + crumb + title. */
export function DocHead({
  icon,
  category,
  title,
  withCover = true,
}: {
  /** Icon name, not the component: this crosses the server/client boundary.
   *  Absent, no tile: without a photo it was a large empty square above the
   *  title that said nothing the category line does not. */
  icon?: string;
  category: string;
  title: React.ReactNode;
  withCover?: boolean;
}) {
  return (
    <header className={icon ? 'doc-head' : 'doc-head pt-6'}>
      {icon ? (
        <div className="doc-icon">
          <Icon icon={iconByName(icon)} className="i" />
        </div>
      ) : null}
      <div className="doc-crumb">{category}</div>
      <h1 className="doc-title display">{title}</h1>
      {!withCover && <div className="qr print-only"><span className="code">QR</span></div>}
    </header>
  );
}

/** Recipes only. Sits above everything — must not be scrolled past. */
export function Allergen({
  summary,
  detail,
  selectedAllergens,
  locale,
}: {
  summary: string;
  detail: React.ReactNode;
  /** Structured FDA Big-9 list — rendered as chips above the summary when
   *  present. `detail`/`summary` stay as supplementary free-form copy. */
  selectedAllergens?: readonly string[];
  locale: 'en' | 'es';
}) {
  return (
    <div className="allergen" role="note">
      <LuCircleAlert aria-hidden="true" className="i i-lg" />
      <div className="allergen-body">
        {selectedAllergens && selectedAllergens.length > 0 && (
          <ul className="allergen-chips" aria-label="Contains allergens">
            {selectedAllergens.map((key) => {
              const entry = ALLERGEN_LABELS[key as AllergenKey];
              return (
                <li key={key} className="allergen-chip">
                  {entry ? entry[locale] : key}
                </li>
              );
            })}
          </ul>
        )}
        <b>{summary}</b>
        <p>{detail}</p>
      </div>
    </div>
  );
}

/** One sentence: why this document exists. */
export function DocPurpose({ children }: { children: React.ReactNode }) {
  return <p className="doc-purpose">{children}</p>;
}

/* ----------------------------------------------------------------
   Readouts: facts + yield
   ---------------------------------------------------------------- */

export type FactKind = 'default' | 'ok';
export type Fact = {
  /** Icon name, not the component: this crosses the server/client boundary. */
  icon: string;
  label: string;
  value: React.ReactNode;
  kind?: FactKind;
};

/** Where / who / whether current. 2 cols on phone, 4 on >=600px. */
export function Facts({ items }: { items: Fact[] }) {
  return (
    <dl className="facts">
      {items.map((f, i) => (
        <div key={i} className={f.kind === 'ok' ? 'ok' : undefined}>
          <dt>
            <Icon icon={iconByName(f.icon)} className="i i-sm" />
            {f.label}
          </dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export type YieldItem = { label: string; value: React.ReactNode };

/** Same component, larger numbers because one holds figures. */
export function Yield({ items }: { items: YieldItem[] }) {
  return (
    <dl className="yield">
      {items.map((y, i) => (
        <div key={i}>
          <dt>{y.label}</dt>
          <dd>{y.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ----------------------------------------------------------------
   Section
   ---------------------------------------------------------------- */

export function Section({
  title,
  count,
  id,
  children,
}: {
  /** Omitted for a run of blocks that arrived before the document's first
   *  heading: the section still supplies the page's left margin. */
  title?: string;
  /** Optional count, e.g. "· 11 steps". */
  count?: React.ReactNode;
  /** Optional DOM id (used for in-page anchors like #related). */
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="doc-sec" id={id}>
      {title ? (
        <h2>
          {title}
          {count && <span className="count">{' · '}{count}</span>}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------
   Triggers + Equipment + Records (prose blocks)
   ---------------------------------------------------------------- */

export function Triggers({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="triggers">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export function FixList({
  items,
}: {
  items: { failure: React.ReactNode; response: React.ReactNode }[];
}) {
  return (
    <dl className="fix">
      {items.map((it, i) => (
        <div key={i}>
          <dt>
            <LuCircleAlert aria-hidden="true" className="i" />
            {it.failure}
          </dt>
          <dd>{it.response}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ----------------------------------------------------------------
   Typed step notes
   ---------------------------------------------------------------- */

export type NoteKind = 'warn' | 'tip' | 'alt' | 'equip' | 'allergen';

const NOTE_META: Record<NoteKind, { icon: IconType; label: string }> = {
  warn:     { icon: LuTriangleAlert,           label: 'Warning' },
  tip:      { icon: LuLightbulb,       label: 'Tip' },
  alt:      { icon: LuArrowLeftRight, label: 'Alternative' },
  equip:    { icon: LuWrench,           label: 'Equipment' },
  allergen: { icon: LuCircleAlert,   label: 'Allergen' },
};

export function NoteBlock({
  kind,
  children,
  label,
}: {
  kind: NoteKind;
  children: React.ReactNode;
  /** Optional override of the kind's default label. */
  label?: string;
}) {
  // A kind this build does not know about is still a note with something to say.
  const meta = NOTE_META[kind] ?? NOTE_META.warn;
  return (
    <div className={cn('note-block', `n-${kind}`)}>
      <span className="ico">
        <Icon icon={meta.icon} className="i" />
      </span>
      <div>
        <span className="label">{label ?? meta.label}</span>
        <p>{children}</p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
   Steps (method) + Prerequisite steps
   ---------------------------------------------------------------- */

export type MethodStep = {
  /** Body — the instruction itself. May include a `.shot` or a `.note-block`. */
  body: React.ReactNode;
  /** Critical control point. Marks the disc red and adds the badge. */
  critical?: boolean;
  /** Watch timestamp chip, e.g. "0:12". */
  watchAt?: string;
  /** Pinned video clip with start/end timestamps. Renders as a watch chip
   *  linking to the source in a new tab. */
  clip?: { src: string; startSec: number; endSec: number };
};

function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function MethodSteps({ steps, nowIndex }: { steps: MethodStep[]; nowIndex?: number }) {
  return (
    <ol className="steps">
      {steps.map((s, i) => {
        const classes = cn('step', s.critical && 'is-crit', nowIndex === i && 'is-now');
        return (
          <li key={i} className={classes || undefined}>
            <div className="step-num" />
            <div className="step-body">
              {s.critical && (
                <span className="step-flag">
                  <LuFocus aria-hidden="true" className="i i-sm" /> Critical step
                </span>
              )}
              {/* A caller can hand over either a plain sentence or its own markup.
                  Wrapping the second kind in a <p> nested a paragraph inside a
                  paragraph, which the browser un-nests — so the server and the
                  client disagreed and every document page logged a hydration error. */}
              {typeof s.body === 'string' ? <p>{s.body}</p> : s.body}
              {s.watchAt && (
                <button className="step-time">
                  <LuPlay aria-hidden="true" className="i i-sm" /> Watch · {s.watchAt}
                </button>
              )}
              {s.clip && (
                <a
                  className="step-time"
                  href={s.clip.src}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LuPlay aria-hidden="true" className="i i-sm" /> Watch · {fmtClock(s.clip.startSec)}–{fmtClock(s.clip.endSec)}
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export type PrepStep = { id: string; label: React.ReactNode; done?: boolean };

export function PrepSteps({ steps }: { steps: PrepStep[] }) {
  return (
    <ul className="steps prep">
      {steps.map((s) => (
        <li key={s.id} className="step">
          <input type="checkbox" className="tick" id={s.id} defaultChecked={s.done} />
          <div className="step-body">
            <label htmlFor={s.id}>{s.label}</label>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------------------------------------------
   Critical limit
   ---------------------------------------------------------------- */

export function CriticalLimit({
  icon,
  label = 'Critical limit',
  value,
  subtitle,
  howToCheck,
  breach,
}: {
  icon?: string;
  label?: string;
  /** The number, in ink. e.g. "200 ppm, for at least 30 seconds" */
  value: React.ReactNode;
  /** The sentence below it. e.g. "Confirm against the bottle label" */
  subtitle?: React.ReactNode;
  /** "Dip a test strip…", "Probe the centre…" */
  howToCheck: React.ReactNode;
  /** "If it reads below 200 ppm", "If it is above 4 °C" */
  breach: React.ReactNode;
}) {
  return (
    <div className="crit">
      <h3 className="crit-h">
        <Icon icon={iconByName(icon)} className="i i-sm" /> {label}
      </h3>
      <div className="crit-b">
        <p className="crit-num">{value}</p>
        {subtitle && <p className="crit-sub">{subtitle}</p>}
        <dl className="crit-parts">
          <div className="crit-part">
            <dt className="crit-lbl">How to check</dt>
            <dd>{howToCheck}</dd>
          </div>
          <div className="crit-part breach">
            <dt className="crit-lbl">
              <LuCircleAlert aria-hidden="true" className="i i-sm" />
              {breach}
            </dt>
            <dd>{/* content is rendered by parent via a custom breach block */}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/** CriticalLimit with full breach body. */
export function CriticalLimitFull({
  icon,
  label,
  value,
  subtitle,
  howToCheck,
  breachLabel,
  breachResponse,
}: {
  icon?: string;
  label?: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  howToCheck: React.ReactNode;
  breachLabel: React.ReactNode;
  breachResponse: React.ReactNode;
}) {
  return (
    <div className="crit">
      <h3 className="crit-h">
        <Icon icon={iconByName(icon)} className="i i-sm" /> {label ?? 'Critical limit'}
      </h3>
      <div className="crit-b">
        <p className="crit-num">{value}</p>
        {subtitle && <p className="crit-sub">{subtitle}</p>}
        <dl className="crit-parts">
          <div className="crit-part">
            <dt className="crit-lbl">How to check</dt>
            <dd>{howToCheck}</dd>
          </div>
          <div className="crit-part breach">
            <dt className="crit-lbl">
              <LuCircleAlert aria-hidden="true" className="i i-sm" />
              {breachLabel}
            </dt>
            <dd>{breachResponse}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
   Photographs
   ---------------------------------------------------------------- */

export function Shot({
  src,
  alt,
  caption,
  width = 1200,
  height = 900,
}: {
  src: string;
  alt: string;
  caption?: React.ReactNode;
  width?: number;
  height?: number;
}) {
  return (
    <figure className="shot">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={width} height={height} loading="lazy" />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export function VideoCover({
  src,
  alt,
  duration,
  caption,
  label,
}: {
  src: string;
  alt: string;
  duration: string;
  caption?: React.ReactNode;
  label: string;
}) {
  return (
    <figure className="shot video">
      <div className="media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={1200} height={900} loading="lazy" />
        <button className="play" aria-label={label}>
          <LuPlay aria-hidden="true" className="i i-lg" />
        </button>
        <span className="dur">{duration}</span>
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export function Compare({
  correct,
  incorrect,
}: {
  correct: { src: string; alt: string };
  incorrect: { src: string; alt: string };
}) {
  return (
    <div className="compare">
      <figure className="ok">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={correct.src} alt={correct.alt} width={1200} height={900} loading="lazy" />
        <figcaption>
          <LuCheck aria-hidden="true" className="i i-sm" /> Correct
        </figcaption>
      </figure>
      <figure className="no">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={incorrect.src} alt={incorrect.alt} width={1200} height={900} loading="lazy" />
        <figcaption>
          <LuX aria-hidden="true" className="i i-sm" /> Over-mashed
        </figcaption>
      </figure>
    </div>
  );
}

/* ----------------------------------------------------------------
   Scaler + Ingredients (recipes only)
   ---------------------------------------------------------------- */

/**
 * Arrow keys move between the seats, which is what a radiogroup promises. With a
 * roving tabindex and no key handler, Tab landed on the selected factor and there
 * was no way to reach the others at all.
 */
export function Scaler({
  factors,
  selected,
  onSelect,
  label = 'Batch',
}: {
  factors: number[];
  selected: number;
  onSelect?: (factor: number) => void;
  label?: string;
}) {
  // A document can carry two recipes, and two "batch-lbl" ids would send both
  // groups' aria-labelledby to the first label.
  const labelId = React.useId();
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const i = factors.indexOf(selected);
    const at =
      e.key === 'Home' ? 0
      : e.key === 'End' ? factors.length - 1
      : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % factors.length
      : (i - 1 + factors.length) % factors.length;
    const next = factors[at];
    if (next === undefined) return;
    onSelect?.(next);
    const group = e.currentTarget;
    (group.children[at] as HTMLElement | undefined)?.focus();
  };

  return (
    <div className="scaler">
      <span className="lbl" id={labelId}>{label}</span>
      <div className="choices" role="radiogroup" aria-labelledby={labelId} onKeyDown={onKeyDown}>
        {factors.map((f) => {
          const checked = f === selected;
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onSelect?.(f)}
            >
              {f}×
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type Ingredient = {
  name: React.ReactNode;
  /** Optional preparation spec shown under the name. e.g. "Small dice, 5 mm" */
  form?: string;
  /** Allergen flag. */
  allergen?: boolean;
  /** Pre-computed amounts for each factor in the scaler. e.g. ["200 g", "400 g"] */
  amounts: string[];
};

export function IngredientsTable({
  ingredients,
  factors,
  selectedFactor,
}: {
  ingredients: Ingredient[];
  factors: number[];
  selectedFactor: number;
}) {
  // Two columns, as in the template: the base batch, and the one that was picked.
  // Every factor at once is a spreadsheet, and a cook reads one number.
  const baseIndex = 0;
  const selectedIndex = factors.indexOf(selectedFactor);
  const isBase = selectedIndex <= baseIndex;
  const columns = isBase ? [baseIndex] : [baseIndex, selectedIndex];

  return (
    <table className={cn('ing', isBase && 'is-base')}>
      <caption className="vh">Ingredients at the base batch and at the selected batch size</caption>
      <thead>
        <tr>
          <th scope="col">Ingredient</th>
          {columns.map((i) => (
            <th key={factors[i]} scope="col" className={cn('num', i === selectedIndex && !isBase && 'adj')}>
              {factors[i]}×
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ingredients.map((ing, i) => (
          <tr key={i}>
            <th scope="row">
              {ing.name}
              {ing.form && <span className="form">{ing.form}</span>}
              {ing.allergen && (
                <span className="flag">
                  <LuCircleAlert aria-hidden="true" className="i i-sm" /> Allergen
                </span>
              )}
            </th>
            {columns.map((j) => (
              <td key={factors[j]} className={cn('num', j === selectedIndex && !isBase && 'adj')}>
                {ing.amounts[j] ?? ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ----------------------------------------------------------------
   Chapters: attachments + related
   ---------------------------------------------------------------- */

export type ChapterRow = {
  icon: IconType;        // remix icon class
  title: string;
  meta?: React.ReactNode;
  href: string;
  /** "download" for attachments, "chevron" for related procedures. */
  kind: 'attachment' | 'related';
};

export function Chapters({ rows }: { rows: ChapterRow[] }) {
  return (
    <div className="chapters">
      {rows.map((r, i) => (
        <a key={i} className="chapter" href={r.href}>
          <span className="idx">
            <Icon icon={r.icon} className="i i-sm" />
          </span>
          <div>
            <div className="title">{r.title}</div>
            {r.meta && <div className="meta">{r.meta}</div>}
          </div>
          <span className="tail">
            <Icon icon={r.kind === 'attachment' ? LuDownload : LuChevronRight} className="i" />
          </span>
        </a>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------
   Foot of every document
   ---------------------------------------------------------------- */

/** The Print with QR code action was removed: stations print from the wall
 *  display, not from a procedure-detail page, and the footer now carries
 *  a single low-prominence "Report a problem" surface. The neutral panel
 *  background (rather than ghost) gives it just enough weight to be a
 *  recognised target on employee phones without competing with the
 *  surrounding doc chrome. */
export type DocControlEntry = { label: string; value: React.ReactNode };

/** Document control <details>. Ships open by default — survives without JS. */
export function DocControl({ entries, defaultOpen = true }: { entries: DocControlEntry[]; defaultOpen?: boolean }) {
  return (
    <details className="doc-ctl" open={defaultOpen}>
      <summary>
        Document control <LuChevronDown aria-hidden="true" className="i" />
      </summary>
      <dl>
        {entries.map((e, i) => (
          <React.Fragment key={i}>
            <dt>{e.label}</dt>
            <dd>{e.value}</dd>
          </React.Fragment>
        ))}
      </dl>
    </details>
  );
}

/* ----------------------------------------------------------------
   Status badges
   ---------------------------------------------------------------- */

const PILL_META = {
  complete:  { icon: LuCheck, useDot: false },
  verified:  { icon: LuBadgeCheck, useDot: false },
  progress:  { icon: null, useDot: true },
  due:       { icon: null, useDot: true },
  overdue:   { icon: null, useDot: true },
  notstart:  { icon: null, useDot: true },
  locked:    { icon: LuLock, useDot: false },
} as const;

export type PillKind = keyof typeof PILL_META;

export function Pill({ kind, children }: { kind: PillKind; children: React.ReactNode }) {
  const meta = PILL_META[kind];
  return (
    <span className={cn('pill', `pill-${kind}`)}>
      {meta.useDot ? (
        <i className="dot" aria-hidden="true" />
      ) : (
        <Icon icon={meta.icon!} className="i i-sm" />
      )}
      {children}
    </span>
  );
}