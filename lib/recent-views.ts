/**
 * What this person opened last, newest first, so the home can offer the way
 * back to a recipe left half-read mid-shift. Kept on the device: a phone is one
 * person's (the staff use their own devices), and it is a convenience, not a
 * record. The access log is the record.
 */

export interface RecentView {
  slug: string;
  titleEn: string;
  titleEs: string;
  cover?: string;
  at: string;
}

const KEY = 'lms_recent_views';
const KEEP = 8;

export function readRecentViews(): RecentView[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentView[]) : [];
  } catch {
    return [];
  }
}

export function recordRecentView(view: Omit<RecentView, 'at'>): void {
  try {
    const rest = readRecentViews().filter((v) => v.slug !== view.slug);
    const next = [{ ...view, at: new Date().toISOString() }, ...rest].slice(0, KEEP);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private window or storage off: the home simply has no "Back to" */
  }
}
