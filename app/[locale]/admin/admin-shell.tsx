'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Employee } from '@/lib/types';
import { LuArrowLeft, LuArrowUpRight, LuChartColumn, LuChefHat, LuCirclePlus, LuClipboardList, LuFolders, LuGraduationCap, LuHouse, LuLogOut, LuMapPin, LuMenu, LuUserCog, LuUserPlus, LuUsers, LuX } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import { AdminSearch } from '@/components/admin/admin-search';
import type { IconType } from 'react-icons';

/**
 * AdminShell — DESIGN.md §3.5 admin navigation.
 *
 * Desktop (>= 900 px): persistent sidebar on the left, main content
 *   to the right. Brandmark + grouped nav + counts + sign-out at the
 *   bottom. Targets are 36 px (admin density).
 *
 * Below 900 px: the sidebar hides and a single hamburger button appears
 *   in the top bar. Tapping it opens a drawer containing the same nav.
 *   Targets become 48 px because the user is now touch (DESIGN.md §5).
 *
 * The drawer uses a focus trap-lite: focus moves into the drawer when
 * it opens, and pressing Escape closes it. Body scroll is locked while
 * the drawer is open so the page underneath doesn't move.
 *
 * The nav is flat: one level, one name per thing. `Library` used to be a
 * parent row holding a child also called `Library`, so the same word appeared
 * twice in a column and neither one said what it opened.
 *
 * What is not built yet (training, reports) is marked rather than hidden: a
 * manager who was promised it looks for it, and a row that says "Soon" answers
 * that, where an unmarked row that lands on an empty page does not.
 *
 * Active-state rules: the longest-prefix matching href wins. So when
 * the user is on /admin/library/categories, only `Categories` shows as
 * active — `Library` is shown as "ancestor active" (softer highlight),
 * never double-active.
 */

/**
 * English or Spanish, on every admin screen.
 *
 * The kitchen is bilingual and so is the library: a manager writing a procedure
 * in Spanish has to be able to see the app the way the cook reading it will. The
 * switch swaps the locale segment of the current path, so it keeps you on the
 * page you are on rather than sending you home.
 */
const LOCALES = ['en', 'es'] as const;

