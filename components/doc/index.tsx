import * as React from 'react';

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
}: {
  backHref: string;
  backLabel: string;
  title: string;
  category: string;
}) {
  return (
    <div className="doc-bar" id="bar">
      <a
        className="btn btn-ghost btn-icon btn-lg"
        href={backHref}
        aria-label={backLabel}
      >
        <i className="ri-arrow-left-line i" aria-hidden="true" />
      </a>
      <div className="where">
        <b>{title}</b>
        <span>{category}</span>
      </div>
      <button className="btn btn-ghost btn-icon btn-lg" aria-label="More options">
        <i className="ri-more-2-fill i" aria-hidden="true" />
      </button>
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
          <i className="ri-image-line i" aria-hidden="true" />
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
  icon: string; // remix icon class, e.g. "ri-restaurant-line"
  category: string;
  title: React.ReactNode;
  withCover?: boolean;
}) {
  return (
    <header className="doc-head">
      <div className="doc-icon">
        <i className={cn(icon, 'i')} aria-hidden="true" />
      </div>
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
}: {
  summary: string;
  detail: React.ReactNode;
}) {
  return (
    <div className="allergen" role="note">
      <i className="ri-error-warning-fill i i-lg" aria-hidden="true" />
      <div>
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
  icon: string; // remix icon class
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
            <i className={cn(f.icon, 'i i-sm')} aria-hidden="true" />
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
  title: string;
  /** Optional count, e.g. "· 11 steps". */
  count?: React.ReactNode;
  /** Optional DOM id (used for in-page anchors like #related). */
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="doc-sec" id={id}>
      <h2>
        {title}
        {count && <span className="count">{' · '}{count}</span>}
      </h2>
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
            <i className="ri-error-warning-line i" aria-hidden="true" />
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

const NOTE_META: Record<NoteKind, { icon: string; label: string }> = {
  warn:     { icon: 'ri-alert-line',           label: 'Warning' },
  tip:      { icon: 'ri-lightbulb-line',       label: 'Tip' },
  alt:      { icon: 'ri-arrow-left-right-line', label: 'Alternative' },
  equip:    { icon: 'ri-tools-line',           label: 'Equipment' },
  allergen: { icon: 'ri-error-warning-fill',   label: 'Allergen' },
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
  const meta = NOTE_META[kind];
  return (
    <div className={cn('note-block', `n-${kind}`)}>
      <span className="ico">
        <i className={cn(meta.icon, 'i')} aria-hidden="true" />
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
};

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
                  <i className="ri-focus-3-line i i-sm" aria-hidden="true" /> Critical step
                </span>
              )}
              <p>{s.body}</p>
              {s.watchAt && (
                <button className="step-time">
                  <i className="ri-play-fill i i-sm" aria-hidden="true" /> Watch · {s.watchAt}
                </button>
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
  icon = 'ri-test-tube-line',
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
        <i className={cn(icon, 'i i-sm')} aria-hidden="true" /> {label}
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
              <i className="ri-error-warning-line i i-sm" aria-hidden="true" />
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
        <i className={cn(icon ?? 'ri-test-tube-line', 'i i-sm')} aria-hidden="true" /> {label ?? 'Critical limit'}
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
              <i className="ri-error-warning-line i i-sm" aria-hidden="true" />
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
          <i className="ri-play-fill i i-lg" aria-hidden="true" />
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
          <i className="ri-check-line i i-sm" aria-hidden="true" /> Correct
        </figcaption>
      </figure>
      <figure className="no">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={incorrect.src} alt={incorrect.alt} width={1200} height={900} loading="lazy" />
        <figcaption>
          <i className="ri-close-line i i-sm" aria-hidden="true" /> Over-mashed
        </figcaption>
      </figure>
    </div>
  );
}

/* ----------------------------------------------------------------
   Scaler + Ingredients (recipes only)
   ---------------------------------------------------------------- */

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
  return (
    <div className="scaler">
      <span className="lbl" id="batch-lbl">{label}</span>
      <div className="choices" role="radiogroup" aria-labelledby="batch-lbl">
        {factors.map((f) => {
          const checked = f === selected;
          return (
            <button
              key={f}
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
  // The "adj" column is the selected factor (or the second one if the selected is the first)
  const selectedIndex = Math.max(1, factors.indexOf(selectedFactor));
  const isBase = selectedFactor === factors[0];

  return (
    <table className={cn('ing', isBase && 'is-base')}>
      <caption className="vh">Ingredients at the base batch and at the selected batch size</caption>
      <thead>
        <tr>
          <th scope="col">Ingredient</th>
          {factors.map((f, i) => (
            <th key={f} scope="col" className={cn('num', i === selectedIndex && 'adj')}>
              {f}×
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
                  <i className="ri-error-warning-fill i i-sm" aria-hidden="true" /> Allergen
                </span>
              )}
            </th>
            {factors.map((f, j) => (
              <td
                key={f}
                className={cn('num', j === selectedIndex && 'adj')}
              >
                {ing.amounts[j] ?? '—'}
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
  icon: string;        // remix icon class
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
            <i className={cn(r.icon, 'i i-sm')} aria-hidden="true" />
          </span>
          <div>
            <div className="title">{r.title}</div>
            {r.meta && <div className="meta">{r.meta}</div>}
          </div>
          <span className="tail">
            <i
              className={cn(
                r.kind === 'attachment' ? 'ri-download-line' : 'ri-arrow-right-s-line',
                'i',
              )}
              aria-hidden="true"
            />
          </span>
        </a>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------
   Foot of every document
   ---------------------------------------------------------------- */

export function DocActs() {
  return (
    <div className="doc-acts">
      <button className="btn btn-secondary btn-lg">
        <i className="ri-printer-line i" aria-hidden="true" /> Print with QR code
      </button>
      <button className="btn btn-ghost btn-lg">
        <i className="ri-feedback-line i" aria-hidden="true" /> Report a problem
      </button>
    </div>
  );
}

export type DocControlEntry = { label: string; value: React.ReactNode };

/** Document control <details>. Ships open by default — survives without JS. */
export function DocControl({ entries, defaultOpen = true }: { entries: DocControlEntry[]; defaultOpen?: boolean }) {
  return (
    <details className="doc-ctl" open={defaultOpen}>
      <summary>
        Document control <i className="ri-arrow-down-s-line i" aria-hidden="true" />
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
  complete:  { icon: 'ri-check-line', useDot: false },
  verified:  { icon: 'ri-verified-badge-line', useDot: false },
  progress:  { icon: null, useDot: true },
  due:       { icon: null, useDot: true },
  overdue:   { icon: null, useDot: true },
  notstart:  { icon: null, useDot: true },
  locked:    { icon: 'ri-lock-line', useDot: false },
} as const;

export type PillKind = keyof typeof PILL_META;

export function Pill({ kind, children }: { kind: PillKind; children: React.ReactNode }) {
  const meta = PILL_META[kind];
  return (
    <span className={cn('pill', `pill-${kind}`)}>
      {meta.useDot ? (
        <i className="dot" aria-hidden="true" />
      ) : (
        <i className={cn(meta.icon!, 'i i-sm')} aria-hidden="true" />
      )}
      {children}
    </span>
  );
}