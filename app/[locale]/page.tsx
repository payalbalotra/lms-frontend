import { redirect } from 'next/navigation';

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
    const me = await fetchMe(cookieHeader);
    if (me.employee.role === 'admin') {
      redirect(`/${locale}/admin/library`);
    } else {
      redirect(`/${locale}/employee/assigned`);
    }
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