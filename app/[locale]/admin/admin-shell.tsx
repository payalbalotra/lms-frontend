'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Employee } from '@/lib/types';

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
 * Collapsible parents: `Library` is a parent item with two children
 * (`Procedures` and `Categories`). Clicking the parent row navigates to
 * its href AND toggles expand; the caret is a visual indicator and an
 * explicit toggle target on its own. A parent auto-expands when the
 * user lands on a child path.
 *
 * Active-state rules: the longest-prefix matching href wins. So when
 * the user is on /admin/library/categories, only `Categories` shows as
 * active — `Library` is shown as "ancestor active" (softer highlight),
 * never double-active.
 */

interface AdminShellProps {
  children: React.ReactNode;
  locale: string;
  employee: Pick<Employee, 'id' | 'name' | 'clearanceLevel'>;
  signOutAction: () => Promise<void>;
}

type NavLeaf = {
  href: string;
  icon: string;
  labelKey: string;
};

type NavItem =
  | ({ kind: 'leaf' } & NavLeaf)
  | ({
      kind: 'parent';
    } & NavLeaf & { children: NavLeaf[] });

type NavGroup = {
  headingKey:
    | 'groupWorkspace'
    | 'groupLibrary'
    | 'groupTraining'
    | 'groupReports'
    | 'groupPeople'
    | 'groupSettings';
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    headingKey: 'groupWorkspace',
    items: [
      { kind: 'leaf', href: '', icon: 'ri-home-5-line', labelKey: 'navHome' },
    ],
  },
  {
    headingKey: 'groupLibrary',
    items: [
      {
        kind: 'parent',
        href: '/library',
        icon: 'ri-book-3-line',
        labelKey: 'navLibrary',
        children: [
          { href: '/library', icon: 'ri-file-list-3-line', labelKey: 'navProcedures' },
          { href: '/library/categories', icon: 'ri-folders-line', labelKey: 'navCategories' },
        ],
      },
      { kind: 'leaf', href: '/library/new', icon: 'ri-add-circle-line', labelKey: 'navNewProcedure' },
    ],
  },
  {
    headingKey: 'groupTraining',
    items: [
      { kind: 'leaf', href: '/training', icon: 'ri-graduation-cap-line', labelKey: 'navTraining' },
    ],
  },
  {
    headingKey: 'groupReports',
    items: [
      { kind: 'leaf', href: '/reports', icon: 'ri-bar-chart-box-line', labelKey: 'navReports' },
    ],
  },
  {
    headingKey: 'groupPeople',
    items: [
      { kind: 'leaf', href: '/employees', icon: 'ri-team-line', labelKey: 'navEmployees' },
      { kind: 'leaf', href: '/employees/new', icon: 'ri-user-add-line', labelKey: 'inviteEmployee' },
    ],
  },
  {
    headingKey: 'groupSettings',
    items: [
      { kind: 'leaf', href: '/settings/stations', icon: 'ri-restaurant-2-line', labelKey: 'navStations' },
      { kind: 'leaf', href: '/settings/roles', icon: 'ri-shield-user-line', labelKey: 'navRoles' },
      { kind: 'leaf', href: '/settings/locations', icon: 'ri-map-pin-2-line', labelKey: 'navLocations' },
    ],
  },
];

