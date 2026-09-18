'use client';

import * as React from 'react';

/**
 * The document's three behaviours, ported from /lms.js so the React pages act
 * like the prototypes they were designed in:
 *
 *   1. The step rail — one mark per step in the right margin on a wide screen,
 *      built from the steps rather than written beside them, so it cannot
 *      describe a method that has since changed. Each mark is a link.
 *   2. Which step you are on. A cook looks at the pan and looks back; the band is
 *      a slice across the middle of the screen, not a line, so a step stays
 *      current while it is being read.
 *   3. The bar's title, revealed only once the real title has scrolled away.
 *
 * Without any of this the page is still complete and still prints — it is added
 * to the DOM after mount, and removed on unmount.
 */
export function DocBehaviour(): null {
  React.useEffect(() => {
    const doc = document.querySelector<HTMLElement>('.doc');
    if (!doc) return;
    const cleanups: (() => void)[] = [];

    /* --- the bar's title ------------------------------------------------- */
    const bar = doc.querySelector<HTMLElement>('.doc-bar');
    const title = doc.querySelector<HTMLElement>('.doc-title');
    if (bar && title && 'IntersectionObserver' in window) {
      bar.classList.add('can-reveal');
      const frame = requestAnimationFrame(() => bar.classList.add('is-ready'));
      const barH = bar.getBoundingClientRect().height || 64;
      const watch = new IntersectionObserver(
        (entries) => {
          const last = entries[entries.length - 1]!;
          bar.classList.toggle('is-scrolled', !last.isIntersecting);
        },
        { rootMargin: `-${barH}px 0px 0px 0px` },
      );
      watch.observe(title);
      cleanups.push(() => {
        cancelAnimationFrame(frame);
        watch.disconnect();
        bar.classList.remove('can-reveal', 'is-ready', 'is-scrolled');
      });
    }

    /* --- the rail, and which step is current ----------------------------- */
    const steps = Array.from(doc.querySelectorAll<HTMLElement>('.steps:not(.prep) .step'));
    if (steps.length && 'IntersectionObserver' in window) {
      const rail = document.createElement('nav');
      rail.className = 'steprail';
      rail.setAttribute('aria-label', 'Method steps');

      const marks = steps.map((step, i) => {
        if (!step.id) step.id = `step-${i + 1}`;
        // is-crit, not crit: .crit is the critical-limit box, and reusing the
        // bare class name here would draw that component's border on a mark.
        const critical = step.classList.contains('is-crit');
        const a = document.createElement('a');
        a.href = `#${step.id}`;
        if (critical) a.className = 'is-crit';
        const n = document.createElement('span');
        n.className = 'n';
        n.textContent = `${critical ? 'Critical step ' : 'Step '}${i + 1}`;
        a.appendChild(n);
        rail.appendChild(a);
        return a;
      });
      doc.appendChild(rail);

      const watcher = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            (e.target as HTMLElement).dataset.inBand = e.isIntersecting ? '1' : '';
          });
          const now = steps.find((s) => s.dataset.inBand);
          steps.forEach((s, i) => {
            const on = s === now;
            s.classList.toggle('is-now', on);
            if (on) marks[i]!.setAttribute('aria-current', 'true');
            else marks[i]!.removeAttribute('aria-current');
          });
        },
        { rootMargin: '-30% 0px -45% 0px' },
      );
      steps.forEach((s) => watcher.observe(s));
      cleanups.push(() => {
        watcher.disconnect();
        rail.remove();
        steps.forEach((s) => s.classList.remove('is-now'));
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
