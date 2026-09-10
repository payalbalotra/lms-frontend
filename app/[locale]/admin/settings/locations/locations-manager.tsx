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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  createLocation,
  deleteLocation,
  updateLocation,
  ApiException,
} from '@/lib/api';
import type { Location } from '@/lib/types';

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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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

  function onDeleteClick(location: Location): void {
    if (confirmDelete !== location.id) {
      setConfirmDelete(location.id);
      return;
    }
    startTransition(async () => {
      try {
        await deleteLocation(location.id);
        setConfirmDelete(null);
        refresh();
      } catch (err) {
        setConfirmDelete(null);
        if (err instanceof ApiException) {
          if (err.code === 'LOCATION_IN_USE') {
            setEditError(t('locationsErrorInUse'));
          } else {
            setEditError(err.message);
          }
        } else {
          setEditError(t('errorGeneric'));
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('locationsCreateHeading')}</CardTitle>
        </CardHeader>
        <form onSubmit={onCreate} noValidate>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1 sm:col-span-2">
              <Label htmlFor="newLocationName">{t('locationsFieldName')}</Label>
              <Input
                id="newLocationName"
                required
                maxLength={120}
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={isPending || !createForm.name}
              >
                {isPending ? t('locationsCreating') : t('locationsCreate')}
              </Button>
            </div>
            {createError ? (
              <p role="alert" className="text-sm text-red-600 sm:col-span-3">
                {createError}
              </p>
            ) : null}
          </CardContent>
        </form>
      </Card>

      {editError ? (
        <p role="alert" className="text-sm text-red-600">
          {editError}
        </p>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {initialLocations.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--color-muted-foreground)]">
              {t('locationsEmpty')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--color-border)] bg-[var(--color-muted)] text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('thLocationsName')}</th>
                    <th className="px-3 py-2 font-medium">{t('thActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {initialLocations.map((l) => {
                    const isEditing = editingId === l.id;
                    return (
                      <tr
                        key={l.id}
                        className="border-b border-[var(--color-border)] last:border-b-0"
                      >
                        <td className="px-3 py-2">
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
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                disabled={isPending || !editingName.trim()}
                                onClick={() => saveEdit(l)}
                              >
                                {t('actionsSave')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isPending}
                                onClick={cancelEdit}
                              >
                                {t('actionsCancel')}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isPending}
                                onClick={() => startEdit(l)}
                              >
                                {t('actionsEdit')}
                              </Button>
                              {confirmDelete === l.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={isPending}
                                    onClick={() => onDeleteClick(l)}
                                  >
                                    {t('confirmYes')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isPending}
                                    onClick={() => setConfirmDelete(null)}
                                  >
                                    {t('confirmNo')}
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isPending}
                                  onClick={() => onDeleteClick(l)}
                                >
                                  {t('actionsDelete')}
                                </Button>
                              )}
                            </div>
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
    </div>
  );
}