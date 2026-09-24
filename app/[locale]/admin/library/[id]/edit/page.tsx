import * as React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { EditProcedureLoader } from './edit-procedure-loader';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AdminLibraryEditPage({ params }: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <EditProcedureLoader locale={locale} id={id} />;
}
