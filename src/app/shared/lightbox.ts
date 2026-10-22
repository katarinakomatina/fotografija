import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injectable,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Photo } from '../core/models';
import { Data, fullUrl, thumbUrl } from '../core/data';
import { I18n } from '../core/i18n';

/** Servis preko kog bilo koja stranica otvara lightbox. */
@Injectable({ providedIn: 'root' })
export class LightboxService {
  readonly list = signal<Photo[]>([]);
  readonly index = signal(-1);
  readonly isOpen = computed(() => this.index() >= 0);

  open(list: Photo[], index: number): void {
    this.list.set(list);
    this.index.set(index);
  }

  close(): void {
    this.index.set(-1);
  }

  go(step: number): void {
    const n = this.list().length;
    if (!n) return;
    this.index.update((i) => (i + step + n) % n);
  }
}

@Component({
  selector: 'app-lightbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  host: {
    '(document:keydown)': 'onKey($event)',
  },
  template: `
    @if (photo(); as p) {
      <div class="lb" role="dialog" aria-modal="true" [attr.aria-label]="i18n.pick(p.place)">
        <button type="button" class="x" (click)="lb.close()" [attr.aria-label]="i18n.t('close')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
        </button>

        <div
          class="stage"
          #stage
          [class.zoomed]="scale() > 1"
          (pointerdown)="down($event)"
          (pointermove)="move($event)"
          (pointerup)="up($event)"
          (pointercancel)="up($event)"
          (wheel)="wheel($event)"
          (dblclick)="dbl($event)"
        >
          <button type="button" class="nav prev" (click)="lb.go(-1)" [attr.aria-label]="i18n.t('prev')">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4l-8 8 8 8" /></svg>
          </button>
          @for (q of [p]; track q.id + q.v) {
            <img
              class="big"
              #big
              [class.anim]="!gesture()"
              [src]="full(q)"
              [alt]="i18n.pick(q.place)"
              draggable="false"
              [style.transform]="'translate(' + tx() + 'px,' + ty() + 'px) scale(' + scale() + ')'"
            />
          }
          <button type="button" class="nav next" (click)="lb.go(1)" [attr.aria-label]="i18n.t('next')">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8" /></svg>
          </button>
        </div>

        <aside class="info paper-card">
          <div class="count label">{{ lb.index() + 1 }} / {{ lb.list().length }}</div>
          @if (p.area?.sr) {
            <h2>{{ i18n.pick(p.area!) }}</h2>
            <div class="sub hand">{{ i18n.pick(p.place) }}</div>
          } @else {
            <h2>{{ i18n.pick(p.place) }}</h2>
          }
          @if (country(); as c) {
            <a class="ctry" [routerLink]="['/drzava', c.id]" (click)="lb.close()">
              <span class="flag fi fi-{{ c.iso }}"></span>{{ i18n.pick(c.name) }}
            </a>
            @if (i18n.pick(c.desc)) {
              <p class="desc">{{ i18n.pick(c.desc) }}</p>
            }
            <a class="more" [routerLink]="['/drzava', c.id]" (click)="lb.close()"
              >{{ i18n.t('seeAllFrom') }} {{ i18n.pick(c.name) }} <span class="arrow">→</span></a
            >
          }
          <img class="deco-in" src="img/ukrasi/linija-maslina.webp" alt="" />
        </aside>
        @if (scale() > 1) {
          <button type="button" class="unzoom label" (click)="reset()">{{ i18n.t('zoomOut') }}</button>
        }

        <div class="strip" #strip>
          @for (q of lb.list(); track q.id; let i = $index) {
            <button type="button" class="th" [class.on]="i === lb.index()" (click)="lb.index.set(i)" [attr.aria-label]="i18n.pick(q.place)">
              <img [src]="thumb(q)" alt="" loading="lazy" />
            </button>
          }
        </div>
      </div>
    }
  `,
  styleUrl: './lightbox.scss',
})
export class Lightbox {
  protected readonly lb = inject(LightboxService);
  protected readonly i18n = inject(I18n);
  private readonly data = inject(Data);
  private readonly strip = viewChild<ElementRef<HTMLElement>>('strip');
  private readonly big = viewChild<ElementRef<HTMLImageElement>>('big');

  // ---- uvećanje (zoom): prsti na telefonu, točkić / dupli klik na računaru ----
  readonly scale = signal(1);
  readonly tx = signal(0);
  readonly ty = signal(0);
  /** true dok prst/miš pomera sliku (tada bez animacije) */
  readonly gesture = signal(false);
  private readonly pts = new Map<number, { x: number; y: number }>();
  private pinch: { d: number; s: number; mx: number; my: number } | null = null;
  private last: { x: number; y: number } | null = null;
  private moved = 0;
  private lastTap = 0;
  private lastType = 'mouse';

  readonly photo = computed(() => this.lb.list()[this.lb.index()]);
  readonly country = computed(() => {
    const p = this.photo();
    return p ? this.data.country(p.country) : undefined;
  });

  protected readonly full = fullUrl;
  protected readonly thumb = thumbUrl;
  private startX = 0;
  private startY = 0;

  constructor() {
    // zaključaj skrol stranice dok je lightbox otvoren
    effect(() => {
      document.body.style.overflow = this.lb.isOpen() ? 'hidden' : '';
    });
    // nova slika → vrati na normalnu veličinu
    effect(() => {
      this.lb.index();
      this.lb.list();
      this.reset();
    });
    // aktivna sličica uvek vidljiva u traci
    effect(() => {
      const i = this.lb.index();
      const el = this.strip()?.nativeElement;
      if (!el || i < 0) return;
      queueMicrotask(() => {
        const btn = el.children[i] as HTMLElement | undefined;
        btn?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      });
    });
    // unapred učitaj susednu sliku
    effect(() => {
      const list = this.lb.list();
      const i = this.lb.index();
      if (i < 0 || !list.length) return;
      for (const s of [1, -1]) {
        const q = list[(i + s + list.length) % list.length];
        const img = new Image();
        img.src = fullUrl(q);
      }
    });
  }

