import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchMe, ApiException } from '@/lib/api';

// Root locale page: if signed in, send to /employee/assigned or /admin/library; otherwise to /login.
export default async function LocaleRootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<never> {
  const { locale } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
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
}