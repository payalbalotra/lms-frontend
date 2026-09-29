import * as React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { EmployeeDetailClient } from './employee-detail-client';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

/**
 * Server shell. The detail page is client-driven (localStorage is
 * unreadable on the server, and `getTrainingRowsForEmployee` is a pure
 * selector that the client runs on every render). The shell's only job
 * is to set the locale for next-intl and hand off to the client.
 */
export default async function AdminEmployeeDetailPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  return <EmployeeDetailClient locale={locale} />;
}
