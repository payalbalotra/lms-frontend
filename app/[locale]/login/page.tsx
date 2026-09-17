import * as React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { LoginForm } from './login-form';

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LoginPage({ params }: LoginPageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <LoginForm locale={locale} />
    </main>
  );
}