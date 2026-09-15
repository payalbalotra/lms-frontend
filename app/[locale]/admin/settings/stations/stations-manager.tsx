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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
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
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [confirmUnarchive, setConfirmUnarchive] = useState<string | null>(null);
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

  function onArchiveClick(station: Station): void {
    if (confirmArchive !== station.id) {
      setConfirmArchive(station.id);
      setConfirmUnarchive(null);
      return;
    }
    startTransition(async () => {
      try {
        await archiveStation(station.id);
        setConfirmArchive(null);
        refresh();
      } catch {
        setConfirmArchive(null);
      }
    });
  }

  function onUnarchiveClick(station: Station): void {
    if (confirmUnarchive !== station.id) {
      setConfirmUnarchive(station.id);
      setConfirmArchive(null);
      return;
    }
    startTransition(async () => {
      try {
        await updateStation(station.id, { isArchived: false });
        setConfirmUnarchive(null);
        refresh();
      } catch {
        setConfirmUnarchive(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('stationsCreateHeading')}</CardTitle>
        </CardHeader>
        <form onSubmit={onCreate} noValidate>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1 sm:col-span-2">
              <Label htmlFor="newStationName">{t('stationsFieldName')}</Label>
              <Input
                id="newStationName"
                required
                maxLength={120}
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="grid gap-1">
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
            <div className="flex items-end sm:col-span-2">
              <Button
                type="submit"
                disabled={isPending || !createForm.name}
              >
                {isPending ? t('stationsCreating') : t('stationsCreate')}
              </Button>
            </div>
            {createError ? (
              <p role="alert" className="text-sm text-[var(--color-bad)] sm:col-span-3">
                {createError}
              </p>
            ) : null}
          </CardContent>
        </form>
      </Card>

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
                    <th className="px-4 py-2 font-semibold text-[var(--color-ink-2)]">{t('thActions')}</th>
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
                        <td className="px-4 py-2">
                          {isEditing ? (
                            <div className="flex flex-wrap gap-2">
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
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="neutral"
                                disabled={isPending}
                                onClick={() => startEdit(s)}
                              >
                                {t('actionsEdit')}
                              </Button>
                              {!s.isArchived ? (
                                confirmArchive === s.id ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={isPending}
                                      onClick={() => onArchiveClick(s)}
                                    >
                                      {t('confirmYes')}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="neutral"
                                      disabled={isPending}
                                      onClick={() => setConfirmArchive(null)}
                                    >
                                      {t('confirmNo')}
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="neutral"
                                    disabled={isPending}
                                    onClick={() => onArchiveClick(s)}
                                  >
                                    {t('actionsArchive')}
                                  </Button>
                                )
                              ) : confirmUnarchive === s.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    disabled={isPending}
                                    onClick={() => onUnarchiveClick(s)}
                                  >
                                    {t('confirmYes')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="neutral"
                                    disabled={isPending}
                                    onClick={() => setConfirmUnarchive(null)}
                                  >
                                    {t('confirmNo')}
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="neutral"
                                  disabled={isPending}
                                  onClick={() => onUnarchiveClick(s)}
                                >
                                  {t('actionsUnarchive')}
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