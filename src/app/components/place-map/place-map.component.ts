import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import * as L from 'leaflet';
import { MapWaypoint, Place } from '../../models/travel.model';
import { GeocodeService } from '../../services/geocode.service';

@Component({
  selector: 'app-place-map',
  standalone: true,
  templateUrl: './place-map.component.html',
  styleUrl: './place-map.component.scss',
})
export class PlaceMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) place!: Place;
  @Input() height = 280;

  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;

  private readonly geocode = inject(GeocodeService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly routeMode = signal<'driving' | 'straight' | 'single' | 'none'>('none');
  readonly directionsUrl = signal<string | null>(null);
  readonly waypoints = signal<MapWaypoint[]>([]);

  private map?: L.Map;
  private layerGroup?: L.LayerGroup;
  private ready = false;
  private requestId = 0;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapHost.nativeElement, {
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView([39.5, -98.35], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.layerGroup = L.layerGroup().addTo(this.map);
    this.ready = true;
    void this.render();

    // Leaflet needs a tick after layout
    window.setTimeout(() => this.map?.invalidateSize(), 80);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['place'] && this.ready) {
      void this.render();
      window.setTimeout(() => this.map?.invalidateSize(), 80);
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }

  private async render(): Promise<void> {
    if (!this.map || !this.layerGroup || !this.place) return;

    const id = ++this.requestId;
    this.loading.set(true);
    this.error.set(null);
    this.layerGroup.clearLayers();

    const points = await this.geocode.resolvePlace(this.place);
    if (id !== this.requestId) return;

    if (!points.length) {
      this.loading.set(false);
      this.routeMode.set('none');
      this.directionsUrl.set(null);
      this.waypoints.set([]);
      this.error.set('Could not locate this place on the map yet.');
      return;
    }

    this.waypoints.set(points);
    this.directionsUrl.set(this.geocode.googleMapsDirectionsUrl(points));

    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));

    points.forEach((point, index) => {
      const marker = L.marker([point.lat, point.lng], {
        icon: this.numberIcon(index + 1, points.length === 1),
      }).bindPopup(
        `<strong>${this.escape(point.label)}</strong>${
          point.detail ? `<br/><span>${this.escape(point.detail)}</span>` : ''
        }`
      );
      this.layerGroup!.addLayer(marker);
    });

    if (points.length >= 2) {
      const driving = await this.geocode.fetchDrivingRoute(points);
      if (id !== this.requestId) return;

      const latLngs =
        driving ??
        (points.map((p) => [p.lat, p.lng] as [number, number]));

      const line = L.polyline(latLngs, {
        color: '#0f766e',
        weight: 4,
        opacity: 0.9,
        lineJoin: 'round',
      });
      this.layerGroup.addLayer(line);
      bounds.extend(line.getBounds());
      this.routeMode.set(driving ? 'driving' : 'straight');
    } else {
      this.routeMode.set('single');
    }

    this.map.fitBounds(bounds.pad(0.2));
    this.loading.set(false);
    window.setTimeout(() => this.map?.invalidateSize(), 50);
  }

  private numberIcon(n: number, single: boolean): L.DivIcon {
    return L.divIcon({
      className: 'waymark-pin',
      html: `<span class="waymark-pin__dot${single ? ' waymark-pin__dot--single' : ''}">${
        single ? '' : n
      }</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -12],
    });
  }

  private escape(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }
}
