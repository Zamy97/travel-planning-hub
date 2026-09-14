import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Place, PlaceStatus, PlaceType } from '../../models/travel.model';
import { PlaceDraft, TravelService } from '../../services/travel.service';

type FilterStatus = PlaceStatus | 'all';
type FilterType = PlaceType | 'all';

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [FormsModule, DatePipe, NgClass],
  templateUrl: './hub.component.html',
  styleUrl: './hub.component.scss',
})
export class HubComponent {
  private readonly travel = inject(TravelService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly query = signal('');
  readonly statusFilter = signal<FilterStatus>('all');
  readonly typeFilter = signal<FilterType>('all');
  readonly expandedId = signal<string | null>(null);
  readonly editorOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly toast = signal<string | null>(null);

  readonly draft = signal<PlaceDraft>(this.emptyDraft());

  readonly stats = this.travel.stats;

  readonly places = computed(() =>
    this.travel.filtered(
      this.query(),
      this.statusFilter(),
      this.typeFilter()
    )
  );

  readonly roadTrips = computed(() =>
    this.places().filter((p) => p.type === 'road-trip')
  );

  readonly standalones = computed(() =>
    this.places().filter((p) => p.type === 'standalone')
  );

  setStatusFilter(value: FilterStatus): void {
    this.statusFilter.set(value);
  }

  setTypeFilter(value: FilterType): void {
    this.typeFilter.set(value);
  }

  toggleExpand(id: string): void {
    this.expandedId.update((current) => (current === id ? null : id));
  }

  cycleStatus(place: Place): void {
    const next: Record<PlaceStatus, PlaceStatus> = {
      wishlist: 'planning',
      planning: 'visited',
      visited: 'wishlist',
    };
    this.travel.setStatus(place.id, next[place.status]);
    this.showToast(
      place.status === 'visited'
        ? `Moved ${place.title} back to wishlist`
        : place.status === 'planning'
          ? `Marked ${place.title} as visited`
          : `Now planning ${place.title}`
    );
  }

  mapUrl(place: Place): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      this.travel.mapEmbedUrl(place.mapQuery)
    );
  }

  openCreate(): void {
    this.editingId.set(null);
    this.draft.set(this.emptyDraft());
    this.editorOpen.set(true);
  }

  openEdit(place: Place, event: Event): void {
    event.stopPropagation();
    this.editingId.set(place.id);
    this.draft.set({
      title: place.title,
      type: place.type,
      region: place.region,
      badge: place.badge,
      description: place.description ?? '',
      notes: place.notes ?? '',
      mapQuery: place.mapQuery,
      status: place.status,
      stopsText:
        place.stops?.map((s) => `${s.title} — ${s.detail}`).join('\n') ?? '',
    });
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
  }

  patchDraft<K extends keyof PlaceDraft>(key: K, value: PlaceDraft[K]): void {
    this.draft.update((current) => ({ ...current, [key]: value }));
  }

  saveEditor(): void {
    const draft = this.draft();
    if (!draft.title.trim()) {
      this.showToast('Add a title first');
      return;
    }

    const id = this.editingId();
    if (id) {
      this.travel.updatePlaceFields(id, draft);
      this.showToast('Spot updated');
    } else {
      this.travel.addPlace(draft);
      this.showToast('New spot saved');
    }
    this.editorOpen.set(false);
  }

  deletePlace(place: Place, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Remove “${place.title}” from your hub?`)) return;
    this.travel.deletePlace(place.id);
    if (this.expandedId() === place.id) this.expandedId.set(null);
    this.showToast('Removed');
  }

  saveNotes(place: Place, value: string): void {
    this.travel.updateNotes(place.id, value);
  }

  exportData(): void {
    const blob = new Blob([this.travel.exportJson()], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waymark-travel-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Backup downloaded');
  }

  importData(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = this.travel.importJson(String(reader.result ?? ''));
      this.showToast(result.ok ? 'Backup restored' : result.error);
      input.value = '';
    };
    reader.readAsText(file);
  }

  resetSeed(): void {
    if (
      !confirm(
        'Reset to the original seed list? Your local changes will be replaced.'
      )
    ) {
      return;
    }
    this.travel.resetToSeed();
    this.showToast('Reset to seed list');
  }

  statusLabel(status: PlaceStatus): string {
    return status === 'wishlist'
      ? 'Wishlist'
      : status === 'planning'
        ? 'Planning'
        : 'Visited';
  }

  private emptyDraft(): PlaceDraft {
    return {
      title: '',
      type: 'standalone',
      region: '',
      badge: '',
      description: '',
      notes: '',
      mapQuery: '',
      status: 'wishlist',
      stopsText: '',
    };
  }

  private showToast(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => {
      if (this.toast() === message) this.toast.set(null);
    }, 2600);
  }
}
