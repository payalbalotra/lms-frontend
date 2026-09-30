import * as React from 'react';
import Link from 'next/link';
import { LuArrowUpRight, LuLogOut } from 'react-icons/lu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { EmployeeTopBarBackButton } from './employee-top-bar-back-button';


export function EmployeeTopBar({
  locale,
  name,
  canEnterAdmin,
  signOutAction,
  labels,
}: {
  locale: string;
  name: string;
  /** Show the "Admin" link. True for seeded admins and for anyone with the
   *  Manager access tier (Head Chef, etc.). Plain employees don't get it. */
  canEnterAdmin: boolean;
  signOutAction: () => Promise<void>;
  labels: { signedInAs: string; signOut: string; admin: string; toDark: string; toLight: string; back: string };
}): React.ReactElement {
  return (
    // At 390px the name wrapped onto two lines and pushed "Sign out" into two
    // of its own. The name gives way; the two controls keep their shape.
    <header className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {/* Renders only on the procedure-detail route — see the component. The
            rest of the employee surfaces navigate via the bottom TabBar, so a
            back control next to the user info would be redundant. */}
        <EmployeeTopBarBackButton label={labels.back} />
        <p className="min-w-0 truncate text-sm text-[var(--color-ink-2)]">{labels.signedInAs}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <ThemeToggle labels={{ toDark: labels.toDark, toLight: labels.toLight }} />
        {canEnterAdmin ? (
          <Link
            href={`/${locale}/admin`}
            className="inline-flex min-h-tap items-center gap-1 whitespace-nowrap px-2 text-sm font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            {labels.admin}
            {/* The same mark the admin bar uses on the link back here. */}
            <LuArrowUpRight aria-hidden="true" />
          </Link>
        ) : null}
        <form action={signOutAction}>
          {/* Sign out carries its own mark and stays quiet at rest: red is what
              a wrong tap looks like, not what the control looks like sitting
              there. It turns red on hover and on focus, where the intent is
              already there. */}
          <button
            type="submit"
            className="inline-flex min-h-tap items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium text-[var(--color-ink-2)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] focus-visible:bg-[var(--color-bad-tint)] focus-visible:text-[var(--color-bad)]"
          >
            <LuLogOut aria-hidden="true" className="text-md" />
            {labels.signOut}
          </button>
        </form>
      </div>
    </header>
  );
}
