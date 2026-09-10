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
  createRole,
  deleteRole,
  updateRole,
  ApiException,
} from '@/lib/api';
import type { ClearanceLevel, Role } from '@/lib/types';

interface RolesManagerProps {
  locale: string;
  initialRoles: Role[];
}

interface CreateForm {
  name: string;
  clearanceLevel: ClearanceLevel;
}

interface EditForm {
  name: string;
  clearanceLevel: ClearanceLevel;
}

export function RolesManager({
  locale: _locale,
  initialRoles,
}: RolesManagerProps): React.ReactElement {
  const t = useTranslations('admin');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<EditForm | null>(null);

  const [createForm, setCreateForm] = useState<CreateForm>({
    name: '',
    clearanceLevel: 'general',
  });

  function refresh(): void {
    router.refresh();
  }

  function resetCreate(): void {
    setCreateForm({ name: '', clearanceLevel: 'general' });
    setCreateError(null);
  }

  function onCreate(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setCreateError(null);
    if (!createForm.name) return;
    startTransition(async () => {
      try {
        await createRole({
          name: createForm.name.trim(),
          clearanceLevel: createForm.clearanceLevel,
        });
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

  function startEdit(role: Role): void {
    setEditingId(role.id);
    setEditingForm({ name: role.name, clearanceLevel: role.clearanceLevel });
    setEditError(null);
  }

  function cancelEdit(): void {
    setEditingId(null);
    setEditingForm(null);
    setEditError(null);
  }

  function saveEdit(role: Role): void {
    if (!editingForm) return;
    setEditError(null);
    startTransition(async () => {
      try {
        await updateRole(role.id, {
          name: editingForm.name.trim(),
          clearanceLevel: editingForm.clearanceLevel,
        });
        cancelEdit();
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'ROLE_NOT_FOUND') setEditError(t('errorNotFound'));
          else setEditError(err.message);
        } else {
          setEditError(t('errorGeneric'));
        }
      }
    });
  }

  function onDeleteClick(role: Role): void {
    if (confirmDelete !== role.id) {
      setConfirmDelete(role.id);
      return;
    }
    startTransition(async () => {
      try {
        await deleteRole(role.id);
        setConfirmDelete(null);
        refresh();
      } catch (err) {
        setConfirmDelete(null);
        if (err instanceof ApiException) {
          if (err.code === 'ROLE_IN_USE') {
            setEditError(t('rolesErrorInUse'));
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
          <CardTitle>{t('rolesCreateHeading')}</CardTitle>
        </CardHeader>
        <form onSubmit={onCreate} noValidate>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1 sm:col-span-2">
              <Label htmlFor="newRoleName">{t('rolesFieldName')}</Label>
              <Input
                id="newRoleName"
                required
                maxLength={120}
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                disabled={isPending}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="newRoleClearance">{t('rolesFieldClearance')}</Label>
              <select
                id="newRoleClearance"
                value={createForm.clearanceLevel}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    clearanceLevel: e.target.value as ClearanceLevel,
                  })
                }
                disabled={isPending}
                className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              >
                <option value="general">general</option>
                <option value="station">station</option>
                <option value="confidential">confidential</option>
                <option value="master">master</option>
              </select>
            </div>
            <div className="flex items-end sm:col-span-2">
              <Button
                type="submit"
                disabled={isPending || !createForm.name}
              >
                {isPending ? t('rolesCreating') : t('rolesCreate')}
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
          {initialRoles.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--color-muted-foreground)]">
              {t('rolesEmpty')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--color-border)] bg-[var(--color-muted)] text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('thRolesName')}</th>
                    <th className="px-3 py-2 font-medium">{t('thRolesClearance')}</th>
                    <th className="px-3 py-2 font-medium">{t('thActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {initialRoles.map((r) => {
                    const isEditing = editingId === r.id && editingForm !== null;
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-[var(--color-border)] last:border-b-0"
                      >
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <Input
                              value={editingForm.name}
                              onChange={(e) =>
                                setEditingForm({
                                  ...editingForm,
                                  name: e.target.value,
                                })
                              }
                              maxLength={120}
                              disabled={isPending}
                            />
                          ) : (
                            r.name
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <select
                              value={editingForm.clearanceLevel}
                              onChange={(e) =>
                                setEditingForm({
                                  ...editingForm,
                                  clearanceLevel: e.target.value as ClearanceLevel,
                                })
                              }
                              disabled={isPending}
                              className="flex h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 text-sm"
                            >
                              <option value="general">general</option>
                              <option value="station">station</option>
                              <option value="confidential">confidential</option>
                              <option value="master">master</option>
                            </select>
                          ) : (
                            r.clearanceLevel
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                disabled={isPending || !editingForm.name}
                                onClick={() => saveEdit(r)}
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
                                onClick={() => startEdit(r)}
                              >
                                {t('actionsEdit')}
                              </Button>
                              {confirmDelete === r.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={isPending}
                                    onClick={() => onDeleteClick(r)}
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
                                  onClick={() => onDeleteClick(r)}
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
