import * as React from 'react';
import { cn } from '@/lib/utils';

interface QuickInfoCardProps {
  locale: string;
  type?: string;
  category?: string;
  languages?: string;
  access?: string;
  className?: string;
}

export function QuickInfoCard({
  locale,
  type = 'Recipe',
  category = 'Recipes',
  languages = 'English · Español',
  access = 'General',
  className,
}: QuickInfoCardProps): React.ReactElement {
  const isEs = locale === 'es';

  return (
    <section
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-xs space-y-4',
        className,
      )}
      aria-labelledby="dashboard-quick-info"
    >
      <h2
        id="dashboard-quick-info"
        className="font-[family-name:var(--font-display)] text-[length:var(--text-md)] font-bold tracking-tight text-[var(--color-ink)]"
      >
        {isEs ? 'Información rápida' : 'Quick info'}
      </h2>

      <div className="space-y-3 text-[length:var(--text-xs)]">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-wash)] text-[var(--color-ink-2)] text-base">
            <i aria-hidden="true" className="ri-restaurant-line" />
          </span>
          <div>
            <span className="text-[var(--color-ink-3)] uppercase tracking-wider text-[10px] font-bold block">
              {isEs ? 'Tipo' : 'Type'}
            </span>
            <span className="font-semibold text-[var(--color-ink)]">{type}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-wash)] text-[var(--color-ink-2)] text-base">
            <i aria-hidden="true" className="ri-folder-3-line" />
          </span>
          <div>
            <span className="text-[var(--color-ink-3)] uppercase tracking-wider text-[10px] font-bold block">
              {isEs ? 'Categoría' : 'Category'}
            </span>
            <span className="font-semibold text-[var(--color-ink)]">{category}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-wash)] text-[var(--color-ink-2)] text-base">
            <i aria-hidden="true" className="ri-translate-2" />
          </span>
          <div>
            <span className="text-[var(--color-ink-3)] uppercase tracking-wider text-[10px] font-bold block">
              {isEs ? 'Idiomas' : 'Languages'}
            </span>
            <span className="font-semibold text-[var(--color-ink)]">{languages}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-wash)] text-[var(--color-ink-2)] text-base">
            <i aria-hidden="true" className="ri-lock-unlock-line" />
          </span>
          <div>
            <span className="text-[var(--color-ink-3)] uppercase tracking-wider text-[10px] font-bold block">
              {isEs ? 'Acceso' : 'Access'}
            </span>
            <span className="font-semibold text-[var(--color-ink)]">{access}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