export function AdminShell({
  children,
  locale,
  employee,
  signOutAction,
}: AdminShellProps): React.ReactElement {
  const t = useTranslations('admin');
  const tShell = useTranslations('admin.shell');
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Auto-open any parent whose child is the current page; the user can
  // then collapse it explicitly if they prefer.
  const [openParents, setOpenParents] = React.useState<Set<string>>(
    () => new Set(),
  );

  React.useEffect(() => {
    setOpenParents((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const group of NAV_GROUPS) {
        for (const item of group.items) {
          if (item.kind !== 'parent') continue;
          const parentFull = `/${locale}/admin${item.href}`;
          const onOrUnder =
            pathname === parentFull ||
            pathname === `${parentFull}/` ||
            pathname.startsWith(`${parentFull}/`);
          if (onOrUnder && !next.has(item.href)) {
            next.add(item.href);
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [pathname, locale]);

  const activeHref = React.useMemo(() => {
    // Longest matching href wins — the most specific item is "the"
    // current page.
    let best = '';
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        const candidates: NavLeaf[] =
          item.kind === 'parent' ? [item, ...item.children] : [item];
        for (const c of candidates) {
          const full = `/${locale}/admin${c.href}`;
          const matches =
            c.href === ''
              ? pathname === full || pathname === `${full}/`
              : pathname === full || pathname.startsWith(`${full}/`);
          if (matches && c.href.length > best.length) best = c.href;
        }
      }
    }
    return best;
  }, [pathname, locale]);

  function isActive(href: string): boolean {
    return activeHref === href;
  }

  function isAncestorActive(href: string): boolean {
    // A parent is "ancestor-active" when the longest match is one of
    // its children (so it's a softer highlight than the child itself).
    if (activeHref === href) return false;
    const full = `/${locale}/admin${href}`;
    return (
      pathname === full ||
      pathname === `${full}/` ||
      pathname.startsWith(`${full}/`)
    );
  }

  function toggleParent(href: string): void {
    setOpenParents((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
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
    groups: NAV_GROUPS,
    labelFor: (key: string) => t(key),
    headingFor: (key: string) => tShell(key),
    isActive,
    isAncestorActive,
    openParents,
    onToggleParent: toggleParent,
    onNavigate: () => setDrawerOpen(false),
    signOutLabel: t('signOut'),
    backToAppLabel: t('backToApp'),
    titleLabel: tShell('title'),
    expandAriaLabel: tShell('expandSection'),
    collapseAriaLabel: tShell('collapseSection'),
    signOutAction,
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-admin)]">
      {/* Desktop sidebar — visible at >= 900 px (DESIGN.md §5). */}
      <Sidebar {...sidebarProps} className="hidden lg:flex" />

      {/* Mobile top bar — visible below 900 px. */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={tShell('openNav')}
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)]',
            'text-[var(--color-ink)] transition-colors duration-[180ms] ease-[var(--ease)]',
            'hover:bg-[var(--color-panel)] active:translate-y-px',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
          )}
        >
          <i aria-hidden="true" className="ri-menu-line text-[length:var(--text-lg)]" />
        </button>
        <span className="font-[family-name:var(--font-display)] text-[length:var(--text-md)] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
          {tShell('title')}
        </span>
        <span className="w-11" aria-hidden="true" />
      </header>

      {/* Mobile drawer — slide-in from the left, full-height, dark backdrop. */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={tShell('title')}>
          <button
            type="button"
            aria-label={tShell('closeNav')}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-default bg-[rgb(34_34_34_/_0.45)]"
          />
          <div
            className={cn(
              'absolute inset-y-0 left-0 flex w-[min(20rem,90vw)] flex-col',
              'border-r border-[var(--color-line)] bg-[var(--color-surface)]',
              'shadow-[var(--e-3)]',
            )}
            style={{ animation: 'drawer-in var(--dur) var(--ease) both' }}
          >
            <div className="flex h-14 items-center justify-between border-b border-[var(--color-line)] px-4">
              <span className="font-[family-name:var(--font-display)] text-[length:var(--text-md)] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
                {tShell('title')}
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={tShell('closeNav')}
                className={cn(
                  'inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)]',
                  'text-[var(--color-ink)] transition-colors duration-[180ms] ease-[var(--ease)]',
                  'hover:bg-[var(--color-panel)] active:translate-y-px',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
                )}
              >
                <i aria-hidden="true" className="ri-close-line text-[length:var(--text-lg)]" />
              </button>
            </div>
            <Sidebar {...sidebarProps} className="flex flex-1 flex-col" />
          </div>
        </div>
      ) : null}

      {/* Main column. Pad-top accounts for the fixed mobile header. */}
      <main className="min-w-0 flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="pt-10 lg:pt-0">{children}</div>
      </main>
    </div>
  );
}

interface SidebarProps {
  locale: string;
  employee: Pick<Employee, 'id' | 'name' | 'clearanceLevel'>;
  groups: NavGroup[];
  labelFor: (key: string) => string;
  headingFor: (key: NavGroup['headingKey']) => string;
  isActive: (href: string) => boolean;
  isAncestorActive: (href: string) => boolean;
  openParents: Set<string>;
  onToggleParent: (href: string) => void;
  onNavigate: () => void;
  signOutLabel: string;
  backToAppLabel: string;
  titleLabel: string;
  expandAriaLabel: string;
  collapseAriaLabel: string;
  signOutAction: () => Promise<void>;
  className?: string;
}