  onKey(e: KeyboardEvent): void {
    if (!this.lb.isOpen()) return;
    if (e.key === 'Escape') {
      if (this.scale() > 1) this.reset();
      else this.lb.close();
    }
    if (e.key === 'ArrowRight') this.lb.go(1);
    if (e.key === 'ArrowLeft') this.lb.go(-1);
  }

  reset(): void {
    this.scale.set(1);
    this.tx.set(0);
    this.ty.set(0);
  }

  /** centar slike na ekranu (bez pomeranja/uvećanja) */
  private center(): { x: number; y: number; w: number; h: number } | null {
    const img = this.big()?.nativeElement;
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - this.tx(),
      y: r.top + r.height / 2 - this.ty(),
      w: img.offsetWidth,
      h: img.offsetHeight,
    };
  }

  /** uvećaj na `s`, tako da tačka (x, y) ostane ispod prsta/miša */
  private zoomTo(s: number, x: number, y: number): void {
    const c = this.center();
    if (!c) return;
    s = Math.min(5, Math.max(1, s));
    const mx = x - c.x;
    const my = y - c.y;
    const k = s / this.scale();
    this.tx.set(mx - k * (mx - this.tx()));
    this.ty.set(my - k * (my - this.ty()));
    this.scale.set(s);
    this.clamp();
  }

  /** ne daj da se slika odvuče skroz van ekrana */
  private clamp(): void {
    const c = this.center();
    const s = this.scale();
    if (!c || s <= 1) {
      this.tx.set(0);
      this.ty.set(0);
      if (s < 1) this.scale.set(1);
      return;
    }
    const lx = ((s - 1) * c.w) / 2;
    const ly = ((s - 1) * c.h) / 2;
    this.tx.set(Math.max(-lx, Math.min(lx, this.tx())));
    this.ty.set(Math.max(-ly, Math.min(ly, this.ty())));
  }

  private isUi(e: Event): boolean {
    return !!(e.target as HTMLElement).closest('button');
  }

  down(e: PointerEvent): void {
    this.lastType = e.pointerType;
    if (this.isUi(e)) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.gesture.set(true);
    this.moved = 0;
    if (this.pts.size === 1) {
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.last = { x: e.clientX, y: e.clientY };
    }
    if (this.pts.size === 2) {
      const [a, b] = [...this.pts.values()];
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: this.scale(), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }
  }

  move(e: PointerEvent): void {
    if (!this.pts.has(e.pointerId)) return;
    this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pts.size >= 2 && this.pinch) {
      e.preventDefault();
      const [a, b] = [...this.pts.values()];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      // pomeranje dva prsta zajedno = pomeranje slike
      this.tx.update((t) => t + mx - this.pinch!.mx);
      this.ty.update((t) => t + my - this.pinch!.my);
      this.pinch.mx = mx;
      this.pinch.my = my;
      this.zoomTo((this.pinch.s * Math.hypot(a.x - b.x, a.y - b.y)) / this.pinch.d, mx, my);
      this.moved = 99;
      return;
    }
    if (this.last) {
      const dx = e.clientX - this.last.x;
      const dy = e.clientY - this.last.y;
      this.moved += Math.abs(dx) + Math.abs(dy);
      this.last = { x: e.clientX, y: e.clientY };
      if (this.scale() > 1) {
        this.tx.update((t) => t + dx);
        this.ty.update((t) => t + dy);
        this.clamp();
      }
    }
  }

  up(e: PointerEvent): void {
    if (!this.pts.has(e.pointerId)) return;
    const wasPinch = this.pts.size >= 2 || !!this.pinch;
    this.pts.delete(e.pointerId);
    if (this.pts.size === 1) {
      // posle štipanja ostao jedan prst → nastavi da pomeraš od njega
      const [p] = [...this.pts.values()];
      this.last = { ...p };
      this.pinch = null;
      return;
    }
    if (this.pts.size) return;
    this.gesture.set(false);
    this.pinch = null;
    this.last = null;
    if (wasPinch) {
      if (this.scale() < 1.05) this.reset();
      return;
    }
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    // prevlačenje levo/desno (samo kad slika nije uvećana) = sledeća/prethodna
    if (this.scale() === 1 && e.pointerType !== 'mouse' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      this.lb.go(dx < 0 ? 1 : -1);
      return;
    }
    // dupli dodir prstom = uvećaj / vrati
    if (e.pointerType !== 'mouse' && this.moved < 12) {
      const now = Date.now();
      if (now - this.lastTap < 320) {
        this.lastTap = 0;
        this.toggle(e.clientX, e.clientY);
      } else this.lastTap = now;
    }
  }

  private toggle(x: number, y: number): void {
    if (this.scale() > 1) this.reset();
    else this.zoomTo(2.5, x, y);
  }

  dbl(e: MouseEvent): void {
    // na telefonu dupli dodir već obrađujemo sami (u up), pa ovde samo miš
    if (this.isUi(e) || this.lastType !== 'mouse') return;
    this.toggle(e.clientX, e.clientY);
  }

  wheel(e: WheelEvent): void {
    e.preventDefault();
    this.zoomTo(this.scale() * Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY);
  }
}
