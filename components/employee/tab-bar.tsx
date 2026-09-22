import * as React from 'react';
import Link from 'next/link';
import { LuBookOpen, LuGraduationCap, LuSearch } from 'react-icons/lu';

export type EmployeeTab = 'ask' | 'procedures' | 'training';

/**
 * The cook's navigation, as designed in /employee-home.html: three tabs, fixed to
 * the bottom of the screen where a thumb reaches without the hand leaving the
 * phone. Each target is 60px tall — taller than the 48px floor, because this is
 * used with wet or gloved hands.
 *
 * On a desk it stays at the bottom but stops spanning the whole width, so it
 * reads as the app's bar rather than a strip glued to the browser.
 */
export function TabBar({
  locale,
  active,
  labels,
}: {
  locale: string;
  active: EmployeeTab;
  labels: { ask: string; procedures: string; training: string; soon: string; nav: string };
}): React.ReactElement {
  const tabs: { key: EmployeeTab; href?: string; icon: typeof LuSearch; label: string; soon?: boolean }[] = [
    { key: 'ask', href: `/${locale}/employee/assigned`, icon: LuSearch, label: labels.ask },
    { key: 'procedures', href: `/${locale}/procedures`, icon: LuBookOpen, label: labels.procedures },
    { key: 'training', href: `/${locale}/employee/training`, icon: LuGraduationCap, label: labels.training },
  ];

  return (
    <nav
      aria-label={labels.nav}
      className="fixed inset-x-0 bottom-0 z-sticky border-t border-[var(--color-line)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-doc">
        {tabs.map((tab) => {
          const on = tab.key === active;
          const inner = (
            <>
              <tab.icon aria-hidden="true" className="text-lg" />
              {tab.label}
              {tab.soon ? <span className="sr-only">{labels.soon}</span> : null}
            </>
          );
          const shape = `flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-sm font-semibold ${
            on ? 'text-[var(--color-brand-700)]' : tab.soon ? 'text-[var(--color-ink-3)]' : 'text-[var(--color-ink-2)]'
          }`;
          return tab.href ? (
            <Link key={tab.key} href={tab.href} aria-current={on ? 'page' : undefined} className={shape}>
              {inner}
            </Link>
          ) : (
            <span key={tab.key} className={shape}>
              {inner}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
