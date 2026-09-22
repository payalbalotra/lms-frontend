import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ locale: string; slug: string; subSlug: string }>;
}

export default async function AdminSubcategoryRedirectPage({
  params,
}: PageProps): Promise<never> {
  const { locale, slug } = await params;
  redirect(`/${locale}/admin/library/categories/${slug}`);
}
