import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Data } from '../core/data';
import { I18n } from '../core/i18n';
import { PhotoView } from '../shared/photo';
import { WorldMap } from '../shared/world-map';
import { CountryList } from '../shared/country-list';
import { LightboxService } from '../shared/lightbox';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PhotoView, WorldMap, CountryList],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly i18n = inject(I18n);
  protected readonly data = inject(Data);
  private readonly lb = inject(LightboxService);

  readonly hero = computed(() => {
    const id = this.data.site()?.hero;
    return (id && this.data.photoById().get(id)) || this.data.photos()[0];
  });

  readonly featured = computed(() => {
    const f = this.data.photos().filter((p) => p.featured);
    return f.length ? f : this.data.photos().slice(0, 8);
  });

  /** mala polaroid slika u uglu naslovne */
  readonly small = computed(() => this.featured().find((p) => p.id !== this.hero()?.id));

  readonly tagline = computed(() => {
    const s = this.data.site();
    return s ? (this.i18n.lang() === 'sr' ? s.taglineSr : s.taglineEn || s.taglineSr) : '';
  });

  readonly about = computed(() => {
    const s = this.data.site();
    const t = s ? (this.i18n.lang() === 'sr' ? s.aboutSr : s.aboutEn || s.aboutSr) : '';
    return t.split('\n')[0];
  });

  readonly postcards = computed(() => {
    const counts = this.data.countByCountry();
    return this.data
      .countries()
      .map((c, i) => ({
        id: c.id,
        iso: c.iso,
        name: this.i18n.pick(c.name),
        count: counts.get(c.id) ?? 0,
        ill: c.illustrations[0],
        rot: [-1.6, 1.2, -0.6, 1.8, -1.2, 0.8][i % 6],
      }))
      .filter((c) => c.count > 0);
  });

  openFeatured(i: number): void {
    this.lb.open(this.featured(), i);
  }

  openHero(): void {
    const h = this.hero();
    if (h) this.lb.open([h, ...this.featured().filter((p) => p.id !== h.id)], 0);
  }
}
