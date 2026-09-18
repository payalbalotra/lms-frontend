'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Drawer } from '@/components/ui/drawer';
import { RowActions, type RowActionItem } from '@/components/ui/row-actions';
import {
  createLocation,
  deleteLocation,
  updateLocation,
  ApiException,
} from '@/lib/api';
import type { Location } from '@/lib/types';
import { LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu';

interface LocationsManagerProps {
  locale: string;
  initialLocations: Location[];
}

interface CreateForm {
  name: string;
}

export function LocationsManager({
  locale: _locale,
  initialLocations,
}: LocationsManagerProps): React.ReactElement {
  const t = useTranslations('admin');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const [createForm, setCreateForm] = useState<CreateForm>({
    name: '',
  });

  function refresh(): void {
    router.refresh();
  }

  function resetCreate(): void {
    setCreateForm({ name: '' });
    setCreateError(null);
  }

  function onCreate(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setCreateError(null);
    if (!createForm.name) return;
    startTransition(async () => {
      try {
        await createLocation({ name: createForm.name.trim() });
        resetCreate();
        setCreateOpen(false);
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          setCreateError(err.message);
        } else {
          setCreateError(t('errorGeneric'));
        }
      }
    });
  }

  function startEdit(location: Location): void {
    setEditingId(location.id);
    setEditingName(location.name);
    setEditError(null);
  }

  function cancelEdit(): void {
    setEditingId(null);
    setEditingName('');
    setEditError(null);
  }

  function saveEdit(location: Location): void {
    setEditError(null);
    startTransition(async () => {
      try {
        await updateLocation(location.id, { name: editingName.trim() });
        cancelEdit();
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'LOCATION_NOT_FOUND') setEditError(t('errorNotFound'));
          else setEditError(err.message);
        } else {
          setEditError(t('errorGeneric'));
        }
      }
    });
  }

  function onDelete(location: Location): void {
    setEditError(null);
    startTransition(async () => {
      try {
        await deleteLocation(location.id);
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'LOCATION_IN_USE') setEditError(t('locationsErrorInUse'));
          else setEditError(err.message);
        } else {
          setEditError(t('errorGeneric'));
        }
      }
    });
  }

  function rowItemsFor(l: Location): RowActionItem[] {
    return [
      {
        label: t('actionsEdit'),
        icon: LuPencil,
        onSelect: () => startEdit(l),
      },
      {
        label: t('actionsDelete'),
        icon: LuTrash2,
        destructive: true,
        onSelect: () => onDelete(l),
      },
    ];
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={() => {
            resetCreate();
            setCreateOpen(true);
          }}
        >
          <LuPlus aria-hidden="true" className="text-lg" />
          {t('locationsCreateHeading')}
        </Button>
      </div>

      {editError ? (
        <p role="alert" className="text-sm text-[var(--color-bad)]">
          {editError}
        </p>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {initialLocations.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              {t('locationsEmpty')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--color-line)] bg-[var(--color-panel)] text-left">
                  <tr>
                    <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{t('thLocationsName')}</th>
                    <th className="w-12 px-4 py-2 text-right font-semibold text-[var(--color-ink-2)]">
                      <span className="sr-only">{t('thActions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {initialLocations.map((l) => {
                    const isEditing = editingId === l.id;
                    return (
                      <tr
                        key={l.id}
                        className="border-b border-[var(--color-line)] last:border-b-0"
                      >
                        <td className="px-4 py-2">
                          {isEditing ? (
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              maxLength={120}
                              disabled={isPending}
                            />
                          ) : (
                            l.name
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                disabled={isPending || !editingName.trim()}
                                onClick={() => saveEdit(l)}
                              >
                                {t('actionsSave')}
                              </Button>
                              <Button
                                size="sm"
                                variant="neutral"
                                disabled={isPending}
                                onClick={cancelEdit}
                              >
                                {t('actionsCancel')}
                              </Button>
                            </div>
                          ) : (
                            <RowActions
                              items={rowItemsFor(l)}
                              triggerLabel={`${t('rowActionsLabel')} — ${l.name}`}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('locationsCreateHeading')}
        closeLabel={t('drawerClose')}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="neutral"
              onClick={() => setCreateOpen(false)}
              disabled={isPending}
            >
              {t('actionsCancel')}
            </Button>
            <Button
              type="submit"
              form="create-location-form"
              disabled={isPending || !createForm.name}
            >
              {isPending ? t('locationsCreating') : t('locationsCreate')}
            </Button>
          </>
        }
      >
        <form id="create-location-form" onSubmit={onCreate} noValidate className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="newLocationName">{t('locationsFieldName')}</Label>
            <Input
              id="newLocationName"
              required
              maxLength={120}
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              disabled={isPending}
              autoFocus
            />
          </div>
          {createError ? (
            <p role="alert" className="text-sm text-[var(--color-bad)]">
              {createError}
            </p>
          ) : null}
        </form>
      </Drawer>
    </div>
  );
}