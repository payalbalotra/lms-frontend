'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Drawer } from '@/components/ui/drawer';
import {
  createRole,
  deleteRole,
  updateRole,
  ApiException,
} from '@/lib/api';
import type { Role } from '@/lib/types';

export type RolesManagerState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; entity: Role };

export interface RolesManagerLabels {
  roleCreateHeading: string;
  roleCreate: string;
  roleCreating: string;
  roleCancel: string;
  roleSave: string;
  roleName: string;
  roleDelete: string;
  roleEdit: string;
  roleErrorInUse: string;
  drawerClose: string;
  errorGeneric: string;
  errorNotFound: string;
}

interface RolesManagerProps {
  state: RolesManagerState;
  onStateChange: (next: RolesManagerState) => void;
  labels: RolesManagerLabels;
}

interface CreateForm {
  name: string;
}

interface EditForm {
  name: string;
}

/**
 * Drawer-only CRUD for roles. The page-level panel renders the chips; this
 * component owns the create + edit drawers and the mutation calls. Roles do
 * not have an `isArchived` state — they are deleted outright, with a
 * `ROLE_IN_USE` error surfaced if employees still reference the role.
 */
export function RolesManager({
  state,
  onStateChange,
  labels,
}: RolesManagerProps): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>({ name: '' });

  function refresh(): void {
    router.refresh();
  }

  function closeDrawer(): void {
    setCreateError(null);
    setEditError(null);
    setEditForm(null);
    onStateChange({ mode: 'closed' });
  }

  function startEdit(role: Role): void {
    setEditForm({ name: role.name });
    setEditError(null);
    onStateChange({ mode: 'edit', entity: role });
  }

  function onCreate(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setCreateError(null);
    if (!createForm.name) return;
    startTransition(async () => {
      try {
        await createRole({
          name: createForm.name.trim(),
          // Clearance isn't surfaced in the UI yet, but the backend still
          // requires it. Default to `general` so a freshly-invited line cook
          // can use the app; the role table does not represent a permission
          // tier.
          clearanceLevel: 'general',
        });
        setCreateForm({ name: '' });
        closeDrawer();
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          setCreateError(err.message);
        } else {
          setCreateError(labels.errorGeneric);
        }
      }
    });
  }

  function saveEdit(role: Role): void {
    if (!editForm) return;
    setEditError(null);
    startTransition(async () => {
      try {
        await updateRole(role.id, {
          name: editForm.name.trim(),
          // Round-trip the existing clearance value — the field is hidden in
          // the UI but the backend still validates it.
          clearanceLevel: role.clearanceLevel,
        });
        closeDrawer();
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'ROLE_NOT_FOUND') setEditError(labels.errorNotFound);
          else setEditError(err.message);
        } else {
          setEditError(labels.errorGeneric);
        }
      }
    });
  }

  function onDelete(role: Role): void {
    setEditError(null);
    startTransition(async () => {
      try {
        await deleteRole(role.id);
        closeDrawer();
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'ROLE_IN_USE') setEditError(labels.roleErrorInUse);
          else setEditError(err.message);
        } else {
          setEditError(labels.errorGeneric);
        }
      }
    });
  }

  React.useEffect(() => {
    if (state.mode === 'edit') {
      setEditForm({ name: state.entity.name });
      setEditError(null);
    }
  }, [state]);

  const editingRole = state.mode === 'edit' ? state.entity : null;
  const isCreateOpen = state.mode === 'create';
  const isEditOpen = editingRole !== null;

  return (
    <>
      <Drawer
        open={isCreateOpen}
        onClose={closeDrawer}
        title={labels.roleCreateHeading}
        closeLabel={labels.drawerClose}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="neutral"
              onClick={closeDrawer}
              disabled={isPending}
            >
              {labels.roleCancel}
            </Button>
            <Button
              type="submit"
              form="create-role-form"
              disabled={isPending || !createForm.name}
            >
              {isPending ? labels.roleCreating : labels.roleCreate}
            </Button>
          </>
        }
      >
        <form id="create-role-form" onSubmit={onCreate} noValidate className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="newRoleName">{labels.roleName}</Label>
            <Input
              id="newRoleName"
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

      <Drawer
        open={isEditOpen}
        onClose={closeDrawer}
        title={editingRole?.name ?? labels.roleEdit}
        closeLabel={labels.drawerClose}
        size="md"
        footer={
          editingRole ? (
            <>
              <Button
                type="button"
                variant="neutral"
                onClick={closeDrawer}
                disabled={isPending}
              >
                {labels.roleCancel}
              </Button>
              <Button
                type="button"
                onClick={() => editingRole && saveEdit(editingRole)}
                disabled={isPending || !editForm?.name}
              >
                {labels.roleSave}
              </Button>
            </>
          ) : null
        }
      >
        {editingRole && editForm ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="editRoleName">{labels.roleName}</Label>
              <Input
                id="editRoleName"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                maxLength={120}
                disabled={isPending}
              />
            </div>
            {editError ? (
              <p role="alert" className="text-sm text-[var(--color-bad)]">
                {editError}
              </p>
            ) : null}
            {/* Delete is one click deeper than edit (DESIGN.md §3.6). It
                surfaces inside the same edit drawer so the destructive
                action lives one level under the chip × icon, never on
                the chip row directly. */}
            <div className="flex justify-end border-t border-[var(--color-line)] pt-3">
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => editingRole && onDelete(editingRole)}
              >
                {labels.roleDelete}
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </>
  );
}
