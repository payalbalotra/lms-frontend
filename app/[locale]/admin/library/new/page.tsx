import * as React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { NewProcedureForm } from './new-procedure-form';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

const SEED_CATEGORIES: ReadonlyArray<{
  slug: string;
  icon: string;
  labelKey:
    | 'categoryRecipes'
    | 'categoryEquipment'
    | 'categoryStation'
    | 'categoryCleaning'
    | 'categoryAdmin'
    | 'categoryDelivery';
}> = [
  { slug: 'recipes', icon: 'ri-restaurant-line', labelKey: 'categoryRecipes' },
  { slug: 'equipment', icon: 'ri-tools-line', labelKey: 'categoryEquipment' },
  { slug: 'station', icon: 'ri-community-line', labelKey: 'categoryStation' },
  { slug: 'cleaning', icon: 'ri-brush-line', labelKey: 'categoryCleaning' },
  { slug: 'admin', icon: 'ri-file-shield-2-line', labelKey: 'categoryAdmin' },
  { slug: 'delivery', icon: 'ri-truck-line', labelKey: 'categoryDelivery' },
];

export default async function AdminLibraryNewPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="w-full">
      <NewProcedureForm
        locale={locale}
        categories={SEED_CATEGORIES.map((c) => ({
          slug: c.slug,
          icon: c.icon,
          labelKey: c.labelKey,
        }))}
      />
    </div>
  );
}