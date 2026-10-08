import http from '@/lib/http';
import { STATIONS_ENDPOINTS } from './endpoints';
import type { Station, CreateStationInput, UpdateStationInput, StationFilterOptions } from './types';

const inFlightStations = new Map<string, Promise<{ stations: Station[] }>>();
const cachedStations = new Map<string, { data: { stations: Station[] }; expiresAt: number }>();
const STATIONS_CACHE_TTL_MS = 15_000;

export function clearStationsCache(): void {
  cachedStations.clear();
  inFlightStations.clear();
}

export async function fetchStations(
  opts: StationFilterOptions = {},
  cookieHeader?: string,
): Promise<{ stations: Station[] }> {
  const cacheKey = `${JSON.stringify(opts)}_${cookieHeader || (typeof window !== 'undefined' ? 'client' : 'server_default')}`;
  const now = Date.now();

  const cached = cachedStations.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const existing = inFlightStations.get(cacheKey);
  if (existing) {
    return existing;
  }

  const stationsPromise = (async () => {
    try {
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

      const res = { stations };
      cachedStations.set(cacheKey, { data: res, expiresAt: Date.now() + STATIONS_CACHE_TTL_MS });
      return res;
    } finally {
      inFlightStations.delete(cacheKey);
    }
  })();

  inFlightStations.set(cacheKey, stationsPromise);
  return stationsPromise;
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
