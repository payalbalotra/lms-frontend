import * as React from 'react';

/** Skeleton shown while the edit page resolves the procedure on the
 *  server (client-side navigation to /admin/library/[id]/edit). */
export default function EditProcedureLoading(): React.ReactElement {
  return (
    <div
      className="mx-auto w-full max-w-doc space-y-4 px-4 pt-6 sm:px-6"
      aria-hidden="true"
    >
      <div className="animate-pulse h-8 w-1/2 rounded-[var(--radius-md)] bg-[var(--color-panel-2)]" />
      <div className="animate-pulse h-64 w-full rounded-[var(--radius-lg)] bg-[var(--color-panel)]" />
      <div className="animate-pulse h-4 w-full rounded-[var(--radius-md)] bg-[var(--color-panel-2)]" />
      <div className="animate-pulse h-4 w-2/3 rounded-[var(--radius-md)] bg-[var(--color-panel-2)]" />
    </div>
  );
}
