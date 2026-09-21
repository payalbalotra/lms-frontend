'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RowActions, type RowActionItem } from '@/components/ui/row-actions';
import { cn } from '@/lib/utils';
import { createCategory, updateCategory, archiveCategory, ApiException } from '@/lib/api';
import type { Category } from '@/lib/types';
import { LuArchive, LuFolderPlus, LuGlobe, LuHistory, LuLink, LuPencil, LuPlus, LuUndo2, LuX } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';

interface CategoryActionsProps {
  category: Category;
}

export function CategoryActions({ category }: CategoryActionsProps): React.ReactElement {
  const t = useTranslations('admin.library.categories');
  const tCommon = useTranslations('admin');
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [renameOpen, setRenameOpen] = React.useState(false);

  const items: RowActionItem[] = React.useMemo(() => {
    const out: RowActionItem[] = [
      {
        label: t('renameAction'),
        icon: LuPencil,
        onSelect: () => setRenameOpen(true),
      },
    ];
    if (category.isArchived) {
      out.push({
        label: t('unarchive'),
        icon: LuUndo2,
        onSelect: () => {
          void runUnarchive(category);
        },
      });
    } else {
      out.push({
        label: t('archive'),
        icon: LuArchive,
        destructive: true,
        onSelect: () => {
          void runArchive(category);
        },
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, t]);

  async function runArchive(target: Category): Promise<void> {
    setError(null);
    setPending(true);
    try {
      await archiveCategory(target.id);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('lms_categories_updated'));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  async function runUnarchive(target: Category): Promise<void> {
    setError(null);
    setPending(true);
    try {
      await updateCategory(target.id, { isArchived: false });
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('lms_categories_updated'));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <RowActions
        items={items}
        triggerLabel={`${tCommon('rowActionsLabel')} — ${category.nameEn}`}
        className={pending ? 'pointer-events-none opacity-50' : undefined}
      />
      {error ? (
        <span role="alert" className="sr-only">
          {error}
        </span>
      ) : null}

      <Modal
        open={renameOpen}
        onClose={() => {
          setRenameOpen(false);
          setError(null);
        }}
        size="md"
      >
        <CategoryForm
          key={category.id}
          mode="rename"
          category={category}
          pending={pending}
          error={error}
          onPendingChange={setPending}
          onErrorChange={setError}
          onDone={() => {
            setRenameOpen(false);
            router.refresh();
          }}
          onCancel={() => {
            setRenameOpen(false);
            setError(null);
          }}
          cancelLabel={t('cancel')}
          saveLabel={t('save')}
        />
      </Modal>
    </>
  );
}

interface CreateButtonProps {
  locationId: string;
}

export function CreateCategoryButton({ locationId }: CreateButtonProps): React.ReactElement {
  const t = useTranslations('admin.library.categories');
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function close(): void {
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)} disabled={pending} icon={LuPlus}>
        {t('addButton')}
      </Button>

      <Modal open={open} onClose={close} size="md">
        <CategoryForm
          key="create"
          mode="create"
          locationId={locationId}
          category={null}
          pending={pending}
          error={error}
          onPendingChange={setPending}
          onErrorChange={setError}
          onDone={() => {
            close();
            router.refresh();
          }}
          onCancel={close}
          cancelLabel={t('cancel')}
          saveLabel={t('save')}
        />
      </Modal>
    </>
  );
}

interface CategoryFormProps {
  mode: 'create' | 'rename';
  /** Required for `create`; ignored for `rename`. */
  locationId?: string;
  category: Category | null;
  pending: boolean;
  error: string | null;
  onPendingChange: (v: boolean) => void;
  onErrorChange: (v: string | null) => void;
  onDone: () => void;
  onCancel: () => void;
  cancelLabel: string;
  saveLabel: string;
}

const SLUG_REGEX = /[^a-z0-9]+/g;

function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[̀-ͯ]/g, '')
    .replace(SLUG_REGEX, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function CategoryForm({
  mode,
  locationId,
  category,
  pending,
  error,
  onPendingChange,
  onErrorChange,
  onDone,
  onCancel,
  cancelLabel,
  saveLabel,
}: CategoryFormProps): React.ReactElement {
  const t = useTranslations('admin.library.categories');
  const locale = useLocale();
  const isEs = locale === 'es';

  const [nameEn, setNameEn] = React.useState(category?.nameEn ?? '');
  const [nameEs, setNameEs] = React.useState(category?.nameEs ?? '');
  const [slug, setSlug] = React.useState(category?.slug ?? '');
  const [slugDirty, setSlugDirty] = React.useState(mode === 'rename');

  function onNameEnChange(value: string): void {
    setNameEn(value);
    if (mode === 'create' && !slugDirty) {
      setSlug(slugify(value));
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (pending) return;
    onErrorChange(null);
    onPendingChange(true);
    try {
      if (mode === 'create') {
        if (!locationId) throw new Error('Missing locationId');
        await createCategory({
          locationId,
          slug: slugify(slug || nameEn),
          nameEn: nameEn.trim(),
          nameEs: nameEs.trim() || nameEn.trim(),
        });
      } else if (category) {
        await updateCategory(category.id, {
          nameEn: nameEn.trim(),
          nameEs: nameEs.trim() || nameEn.trim(),
        });
      }
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('lms_categories_updated'));
      onDone();
    } catch (err) {
      if (err instanceof ApiException && err.code === 'CATEGORY_SLUG_TAKEN') {
        onErrorChange(t('errors.slugTaken'));
      } else if (err instanceof ApiException) {
        onErrorChange(err.message);
      } else {
        onErrorChange(String(err));
      }
    } finally {
      onPendingChange(false);
    }
  }

  const canSubmit =
    !pending &&
    nameEn.trim().length > 0 &&
    (mode === 'rename' || slug.trim().length > 0);

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      {/* Modal Header */}
      <div className="flex items-start justify-between border-b border-[var(--color-line)] p-6 pb-5">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-panel)] text-[var(--color-ink-2)] text-xl shadow-e1">
            <Icon icon={mode === 'create' ? LuFolderPlus : LuPencil} />
          </div>
          <div className="space-y-0.5">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--color-ink)]">
              {mode === 'create'
                ? isEs
                  ? 'Crear categoría'
                  : 'Create category'
                : isEs
                  ? 'Renombrar categoría'
                  : 'Rename category'}
            </h2>
            <p className="text-sm text-[var(--color-ink-2)] font-medium">
              {isEs
                ? 'Añade una categoría para organizar tus procedimientos en la biblioteca.'
                : 'Add a category to organize your procedures in the library.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="flex size-8 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] transition-colors"
        >
          <LuX aria-hidden="true" className="text-xl" />
        </button>
      </div>

      {/* Modal Form Body */}
      <div className="p-6 space-y-6">
        {/* Category Details Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">
              {isEs ? 'Detalles de la categoría' : 'Category details'}
            </h3>
            <p className="text-sm text-[var(--color-ink-2)] font-medium mt-0.5">
              {isEs
                ? 'Introduce el nombre en inglés. El nombre en español es opcional.'
                : 'Enter the name in English. The Spanish name is optional and can be added later.'}
            </p>
          </div>

          {/* English Name Input */}
          <div className="space-y-1">
            <Label
              htmlFor="category-name-en"
              className="text-sm font-semibold text-[var(--color-ink)]"
            >
              {isEs ? 'Nombre de la categoría (Inglés)' : 'Category name (English)'}{' '}
              <span aria-hidden="true" className="text-[var(--color-bad)]">
                *
              </span>
            </Label>
            <Input
              id="category-name-en"
              name="nameEn"
              value={nameEn}
              onChange={(e) => onNameEnChange(e.currentTarget.value.slice(0, 100))}
              placeholder={isEs ? 'ej. Procedimientos de Estación' : 'Station Procedures'}
              maxLength={100}
              required
              autoFocus
              autoComplete="off"
            />
            <div className="text-sm text-[var(--color-ink-3)] text-right font-mono font-semibold pt-0.5">
              {nameEn.length} / 100
            </div>
          </div>

          {/* Spanish Name Input */}
          <div className="space-y-1">
            <Label
              htmlFor="category-name-es"
              className="text-sm font-semibold text-[var(--color-ink)]"
            >
              {isEs ? 'Nombre en español' : 'Spanish name'}{' '}
              <span className="text-[var(--color-ink-3)] font-normal">(optional)</span>
            </Label>
            <Input
              id="category-name-es"
              name="nameEs"
              value={nameEs}
              onChange={(e) => setNameEs(e.currentTarget.value)}
              placeholder={isEs ? 'Procedimientos de estación' : 'Procedimientos de estación'}
              autoComplete="off"
            />
            <p className="flex items-center gap-2 text-sm text-[var(--color-ink-2)] pt-1 font-medium">
              <LuGlobe aria-hidden="true" className="text-sm text-[var(--color-ink-3)]" />
              {isEs
                ? 'Se usa cuando la biblioteca se ve en español.'
                : 'Used when the library is viewed in Spanish.'}
            </p>
          </div>
        </div>

        {/* URL Identifier Callout Card */}
        {mode === 'create' && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel)] text-[var(--color-ink-2)] text-sm mt-0.5 shadow-e1">
                <LuLink aria-hidden="true" />
              </span>
              <div className="space-y-0.5">
                <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                  {isEs ? 'Identificador URL' : 'URL identifier'}
                </h4>
                <p className="text-sm text-[var(--color-ink-2)] font-medium">
                  {isEs
                    ? 'Generado automáticamente a partir del nombre en inglés.'
                    : 'Automatically generated from the English name.'}
                </p>
              </div>
            </div>

            <div className="relative">
              <Input
                id="category-slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.currentTarget.value);
                  setSlugDirty(true);
                }}
                required
                autoComplete="off"
                spellCheck={false}
                className="pr-10 font-mono text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-3)] pointer-events-none">
                <LuHistory aria-hidden="true" className="text-sm" />
              </span>
            </div>

            <p className="text-sm text-[var(--color-ink-3)] font-medium">
              {isEs ? 'Puedes editarlo más tarde si es necesario.' : 'You can edit it later if needed.'}
            </p>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-[var(--radius-md)] bg-[var(--color-bad-tint)] px-4 py-2 text-sm font-medium text-[var(--color-bad)]"
          >
            {error}
          </p>
        )}
      </div>

      {/* Modal Action Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-[var(--color-line)] bg-[var(--color-wash)] px-6 py-4">
        <Button
          type="button"
          variant="neutral"
          onClick={onCancel}
          disabled={pending}
          className="rounded-full px-5 text-sm font-semibold"
        >
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!canSubmit}
          className="rounded-full bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white px-5 text-sm font-semibold shadow-e1"
        >
          {mode === 'create' ? (isEs ? 'Crear categoría' : 'Create category') : saveLabel}
        </Button>
      </div>
    </form>
  );
}
