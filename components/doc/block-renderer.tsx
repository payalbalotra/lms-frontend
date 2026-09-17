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
  IngredientsTable,
  MethodSteps,
  NoteBlock,
  Scaler,
  Section,
  Shot,
  VideoCover,
  Yield,
  type MethodStep,
  type ChapterRow,
} from './index';

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

export function BlockRenderer({
  blocks,
  locale,
}: {
  blocks: ProcedureBlock[];
  locale: 'en' | 'es';
}): React.ReactElement {
  const attachmentRows: ChapterRow[] = [];

  const rendered = blocks.map((block, i) => {
    switch (block.kind) {
      case 'text':
        return (
          <p key={block.id ?? i} className="text-[length:var(--text-base)] text-[var(--color-ink)] leading-relaxed my-3 font-normal">
            {pickText(block.body, locale)}
          </p>
        );
      case 'heading': {
        const text = pickText(block.text, locale);
        if (block.level === 1) {
          return (
            <h2 key={block.id ?? i} className="font-[family-name:var(--font-display)] text-[length:var(--text-xl)] sm:text-[length:var(--text-2xl)] font-bold text-[var(--color-ink)] mt-8 mb-3 pb-2 border-b border-[var(--color-line)]">
              {text}
            </h2>
          );
        }
        if (block.level === 2) {
          return (
            <h3 key={block.id ?? i} className="font-[family-name:var(--font-ui)] text-[length:var(--text-lg)] font-bold text-[var(--color-ink)] mt-6 mb-2">
              {text}
            </h3>
          );
        }
        return (
          <h4 key={block.id ?? i} className="font-[family-name:var(--font-ui)] text-[length:var(--text-md)] font-semibold text-[var(--color-ink)] mt-4 mb-2">
            {text}
          </h4>
        );
      }
      case 'method': {
        const steps = block.steps.map((s) => toMethodStep(s, locale));
        return (
          <Section key={block.id ?? i} title="Method" count={`${steps.length} steps`}>
            <MethodSteps steps={steps} />
          </Section>
        );
      }
      case 'recipe': {
        const steps = block.steps.map((s) => toMethodStep(s, locale));
        return (
          <Section key={block.id ?? i} title="Recipe">
            {block.allergen && (
              <Allergen
                summary={block.allergen.summary}
                detail={block.allergen.detail}
                selectedAllergens={block.allergen.selectedAllergens}
                locale={locale}
              />
            )}
            {block.yieldItems && block.yieldItems.length > 0 && (
              <Yield
                items={block.yieldItems.map((y) => ({ label: y.label, value: y.value }))}
              />
            )}
            {block.factors && block.factors.length > 0 && (
              <Scaler factors={block.factors} selected={block.factors[0]} />
            )}
            {block.ingredients && block.ingredients.length > 0 && block.factors && (
              <IngredientsTable
                ingredients={block.ingredients.map((ing) => ({
                  name: ing.name,
                  form: ing.form,
                  allergen: ing.allergen,
                  amounts: ing.amounts,
                }))}
                factors={block.factors}
                selectedFactor={block.factors[0]}
              />
            )}
            <MethodSteps steps={steps} />
          </Section>
        );
      }
      case 'image': {
        const alt = pickText(block.alt, locale);
        const caption = pickOpt(block.caption, locale);
        return (
          <figure key={block.id ?? i} className="my-6 space-y-2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-wash)]/40 p-3 shadow-xs">
            <div className="flex items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-white max-h-96">
              {/* eslint-disable-next-html-element-suppress */}
              <img src={block.src} alt={alt} className="max-h-96 w-auto object-contain rounded" loading="lazy" />
            </div>
            {caption && <figcaption className="text-center text-[length:var(--text-xs)] text-[var(--color-ink-2)] font-medium pt-1">{caption}</figcaption>}
          </figure>
        );
      }
      case 'video': {
        const caption = pickOpt(block.caption, locale);
        const videoClass = classifyVideoUrl(block.src);
        return (
          <figure key={block.id ?? i} className="my-6 space-y-2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-black p-2 shadow-xs">
            {videoClass.provider === 'file' ? (
              <video controls src={block.src} className="w-full max-h-96 object-contain rounded-md" />
            ) : videoClass.embedUrl ? (
              <iframe
                src={videoClass.embedUrl}
                title={caption ?? 'video'}
                className="aspect-video w-full rounded-md"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            ) : null}
            {caption && <figcaption className="text-center text-[length:var(--text-xs)] text-white/80 font-medium pt-1">{caption}</figcaption>}
          </figure>
        );
      }
      case 'warning': {
        const sev = block.severity as ProcedureNoteKind;
        return (
          <NoteBlock key={block.id ?? i} kind={sev}>
            {pickText(block.body, locale)}
          </NoteBlock>
        );
      }
      case 'attachment': {
        const title = pickText(block.title, locale);
        const row: ChapterRow = {
          icon: 'ri-file-pdf-2-line',
          title,
          meta: block.meta,
          href: block.href,
          kind: 'attachment',
        };
        attachmentRows.push(row);
        return null;
      }
      case 'table': {
        return (
          <div key={block.id ?? i} className="my-6 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-line-2)]">
            <table className="w-full text-left text-[length:var(--text-sm)]">
              <thead className="border-b border-[var(--color-line-2)] bg-[var(--color-wash)] text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-ink-3)]">
                <tr>
                  {block.headers.map((h, j) => (
                    <th key={j} className="px-4 py-3">{pickText(h, locale)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)] bg-white">
                {block.rows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-[var(--color-wash)]/50 transition-colors">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-3 text-[var(--color-ink)]">{pickText(cell, locale)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }
  });

  return (
    <div className="doc-prose">
      {rendered}
      {attachmentRows.length > 0 && (
        <Section title="Attachments">
          <div className="chapters">
            {attachmentRows.map((r, i) => (
              <a key={i} className="chapter" href={r.href}>
                <span className="idx">
                  <i className={r.icon + ' i i-sm'} aria-hidden="true" />
                </span>
                <div>
                  <div className="title">{r.title}</div>
                  {r.meta && <div className="meta">{r.meta}</div>}
                </div>
                <span className="tail">
                  <i className="ri-download-line i" aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
