'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import {
  archiveStation,
  createStation,
  updateStation,
  ApiException,
} from '@/lib/api';
import type { Location, Station } from '@/lib/types';

export type StationsManagerState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; entity: Station };

export interface StationsManagerLabels {
  stationName: string;
  stationLocation: string;
  stationCreateHeading: string;
  stationCreate: string;
  stationCreating: string;
  stationCancel: string;
  stationSave: string;
  stationArchive: string;
  stationUnarchive: string;
  stationEdit: string;
  stationErrorLocationNotFound: string;
  drawerClose: string;
  errorGeneric: string;
  errorNotFound: string;
  rowActionsLabel: string;
}

interface StationsManagerProps {
  state: StationsManagerState;
  onStateChange: (next: StationsManagerState) => void;
  locations: Location[];
  locationId: string | null;
  labels: StationsManagerLabels;
}

interface CreateForm {
  name: string;
  locationId: string;
}

interface EditForm {
  name: string;
  isArchived: boolean;
}

/**
 * Drawer-only CRUD for stations. The page-level `<SettingsPanel>` renders
 * the chips and the dashed Add button; this component owns the create +
 * edit drawers and the mutation calls. Driven by an imperative `state`
 * prop so the parent can open either drawer from anywhere on the panel.
 */
export function StationsManager({
  state,
  onStateChange,
  locations,
  locationId,
  labels,
}: StationsManagerProps): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>({
    name: '',
    locationId: locationId ?? locations[0]?.id ?? '',
  });

  function refresh(): void {
    router.refresh();
  }

  function closeDrawer(): void {
    setCreateError(null);
    setEditError(null);
    setEditForm(null);
    onStateChange({ mode: 'closed' });
  }

  function startEdit(station: Station): void {
    setEditForm({ name: station.name, isArchived: station.isArchived });
    setEditError(null);
    onStateChange({ mode: 'edit', entity: station });
  }

  function onCreate(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setCreateError(null);
    if (!createForm.name) return;
    startTransition(async () => {
      try {
        await createStation({
          name: createForm.name.trim(),
          locationId: createForm.locationId,
        });
        setCreateForm({ name: '', locationId: locationId ?? locations[0]?.id ?? '' });
        closeDrawer();
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'LOCATION_NOT_FOUND') {
            setCreateError(labels.stationErrorLocationNotFound);
          } else {
            setCreateError(err.message);
          }
        } else {
          setCreateError(labels.errorGeneric);
        }
      }
    });
  }

  function saveEdit(station: Station): void {
    if (!editForm) return;
    setEditError(null);
    startTransition(async () => {
      try {
        await updateStation(station.id, {
          name: editForm.name.trim(),
          isArchived: editForm.isArchived,
        });
        closeDrawer();
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'STATION_NOT_FOUND') setEditError(labels.errorNotFound);
          else setEditError(err.message);
        } else {
          setEditError(labels.errorGeneric);
        }
      }
    });
  }

  function doArchive(station: Station): void {
    startTransition(async () => {
      try {
        await archiveStation(station.id);
        refresh();
      } catch {
        // surface via row refresh
      }
    });
  }

  function doUnarchive(station: Station): void {
    startTransition(async () => {
      try {
        await updateStation(station.id, { isArchived: false });
        refresh();
      } catch {
        // surface via row refresh
      }
    });
  }

  // The edit form state is captured when `state.mode === 'edit'` so the
  // drawer body stays in sync with whatever the parent requested.
  React.useEffect(() => {
    if (state.mode === 'edit') {
      setEditForm({ name: state.entity.name, isArchived: state.entity.isArchived });
      setEditError(null);
    }
  }, [state]);

  const editingStation = state.mode === 'edit' ? state.entity : null;
  const isCreateOpen = state.mode === 'create';
  const isEditOpen = editingStation !== null;

  return (
    <>
      {/* Create Station Modal */}
      <Modal open={isCreateOpen} onClose={closeDrawer} size="sm">
        <ModalHeader
          title={labels.stationCreateHeading}
          onClose={closeDrawer}
          closeLabel={labels.drawerClose}
        />
        <form onSubmit={onCreate} noValidate>
          <ModalBody className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="newStationName">{labels.stationName}</Label>
              <Input
                id="newStationName"
                required
                maxLength={120}
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                disabled={isPending}
                autoFocus
              />
            </div>
            {locations.length > 1 ? (
              <div className="grid gap-2">
                <Label htmlFor="newStationLocation">{labels.stationLocation}</Label>
                <Select
                  id="newStationLocation"
                  value={createForm.locationId}
                  onChange={(e) => setCreateForm({ ...createForm, locationId: e.target.value })}
                  disabled={isPending}
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            {createError ? (
              <p role="alert" className="text-sm text-[var(--color-bad)]">
                {createError}
              </p>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="neutral"
              onClick={closeDrawer}
              disabled={isPending}
            >
              {labels.stationCancel}
            </Button>
            <Button
              type="submit"
              disabled={isPending || !createForm.name.trim()}
            >
              {isPending ? labels.stationCreating : labels.stationCreate}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit Station Modal */}
      <Modal open={isEditOpen} onClose={closeDrawer} size="sm">
        <ModalHeader
          title={editingStation?.name ?? labels.stationEdit}
          onClose={closeDrawer}
          closeLabel={labels.drawerClose}
        />
        {editingStation && editForm ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editForm.name.trim()) saveEdit(editingStation);
            }}
          >
            <ModalBody className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="editStationName">{labels.stationName}</Label>
                <Input
                  id="editStationName"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  maxLength={120}
                  disabled={isPending}
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--color-ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isArchived}
                  onChange={(e) =>
                    setEditForm({ ...editForm, isArchived: e.target.checked })
                  }
                  disabled={isPending}
                  className="rounded border-[var(--color-line-2)] text-[var(--color-brand)] focus:ring-[var(--color-ring)]"
                />
                <span>{editingStation.isArchived ? labels.stationUnarchive : labels.stationArchive}</span>
              </label>
              {editError ? (
                <p role="alert" className="text-sm text-[var(--color-bad)]">
                  {editError}
                </p>
              ) : null}
            </ModalBody>
            <ModalFooter>
              <div className="mr-auto">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => (editingStation.isArchived ? doUnarchive(editingStation) : doArchive(editingStation))}
                  className="text-xs text-[var(--color-ink-3)] hover:text-[var(--color-bad)]"
                >
                  {editingStation.isArchived ? labels.stationUnarchive : labels.stationArchive}
                </Button>
              </div>
              <Button
                type="button"
                variant="neutral"
                onClick={closeDrawer}
                disabled={isPending}
              >
                {labels.stationCancel}
              </Button>
              <Button
                type="submit"
                disabled={isPending || !editForm.name.trim()}
              >
                {labels.stationSave}
              </Button>
            </ModalFooter>
          </form>
        ) : null}
      </Modal>
    </>
  );
}
