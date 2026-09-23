'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RowActions, type RowActionItem } from '@/components/ui/row-actions';
import { cn } from '@/lib/utils';
import { useCreateCategory, useUpdateCategory, useArchiveCategory } from '@/services/categories/hooks';
import type { Category } from '@/lib/types';
import {
  LuArchive,
  LuBrush,
  LuBuilding2,
  LuChefHat,
  LuClipboardList,
  LuFolder,
  LuPackage,
  LuPencil,
  LuPlus,
  LuShieldCheck,
  LuTruck,
  LuUndo2,
  LuUtensils,
  LuWrench,
  LuX,
  LuChevronDown,
} from 'react-icons/lu';
import { IconTile } from '@/components/ui/icon-tile';

const AVAILABLE_ICONS = [
  { id: 'LuFolder', label: 'Folder', icon: LuFolder },
  { id: 'LuUtensils', label: 'Recipes', icon: LuUtensils },
  { id: 'LuBuilding2', label: 'Station', icon: LuBuilding2 },
  { id: 'LuWrench', label: 'Equipment', icon: LuWrench },
  { id: 'LuBrush', label: 'Cleaning', icon: LuBrush },
  { id: 'LuTruck', label: 'Delivery', icon: LuTruck },
  { id: 'LuShieldCheck', label: 'Safety', icon: LuShieldCheck },
  { id: 'LuClipboardList', label: 'Checklist', icon: LuClipboardList },
  { id: 'LuChefHat', label: 'Chef', icon: LuChefHat },
  { id: 'LuPackage', label: 'Stock', icon: LuPackage },
] as const;

interface CategoryActionsProps {
  category: Category;
}

