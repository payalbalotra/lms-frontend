import { redirect } from 'next/navigation';

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LoginPage({ params }: LoginPageProps): Promise<never> {
  const { locale } = await params;
  redirect(`/${locale}/admin/library`);
}