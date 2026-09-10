import * as React from 'react';
import { cn } from '@/lib/utils';

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
        'flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm',
        'placeholder:text-[var(--color-muted-foreground)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
});