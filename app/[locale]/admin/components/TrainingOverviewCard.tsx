import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface TrainingOverviewCardProps {
  locale: string;
  completionRate?: number;
  completedCount?: number;
  inProgressCount?: number;
  overdueCount?: number;
  className?: string;
}

export function TrainingOverviewCard({
  locale,
  completionRate = 87,
  completedCount = 37,
  inProgressCount = 3,
  overdueCount = 2,
  className,
}: TrainingOverviewCardProps): React.ReactElement {
  const isEs = locale === 'es';
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  return (
    <section
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-xs space-y-4',
        className,
      )}
      aria-labelledby="dashboard-training-overview"
    >
      <header className="flex items-center justify-between gap-3">
        <h2
          id="dashboard-training-overview"
          className="font-[family-name:var(--font-display)] text-[length:var(--text-md)] font-bold tracking-tight text-[var(--color-ink)]"
        >
          {isEs ? 'Resumen de capacitación' : 'Training overview'}
        </h2>
        <Link
          href={`/${locale}/admin/training`}
          className="inline-flex items-center gap-1 text-[length:var(--text-xs)] font-bold uppercase tracking-wider text-[var(--color-brand-700)] hover:text-[var(--color-brand-600)] transition-colors"
        >
          {isEs ? 'Ver todo' : 'View all'}
          <i aria-hidden="true" className="ri-arrow-right-line" />
        </Link>
      </header>

      {/* Radial Donut Progress Ring + Main Stat */}
      <div className="flex items-center gap-4 py-2">
        <div className="relative flex size-24 shrink-0 items-center justify-center">
          <svg className="size-full -rotate-90" viewBox="0 0 96 96">
            {/* Background Circle */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-[var(--color-wash)] fill-none"
              strokeWidth="10"
            />
            {/* Completed Progress Arc */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-emerald-500 fill-none transition-all duration-1000 ease-out"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-[family-name:var(--font-display)] text-xl font-bold leading-none text-[var(--color-ink)]">
              {completionRate}%
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-[length:var(--text-xs)] font-bold text-[var(--color-ink)]">
            {isEs ? 'Tasa de finalización' : 'Completion rate'}
          </h3>
          <p className="text-[11px] text-[var(--color-ink-2)] font-medium">
            {isEs
              ? `${completedCount} completados · ${inProgressCount} en progreso · ${overdueCount} vencidos`
              : `${completedCount} completed · ${inProgressCount} in progress · ${overdueCount} overdue`}
          </p>
        </div>
      </div>

      {/* Color Legend Rows */}
      <div className="space-y-2 border-t border-[var(--color-line-2)]/60 pt-3 text-[length:var(--text-xs)]">
        <div className="flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            <span className="text-[var(--color-ink-2)]">{isEs ? 'Completado' : 'Completed'}</span>
          </div>
          <span className="font-bold text-[var(--color-ink)]">{completedCount}</span>
        </div>

        <div className="flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-sky-500" />
            <span className="text-[var(--color-ink-2)]">{isEs ? 'En progreso' : 'In progress'}</span>
          </div>
          <span className="font-bold text-[var(--color-ink)]">{inProgressCount}</span>
        </div>

        <div className="flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-rose-500" />
            <span className="text-[var(--color-ink-2)]">{isEs ? 'Vencido' : 'Overdue'}</span>
          </div>
          <span className="font-bold text-[var(--color-ink)]">{overdueCount}</span>
        </div>
      </div>
    </section>
  );
}
