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

        <div class="stage" (pointerdown)="down($event)" (pointerup)="up($event)">
          <button type="button" class="nav prev" (click)="lb.go(-1)" [attr.aria-label]="i18n.t('prev')">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4l-8 8 8 8" /></svg>
          </button>
          @for (q of [p]; track q.id + q.v) {
            <img class="big" [src]="full(q)" [alt]="i18n.pick(q.place)" />
          }
          <button type="button" class="nav next" (click)="lb.go(1)" [attr.aria-label]="i18n.t('next')">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8" /></svg>
          </button>
        </div>

        <aside class="info paper-card">
          <div class="count label">{{ lb.index() + 1 }} / {{ lb.list().length }}</div>
          <h2>{{ i18n.pick(p.place) }}</h2>
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

  readonly photo = computed(() => this.lb.list()[this.lb.index()]);
  readonly country = computed(() => {
    const p = this.photo();
    return p ? this.data.country(p.country) : undefined;
  });

  protected readonly full = fullUrl;
  protected readonly thumb = thumbUrl;
  private startX = 0;

  constructor() {
    // zaključaj skrol stranice dok je lightbox otvoren
    effect(() => {
      document.body.style.overflow = this.lb.isOpen() ? 'hidden' : '';
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
    if (e.key === 'Escape') this.lb.close();
    if (e.key === 'ArrowRight') this.lb.go(1);
    if (e.key === 'ArrowLeft') this.lb.go(-1);
  }

  down(e: PointerEvent): void {
    this.startX = e.clientX;
  }

  up(e: PointerEvent): void {
    const dx = e.clientX - this.startX;
    if (Math.abs(dx) > 50 && e.pointerType !== 'mouse') this.lb.go(dx < 0 ? 1 : -1);
  }
}
