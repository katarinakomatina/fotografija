import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Data } from '../core/data';
import { I18n } from '../core/i18n';
import { Justified } from '../shared/justified';
import { LightboxService } from '../shared/lightbox';

const PAGE = 32;

@Component({
  selector: 'app-country',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Justified],
  template: `
    @if (country(); as c) {
      <section class="wrap head">
        <div class="crumbs label">
          <a routerLink="/mapa">← {{ i18n.t('backToMap') }}</a>
        </div>
        <div class="head-grid">
          <div class="txt">
            <h1>{{ i18n.pick(c.name) }} <span class="flag fi fi-{{ c.iso }}"></span></h1>
            <p class="lead">{{ i18n.pick(c.desc) }}</p>
            <div class="places">
              @for (pl of places(); track pl) {
                <span class="hand">{{ pl }}</span>
              }
            </div>
            <div class="label cnt">{{ photos().length }} {{ i18n.t('photos') }}</div>
          </div>
          <div class="art">
            @if (ills()[0]; as a) {
              <img class="ill main" [src]="'img/ilustracije/' + a + '.webp'" alt="" />
            }
            @if (ills()[1]; as b) {
              <img class="ill second" [src]="'img/ilustracije/' + b + '.webp'" alt="" />
            }
            <img class="deco c-stamp" src="img/ukrasi/marka.webp" alt="" />
            <img class="deco c-postmark" src="img/ukrasi/pecat.webp" alt="" />
          </div>
        </div>
      </section>

      <section class="wrap">
        <app-justified [photos]="shown()" (open)="open($event)" />
        @if (shown().length < photos().length) {
          <div class="more">
            <button type="button" class="btn ghost" (click)="limit.set(limit() + 32)">
              {{ i18n.t('showMore') }} ({{ photos().length - shown().length }})
            </button>
          </div>
        }
      </section>

      <section class="wrap others">
        <div class="label">{{ i18n.t('exploreByCountry') }}</div>
        <div class="other-list">
          @for (o of others(); track o.id) {
            <a [routerLink]="['/drzava', o.id]" class="other"><span class="flag fi fi-{{ o.iso }}"></span> {{ i18n.pick(o.name) }}</a>
          }
        </div>
      </section>
    } @else {
      <section class="wrap head">
        <h1 class="hand">404</h1>
        <a routerLink="/mapa" class="btn">{{ i18n.t('backToMap') }}</a>
      </section>
    }
  `,
  styles: `
    .head {
      padding-top: 34px;
      padding-bottom: 56px;
    }
    .crumbs a {
      text-decoration: none;
    }
    .crumbs a:hover {
      color: var(--rust);
    }
    .head-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 40px;
      align-items: center;
    }
    h1 {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 22px;
      margin: 20px 0 22px;
      font-size: clamp(56px, 8vw, 104px);
      font-weight: 400;
    }
    h1 .flag {
      font-size: 0.42em;
    }
    .lead {
      max-width: 500px;
    }
    .places {
      display: flex;
      flex-wrap: wrap;
      gap: 2px 18px;
      margin-top: 22px;
      max-width: 560px;
    }
    .places .hand {
      font-size: 24px;
      color: var(--rust-dark);
    }
    .places .hand:not(:last-child)::after {
      content: '·';
      margin-left: 18px;
      color: var(--muted);
    }
    .cnt {
      margin-top: 20px;
      font-size: 11px;
    }
    .art {
      position: relative;
      min-height: 320px;
    }
    .ill.main {
      position: relative;
      z-index: 2;
      width: 88%;
      margin-left: auto;
      filter: drop-shadow(0 10px 18px rgba(45, 36, 28, 0.2));
      animation: rise 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both;
    }
    .ill.second {
      position: absolute;
      left: 0;
      bottom: -40px;
      z-index: 3;
      width: 42%;
      filter: drop-shadow(0 10px 18px rgba(45, 36, 28, 0.25));
      transform: rotate(-4deg);
      animation: rise 0.9s 0.2s cubic-bezier(0.2, 0.7, 0.2, 1) backwards;
    }
    .c-stamp {
      right: -10px;
      top: -30px;
      width: 96px;
      z-index: 4;
      transform: rotate(9deg);
    }
    .c-postmark {
      right: 50px;
      top: -40px;
      width: 120px;
      opacity: 0.55;
      z-index: 5;
      transform: rotate(-12deg);
    }
    .more {
      display: flex;
      justify-content: center;
      margin-top: 50px;
    }
    .others {
      margin-top: 90px;
    }
    .other-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 14px;
      margin-top: 16px;
    }
    .other {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 6px 14px;
      font-family: var(--serif);
      font-size: 19px;
      text-decoration: none;
      border: 1px dashed rgba(45, 36, 28, 0.4);
      background: rgba(247, 240, 225, 0.6);
    }
    .other:hover {
      border-style: solid;
      background: var(--paper-light);
    }
    @media (max-width: 860px) {
      .head-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .art {
        order: -1;
        min-height: 0;
        margin: 10px 0 30px;
      }
      .ill.main {
        width: 92%;
      }
      .ill.second {
        width: 40%;
        bottom: -26px;
      }
      .c-stamp {
        width: 70px;
        top: -10px;
      }
      .c-postmark {
        width: 90px;
        top: -20px;
      }
      .places .hand {
        font-size: 21px;
      }
    }
  `,
})
export class CountryPage {
  protected readonly i18n = inject(I18n);
  private readonly data = inject(Data);
  private readonly lb = inject(LightboxService);

  readonly id = input.required<string>();
  readonly country = computed(() => this.data.country(this.id()));
  readonly photos = computed(() => this.data.photosOf(this.id()));
  readonly limit = linkedSignal({ source: this.id, computation: () => PAGE });
  readonly shown = computed(() => this.photos().slice(0, this.limit()));
  readonly ills = computed(() => this.country()?.illustrations ?? []);

  readonly places = computed(() => {
    const seen = new Map<string, number>();
    for (const p of this.photos()) {
      const n = this.i18n.pick(p.place);
      seen.set(n, (seen.get(n) ?? 0) + 1);
    }
    return [...seen.keys()];
  });

  readonly others = computed(() => this.data.countries().filter((c) => c.id !== this.id()));

  open(i: number): void {
    this.lb.open(this.photos(), i);
  }
}
