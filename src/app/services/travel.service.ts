import { Injectable, computed, inject, signal } from '@angular/core';
import { SEED_PLACES } from '../data/seed-places';
import {
  Place,
  PlaceStatus,
  PlaceType,
  TravelStore,
} from '../models/travel.model';
import { GeocodeService } from './geocode.service';

const STORAGE_KEY = 'travel-planning-hub.v1';
const STORE_VERSION = 5;

export interface PlaceDraft {
  title: string;
  type: PlaceType;
  region: string;
  badge: string;
  description?: string;
  notes?: string;
  mapQuery: string;
  status: PlaceStatus;
  stopsText?: string;
}

@Injectable({ providedIn: 'root' })
export class TravelService {
  private readonly geocode = inject(GeocodeService);
  private readonly placesSignal = signal<Place[]>(this.load());

  readonly places = this.placesSignal.asReadonly();

  readonly stats = computed(() => {
    const places = this.placesSignal();
    return {
      total: places.length,
      visited: places.filter((p) => p.status === 'visited').length,
      planning: places.filter((p) => p.status === 'planning').length,
      wishlist: places.filter((p) => p.status === 'wishlist').length,
      roadTrips: places.filter((p) => p.type === 'road-trip').length,
    };
  });

  filtered(
    query: string,
    status: PlaceStatus | 'all',
    type: PlaceType | 'all'
  ): Place[] {
    const q = query.trim().toLowerCase();
    return this.placesSignal()
      .filter((place) => (status === 'all' ? true : place.status === status))
      .filter((place) => (type === 'all' ? true : place.type === type))
      .filter((place) => {
        if (!q) return true;
        const haystack = [
          place.title,
          place.region,
          place.badge,
          place.description ?? '',
          place.notes ?? '',
          ...(place.stops?.map((s) => `${s.title} ${s.detail}`) ?? []),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        const order: Record<PlaceStatus, number> = {
          planning: 0,
          wishlist: 1,
          visited: 2,
        };
        if (order[a.status] !== order[b.status]) {
          return order[a.status] - order[b.status];
        }
        return a.title.localeCompare(b.title);
      });
  }

  setStatus(id: string, status: PlaceStatus): void {
    this.updatePlace(id, {
      status,
      visitedAt: status === 'visited' ? new Date().toISOString() : undefined,
    });
  }

  toggleVisited(id: string): void {
    const place = this.placesSignal().find((p) => p.id === id);
    if (!place) return;
    this.setStatus(id, place.status === 'visited' ? 'wishlist' : 'visited');
  }

  updateNotes(id: string, notes: string): void {
    this.updatePlace(id, { notes });
  }

  addPlace(draft: PlaceDraft): Place {
    const place: Place = {
      id: this.slugify(draft.title),
      title: draft.title.trim(),
      type: draft.type,
      region: draft.region.trim(),
      badge: draft.badge.trim() || draft.region.trim(),
      description: draft.description?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
      mapQuery: draft.mapQuery.trim() || draft.title.trim(),
      status: draft.status,
      visitedAt:
        draft.status === 'visited' ? new Date().toISOString() : undefined,
      stops: this.parseStops(draft.stopsText),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSeed: false,
    };

    let saved = place;
    this.placesSignal.update((places) => {
      saved = this.ensureUniqueId(place, places);
      return [saved, ...places];
    });
    this.persist();
    void this.enrichCoordinates(saved.id);
    return saved;
  }

  updatePlaceFields(id: string, draft: PlaceDraft): void {
    this.updatePlace(id, {
      title: draft.title.trim(),
      type: draft.type,
      region: draft.region.trim(),
      badge: draft.badge.trim() || draft.region.trim(),
      description: draft.description?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
      mapQuery: draft.mapQuery.trim() || draft.title.trim(),
      status: draft.status,
      visitedAt:
        draft.status === 'visited' ? new Date().toISOString() : undefined,
      stops: this.parseStops(draft.stopsText),
      lat: undefined,
      lng: undefined,
    });
    void this.enrichCoordinates(id);
  }

  deletePlace(id: string): void {
    this.placesSignal.update((places) => places.filter((p) => p.id !== id));
    this.persist();
  }

  exportJson(): string {
    const store: TravelStore = {
      version: STORE_VERSION,
      places: this.placesSignal(),
    };
    return JSON.stringify(store, null, 2);
  }

  importJson(raw: string): { ok: true } | { ok: false; error: string } {
    try {
      const parsed = JSON.parse(raw) as TravelStore;
      if (!parsed?.places || !Array.isArray(parsed.places)) {
        return { ok: false, error: 'Invalid file: missing places array.' };
      }
      const places = parsed.places.map((place) =>
        this.mergeSeedCoords(this.normalizePlace(place))
      );
      this.placesSignal.set(places);
      this.persist();
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not parse JSON file.' };
    }
  }

  resetToSeed(): void {
    this.placesSignal.set(structuredClone(SEED_PLACES));
    this.persist();
  }

  private async enrichCoordinates(id: string): Promise<void> {
    const place = this.placesSignal().find((p) => p.id === id);
    if (!place) return;

    const points = await this.geocode.resolvePlace(place);
    if (!points.length) return;

    if (place.stops?.length) {
      const stops = place.stops.map((stop, index) => {
        const point = points[index];
        return point
          ? { ...stop, lat: point.lat, lng: point.lng }
          : stop;
      });
      this.updatePlace(id, {
        stops,
        lat: points[0].lat,
        lng: points[0].lng,
      });
      return;
    }

    this.updatePlace(id, {
      lat: points[0].lat,
      lng: points[0].lng,
    });
  }

  private updatePlace(id: string, patch: Partial<Place>): void {
    this.placesSignal.update((places) =>
      places.map((place) =>
        place.id === id
          ? { ...place, ...patch, updatedAt: new Date().toISOString() }
          : place
      )
    );
    this.persist();
  }

  private load(): Place[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return structuredClone(SEED_PLACES);
      }
      const parsed = JSON.parse(raw) as TravelStore;
      if (!parsed?.places?.length) {
        return structuredClone(SEED_PLACES);
      }
      const existing = parsed.places.map((place) =>
        this.mergeSeedCoords(this.normalizePlace(place))
      );
      return this.upsertMissingSeeds(existing);
    } catch {
      return structuredClone(SEED_PLACES);
    }
  }

  constructor() {
    // Persist seed upgrades (coords + newly added seed places).
    this.persist();
  }

  private persist(): void {
    const store: TravelStore = {
      version: STORE_VERSION,
      places: this.placesSignal(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  private normalizePlace(place: Place): Place {
    return {
      ...place,
      status: place.status ?? 'wishlist',
      type: place.type ?? 'standalone',
      region: place.region ?? '',
      badge: place.badge ?? place.region ?? '',
      mapQuery: place.mapQuery || place.title,
      createdAt: place.createdAt || new Date().toISOString(),
      updatedAt: place.updatedAt || new Date().toISOString(),
      isSeed: Boolean(place.isSeed),
    };
  }

  /** Add any seed places that are not already in the user's local list. */
  private upsertMissingSeeds(existing: Place[]): Place[] {
    const ids = new Set(existing.map((p) => p.id));
    const missing = SEED_PLACES.filter((seed) => !ids.has(seed.id)).map((seed) =>
      structuredClone(seed)
    );
    return missing.length ? [...missing, ...existing] : existing;
  }

  private mergeSeedCoords(place: Place): Place {
    const seed = SEED_PLACES.find((s) => s.id === place.id);
    if (!seed) return place;

    const needsPlaceCoords =
      typeof place.lat !== 'number' || typeof place.lng !== 'number';
    const stops =
      place.stops?.map((stop, index) => {
        const seedStop = seed.stops?.[index];
        if (
          seedStop &&
          (typeof stop.lat !== 'number' || typeof stop.lng !== 'number')
        ) {
          return {
            ...stop,
            lat: seedStop.lat,
            lng: seedStop.lng,
            mapQuery: stop.mapQuery || seedStop.mapQuery,
          };
        }
        return stop;
      }) ?? seed.stops;

    return {
      ...place,
      lat: needsPlaceCoords ? seed.lat : place.lat,
      lng: needsPlaceCoords ? seed.lng : place.lng,
      stops: place.stops?.length ? stops : place.stops ?? seed.stops,
    };
  }

  private parseStops(stopsText?: string) {
    if (!stopsText?.trim()) return undefined;
    return stopsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, ...rest] = line.split('—');
        return {
          title: title.trim(),
          detail: rest.join('—').trim() || title.trim(),
          mapQuery: title.trim(),
        };
      });
  }

  private slugify(value: string): string {
    return (
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 48) || `place-${Date.now()}`
    );
  }

  private ensureUniqueId(place: Place, places: Place[]): Place {
    if (!places.some((p) => p.id === place.id)) return place;
    return { ...place, id: `${place.id}-${Date.now()}` };
  }
}
