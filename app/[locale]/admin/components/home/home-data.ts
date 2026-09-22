import { getCategoryIcon } from '@/lib/category-icons';
import type { AdminEmployee, Category, Procedure, Role, Station } from '@/lib/types';
import { LuFileText, LuLanguages } from 'react-icons/lu';
import type { IconType } from 'react-icons';

/**
 * Everything on the admin home is derived here from the four lists the API
 * already returns: employees, procedures, categories and roles/stations.
 * Nothing is typed in. A number on this page that the data cannot produce
 * does not appear, because a manager acts on what the home tells them.
 */

export type AttentionKind = 'invite' | 'spanish' | 'draft' | 'emptyCategory';

export interface AttentionItem {
  kind: AttentionKind;
  key: string;
  title: string;
  /** Pieces of the meta line, joined with a middot by the view. */
  meta: string[];
  href: string;
  image?: { src: string; alt: string };
  icon?: IconType;
  initials?: string;
  /** Oldest first inside a group: the thing left longest goes to the top. */
  since: number;
}

export interface AttentionGroup {
  kind: AttentionKind;
  items: AttentionItem[];
}

const DAY = 24 * 60 * 60 * 1000;

export function coverOf(p: Procedure, locale: string): { src: string; alt: string } | undefined {
  const body = p.bodyEn.blocks.length ? p.bodyEn : p.bodyEs;
  for (const b of body.blocks) {
    if (b.kind === 'image' && b.src) return { src: b.src, alt: locale === 'es' ? b.alt.es || b.alt.en : b.alt.en || b.alt.es };
  }
  return undefined;
}

export function titleOf(p: Procedure, locale: string): string {
  return locale === 'es' ? p.titleEs || p.titleEn : p.titleEn || p.titleEs;
}

export function categoryName(c: Category | null, locale: string): string | null {
  if (!c) return null;
  return locale === 'es' ? c.nameEs || c.nameEn : c.nameEn || c.nameEs;
}

/** A procedure a Spanish-reading cook cannot read: no Spanish title, or an
 *  English body with nothing on the Spanish side. */
export function missingSpanish(p: Procedure): boolean {
  return !p.titleEs.trim() || (p.bodyEn.blocks.length > 0 && p.bodyEs.blocks.length === 0);
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

export function relativeDays(iso: string, locale: string, now: number): string {
  const days = Math.round((new Date(iso).getTime() - now) / DAY);
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(days, 'day');
}

export interface HomeInput {
  locale: string;
  now: number;
  meId: string | null;
  employees: AdminEmployee[];
  procedures: Procedure[];
  categories: Category[];
  roles: Role[];
  stations: Station[];
  t: {
    inviteTitle: (name: string) => string;
    invitedAgo: (when: string) => string;
    readsSpanish: string;
    spanishTitle: (title: string) => string;
    spanishReaders: (count: number) => string;
    editedAgo: (when: string, name: string) => string;
    noSpanishYet: string;
    emptyCategoryTitle: (name: string) => string;
    emptyCategoryMeta: string;
    uncategorised: string;
  };
}

export function buildAttention(input: HomeInput): AttentionGroup[] {
  const { locale, now, employees, procedures, categories, roles, stations, t } = input;
  const nameById = new Map(employees.map((e) => [e.id, e.name]));
  const roleById = new Map(roles.map((r) => [r.id, r.name]));
  const stationById = new Map(stations.map((s) => [s.id, s.name]));
  const spanishReaders = employees.filter((e) => e.status === 'active' && e.languagePref === 'es').length;

  // Somebody is locked out until the invite is used: they come first.
  const invites: AttentionItem[] = employees
    .filter((e) => e.status === 'pending')
    .map((e) => ({
      kind: 'invite' as const,
      key: `invite-${e.id}`,
      title: t.inviteTitle(e.name),
      meta: [
        e.roleIds[0] ? roleById.get(e.roleIds[0]) : undefined,
        e.stationIds[0] ? stationById.get(e.stationIds[0]) : undefined,
        t.invitedAgo(relativeDays(e.createdAt, locale, now)),
        e.languagePref === 'es' ? t.readsSpanish : undefined,
      ].filter((x): x is string => Boolean(x)),
      href: `/${locale}/admin/employees?status=pending`,
      initials: initialsOf(e.name),
      since: new Date(e.createdAt).getTime(),
    }));

  // Published, so cooks are already opening it, and part of the team cannot read it.
  const spanish: AttentionItem[] =
    spanishReaders === 0
      ? []
      : procedures
          .filter((p) => p.status === 'published' && missingSpanish(p))
          .map((p) => ({
            kind: 'spanish' as const,
            key: `es-${p.id}`,
            title: t.spanishTitle(titleOf(p, 'en')),
            meta: [categoryName(p.category, locale) ?? t.uncategorised, t.spanishReaders(spanishReaders)],
            href: `/${locale}/procedures/${p.slug}`,
            image: coverOf(p, locale),
            icon: LuLanguages,
            since: new Date(p.updatedAt).getTime(),
          }));

  const drafts: AttentionItem[] = procedures
    .filter((p) => p.status === 'draft')
    .map((p) => ({
      kind: 'draft' as const,
      key: `draft-${p.id}`,
      title: titleOf(p, locale),
      meta: [
        categoryName(p.category, locale) ?? t.uncategorised,
        t.editedAgo(relativeDays(p.updatedAt, locale, now), nameById.get(p.createdBy) ?? ''),
        missingSpanish(p) ? t.noSpanishYet : undefined,
      ].filter((x): x is string => Boolean(x)),
      href: `/${locale}/procedures/${p.slug}`,
      image: coverOf(p, locale),
      icon: p.category ? getCategoryIcon(p.category) : LuFileText,
      since: new Date(p.updatedAt).getTime(),
    }));

  const used = new Set(procedures.map((p) => p.category?.id).filter(Boolean));
  const empty: AttentionItem[] = categories
    .filter((c) => !c.isArchived && !used.has(c.id))
    .map((c) => ({
      kind: 'emptyCategory' as const,
      key: `cat-${c.id}`,
      title: t.emptyCategoryTitle(categoryName(c, locale)!),
      meta: [t.emptyCategoryMeta],
      href: `/${locale}/admin/library/new`,
      icon: getCategoryIcon(c),
      since: 0,
    }));

  return [
    { kind: 'invite' as const, items: invites },
    { kind: 'spanish' as const, items: spanish },
    { kind: 'draft' as const, items: drafts },
    { kind: 'emptyCategory' as const, items: empty },
  ]
    .map((g) => ({ ...g, items: [...g.items].sort((a, b) => a.since - b.since) }))
    .filter((g) => g.items.length > 0);
}

/** The draft the signed-in manager touched last. The home opens with it, so
 *  whoever was interrupted last night lands back where they stopped. */
export function resumeDraft(procedures: Procedure[], meId: string | null): Procedure | null {
  const mine = procedures.filter((p) => p.status === 'draft' && (!meId || p.createdBy === meId));
  mine.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return mine[0] ?? null;
}

export function recentProcedures(procedures: Procedure[], limit = 3): Procedure[] {
  return [...procedures]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}
