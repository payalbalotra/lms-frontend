'use client';

import * as React from 'react';
import { useState, useTransition, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { LuChefHat, LuShield } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/custom-select';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import {
  updateEmployee,
  type UpdateEmployeeInput,
} from '@/lib/mock-employees';
import type { AdminEmployee, Role, Station } from '@/lib/types';

interface EditRolesModalProps {
  open: boolean;
  onClose: () => void;
  employee: AdminEmployee;
  /** Roles catalog (small, fetched once on first open). */
  roles: Role[];
  /** Locations catalog for the location select. */
  locations: Array<{ id: string; name: string }>;
  /** Stations at the current working location — the page reloads these
   *  every time the user changes location inside the modal. */
  stations: Station[];
  /** Page-owned hook so the modal can ask for a fresh station list when
   *  the working location changes. */
  onLocationChange: (locationId: string) => Promise<void> | void;
  /** Called after a successful save. The detail page uses this to refresh
   *  the local employee state and call `router.refresh()`. The toast is a
   *  separate later UI task that captures `prior` for an Undo. */
  onSaved: (next: AdminEmployee, prior: UpdateEmployeeInput) => void;
}

/**
 * Full edit modal for an existing employee. Lets the admin change name,
 * email, location, access tier (Manager / Employee), kitchen job role(s),
 * and station(s) in one save.
 *
 * Behaviour parity with the invite form (`new/new-employee-form.tsx`):
 *   - Job roles first.
 *   - Stations gated until at least one role is picked.
 *   - Stations scoped to the selected location (re-fetched on change).
 *   - Save disabled until name, location, access level, and ≥1 role.
 *
 * Access level is exposed as a Manager / Employee radio. Admin is a seeded
 * role (Raúl) and is not editable here — the picker cannot move anyone
 * into or out of the Admin tier; it only moves Manager ⇄ Employee inside
 * the standard 'employee' role bucket.
 *
 * Focus on open lands on Cancel, not Save (DESIGN.md §3.6). The body's
 * first interactive control is the Name input — so a sighted user can
 * keep typing rather than losing their place. The Cancel `autoFocus`
 * covers the keyboard path.
 */
