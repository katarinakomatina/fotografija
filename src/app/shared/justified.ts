import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Photo } from '../core/models';
import { I18n } from '../core/i18n';
import { Data } from '../core/data';
import { PhotoView } from './photo';

interface Item {
  photo: Photo;
  index: number;
  w: number;
  h: number;
  label: string;
}

/**
 * Mreža "kao album": svaka slika zadržava svoj originalni oblik (uspravna, položena, kvadrat),
 * a slike se slažu u redove iste visine koji tačno popune širinu.
 */
@Component({
  selector: 'app-justified',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhotoView],
  template: `
    @for (row of rows(); track $index) {
      <div class="row" [style.gap.px]="gap()">
        @for (it of row; track it.photo.id) {
          <button
            type="button"
            class="ph"
            [style.width.px]="it.w"
            [style.height.px]="it.h"
            (click)="open.emit(it.index)"
            [attr.aria-label]="it.label"
          >
            <app-photo [photo]="it.photo" [ratio]="it.photo.w + ' / ' + it.photo.h" [eager]="it.index < eagerCount()" [alt]="it.label" />
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .row {
      display: flex;
      margin-bottom: var(--jgap);
    }
    .ph {
      flex: 0 0 auto;
      padding: 0;
      border: 0;
      background: #fbf7ee;
      cursor: zoom-in;
      outline: 5px solid #fbf7ee;
      outline-offset: -1px;
      box-shadow: 0 6px 16px rgba(45, 36, 28, 0.2);
      transition:
        transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
        box-shadow 0.35s;
    }
    .ph app-photo {
      width: 100%;
      height: 100%;
    }
    .ph:hover,
    .ph:focus-visible {
      position: relative;
      z-index: 2;
      transform: translateY(-5px) scale(1.02);
      box-shadow: 0 18px 34px rgba(45, 36, 28, 0.3);
    }
    @media (max-width: 700px) {
      .ph {
        outline-width: 3px;
      }
    }
  `,
  host: { '[style.--jgap.px]': 'gap()' },
})
export class Justified {
  private readonly i18n = inject(I18n);
  private readonly data = inject(Data);

  readonly photos = input.required<Photo[]>();
  readonly eagerCount = input(8);
  readonly open = output<number>();

  private readonly width = signal(0);
  readonly gap = computed(() => (this.width() < 700 ? 10 : 18));

  readonly rows = computed<Item[][]>(() => {
    const W = this.width();
    if (!W) return [];
    const target = W < 520 ? 260 : W < 900 ? 380 : 600;
    const gap = this.gap();
    const rows: Item[][] = [];
    let row: { p: Photo; i: number; ar: number }[] = [];
    let sum = 0;
    const label = (p: Photo) => {
      const c = this.data.country(p.country);
      return this.i18n.pick(p.place) + (c ? ', ' + this.i18n.pick(c.name) : '');
    };
    const flush = (h: number) => {
      rows.push(row.map((r) => ({ photo: r.p, index: r.i, w: Math.floor(r.ar * h), h: Math.round(h), label: label(r.p) })));
      row = [];
      sum = 0;
    };
    this.photos().forEach((p, i) => {
      const ar = Math.min(3, Math.max(0.45, (p.w || 4) / (p.h || 5)));
      row.push({ p, i, ar });
      sum += ar;
      const full = sum * target + gap * (row.length - 1);
      if (full >= W) flush((W - gap * (row.length - 1)) / sum);
    });
    if (row.length) flush(Math.min(target, (W - gap * (row.length - 1)) / sum));
    return rows;
  });

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const ro = new ResizeObserver((e) => this.width.set(Math.floor(e[0].contentRect.width)));
    ro.observe(el);
    inject(DestroyRef).onDestroy(() => ro.disconnect());
  }
}
