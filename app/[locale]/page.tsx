import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { fetchMe, ApiException } from '@/lib/api';

// Root locale page: if signed in, send to /employee/assigned; otherwise to /login.
export default async function LocaleRootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<never> {
  const { locale } = await params;

  // Forward the browser's cookies to the backend so /api/auth/me sees the session.
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  try {
    await fetchMe(cookieHeader);
    redirect(`/${locale}/employee/assigned`);
  } catch (err) {
    if (err instanceof ApiException) {
      redirect(`/${locale}/login`);
    }
    // Network or unexpected error: fall back to login (safe default).
    redirect(`/${locale}/login`);
  }

  // Unreachable — both paths above redirect.
  // Make TS happy by referencing headers() so the import isn't dropped.
  void headers;
}