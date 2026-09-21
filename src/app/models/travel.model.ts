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

export interface DaySlot {
  time: string;
  activity: string;
}

export interface DayPlan {
  label: string;
  focus?: string;
  slots: DaySlot[];
}

export interface Place {
  id: string;
  title: string;
  type: PlaceType;
  region: string;
  badge: string;
  description?: string;
  stops?: TripStop[];
  dayPlans?: DayPlan[];
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
