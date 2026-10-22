import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18n } from '../core/i18n';
import { WorldMap } from '../shared/world-map';

@Component({
  selector: 'app-map-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WorldMap],
  template: `
    <section class="wrap page">
      <img class="deco m-plane" src="img/ukrasi/avion.webp" alt="" />
      <div class="label">{{ i18n.t('navMap') }}</div>
      <h1 class="hand">{{ i18n.t('exploreByCountry') }}</h1>
      <p class="lead">{{ i18n.t('chooseCountryHint') }}</p>
      <div class="grid">
        <div class="paper-card mp">
          <app-world-map />
          <span class="tape t1"></span>
          <span class="tape green t2"></span>
        </div>
      </div>
    </section>
  `,
  styles: `
    .page {
      padding-top: 46px;
    }
    h1 {
      margin: 6px 0 8px;
      font-size: clamp(54px, 7.5vw, 92px);
      font-weight: 600;
    }
    .m-plane {
      right: calc(var(--gutter) + 40px);
      top: 40px;
      width: 90px;
      opacity: 0.75;
      transform: rotate(-8deg);
    }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 36px;
      align-items: start;
      margin-top: 36px;
    }
    .mp {
      position: relative;
      width: 100%;
      max-width: 960px;
      margin: 0 auto;
      min-width: 0;
      padding: 16px;
    }
    .t1 {
      left: -26px;
      top: 18px;
      transform: rotate(-38deg);
    }
    .t2 {
      right: -24px;
      bottom: 26px;
      transform: rotate(-40deg);
    }
    .side {
      position: relative;
    }
    .m-seal {
      right: -18px;
      bottom: -46px;
      width: 92px;
      transform: rotate(12deg);
      z-index: 3;
    }
    @media (max-width: 1100px) {
      .grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .side {
        max-width: 520px;
      }
    }
    @media (max-width: 700px) {
      .mp {
        padding: 8px;
      }
      .m-plane {
        width: 60px;
        top: 30px;
      }
      .t1,
      .t2 {
        width: 80px;
        height: 24px;
      }
    }
  `,
})
export class MapPage {
  protected readonly i18n = inject(I18n);
}
