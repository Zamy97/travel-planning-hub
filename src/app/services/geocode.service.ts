import { Injectable } from '@angular/core';
import { MapWaypoint, Place } from '../models/travel.model';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name?: string;
}

@Injectable({ providedIn: 'root' })
export class GeocodeService {
  private readonly cache = new Map<string, MapWaypoint | null>();

  async resolvePlace(place: Place): Promise<MapWaypoint[]> {
    if (place.stops?.length) {
      const points: MapWaypoint[] = [];
      for (const stop of place.stops) {
        if (typeof stop.lat === 'number' && typeof stop.lng === 'number') {
          points.push({
            label: stop.title,
            detail: stop.detail,
            lat: stop.lat,
            lng: stop.lng,
          });
          continue;
        }
        const query = stop.mapQuery || stop.title;
        const found = await this.geocode(query);
        if (found) {
          points.push({
            label: stop.title,
            detail: stop.detail,
            lat: found.lat,
            lng: found.lng,
          });
        }
      }
      if (points.length) return points;
    }

    if (typeof place.lat === 'number' && typeof place.lng === 'number') {
      return [
        {
          label: place.title,
          detail: place.description || place.region,
          lat: place.lat,
          lng: place.lng,
        },
      ];
    }

    const found = await this.geocode(place.mapQuery || place.title);
    return found
      ? [
          {
            label: place.title,
            detail: place.description || place.region,
            lat: found.lat,
            lng: found.lng,
          },
        ]
      : [];
  }

  async geocode(query: string): Promise<MapWaypoint | null> {
    const key = query.trim().toLowerCase();
    if (!key) return null;
    if (this.cache.has(key)) return this.cache.get(key) ?? null;

    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');

      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        this.cache.set(key, null);
        return null;
      }

      const data = (await response.json()) as NominatimResult[];
      if (!data.length) {
        this.cache.set(key, null);
        return null;
      }

      const point: MapWaypoint = {
        label: query,
        detail: data[0].display_name,
        lat: Number(data[0].lat),
        lng: Number(data[0].lon),
      };
      this.cache.set(key, point);
      return point;
    } catch {
      this.cache.set(key, null);
      return null;
    }
  }

  async fetchDrivingRoute(
    points: MapWaypoint[]
  ): Promise<[number, number][] | null> {
    if (points.length < 2) return null;

    const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      const geometry = data?.routes?.[0]?.geometry?.coordinates as
        | [number, number][]
        | undefined;
      if (!geometry?.length) return null;
      // OSRM returns [lng, lat]; Leaflet wants [lat, lng]
      return geometry.map(([lng, lat]) => [lat, lng]);
    } catch {
      return null;
    }
  }

  googleMapsDirectionsUrl(points: MapWaypoint[]): string {
    if (!points.length) return 'https://maps.google.com';
    if (points.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${points[0].lat},${points[0].lng}`;
    }
    const origin = `${points[0].lat},${points[0].lng}`;
    const destination = `${points[points.length - 1].lat},${points[points.length - 1].lng}`;
    const waypoints = points
      .slice(1, -1)
      .map((p) => `${p.lat},${p.lng}`)
      .join('|');
    const params = new URLSearchParams({
      api: '1',
      origin,
      destination,
      travelmode: 'driving',
    });
    if (waypoints) params.set('waypoints', waypoints);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }
}