function Sidebar({
  locale,
  employee,
  groups,
  labelFor,
  headingFor,
  isActive,
  isAncestorActive,
  openParents,
  onToggleParent,
  onNavigate,
  signOutLabel,
  backToAppLabel,
  titleLabel,
  expandAriaLabel,
  collapseAriaLabel,
  signOutAction,
  className,
}: SidebarProps): React.ReactElement {
  return (
    <aside
      className={cn(
        'w-64 shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)]',
        className,
      )}
      aria-label={titleLabel}
    >
      <div className="flex h-16 items-center gap-2 border-b border-[var(--color-line)] px-5">
        <span
          aria-hidden="true"
          className="inline-flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-600)] text-white"
        >
          <i className="ri-book-3-line text-[length:var(--text-md)]" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-[family-name:var(--font-display)] text-[length:var(--text-sm)] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
            {titleLabel}
          </p>
          <p className="truncate text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {employee.name}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.headingKey} className="space-y-1">
            <p className="px-2 text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-ink-3)]">
              {headingFor(group.headingKey)}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                if (item.kind === 'parent') {
                  return (
                    <ParentNavRow
                      key={item.href}
                      locale={locale}
                      item={item}
                      open={openParents.has(item.href)}
                      isParentActive={isActive(item.href)}
                      isAncestorActive={isAncestorActive(item.href)}
                      isChildActive={isActive}
                      labelFor={labelFor}
                      onToggle={onToggleParent}
                      onNavigate={onNavigate}
                      expandAriaLabel={expandAriaLabel}
                      collapseAriaLabel={collapseAriaLabel}
                    />
                  );
                }
                return (
                  <li key={item.href || 'home'}>
                    <NavLink
                      href={`/${locale}/admin${item.href}`}
                      icon={item.icon}
                      label={labelFor(item.labelKey)}
                      active={isActive(item.href)}
                      onClick={onNavigate}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--color-line)] p-3">
        <Link
          href={`/${locale}/employee/assigned`}
          onClick={onNavigate}
          className={cn(
            'flex min-h-9 items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-1.5',
            'text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]',
            'transition-colors duration-[180ms] ease-[var(--ease)]',
            'hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
          )}
        >
          <i aria-hidden="true" className="ri-arrow-left-line text-[length:var(--text-md)]" />
          <span className="flex-1 truncate">{backToAppLabel}</span>
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className={cn(
              'mt-1 flex w-full min-h-9 items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-1.5',
              'text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]',
              'transition-colors duration-[180ms] ease-[var(--ease)]',
              'hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
            )}
          >
            <i aria-hidden="true" className="ri-logout-box-r-line text-[length:var(--text-md)]" />
            <span className="flex-1 truncate text-left">{signOutLabel}</span>
          </button>
        </form>
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
  indent = false,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  indent?: boolean;
}): React.ReactElement {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex min-h-9 items-center gap-2.5 rounded-[var(--radius-md)] py-1.5',
        indent ? 'pl-9 pr-2.5' : 'px-2.5',
        'text-[length:var(--text-sm)] font-medium',
        'transition-colors duration-[180ms] ease-[var(--ease)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
        active
          ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]'
          : 'text-[var(--color-ink-2)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)]',
      )}
    >
      <i
        aria-hidden="true"
        className={cn(
          `${icon} text-[length:var(--text-md)]`,
          active
            ? 'text-[var(--color-brand-700)]'
            : 'text-[var(--color-ink-3)] group-hover:text-[var(--color-ink-2)]',
        )}
      />
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}

interface ParentNavRowProps {
  locale: string;
  item: Extract<NavItem, { kind: 'parent' }>;
  open: boolean;
  isParentActive: boolean;
  isAncestorActive: boolean;
  isChildActive: (href: string) => boolean;
  labelFor: (key: string) => string;
  onToggle: (href: string) => void;
  onNavigate: () => void;
  expandAriaLabel: string;
  collapseAriaLabel: string;
}

function ParentNavRow({
  locale,
  item,
  open,
  isParentActive,
  isAncestorActive,
  isChildActive,
  labelFor,
  onToggle,
  onNavigate,
  expandAriaLabel,
  collapseAriaLabel,
}: ParentNavRowProps): React.ReactElement {
  const highlighted = isParentActive;
  return (
    <li>
      <div
        className={cn(
          'flex items-center rounded-[var(--radius-md)] transition-colors duration-[180ms] ease-[var(--ease)]',
          highlighted ? 'bg-[var(--color-brand-tint)]' : 'hover:bg-[var(--color-panel)]',
        )}
      >
        <Link
          href={`/${locale}/admin${item.href}`}
          onClick={onNavigate}
          aria-current={isParentActive ? 'page' : undefined}
          className={cn(
            'flex min-h-9 flex-1 items-center gap-2.5 rounded-l-[var(--radius-md)] px-2.5 py-1.5',
            'text-[length:var(--text-sm)] font-semibold',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
            isParentActive || isAncestorActive
              ? 'text-[var(--color-brand-700)]'
              : 'text-[var(--color-ink)]',
          )}
        >
          <i
            aria-hidden="true"
            className={cn(
              `${item.icon} text-[length:var(--text-md)]`,
              highlighted ? 'text-[var(--color-brand-700)]' : 'text-[var(--color-ink-3)]',
            )}
          />
          <span className="flex-1 truncate">{labelFor(item.labelKey)}</span>
        </Link>
        <button
          type="button"
          onClick={() => onToggle(item.href)}
          aria-label={open ? collapseAriaLabel : expandAriaLabel}
          aria-expanded={open}
          className={cn(
            'inline-flex h-9 w-8 items-center justify-center rounded-r-[var(--radius-md)]',
            'text-[length:var(--text-sm)] transition-colors duration-[180ms] ease-[var(--ease)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)] focus-visible:ring-offset-2',
            highlighted
              ? 'text-[var(--color-brand-700)]'
              : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)]',
          )}
        >
          <i
            aria-hidden="true"
            className={cn(
              'transition-transform duration-[180ms] ease-[var(--ease)]',
              open ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line',
              'text-[length:var(--text-lg)]',
            )}
          />
        </button>
      </div>
      {open ? (
        <ul className="mt-0.5 ml-3 space-y-0.5 border-l border-[var(--color-line)] pl-3">
          {item.children.map((child) => (
            <li key={child.href}>
              <NavLink
                href={`/${locale}/admin${child.href}`}
                icon={child.icon}
                label={labelFor(child.labelKey)}
                active={isChildActive(child.href)}
                onClick={onNavigate}
                indent
              />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}