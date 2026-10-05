import * as React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { AuthShell } from '@/components/auth/auth-shell';
import { InviteLinkForm } from './invite-link-form';

interface InviteTokenPageProps {
  params: Promise<{ locale: string; token: string }>;
}

export default async function InviteTokenPage({
  params,
}: InviteTokenPageProps): Promise<React.ReactElement> {
  const { locale, token } = await params;
  setRequestLocale(locale);

  return (
    <AuthShell locale={locale}>
      <InviteLinkForm locale={locale} token={token} />
    </AuthShell>
  );
}
