'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Drawer } from '@/components/ui/drawer';
import { RowActions, type RowActionItem } from '@/components/ui/row-actions';
import {
  createRole,
  deleteRole,
  updateRole,
  ApiException,
} from '@/lib/api';
import type { ClearanceLevel, Role } from '@/lib/types';
import { LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<EditForm | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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

  function onDelete(role: Role): void {
    setEditError(null);
    startTransition(async () => {
      try {
        await deleteRole(role.id);
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'ROLE_IN_USE') setEditError(t('rolesErrorInUse'));
          else setEditError(err.message);
        } else {
          setEditError(t('errorGeneric'));
        }
      }
    });
  }

  function rowItemsFor(r: Role): RowActionItem[] {
    return [
      {
        label: t('actionsEdit'),
        icon: LuPencil,
        onSelect: () => startEdit(r),
      },
      {
        label: t('actionsDelete'),
        icon: LuTrash2,
        destructive: true,
        onSelect: () => onDelete(r),
      },
    ];
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          icon={LuPlus}
          onClick={() => {
            resetCreate();
            setCreateOpen(true);
          }}
        >
          {t('rolesCreateHeading')}
        </Button>
      </div>

      {editError ? (
        <p role="alert" className="text-sm text-[var(--color-bad)]">
          {editError}
        </p>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {initialRoles.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              {t('rolesEmpty')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="atable">
                <thead>
                  <tr>
                    <th>{t('thRolesName')}</th>
                    <th>{t('thRolesClearance')}</th>
                    <th>
                      <span className="sr-only">{t('thActions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {initialRoles.map((r) => {
                    const isEditing = editingId === r.id && editingForm !== null;
                    return (
                      <tr
                        key={r.id}
                      >
                        <td>
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
                        <td>
                          {isEditing ? (
                            <Select
                              value={editingForm.clearanceLevel}
                              onChange={(e) =>
                                setEditingForm({
                                  ...editingForm,
                                  clearanceLevel: e.target.value as ClearanceLevel,
                                })
                              }
                              disabled={isPending}
                              className="h-tap-admin w-auto px-2"
                            >
                              <option value="general">general</option>
                              <option value="station">station</option>
                              <option value="confidential">confidential</option>
                              <option value="master">master</option>
                            </Select>
                          ) : (
                            r.clearanceLevel
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={isPending || !editingForm.name}
                                onClick={() => saveEdit(r)}
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
                              items={rowItemsFor(r)}
                              triggerLabel={`${t('rowActionsLabel')}: ${r.name}`}
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
        title={t('rolesCreateHeading')}
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
              form="create-role-form"
              disabled={isPending || !createForm.name}
            >
              {isPending ? t('rolesCreating') : t('rolesCreate')}
            </Button>
          </>
        }
      >
        <form id="create-role-form" onSubmit={onCreate} noValidate className="grid gap-4">
          <div className="grid gap-2">
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
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="newRoleClearance">{t('rolesFieldClearance')}</Label>
            <Select
              id="newRoleClearance"
              value={createForm.clearanceLevel}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  clearanceLevel: e.target.value as ClearanceLevel,
                })
              }
              disabled={isPending}
            >
              <option value="general">general</option>
              <option value="station">station</option>
              <option value="confidential">confidential</option>
              <option value="master">master</option>
            </Select>
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