function LocaleSwitch({ locale, label }: { locale: string; label: string }): React.ReactElement {
  const pathname = usePathname();
  const rest = pathname.split('/').slice(2).join('/');
  // The query goes with you: switching language on a filtered list should change
  // the language, not clear the filter.
  const query = useSearchParams().toString();
  const suffix = query ? `?${query}` : '';
  // .segbar is the recipe scaler's control at admin size — same shape, same
  // seats, same filled answer — so the two places the app asks "which one?" look
  // alike.
  return (
    <div className="segbar" role="group" aria-label={label}>
      {LOCALES.map((code) => {
        const current = code === locale;
        return (
          <Link
            key={code}
            href={`/${code}${rest ? `/${rest}` : ''}${suffix}`}
            aria-current={current ? 'true' : undefined}
          >
            {/* The code is written in caps, rather than a lowercase word set in
                caps by CSS: a screen reader should say "E S", not "es". */}
            {code.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}

interface AdminShellProps {
  children: React.ReactNode;
  locale: string;
  employee: Pick<Employee, 'id' | 'name' | 'role'>;
  /** The restaurant this admin area belongs to. The sidebar is the chrome, so
   *  the workspace name lives there rather than being repeated on every page. */
  workspace: string;
  signOutAction: () => Promise<void>;
}

type NavItem = {
  href: string;
  icon: IconType;
  labelKey: string;
  /** Marked in the nav and reachable, but the page behind it is a placeholder. */
  soon?: boolean;
};

type NavGroup = {
  headingKey:
    | 'groupWorkspace'
    | 'groupLibrary'
    | 'groupTraining'
    | 'groupPeople'
    | 'groupSettings'
    | 'groupSoon';
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    headingKey: 'groupWorkspace',
    items: [{ href: '', icon: LuHouse, labelKey: 'navHome' }],
  },
  {
    headingKey: 'groupLibrary',
    items: [
      { href: '/library', icon: LuClipboardList, labelKey: 'navProcedures' },
      { href: '/library/categories', icon: LuFolders, labelKey: 'navCategories' },
      { href: '/library/new', icon: LuCirclePlus, labelKey: 'navNewProcedure' },
    ],
  },
  {
    headingKey: 'groupTraining',
    items: [
      { href: '/training', icon: LuGraduationCap, labelKey: 'navTraining' },
    ],
  },
  {
    headingKey: 'groupPeople',
    items: [
      { href: '/employees', icon: LuUsers, labelKey: 'navEmployees' },
      { href: '/employees/new', icon: LuUserPlus, labelKey: 'inviteEmployee' },
    ],
  },
  {
    headingKey: 'groupSettings',
    items: [
      { href: '/settings/stations', icon: LuChefHat, labelKey: 'navStations' },
      { href: '/settings/roles', icon: LuUserCog, labelKey: 'navRoles' },
      { href: '/settings/locations', icon: LuMapPin, labelKey: 'navLocations' },
    ],
  },
  {
    headingKey: 'groupSoon',
    items: [
      { href: '/reports', icon: LuChartColumn, labelKey: 'navReports', soon: true },
    ],
  },
];

export function AdminShell({
  children,
  locale,
  employee,
  workspace,
  signOutAction,
}: AdminShellProps): React.ReactElement {
  const t = useTranslations('admin');
  const tShell = useTranslations('admin.shell');
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const activeHref = React.useMemo(() => {
    // Longest matching href wins — the most specific item is "the"
    // current page.
    let best = '';
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        const full = `/${locale}/admin${item.href}`;
        const matches =
          item.href === ''
            ? pathname === full || pathname === `${full}/`
            : pathname === full || pathname.startsWith(`${full}/`);
        if (matches && item.href.length > best.length) best = item.href;
      }
    }
    return best;
  }, [pathname, locale]);

  function isActive(href: string): boolean {
    return activeHref === href;
  }

  // Close drawer on route change so the user lands clean.
  const lastPath = React.useRef(pathname);
  React.useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      setDrawerOpen(false);
    }
  }, [pathname]);

  // Escape closes the drawer; lock body scroll while it's open.
  React.useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  const sidebarProps = {
    locale,
    employee,
    workspace,
    groups: NAV_GROUPS,
    labelFor: (key: string) => t(key),
    headingFor: (key: string) => tShell(key),
    isActive,
    onNavigate: () => setDrawerOpen(false),
    signOutLabel: t('signOut'),
    backToAppLabel: t('backToApp'),
    titleLabel: tShell('title'),
    soonLabel: tShell('soon'),
    signOutAction,
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-admin)]">
      {/* Desktop sidebar — visible at >= 900 px (DESIGN.md §5). */}
      <Sidebar {...sidebarProps} className="hidden lg:flex" />

      {/* Mobile top bar — visible below 900 px. */}
      <header className="fixed inset-x-0 top-0 z-sticky flex h-bar items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={tShell('openNav')}
          className={cn(
            'inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)]',
            'text-[var(--color-ink)] transition-colors duration-[var(--dur)] ease-[var(--ease)]',
            'hover:bg-[var(--color-panel)] active:translate-y-px',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
          )}
        >
          <LuMenu aria-hidden="true" className="text-lg" />
        </button>
        <span className="font-[family-name:var(--font-ui)] text-md font-semibold tracking-tight text-[var(--color-ink)]">
          {tShell('title')}
        </span>
        <span className="w-12" aria-hidden="true" />
      </header>

      {/* Mobile drawer — slide-in from the left, full-height, dark backdrop. */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-backdrop lg:hidden" role="dialog" aria-modal="true" aria-label={tShell('title')}>
          <button
            type="button"
            aria-label={tShell('closeNav')}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-default bg-scrim"
          />
          <div
            className={cn(
              'absolute inset-y-0 left-0 flex w-sheet max-w-sheet flex-col',
              'border-r border-[var(--color-line)] bg-[var(--color-surface)]',
              'shadow-[var(--e-3)]',
            )}
            style={{ animation: 'drawer-in var(--dur) var(--ease) both' }}
          >
            <div className="flex h-bar items-center justify-between border-b border-[var(--color-line)] px-4">
              <span className="font-[family-name:var(--font-ui)] text-md font-semibold tracking-tight text-[var(--color-ink)]">
                {tShell('title')}
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={tShell('closeNav')}
                className={cn(
                  'inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)]',
                  'text-[var(--color-ink)] transition-colors duration-[var(--dur)] ease-[var(--ease)]',
                  'hover:bg-[var(--color-panel)] active:translate-y-px',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
                )}
              >
                <LuX aria-hidden="true" className="text-lg" />
              </button>
            </div>
            <Sidebar {...sidebarProps} className="flex flex-1 flex-col" />
          </div>
        </div>
      ) : null}

      {/* Main column. Pad-top accounts for the fixed mobile header. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* The desktop bar. It holds the two things that belong to the whole admin
            area rather than to one page: find anything, and which language you are
            reading it in. The page's own title stays on the page — repeating it
            here would be the same words twice on one screen.

            It is not shown below 900px: there the mobile header already occupies
            that row, and a phone has no space for a field this wide. */}
        <div className="sticky top-0 z-sticky hidden min-h-bar items-center gap-4 border-b border-[var(--color-line)] bg-[var(--color-ground)] px-10 py-3 lg:flex">
          <AdminSearch
            locale={locale}
            labels={{
              label: tShell('searchLabel'),
              placeholder: tShell('searchPlaceholder'),
              procedures: tShell('searchProcedures'),
              people: tShell('searchPeople'),
              empty: tShell('searchEmpty'),
              hint: tShell('searchHint'),
              results: (n: number) => tShell('searchResults', { count: n }),
            }}
          />
          <div className="ml-auto flex items-center gap-3">
            {/* The way across to what the cooks see. The employee bar has the same
                link back, under the name of the area it opens — so this one is
                "Employee", not "Preview" or "Back": the two sides name each other
                the same way. The sidebar footer has it too, for the phone, where
                this bar is not shown. */}
            <Link
              href={`/${locale}/employee/assigned`}
              className="inline-flex min-h-tap-admin items-center gap-1 rounded-full px-3 text-sm font-medium text-[var(--color-ink-2)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)]"
            >
              {t('backToApp')}
              {/* The mark for a link that leaves this area for the other one. */}
              <LuArrowUpRight aria-hidden="true" />
            </Link>
            <LocaleSwitch locale={locale} label={tShell('langLabel')} />
          </div>
        </div>

        <main className="min-w-0 flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
          <div className="pt-10 lg:pt-0">{children}</div>
        </main>
      </div>
    </div>
  );
}

