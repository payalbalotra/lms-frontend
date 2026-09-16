import * as React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { BlockRenderer } from '@/components/doc/block-renderer';
import { Button } from '@/components/ui/button';
import { getProcedureBySlug, ApiException } from '@/lib/api';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export const dynamic = 'force-dynamic';

const CATEGORY_NAMES: Record<string, { en: string; es: string; icon: string }> = {
  recipes: { en: 'Recipes', es: 'Recetas', icon: 'ri-restaurant-line' },
  equipment: { en: 'Equipment Handling', es: 'Manejo de Equipos', icon: 'ri-tools-line' },
  station: { en: 'Station Procedures', es: 'Procedimientos de Estación', icon: 'ri-store-2-line' },
  cleaning: { en: 'Cleaning Schedules', es: 'Calendarios de Limpieza', icon: 'ri-sparkles-line' },
  admin: { en: 'General and Administrative', es: 'General y Administrativo', icon: 'ri-shield-user-line' },
  delivery: { en: 'Delivery and Receiving', es: 'Entrega y Recepción', icon: 'ri-truck-line' },
};

export default async function ProcedurePage({ params }: PageProps): Promise<React.ReactElement> {
  const { id: slug, locale } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let proc;
  try {
    const result = await getProcedureBySlug(slug, cookieHeader);
    proc = result.procedure;
  } catch (err) {
    if (err instanceof ApiException && err.status === 404) {
      notFound();
    }
    if (err instanceof ApiException && (err.status === 401 || err.code === 'SESSION_INVALID')) {
      redirect(`/${locale}/login`);
    }
    throw err;
  }
  if (!proc) notFound();

  const isEs = locale === 'es';
  const title = isEs ? proc.titleEs || proc.titleEn : proc.titleEn || proc.titleEs;
  const purpose = isEs ? proc.purposeEs || proc.purposeEn : proc.purposeEn || proc.purposeEs;
  const body = isEs ? proc.bodyEs : proc.bodyEn;
  const blocks = body?.blocks ?? proc.bodyEn?.blocks ?? [];

  const catMeta = CATEGORY_NAMES[proc.categoryKey] ?? {
    en: proc.categoryKey,
    es: proc.categoryKey,
    icon: 'ri-file-text-line',
  };
  const categoryLabel = isEs ? catMeta.es : catMeta.en;

  const formattedDate = new Date(proc.updatedAt || proc.createdAt).toLocaleDateString(
    isEs ? 'es-ES' : 'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' },
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg-admin)] pb-24 pt-6 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation / Action Bar */}
        <div className="flex items-center justify-between border-b border-[var(--color-line-2)]/60 pb-4">
          <Link
            href={`/${locale}/admin/library`}
            className="inline-flex items-center gap-1.5 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)] hover:text-[var(--color-brand-700)] transition-colors"
          >
            <i aria-hidden="true" className="ri-arrow-left-line text-lg" />
            {isEs ? 'Volver a la Biblioteca' : 'Back to Library'}
          </Link>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[length:var(--text-xs)] font-bold uppercase tracking-wide',
                proc.status === 'published'
                  ? 'bg-[var(--color-ok-tint)] text-[var(--color-ok)] border border-[var(--color-ok-tint-2)]'
                  : 'bg-[var(--color-warn-tint)] text-[var(--color-warn-ink)] border border-[var(--color-warn)]/30',
              )}
            >
              <span className="size-2 rounded-full bg-current" />
              {proc.status === 'published' ? (isEs ? 'Publicado' : 'Published') : (isEs ? 'Borrador' : 'Draft')}
            </span>

            <Link href={`/${locale}/admin/library/new`}>
              <Button type="button" variant="secondary" size="sm" className="gap-1.5 text-xs">
                <i aria-hidden="true" className="ri-edit-line" />
                {isEs ? 'Editar' : 'Edit'}
              </Button>
            </Link>
          </div>
        </div>

        {/* SOP Main Document Card */}
        <article className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 sm:p-10 shadow-sm space-y-8">
          {/* Header Banner */}
          <header className="space-y-4 border-b border-[var(--color-line)]/60 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] text-2xl shadow-xs">
                <i aria-hidden="true" className={catMeta.icon} />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 text-[length:var(--text-xs)] font-bold uppercase tracking-wider text-[var(--color-brand-700)]">
                  {categoryLabel}
                </span>
                <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] sm:text-[length:var(--text-3xl)] font-bold tracking-tight text-[var(--color-ink)] mt-0.5">
                  {title}
                </h1>
              </div>
            </div>

            {/* Purpose Callout Box */}
            {purpose && (
              <div className="rounded-r-[var(--radius-md)] border-l-4 border-[var(--color-brand-600)] bg-[var(--color-brand-tint)]/30 p-4 text-[length:var(--text-base)] text-[var(--color-ink)] leading-relaxed font-medium">
                <div className="text-[length:var(--text-xs)] font-bold uppercase tracking-wide text-[var(--color-brand-700)] mb-1">
                  {isEs ? 'Propósito' : 'Purpose'}
                </div>
                {purpose}
              </div>
            )}
          </header>

          {/* Metadata Quick Info Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)]/40 p-4 text-[length:var(--text-xs)] font-semibold">
            <div>
              <span className="text-[var(--color-ink-3)] block uppercase tracking-wide text-[10px]">
                {isEs ? 'Categoría' : 'Category'}
              </span>
              <span className="text-[var(--color-ink)] mt-0.5 block truncate">{categoryLabel}</span>
            </div>
            <div>
              <span className="text-[var(--color-ink-3)] block uppercase tracking-wide text-[10px]">
                {isEs ? 'Estado' : 'Status'}
              </span>
              <span className="text-[var(--color-ink)] mt-0.5 block capitalize">{proc.status}</span>
            </div>
            <div>
              <span className="text-[var(--color-ink-3)] block uppercase tracking-wide text-[10px]">
                {isEs ? 'Última actualización' : 'Last Updated'}
              </span>
              <span className="text-[var(--color-ink)] mt-0.5 block">{formattedDate}</span>
            </div>
            <div>
              <span className="text-[var(--color-ink-3)] block uppercase tracking-wide text-[10px]">
                {isEs ? 'Creado por' : 'Author'}
              </span>
              <span className="text-[var(--color-ink)] mt-0.5 block truncate">{proc.createdBy || 'Admin'}</span>
            </div>
          </div>

          {/* Procedure Content Blocks */}
          <section className="space-y-6">
            {blocks.length === 0 ? (
              <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-3)]/60 bg-[var(--color-wash)]/20 p-8 text-center text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                <i aria-hidden="true" className="ri-article-line text-3xl mb-2 text-[var(--color-ink-3)] block" />
                {isEs ? 'Este procedimiento aún no tiene contenido.' : 'This procedure has no content blocks yet.'}
              </div>
            ) : (
              <BlockRenderer blocks={blocks} locale={isEs ? 'es' : 'en'} />
            )}
          </section>
        </article>
      </div>
    </div>
  );
}
