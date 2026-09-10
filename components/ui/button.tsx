import * as React from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  outline: 'border border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-muted)]',
  secondary: 'bg-[var(--color-muted)] text-[var(--color-foreground)] hover:opacity-80',
  ghost: 'hover:bg-[var(--color-muted)]',
  link: 'text-[var(--color-primary)] underline-offset-4 hover:underline',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3',
  lg: 'h-11 px-6',
  icon: 'h-10 w-10',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', size = 'default', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-slot="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});