export function CategoryActions({ category }: CategoryActionsProps): React.ReactElement {
  const t = useTranslations('admin.library.categories');
  const tCommon = useTranslations('admin');
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [renameOpen, setRenameOpen] = React.useState(false);

  const archiveMutation = useArchiveCategory();
  const updateMutation = useUpdateCategory();
  const pending = isPending || archiveMutation.isPending || updateMutation.isPending;

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
  }, [category, t]);

  async function runArchive(target: Category): Promise<void> {
    setError(null);
    try {
      await archiveMutation.mutateAsync(target.id);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  }

  async function runUnarchive(target: Category): Promise<void> {
    setError(null);
    try {
      await updateMutation.mutateAsync({ id: target.id, input: { isArchived: false } });
      router.refresh();
    } catch (err: any) {
      setError(err?.message || String(err));
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
          onPendingChange={setIsPending}
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
      <Button
        variant="primary"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="shrink-0 font-semibold shadow-2xs"
      >
        <LuPlus className="text-base" />
        <span>{t('addButton')}</span>
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
  const locale = useLocale();
  const isEs = locale === 'es';

  const [nameEn, setNameEn] = React.useState(category?.nameEn ?? '');
  const [nameEs, setNameEs] = React.useState(category?.nameEs ?? '');
  const [icon, setIcon] = React.useState(category?.icon ?? 'LuFolder');
  const [showIconPicker, setShowIconPicker] = React.useState(false);

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (pending) return;
    onErrorChange(null);
    onPendingChange(true);

    // Only one of EN / ES is required. Whichever is filled wins; the other
    // falls back to the filled one so the persisted record always has both
    // populated and the reader side (EN-first, ES-first) still works.
    const trimmedEn = nameEn.trim();
    const trimmedEs = nameEs.trim();
    const finalEn = trimmedEn || trimmedEs;
    const finalEs = trimmedEs || trimmedEn;

    try {
      if (mode === 'create') {
        if (!locationId) throw new Error('Missing locationId');
        await createMutation.mutateAsync({
          locationId,
          nameEn: finalEn,
          nameEs: finalEs,
          icon,
        });
      } else if (category) {
        await updateMutation.mutateAsync({
          id: category.id,
          input: {
            nameEn: finalEn,
            nameEs: finalEs,
            icon,
          },
        });
      }
      onDone();
    } catch (err: any) {
      onErrorChange(err?.message || String(err));
    } finally {
      onPendingChange(false);
    }
  }

  // Either name is enough — Spanish is optional, English is optional, but at
  // least one has to be filled before the user can save.
  const canSubmit =
    !pending && (nameEn.trim().length > 0 || nameEs.trim().length > 0);
  const currentIconObj = AVAILABLE_ICONS.find((i) => i.id === icon) ?? AVAILABLE_ICONS[0];
  const CurrentIconComp = currentIconObj.icon;

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      <ModalHeader
        title={
          mode === 'create'
            ? isEs
              ? 'Crear categoría'
              : 'Create category'
            : isEs
              ? 'Editar categoría'
              : 'Edit category'
        }
        description={
          mode === 'create'
            ? isEs
              ? 'Agrega una categoría para organizar tus procedimientos.'
              : 'Add a category to organize your procedures in the library.'
            : isEs
              ? 'Cambia su nombre o su icono.'
              : 'Change its name or its icon.'
        }
        onClose={onCancel}
        closeLabel={isEs ? 'Cerrar' : 'Close'}
      />

      {/* The header draws no icon: the chosen one is previewed beside Choose
          icon below, and a second copy in the header was the same mark twice. */}
      <ModalBody className="space-y-4">
        {/* Either name is enough; neither field is marked required on its own,
            and the line under them says so once. */}
        <div className="space-y-1.5">
          <Label htmlFor="cat-name-en">{isEs ? 'Nombre (Inglés)' : 'Name (English)'}</Label>
          <Input
            id="cat-name-en"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="e.g. Food Safety"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-name-es">{isEs ? 'Nombre (Español)' : 'Name (Spanish)'}</Label>
          <Input
            id="cat-name-es"
            value={nameEs}
            onChange={(e) => setNameEs(e.target.value)}
            placeholder="e.g. Seguridad Alimentaria"
          />
          <p className="text-sm text-[var(--color-ink-3)]">
            {isEs
              ? 'Al menos uno de los dos nombres es obligatorio.'
              : 'At least one of the two names is required.'}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-icon-toggle">{isEs ? 'Icono' : 'Icon'}</Label>
          <div className="flex items-center gap-3">
            <IconTile size="md" icon={CurrentIconComp} />
            <Button
              id="cat-icon-toggle"
              type="button"
              variant="neutral"
              icon={LuChevronDown}
              aria-expanded={showIconPicker}
              onClick={() => setShowIconPicker(!showIconPicker)}
            >
              {isEs ? 'Elegir icono' : 'Choose icon'}
            </Button>
          </div>

          {showIconPicker && (
            <div className="mt-2 grid grid-cols-4 gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] p-2">
              {AVAILABLE_ICONS.map((item) => {
                const isSelected = icon === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setIcon(item.id);
                      setShowIconPicker(false);
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-[var(--radius-md)] border p-2 text-sm transition-colors',
                      isSelected
                        ? 'border-[var(--color-ring)] bg-[var(--color-brand-tint)] font-semibold text-[var(--color-brand-700)]'
                        : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-panel)]',
                    )}
                  >
                    <IconComponent aria-hidden="true" className="text-lg" />
                    <span className="w-full truncate text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-[var(--radius-md)] bg-[var(--color-bad-tint)] px-3 py-2 text-sm font-medium text-[var(--color-bad)]"
          >
            {error}
          </p>
        )}
      </ModalBody>

      <ModalFooter>
        <Button type="button" variant="neutral" onClick={onCancel} disabled={pending}>
          {cancelLabel}
        </Button>
        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {mode === 'create' ? (isEs ? 'Crear' : 'Create') : saveLabel}
        </Button>
      </ModalFooter>
    </form>
  );
}
