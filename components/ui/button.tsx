import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Buttons follow DESIGN.md §3.1.
 *
 *   - Shape is pill (rounded-full). A pill says press; a rectangle says report.
 *   - Solid fill in light or dark tone of its own hue.
 *   - Sizes match density: `default` = 36px admin tap target, `lg` = 48px employee.
 *   - No outline variant — outline buttons are banned (DESIGN.md §9.6).
 *   - Destructive lives in its light tone by default (DESIGN.md §3.1 rule).
 *
 * Variant selection (read this before picking `variant`):
 *
 *   primary      One per screen — the main action. White text on terracotta.
 *   secondary    Visible companion to primary (or any high-prominence action
 *                in a dense area). Dark terracotta text on peach.
 *   neutral      Cancel, dismiss, "No" next to a confirm — low-prominence.
 *                Ink text on bone. Do NOT use this for the main action on a
 *                list/table page or for "[+ Add]" triggers — those should
 *                be `secondary` so they read as branded, not as chrome.
 *   ghost        Barely-there actions (icon button, tertiary link).
 *                Ink text on transparent.
 *   destructive  ONLY on the confirm step of a destructive flow — never
 *                on the first surface. Light bad tint → solid bad on hover.
 *
 * Heuristic: if the button is in a footer, on a card, or is the page-level
 * add/create trigger, default to `secondary`. Reserve `neutral` for true
 * cancel / dismiss / no-confirm.
 */
type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'neutral';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    // text-white! needed because base CSS resets button color to inherit, and
    // class-selector specificity loses to the `button { color: inherit }` rule
    // in lms.css without it. The `!` makes the override survive the cascade.
    'bg-[var(--color-brand-600)] text-white! hover:bg-[var(--color-brand-700)] active:translate-y-px',
  secondary:
    'bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] hover:bg-[var(--color-brand-tint-2)] active:translate-y-px',
  destructive:
    // Light tone by default. Solid red on hover + a confirm CTA behind it (DESIGN.md).
    'bg-[var(--color-bad-tint)] text-[var(--color-bad)] hover:bg-[var(--color-bad)] hover:text-white active:translate-y-px',
  neutral:
    'bg-[var(--color-panel)] text-[var(--color-ink)] hover:bg-[var(--color-panel-2)] active:translate-y-px',
  ghost:
    'bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-panel)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  // admin tap target = 36px
  default: 'min-h-9 px-5 text-sm',
  // compact row button
  sm: 'min-h-8 px-3 text-sm',
  // employee tap target = 48px
  lg: 'min-h-12 px-8 text-md',
  // square icon button sized to match its sibling
  icon: 'min-h-9 min-w-9 px-0',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'default', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-slot="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap',
        // Transition follows the --ease curve + 180ms duration from §2.4.
        'transition-colors duration-[180ms] ease-[var(--ease)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});
