import * as React from 'react';
import Link from 'next/link';
import { LuArrowUpRight, LuLogOut } from 'react-icons/lu';
import { ThemeToggle } from '@/components/ui/theme-toggle';

/**
 * The bar across the top of every page a cook reads: who is signed in, the
 * theme, the way to the admin side for someone who has one, and sign out.
 *
 * It lived inline in the /employee layout, and /procedures sits outside that
 * tree, so a cook reading a procedure lost the whole bar -- no way to switch to
 * dark in a dark kitchen, no way to sign out -- on the pages they spend the most
 * time on. One bar, worn by both layouts.
 */
export function EmployeeTopBar({
  locale,
  name,
  isAdmin,
  signOutAction,
  labels,
}: {
  locale: string;
  name: string;
  isAdmin: boolean;
  signOutAction: () => Promise<void>;
  labels: { signedInAs: string; signOut: string; admin: string; toDark: string; toLight: string };
}): React.ReactElement {
  return (
    // At 390px the name wrapped onto two lines and pushed "Sign out" into two
    // of its own. The name gives way; the two controls keep their shape.
    <header className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 sm:px-6">
      <p className="min-w-0 truncate text-sm text-[var(--color-ink-2)]">{labels.signedInAs}</p>
      <div className="flex shrink-0 items-center gap-3">
        <ThemeToggle labels={{ toDark: labels.toDark, toLight: labels.toLight }} />
        {isAdmin ? (
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
