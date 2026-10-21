import { Injectable, computed, signal } from '@angular/core';
import { Content, Country, MapData, Photo } from './models';

// Učitava content.json i mapa.json i drži ih u signalima.
@Injectable({ providedIn: 'root' })
export class Data {
  readonly content = signal<Content | null>(null);
  readonly map = signal<MapData | null>(null);

  readonly photos = computed(() => this.content()?.photos ?? []);
  readonly countries = computed(() => this.content()?.countries ?? []);
  readonly site = computed(() => this.content()?.site);

  readonly countryById = computed(() => new Map(this.countries().map((c) => [c.id, c])));
  readonly photoById = computed(() => new Map(this.photos().map((p) => [p.id, p])));

  readonly countByCountry = computed(() => {
    const m = new Map<string, number>();
    for (const p of this.photos()) m.set(p.country, (m.get(p.country) ?? 0) + 1);
    return m;
  });

  readonly placeCount = computed(() => new Set(this.photos().map((p) => p.country + '/' + p.place.sr)).size);

  private loading?: Promise<void>;

  load(): Promise<void> {
    this.loading ??= Promise.all([
      fetch('data/content.json', { cache: 'no-cache' }).then((r) => r.json()),
      fetch('data/mapa.json').then((r) => r.json()),
    ]).then(([content, map]) => {
      this.content.set(content as Content);
      this.map.set(map as MapData);
    });
    return this.loading;
  }

  photosOf(countryId: string): Photo[] {
    return this.photos().filter((p) => p.country === countryId);
  }

  country(id: string): Country | undefined {
    return this.countryById().get(id);
  }

  /** Pretvara geografske koordinate u tačku na mapi */
  project(lat: number, lng: number): { x: number; y: number } {
    const m = this.map();
    if (!m) return { x: 0, y: 0 };
    return { x: (lng - m.lon0) * m.cos * m.k, y: (m.lat1 - lat) * m.k };
  }
}

export function thumbUrl(p: Photo): string {
  return `photos/thumb/${p.file}?v=${p.v}`;
}

export function fullUrl(p: Photo): string {
  return `photos/full/${p.file}?v=${p.v}`;
}
