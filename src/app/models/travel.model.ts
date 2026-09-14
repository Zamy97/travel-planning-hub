export type PlaceStatus = 'wishlist' | 'planning' | 'visited';
export type PlaceType = 'road-trip' | 'standalone';

export interface TripStop {
  title: string;
  detail: string;
}

export interface Place {
  id: string;
  title: string;
  type: PlaceType;
  region: string;
  badge: string;
  description?: string;
  stops?: TripStop[];
  notes?: string;
  mapQuery: string;
  status: PlaceStatus;
  visitedAt?: string;
  createdAt: string;
  updatedAt: string;
  isSeed: boolean;
}

export interface TravelStore {
  version: number;
  places: Place[];
}
