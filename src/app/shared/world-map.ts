import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Data, thumbUrl } from '../core/data';
import { I18n } from '../core/i18n';

/**
 * Mapa Balkana i Mediterana. Moje države su obojene, a svaka ima pin i polaroid
 * sa naslovnom fotografijom. Klik vodi na stranicu države.
 */
@Component({
  selector: 'app-world-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (data.map(); as m) {
      <div class="map" [style.aspect-ratio]="m.width + ' / ' + m.height">
        <svg class="geo" [attr.viewBox]="'0 0 ' + m.width + ' ' + m.height" aria-hidden="true">
          <defs>
            <pattern id="grid" width="62" height="62" patternUnits="userSpaceOnUse">
              <path d="M62 0H0V62" fill="none" stroke="rgba(70,90,85,.13)" stroke-width="1" />
            </pattern>
          </defs>
          <rect [attr.width]="m.width" [attr.height]="m.height" class="sea" />
          <rect [attr.width]="m.width" [attr.height]="m.height" fill="url(#grid)" />
          @for (d of m.others; track $index) {
            <path [attr.d]="d" class="land" />
          }
          @for (c of items(); track c.id) {
            <path [attr.d]="c.path" class="mine" [class.hot]="hot() === c.id" />
          }
          @if (cards()) {
            @for (c of items(); track c.id) {
              <path [attr.d]="c.line" class="line" [class.hot]="hot() === c.id" />
            }
          }
        </svg>

        @for (c of items(); track c.id) {
          <a
            class="pin"
            [routerLink]="['/drzava', c.id]"
            [style.left.%]="c.px"
            [style.top.%]="c.py"
            (mouseenter)="hot.set(c.id)"
            (mouseleave)="hot.set('')"
            (focus)="hot.set(c.id)"
            (blur)="hot.set('')"
            [attr.aria-label]="c.name"
          >
            <svg viewBox="0 0 24 32" aria-hidden="true"><path d="M12 31s10-11 10-19A10 10 0 0 0 2 12c0 8 10 19 10 19z" /><circle cx="12" cy="12" r="4" /></svg>
            <span class="tip"><span class="flag fi fi-{{ c.iso }}"></span>{{ c.name }}</span>
          </a>
        }

        @if (cards()) {
          @for (c of items(); track c.id) {
            <a
              class="card"
              [class.hot]="hot() === c.id"
              [routerLink]="['/drzava', c.id]"
              [style.left.%]="c.cx"
              [style.top.%]="c.cy"
              [style.--rot.deg]="c.rot"
              (mouseenter)="hot.set(c.id)"
              (mouseleave)="hot.set('')"
            >
              <span class="tape"></span>
              @if (c.cover) {
                <img [src]="c.cover" alt="" loading="lazy" />
              }
              <span class="name hand">{{ c.name }}</span>
            </a>
          }
        }

        <img class="deco compass" src="img/ukrasi/kompas.webp" alt="" />
      </div>
    }
  `,
  styleUrl: './world-map.scss',
})
export class WorldMap {
  protected readonly data = inject(Data);
  private readonly i18n = inject(I18n);

  /** da li prikazati polaroide (na telefonu se kriju preko CSS-a) */
  readonly cards = input(true);
  readonly hot = signal('');

  readonly items = computed(() => {
    const m = this.data.map();
    if (!m) return [];
    return this.data.countries().map((c) => {
      const p = this.data.project(c.lat, c.lng);
      const cover = this.data.photoById().get(c.cover) ?? this.data.photosOf(c.id)[0];
      const cx = c.card?.x ?? p.x;
      const cy = c.card?.y ?? p.y - 120;
      return {
        id: c.id,
        iso: c.iso,
        name: this.i18n.pick(c.name),
        path: m.countries[c.iso] ?? '',
        px: (p.x / m.width) * 100,
        py: (p.y / m.height) * 100,
        cx: (cx / m.width) * 100,
        cy: (cy / m.height) * 100,
        rot: c.card?.rot ?? 0,
        line: `M${p.x} ${p.y - 14}Q${(p.x + cx) / 2} ${Math.min(p.y, cy) - 30} ${cx} ${cy}`,
        cover: cover ? thumbUrl(cover) : '',
      };
    });
  });
}
