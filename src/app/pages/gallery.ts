import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { Router } from '@angular/router';
import { Data } from '../core/data';
import { I18n } from '../core/i18n';
import { Justified } from '../shared/justified';
import { LightboxService } from '../shared/lightbox';

const PAGE = 32;

@Component({
  selector: 'app-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Justified],
  template: `
    <section class="wrap head">
      <img class="deco g-branch" src="img/ukrasi/linija-list.webp" alt="" />
      <div class="label">{{ i18n.t('photography') }}</div>
      <h1 class="hand">{{ i18n.t('navPhotos') }}</h1>

      <div class="chips" role="group" [attr.aria-label]="i18n.t('chooseCountry')">
        <button type="button" class="chip all" [class.on]="!current()" (click)="pick('')">
          {{ i18n.t('all') }} <span class="n">{{ data.photos().length }}</span>
        </button>
        @for (c of chips(); track c.id) {
          <button type="button" class="chip flagchip" [class.on]="current() === c.id" (click)="pick(c.id)" [attr.aria-label]="c.name" [attr.aria-pressed]="current() === c.id">
            <span class="flag fi fi-{{ c.iso }}"></span>
            <span class="tip hand">{{ c.name }} · {{ c.count }}</span>
          </button>
        }
      </div>
      <div class="now label">
        @if (country(); as c) {
          <span class="flag fi fi-{{ c.iso }}"></span> {{ i18n.pick(c.name) }} ·
        }
        {{ list().length }} {{ i18n.t('photos') }}
      </div>
    </section>

    <section class="wrap">
      <app-justified [photos]="shown()" (open)="open($event)" />
      @if (shown().length < list().length) {
        <div class="more">
          <button type="button" class="btn ghost" (click)="limit.set(limit() + PAGE)">
            {{ i18n.t('showMore') }} ({{ list().length - shown().length }})
          </button>
        </div>
      }
    </section>
  `,
  styles: `
    .head {
      position: relative;
      padding-top: 46px;
      padding-bottom: 34px;
    }
    .g-branch {
      right: var(--gutter);
      top: 10px;
      width: 160px;
      opacity: 0.55;
      transform: rotate(18deg);
    }
    h1 {
      margin: 6px 0 26px;
      font-size: clamp(58px, 8vw, 96px);
      font-weight: 600;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 14px;
    }
    .chip {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 46px;
      border: 1.5px solid rgba(45, 36, 28, 0.35);
      background: rgba(247, 240, 225, 0.7);
      cursor: pointer;
      transition:
        transform 0.25s,
        background 0.25s,
        border-color 0.25s;
    }
    .chip.all {
      padding: 0 18px;
      font-family: var(--type);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .chip .n {
      font-weight: 400;
      color: var(--muted);
    }
    .chip.on {
      background: var(--ink);
      border-color: var(--ink);
      color: var(--paper-light);
    }
    .chip.on .n {
      color: var(--paper-dark);
    }
    .flagchip {
      width: 58px;
      justify-content: center;
      padding: 0;
    }
    .flagchip .flag {
      font-size: 24px;
    }
    .flagchip:hover {
      transform: translateY(-3px) rotate(-3deg);
    }
    .flagchip.on {
      background: var(--paper-light);
      border-color: var(--rust);
      box-shadow:
        0 0 0 3px var(--paper),
        0 0 0 5px var(--rust);
    }
    .tip {
      position: absolute;
      left: 50%;
      bottom: calc(100% + 10px);
      z-index: 5;
      padding: 6px 12px 7px;
      white-space: nowrap;
      font-size: 22px;
      color: var(--ink);
      background: var(--paper-light);
      box-shadow: var(--shadow-sm);
      opacity: 0;
      transform: translate(-50%, 6px) rotate(-2deg);
      pointer-events: none;
      transition:
        opacity 0.2s,
        transform 0.2s;
    }
    .flagchip:hover .tip,
    .flagchip:focus-visible .tip {
      opacity: 1;
      transform: translate(-50%, 0) rotate(-2deg);
    }
    .now {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 22px;
      font-size: 11px;
    }
    .more {
      display: flex;
      justify-content: center;
      margin-top: 50px;
    }
    @media (max-width: 700px) {
      .chips {
        gap: 10px;
      }
      .flagchip {
        width: 50px;
        min-height: 42px;
      }
      .g-branch {
        width: 100px;
      }
    }
  `,
})
export class Gallery {
  protected readonly i18n = inject(I18n);
  protected readonly data = inject(Data);
  private readonly lb = inject(LightboxService);
  private readonly router = inject(Router);
  protected readonly PAGE = PAGE;

  /** ?drzava=srbija iz adrese */
  readonly drzava = input<string>();
  readonly current = computed(() => this.drzava() ?? '');
  readonly country = computed(() => this.data.country(this.current()));

  readonly limit = linkedSignal({ source: this.current, computation: () => PAGE });

  readonly chips = computed(() => {
    const counts = this.data.countByCountry();
    return this.data
      .countries()
      .map((c) => ({ id: c.id, iso: c.iso, name: this.i18n.pick(c.name), count: counts.get(c.id) ?? 0 }))
      .filter((c) => c.count > 0);
  });

  readonly list = computed(() => {
    const c = this.current();
    return c ? this.data.photosOf(c) : this.data.photos();
  });

  readonly shown = computed(() => this.list().slice(0, this.limit()));

  pick(id: string): void {
    this.router.navigate([], { queryParams: { drzava: id || null }, replaceUrl: true });
  }

  open(i: number): void {
    this.lb.open(this.list(), i);
  }
}
