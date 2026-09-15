import * as React from 'react';
import { notFound } from 'next/navigation';
import { getProcedure, listProcedureIds, type Procedure, type CriticalLimit } from '@/lib/procedures';
import {
  DocBar,
  DocHead,
  DocPurpose,
  Facts,
  Section,
  Triggers,
  NoteBlock,
  PrepSteps,
  MethodSteps,
  CriticalLimitFull,
  FixList,
  Chapters,
  DocActs,
  DocControl,
} from '@/components/doc';

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Pre-render the two fixture procedures. */
export function generateStaticParams(): Array<{ id: string }> {
  return listProcedureIds().map((id) => ({ id }));
}

/** Render a critical limit embedded inside a method step. */
function MethodStep({ p, nowIndex, index }: { p: Procedure['method'][number]; nowIndex?: number; index: number }) {
  const classes = [
    'step',
    p.critical && 'is-crit',
    nowIndex === index && 'is-now',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={classes || undefined}>
      <div className="step-num" />
      <div className="step-body">
        {p.critical && (
          <span className="step-flag">
            <i className="ri-focus-3-line i i-sm" aria-hidden="true" /> Critical step
          </span>
        )}
        <p>{p.body}</p>
        {p.criticalLimit && <EmbeddedCrit limit={p.criticalLimit} />}
      </div>
    </li>
  );
}

function EmbeddedCrit({ limit }: { limit: CriticalLimit }) {
  return (
    <CriticalLimitFull
      icon={limit.icon}
      label={limit.label}
      value={limit.value}
      subtitle={limit.subtitle}
      howToCheck={limit.howToCheck}
      breachLabel={limit.breachLabel}
      breachResponse={limit.breachResponse}
    />
  );
}

export default async function ProcedurePage({ params }: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const proc = getProcedure(id);
  if (!proc) notFound();

  return (
    <main>
      <article className="doc">
        <DocBar
          backHref="#"
          backLabel={`Back to ${proc.category}`}
          title={proc.title}
          category={proc.category}
        />

        <DocHead icon={proc.icon} category={proc.category} title={proc.title} />

        <DocPurpose>{proc.purpose}</DocPurpose>

        <Facts items={proc.facts} />

        {proc.audience && (
          <Section title="Who this is for">
            <p>{proc.audience}</p>
          </Section>
        )}

        {proc.equipment && (
          <Section title="Equipment">
            <p>{proc.equipment}</p>
          </Section>
        )}

        {(proc.beforeNotes?.length || proc.prereqs?.length) && (
          <Section title="Before you start">
            {proc.prereqs && proc.prereqs.length > 0 && <PrepSteps steps={proc.prereqs} />}
            {proc.beforeNotes?.map((n, i) => (
              <NoteBlock key={i} kind={n.kind}>
                {n.body}
              </NoteBlock>
            ))}
          </Section>
        )}

        <Section title="Method" count={`${proc.method.length} steps`}>
          <ol className="steps">
            {proc.method.map((step, i) => (
              <MethodStep key={i} p={step} index={i} />
            ))}
          </ol>
        </Section>

        {proc.monitoring && proc.monitoring.length > 0 && (
          <Section title="Monitoring">
            <Triggers items={proc.monitoring} />
          </Section>
        )}

        {proc.fixes && proc.fixes.length > 0 && (
          <Section title="If something goes wrong">
            <FixList items={proc.fixes} />
          </Section>
        )}

        {proc.records && (
          <Section title="Records">
            <p>
              <strong>{proc.records.split('.')[0]}.</strong>
              {proc.records.slice(0).split('.').slice(1).join('.').trim()}
            </p>
          </Section>
        )}

        {proc.attachments.length > 0 && (
          <Section title="Attachments">
            <Chapters
              rows={proc.attachments.map((a) => ({
                icon: 'ri-file-pdf-2-line',
                title: a.title,
                meta: a.meta,
                href: a.href,
                kind: 'attachment',
              }))}
            />
          </Section>
        )}

        {proc.related.length > 0 && (
          <Section title="Related procedures" id="related">
            <Chapters
              rows={proc.related.map((r) => ({
                icon: 'ri-file-list-3-line',
                title: r.title,
                meta: r.meta,
                href: r.href,
                kind: 'related',
              }))}
            />
          </Section>
        )}

        <DocActs />
        <DocControl entries={proc.control} />
      </article>
    </main>
  );
}