export function EditRolesModal({
  open,
  onClose,
  employee,
  roles,
  locations,
  stations,
  onLocationChange,
  onSaved,
}: EditRolesModalProps): React.ReactElement {
  const t = useTranslations('admin');
  const [_pending, startTransition] = useTransition();

  // Working form state — mirrors the invite form's shape, plus email-as-string
  // (the type carries `null` for "no email" which we materialise as '').
  // Access is a two-way Manager / Employee choice — Admin is a seeded role
  // only and is not exposed as a destination; anyone already an admin keeps
  // their tier (the radio just won't let you change to / away from it).
  type Tier = 'manager' | 'employee';

  const [name, setName] = useState<string>(employee.name);
  const [email, setEmail] = useState<string>(employee.email ?? '');
  const [locationId, setLocationId] = useState<string>(employee.locationId);
  const [tier, setTier] = useState<Tier>(employee.accessLevel);
  const [roleIds, setRoleIds] = useState<string[]>(employee.roleIds);
  const [stationIds, setStationIds] = useState<string[]>(employee.stationIds);

  // Reset the working state whenever the modal opens — a previous edit's
  // draft must not leak into the next one.
  React.useEffect(() => {
    if (!open) return;
    setName(employee.name);
    setEmail(employee.email ?? '');
    setLocationId(employee.locationId);
    setTier(employee.accessLevel);
    setRoleIds(employee.roleIds);
    setStationIds(employee.stationIds);
  }, [open, employee]);

  // Stations are location-scoped. Drop any already-selected stations that
  // don't exist at the new location so the save payload never carries an
  // orphan id (same rule as the invite form).
  React.useEffect(() => {
    setStationIds((prev) => prev.filter((id) => stations.some((s) => s.id === id)));
  }, [stations]);

  // Job→station mapping: each Role carries the stations it works on
  // (Line Cook → gm/grill/expo, Prep Cook → prep, Dishwasher → dish).
  // Manager bypasses the filter and shows every station at the location.
  const roleById = useMemo<Map<string, Role>>(
    () => new Map(roles.map((r) => [r.id, r])),
    [roles],
  );

  const stationsCoveredByRoles = useMemo<Set<string>>(() => {
    const covered = new Set<string>();
    for (const roleId of roleIds) {
      const role = roleById.get(roleId);
      if (!role) continue;
      if (role.stationIds.length === 0) {
        return new Set(stations.map((s) => s.id));
      }
      for (const stationId of role.stationIds) covered.add(stationId);
    }
    return covered;
  }, [roleIds, roleById, stations]);

  const availableStations = useMemo<Station[]>(() => {
    if (tier === 'manager') return stations;
    if (roleIds.length === 0) return [];
    return stations.filter((s) => stationsCoveredByRoles.has(s.id));
  }, [tier, roleIds.length, stations, stationsCoveredByRoles]);

  const stationsBlockedReason = useMemo<string | undefined>(() => {
    if (tier === 'manager') return undefined;
    if (roleIds.length === 0) return t('detailEditRolesNeedRole');
    if (stations.length === 0) return t('stationsEmptyForLocation');
    if (availableStations.length === 0) return t('stationsEmptyForRoles');
    return undefined;
  }, [tier, roleIds.length, stations.length, availableStations.length, t]);

  // Manager tier: preselect every job role and every station at the location.
  // Switching away from Manager clears the chips — the auto-fill is no longer
  // valid for an employee, and the role-station filter would otherwise leave
  // stale chips in place.
  function onTierChange(next: Tier): void {
    if (next === 'manager') {
      setTier('manager');
      setRoleIds(roles.map((r) => r.id));
      setStationIds(stations.map((s) => s.id));
      return;
    }
    setTier(next);
    setRoleIds([]);
    setStationIds([]);
  }

  // Preserve already-selected stations only if they remain valid for the
  // current location + role-set. Drop everything else so the save payload
  // never contains an orphan id. Manager bypasses the role-stations filter.
  function onRolesChange(next: string[]): void {
    if (tier === 'manager') {
      setRoleIds(next);
      return;
    }
    const covered = new Set<string>();
    for (const roleId of next) {
      const role = roleById.get(roleId);
      if (!role) continue;
      if (role.stationIds.length === 0) {
        for (const s of stations) covered.add(s.id);
        break;
      }
      for (const stationId of role.stationIds) covered.add(stationId);
    }
    const stillValidStations = stationIds.filter((id) => covered.has(id));
    setRoleIds(next);
    setStationIds(stillValidStations);
  }

  function onLocationChangeLocal(newLocationId: string): void {
    setLocationId(newLocationId);
    // Stations reload happens in the page (parent owns the catalog).
    void onLocationChange(newLocationId);
  }

  const canSave =
    name.trim().length > 0 &&
    locationId !== '' &&
    roleIds.length > 0;

  // Compare against the persisted employee to decide whether Save is even
  // meaningful — disabled when nothing changed keeps the action honest.
  const priorSnapshot = JSON.stringify({
    name: employee.name,
    email: employee.email ?? '',
    locationId: employee.locationId,
    role: employee.role,
    accessLevel: employee.accessLevel,
    roleIds: employee.roleIds,
    stationIds: employee.stationIds,
  });
  const nextSnapshot = JSON.stringify({
    name: name.trim(),
    email: email.trim(),
    locationId,
    role: employee.role,
    accessLevel: tier,
    roleIds,
    stationIds,
  });
  const dirty = priorSnapshot !== nextSnapshot;

  function onSave(): void {
    if (!canSave) return;
    const prior: UpdateEmployeeInput = {
      name: employee.name,
      email: employee.email ?? null,
      locationId: employee.locationId,
      accessLevel: employee.accessLevel,
      role: employee.role,
      roleIds: [...employee.roleIds],
      stationIds: [...employee.stationIds],
    };
    const patch: UpdateEmployeeInput = {
      name: name.trim(),
      email: email.trim() ? email.trim() : null,
      locationId,
      accessLevel: tier,
      // Role ('admin' | 'employee') is not editable from this modal — admin
      // stays admin; everyone else is 'employee'. The picker only moves
      // them between Manager and Employee inside that 'employee' bucket.
      role: employee.role,
      roleIds: [...roleIds],
      stationIds: [...stationIds],
    };
    startTransition(() => {
      const updated = updateEmployee(employee.id, patch);
      if (updated) onSaved(updated, prior);
      onClose();
    });
  }

  const locationOptions = locations;

  return (
    <Modal open={open} onClose={onClose} size="2xl">
      <ModalHeader
        title={t('detailEditProfileHeading')}
        description={employee.name}
        onClose={onClose}
        closeLabel={t('detailEditRolesCancel')}
      />
      <ModalBody className="space-y-4 p-5 sm:p-6">
        {/* ===== Profile: Name & Email on row 1, Location on row 2 ===== */}
        <div className="grid gap-3.5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-name">{t('nameLabel')}</Label>
              <Input
                id="edit-name"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-email">{t('emailLabel')}</Label>
              <Input
                id="edit-email"
                type="email"
                maxLength={200}
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label id="edit-locationId-label" htmlFor="edit-locationId">
              {t('locationLabel')}
            </Label>
            <CustomSelect
              id="edit-locationId"
              ariaLabelledBy="edit-locationId-label"
              value={locationId}
              onChange={onLocationChangeLocal}
              options={locationOptions.map((l) => ({ value: l.id, label: l.name }))}
            />
          </div>
        </div>

        {/* ===== Access level ===== */}
        <div className="border-t border-[var(--color-line)] pt-4">
          <fieldset className="grid gap-2 pb-1">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <LuShield className="size-4 text-[var(--color-ink-2)]" aria-hidden="true" />
                <legend
                  id="edit-accessLevel-label"
                  className="text-sm font-semibold text-[var(--color-ink)]"
                >
                  {t('accessLevelLabel')}
                </legend>
              </div>
              <p className="mt-0.5 text-xs text-[var(--color-ink-2)]">
                Controls permissions in the LMS.
              </p>
            </div>
            <div
              role="radiogroup"
              aria-labelledby="edit-accessLevel-label"
              className="mt-3 flex flex-wrap items-center gap-3"
            >
              {(['manager', 'employee'] as Tier[]).map((opt) => {
                const selected = tier === opt;
                return (
                  <label
                    key={opt}
                    className={[
                      'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                      selected
                        ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white shadow-xs'
                        : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-panel)]',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="edit-accessLevel"
                      value={opt}
                      checked={selected}
                      onChange={() => onTierChange(opt)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={[
                        'inline-block size-2 shrink-0 rounded-full',
                        selected
                          ? 'bg-white'
                          : 'bg-[var(--color-line-2)]',
                      ].join(' ')}
                    />
                    <span>
                      {opt === 'manager'
                        ? t('accessLevelManager')
                        : t('accessLevelEmployee')}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        {/* ===== Kitchen assignment ===== */}
        <div className="border-t border-[var(--color-line)] pt-4 pb-3 sm:pb-4">
          <div className="mb-3 flex flex-col">
            <div className="flex items-center gap-2">
              <LuChefHat className="size-4 text-[var(--color-ink-2)]" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                Kitchen assignment
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-[var(--color-ink-2)]">
              Station and role assignments in the kitchen.
            </p>
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <MultiSelectDropdown
              id="edit-job-roles"
              label={t('jobRolesLabel')}
              value={roleIds}
              onChange={onRolesChange}
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
              placeholder={t('jobRolesPrompt')}
            />

            <MultiSelectDropdown
              id="edit-stations"
              label={t('stationsLabel')}
              value={stationIds}
              onChange={setStationIds}
              options={availableStations.map((s) => ({ value: s.id, label: s.name }))}
              disabled={roleIds.length === 0}
              blockedReason={stationsBlockedReason}
              placeholder={t('stationsPrompt')}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        {/* Cancel first per the focus rule (DESIGN.md §3.6). */}
        <Button type="button" variant="neutral" onClick={onClose}>
          {t('detailEditRolesCancel')}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onSave}
          disabled={!canSave || !dirty}
        >
          {t('detailEditRolesSave')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
