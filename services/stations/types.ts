import type { Station, CreateStationInput, UpdateStationInput } from '@/lib/types';

export type { Station, CreateStationInput, UpdateStationInput };

export interface StationFilterOptions {
  locationId?: string;
  includeArchived?: boolean;
}
