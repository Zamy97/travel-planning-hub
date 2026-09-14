export type PlaceStatus = 'wishlist' | 'planning' | 'visited';
export type PlaceType = 'road-trip' | 'standalone';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface TripStop {
  title: string;
  detail: string;
  lat?: number;
  lng?: number;
  mapQuery?: string;
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
  lat?: number;
  lng?: number;
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

export interface MapWaypoint {
  label: string;
  detail?: string;
  lat: number;
  lng: number;
}
