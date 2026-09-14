import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { Place } from '../../models/travel.model';

@Component({
  selector: 'app-overview-map',
  standalone: true,
  templateUrl: './overview-map.component.html',
  styleUrl: './overview-map.component.scss',
})
export class OverviewMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) places: Place[] = [];

  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private layerGroup?: L.LayerGroup;
  private ready = false;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapHost.nativeElement, {
      scrollWheelZoom: false,
    }).setView([39.5, -98.35], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.layerGroup = L.layerGroup().addTo(this.map);
    this.ready = true;
    this.render();
    window.setTimeout(() => this.map?.invalidateSize(), 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['places'] && this.ready) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private render(): void {
    if (!this.map || !this.layerGroup) return;
    this.layerGroup.clearLayers();

    const mappable = this.places.filter(
      (p) => typeof p.lat === 'number' && typeof p.lng === 'number'
    );

    if (!mappable.length) {
      this.map.setView([39.5, -98.35], 4);
      return;
    }

    const bounds = L.latLngBounds([]);
    for (const place of mappable) {
      const color =
        place.status === 'visited'
          ? '#c2783a'
          : place.status === 'planning'
            ? '#0f766e'
            : '#5c6f6a';

      const marker = L.circleMarker([place.lat!, place.lng!], {
        radius: 8,
        color: '#f7f4ee',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.95,
      }).bindPopup(
        `<strong>${place.title}</strong><br/><span>${place.region} · ${place.status}</span>`
      );
      this.layerGroup.addLayer(marker);
      bounds.extend([place.lat!, place.lng!]);
    }

    this.map.fitBounds(bounds.pad(0.2));
    window.setTimeout(() => this.map?.invalidateSize(), 50);
  }
}
