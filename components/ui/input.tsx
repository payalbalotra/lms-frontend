import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Inputs follow DESIGN.md §3.2:
 *   - 36px min height on admin (matches default button).
 *   - 8px radius (--radius-md).
 *   - Border --color-line-3 (the 3.5:1 control boundary), focus border --color-brand-600.
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        'flex min-h-9 w-full rounded-md border border-[var(--color-line-3)] bg-[var(--color-input)]',
        'px-3 py-2 text-sm text-[var(--color-foreground)]',
        'placeholder:text-[var(--color-muted-foreground)]',
        // Focus halo: brand ring on the boundary + halo via box-shadow.
        'transition-colors duration-[180ms] ease-[var(--ease)]',
        'focus-visible:outline-none focus-visible:border-[var(--color-brand-600)] focus-visible:ring-2 focus-visible:ring-[var(--color-brand-tint-2)]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
});
