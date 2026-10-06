import http from '@/lib/http';
import { STATIONS_ENDPOINTS } from './endpoints';
import type { Station, CreateStationInput, UpdateStationInput, StationFilterOptions } from './types';

export async function fetchStations(
  opts: StationFilterOptions = {},
  cookieHeader?: string,
): Promise<{ stations: Station[] }> {
  const headers: Record<string, string> = {};

  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
    if (tokenMatch) {
      headers['Authorization'] = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
    }
  }

  const { data } = await http.get<{
    success: boolean;
    data: { stations: Array<{ id: string; name: string }> };
  }>(STATIONS_ENDPOINTS.LIST, {
    headers: Object.keys(headers).length ? headers : undefined,
    params: { _t: Date.now() },
  });

  const rawStations = data.data?.stations ?? [];
  const stations: Station[] = rawStations.map((s, idx) => ({
    id: s.id,
    name: s.name,
    locationId: opts.locationId || '',
    sortOrder: idx + 1,
    isArchived: false,
  }));

  return { stations };
}

export async function createStation(
  input: CreateStationInput,
): Promise<{ station: Station }> {
  const { data } = await http.post<{
    success: boolean;
    data: { station: { id: string; name: string } };
  }>(STATIONS_ENDPOINTS.CREATE, {
    name: input.name,
  });

  const station: Station = {
    id: data.data.station.id,
    name: data.data.station.name,
    locationId: input.locationId,
    sortOrder: input.sortOrder ?? 1,
    isArchived: false,
  };

  return { station };
}

export async function updateStation(
  stationId: string,
  patch: UpdateStationInput,
): Promise<{ station: Station }> {
  const { data } = await http.patch<{
    success: boolean;
    data: { station: { id: string; name: string } };
  }>(STATIONS_ENDPOINTS.UPDATE(stationId), {
    name: patch.name,
  });

  const station: Station = {
    id: data.data.station.id,
    name: data.data.station.name,
    locationId: '',
    sortOrder: 1,
    isArchived: patch.isArchived ?? false,
  };

  return { station };
}

export async function deleteStation(stationId: string): Promise<{ ok: true }> {
  await http.delete(STATIONS_ENDPOINTS.DELETE(stationId));
  return { ok: true };
}
