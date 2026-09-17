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
import { StatusPill } from '@/components/ui/status-pill';
import { Drawer } from '@/components/ui/drawer';
import { RowActions, type RowActionItem } from '@/components/ui/row-actions';
import {
  archiveStation,
  createStation,
  updateStation,
  ApiException,
} from '@/lib/api';
import type { Location, Station } from '@/lib/types';

interface StationsManagerProps {
  locale: string;
  initialStations: Station[];
  locations: Location[];
  locationId: string;
}

interface CreateForm {
  name: string;
  locationId: string;
}

interface EditForm {
  name: string;
  isArchived: boolean;
}

export function StationsManager({
  locale: _locale,
  initialStations,
  locations,
  locationId,
}: StationsManagerProps): React.ReactElement {
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
    locationId,
  });

  function refresh(): void {
    router.refresh();
  }

  function resetCreate(): void {
    setCreateForm({ name: '', locationId });
    setCreateError(null);
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
        resetCreate();
        setCreateOpen(false);
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'LOCATION_NOT_FOUND') setCreateError(t('stationsErrorLocationNotFound'));
          else setCreateError(err.message);
        } else {
          setCreateError(t('errorGeneric'));
        }
      }
    });
  }

  function startEdit(station: Station): void {
    setEditingId(station.id);
    setEditingForm({
      name: station.name,
      isArchived: station.isArchived,
    });
    setEditError(null);
  }

  function cancelEdit(): void {
    setEditingId(null);
    setEditingForm(null);
    setEditError(null);
  }

  function saveEdit(station: Station): void {
    if (!editingForm) return;
    setEditError(null);
    startTransition(async () => {
      try {
        await updateStation(station.id, {
          name: editingForm.name.trim(),
          isArchived: editingForm.isArchived,
        });
        cancelEdit();
        refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === 'STATION_NOT_FOUND') setEditError(t('errorNotFound'));
          else setEditError(err.message);
        } else {
          setEditError(t('errorGeneric'));
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

  function rowItemsFor(s: Station): RowActionItem[] {
    if (s.isArchived) {
      return [
        {
          label: t('actionsEdit'),
          icon: 'ri-pencil-line',
          onSelect: () => startEdit(s),
        },
        {
          label: t('actionsUnarchive'),
          icon: 'ri-inbox-archive-line',
          onSelect: () => doUnarchive(s),
        },
      ];
    }
    return [
      {
        label: t('actionsEdit'),
        icon: 'ri-pencil-line',
        onSelect: () => startEdit(s),
      },
      {
        label: t('actionsArchive'),
        icon: 'ri-inbox-archive-line',
        destructive: true,
        onSelect: () => doArchive(s),
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
          <i aria-hidden="true" className="ri-add-line text-[length:var(--text-lg)]" />
          {t('stationsCreateHeading')}
        </Button>
      </div>

      {editError ? (
        <p role="alert" className="text-sm text-[var(--color-bad)]">
          {editError}
        </p>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {initialStations.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              {t('stationsEmpty')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--color-line)] bg-[var(--color-panel)] text-left">
                  <tr>
                    <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{t('thStationsName')}</th>
                    <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{t('thStationsStatus')}</th>
                    <th className="w-12 px-4 py-2 text-right font-semibold text-[var(--color-ink-2)]">
                      <span className="sr-only">{t('thActions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {initialStations.map((s) => {
                    const isEditing = editingId === s.id && editingForm !== null;
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-[var(--color-line)] last:border-b-0"
                      >
                        <td className="px-4 py-2">
                          {isEditing ? (
                            <Input
                              value={editingForm.name}
                              onChange={(e) =>
                                setEditingForm({ ...editingForm, name: e.target.value })
                              }
                              maxLength={120}
                              disabled={isPending}
                            />
                          ) : (
                            s.name
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isEditing ? (
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={editingForm.isArchived}
                                onChange={(e) =>
                                  setEditingForm({
                                    ...editingForm,
                                    isArchived: e.target.checked,
                                  })
                                }
                                disabled={isPending}
                              />
                              {t('stationArchivedBadge')}
                            </label>
                          ) : (
                            <StatusPill tone={s.isArchived ? 'neutral' : 'ok'}>
                              {s.isArchived ? t('stationArchivedBadge') : t('stationActiveBadge')}
                            </StatusPill>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                disabled={isPending || !editingForm.name}
                                onClick={() => saveEdit(s)}
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
                              items={rowItemsFor(s)}
                              triggerLabel={`${t('rowActionsLabel')} — ${s.name}`}
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
        title={t('stationsCreateHeading')}
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
              form="create-station-form"
              disabled={isPending || !createForm.name}
            >
              {isPending ? t('stationsCreating') : t('stationsCreate')}
            </Button>
          </>
        }
      >
        <form id="create-station-form" onSubmit={onCreate} noValidate className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="newStationName">{t('stationsFieldName')}</Label>
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
              <Label htmlFor="newStationLocation">{t('stationsFieldLocation')}</Label>
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
        </form>
      </Drawer>
    </div>
  );
}