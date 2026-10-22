import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  linkedSignal,
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
    @for (row of visible(); track $index) {
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
    @if (hidden() > 0) {
      <div class="more">
        <button type="button" class="btn ghost" (click)="more()">{{ i18n.t('showMore') }} ({{ hidden() }})</button>
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
    .more {
      display: flex;
      justify-content: center;
      margin-top: 50px;
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
  protected readonly i18n = inject(I18n);
  private readonly data = inject(Data);

  readonly photos = input.required<Photo[]>();
  readonly eagerCount = input(8);
  /** 'large' = veliki redovi (država), 'normal' = manji (sve fotografije) */
  readonly size = input<'large' | 'normal'>('large');
  /** koliko slika (otprilike) prikazati odjednom; 0 = sve. Uvek se prikazuju celi redovi. */
  readonly page = input(0);
  readonly open = output<number>();

  /** koliko slika je "traženo" — raste klikom na "Prikaži još", vraća se na početak kad se promeni lista */
  private readonly want = linkedSignal({ source: () => [this.photos(), this.page()] as const, computation: ([, pg]) => pg });

  /** samo celi redovi: uzimamo redove dok ne pređemo traženi broj slika */
  readonly visible = computed(() => {
    const rows = this.rows();
    const want = this.want();
    if (!want) return rows;
    const out: Item[][] = [];
    let n = 0;
    for (const r of rows) {
      if (n >= want) break;
      out.push(r);
      n += r.length;
    }
    // ako bi ostao samo jedan red, prikaži i njega (bolje nego dugme za par slika)
    return rows.length - out.length === 1 ? rows : out;
  });
  readonly hidden = computed(() => this.photos().length - this.visible().reduce((a, r) => a + r.length, 0));

  more(): void {
    this.want.set(this.visible().reduce((a, r) => a + r.length, 0) + this.page());
  }

  private readonly width = signal(0);
  readonly gap = computed(() => (this.width() < 700 ? 10 : 18));

  readonly rows = computed<Item[][]>(() => {
    const W = this.width();
    if (!W) return [];
    const target =
      this.size() === 'large' ? (W < 520 ? 260 : W < 900 ? 380 : 600) : W < 520 ? 170 : W < 900 ? 230 : 300;
    const gap = this.gap();
    const rows: Item[][] = [];
    let row: { p: Photo; i: number; ar: number }[] = [];
    let sum = 0;
    const label = (p: Photo) => {
      const c = this.data.country(p.country);
      const a = p.area?.sr ? this.i18n.pick(p.area) + ', ' : '';
      return a + this.i18n.pick(p.place) + (c ? ', ' + this.i18n.pick(c.name) : '');
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