interface SidebarProps {
  locale: string;
  employee: Pick<Employee, 'id' | 'name' | 'role'>;
  workspace: string;
  groups: NavGroup[];
  labelFor: (key: string) => string;
  headingFor: (key: NavGroup['headingKey']) => string;
  isActive: (href: string) => boolean;
  onNavigate: () => void;
  signOutLabel: string;
  backToAppLabel: string;
  titleLabel: string;
  soonLabel: string;
  signOutAction: () => Promise<void>;
  className?: string;
}

function Sidebar({
  locale,
  employee,
  workspace,
  groups,
  labelFor,
  headingFor,
  isActive,
  onNavigate,
  signOutLabel,
  backToAppLabel,
  titleLabel,
  soonLabel,
  signOutAction,
  className,
}: SidebarProps): React.ReactElement {
  return (
    <aside
      className={cn(
        'sticky top-0 h-screen w-sidebar shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)]',
        className,
      )}
      aria-label={titleLabel}
    >
      {/* The brand block is the restaurant's block: its colour, ending in its own
          stepped zigzag instead of a 1px rule. It is the one place in the admin
          chrome that looks like the restaurant rather than like software, which
          is why it is also the only terracotta field on the screen. */}
      <div className="flex min-h-16 items-center gap-3 bg-[var(--color-brand-600)] px-4 py-3">
        {/* The restaurant's own mark, from alimentariamexicana.com. It carries its
            own cream ground, so it sits in a plain rounded frame. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand-mark.png"
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-[var(--radius-md)] object-cover"
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold leading-heading text-[var(--color-white)]">
            {workspace.split(',')[0] || titleLabel}
          </span>
          {/* White, not the peach tint: the tint reads at 4.09:1 on terracotta,
              under the 4.5:1 this size needs. The weight carries the hierarchy. */}
          <span className="block truncate text-sm leading-meta text-[var(--color-white)]">
            {workspace.split(',').slice(1).join(',').trim() || titleLabel}
          </span>
        </span>
      </div>
      {/* Teeth down: the block above owns the edge, the way the site draws it. */}
      <span className="pix-edge is-down" aria-hidden="true" />

      {/* The zigzag is a piece of ornament, not a rule, so it needs room under it
          before the first row — pressed up against Home it reads as that row's
          decoration rather than as the brand block's edge. */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-6">
        {groups.map((group) => (
          <div key={group.headingKey} className="space-y-1">
            {/* 14px, because 12px is the one size this system does not use on an
                admin screen — and a group label is read, not decoration. The first
                group is a single row called Home, which needs no heading over it. */}
            {group.headingKey === 'groupWorkspace' ? null : (
              <p className="px-3 pb-1 text-sm leading-meta text-[var(--color-ink-3)]">
                {headingFor(group.headingKey)}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href || 'home'}>
                  <NavLink
                    href={`/${locale}/admin${item.href}`}
                    icon={item.icon}
                    label={labelFor(item.labelKey)}
                    active={isActive(item.href)}
                    onClick={onNavigate}
                    soon={item.soon ? soonLabel : undefined}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--color-line)] p-3">
        <p className="flex items-center gap-3 px-3 py-2">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel)] text-sm font-semibold text-[var(--color-ink)]"
          >
            {employee.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
          </span>
          <span className="min-w-0 truncate text-sm font-medium text-[var(--color-ink)]">
            {employee.name}
          </span>
        </p>
        <Link
          href={`/${locale}/employee/assigned`}
          onClick={onNavigate}
          className={cn(
            'flex min-h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2',
            'text-sm font-medium text-[var(--color-ink-2)]',
            'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
            'hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
          )}
        >
          <LuArrowLeft aria-hidden="true" className="text-md" />
          <span className="flex-1 truncate">{backToAppLabel}</span>
        </Link>
        {/* Sign out is hidden in the sidebar for now — UI only. The action and its
            label are still wired, so putting this row back is uncommenting it.
            Signing out is still reachable from the employee bar via "Back to app".
        <form action={signOutAction}>
          <button
            type="submit"
            className={cn(
              'mt-1 flex w-full min-h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2',
              'text-sm font-medium text-[var(--color-ink-3)]',
              'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
              'hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
            )}
          >
            <LuLogOut aria-hidden="true" className="text-md" />
            <span className="flex-1 truncate text-left">{signOutLabel}</span>
          </button>
        </form>
        */}
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
  onClick,
  soon,
}: {
  href: string;
  icon: IconType;
  label: string;
  active: boolean;
  onClick: () => void;
  /** Text of the badge for a page that is not built yet. */
  soon?: string;
}): React.ReactElement {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex min-h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2',
        'text-sm font-medium',
        'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
        active
          ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]'
          : 'text-[var(--color-ink-2)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)]',
      )}
    >
      <Icon
        icon={icon}
        className={cn(
          'text-md',
          active
            ? 'text-[var(--color-brand-700)]'
            : 'text-[var(--color-ink-3)] group-hover:text-[var(--color-ink-2)]',
        )}
      />
      <span className="flex-1 truncate">{label}</span>
      {soon ? (
        <span className="rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-2 py-0.5 text-xs font-semibold text-[var(--color-ink-2)]">
          {soon}
        </span>
      ) : null}
    </Link>
  );
}
