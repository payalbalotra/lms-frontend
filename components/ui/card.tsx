import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Cards follow DESIGN.md §3, radii §2.3:
 *   - 12px radius (rounded-xl). Cards are rectangles, not pills.
 *   - The ground is light, so the card is told apart by its edge: --color-line-2
 *     at 2.1:1 on white. The old hairline was --color-line at 1.27:1, which on a
 *     page this pale is a boundary you infer rather than see.
 *   - Surface is --color-card (white); the soft --e-1 lift stays, but it is the
 *     edge that does the work now.
 */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="card"
        className={cn(
          'rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-card)] text-[var(--color-card-foreground)]',
          className,
        )}
        {...props}
      />
    );
  },
);

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-2 px-6 pt-5 pb-3', className)}
        {...props}
      />
    );
  },
);

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    // Section heading tier — DM Sans from 28px up, weight 700, -0.02em tracking (§2.2).
    return (
      <h2
        ref={ref}
        className={cn(
          'font-[family-name:var(--font-display)] text-xl font-bold tracking-tight',
          className,
        )}
        {...props}
      />
    );
  },
);

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, ...props }, ref) {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-[var(--color-muted-foreground)]', className)}
        {...props}
      />
    );
  },
);

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn('px-6 pb-6', className)} {...props} />;
  },
);

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex items-center px-6 pb-5', className)}
        {...props}
      />
    );
  },
);
