import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Data } from '../core/data';
import { I18n } from '../core/i18n';

@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="wrap page">
      <div class="grid">
        <div class="pic">
          <div class="pol">
            <span class="tape"></span>
            @if (site()?.aboutPhoto; as src) {
              <img class="me" [src]="src" alt="Katarina Komatina" />
            } @else {
              <img class="me cam" src="img/ukrasi/aparat.webp" alt="" />
            }
            <span class="sig hand">Katarina Komatina ♡</span>
          </div>
          <img class="deco p-stamp" src="img/ukrasi/marka.webp" alt="" />
        </div>

        <div class="txt">
          <div class="label">{{ i18n.t('photography') }}</div>
          <h1 class="hand">{{ i18n.t('aboutTitle') }}</h1>
          @for (para of paragraphs(); track $index) {
            <p class="lead">{{ para }}</p>
          }

          <div class="contact paper-card">
            <h2 class="hand">{{ i18n.t('contact') }}</h2>
            <p>{{ i18n.t('contactLine') }}</p>
            <div class="links">
              @if (site()?.email; as e) {
                <a [href]="'mailto:' + e" class="btn">{{ e }}</a>
              }
              @if (site()?.instagram; as ig) {
                <a [href]="'https://instagram.com/' + ig.replace('@', '')" target="_blank" rel="noopener" class="btn ghost">Instagram {{ '@' + ig.replace('@', '') }}</a>
              }
              <a routerLink="/fotografije" class="btn ghost">{{ i18n.t('explorePhotos') }} <span class="arrow">→</span></a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .page {
      padding-top: 60px;
    }
    .grid {
      display: grid;
      grid-template-columns: 380px minmax(0, 1fr);
      gap: 70px;
      align-items: start;
    }
    .pic {
      position: relative;
    }
    .pol {
      position: relative;
      z-index: 2;
      padding: 16px 16px 0;
      background: #fbf7ee;
      box-shadow: var(--shadow);
      transform: rotate(-3deg);
    }
    .pol .tape {
      left: 120px;
      top: -16px;
      transform: rotate(-3deg);
    }
    .me {
      width: 100%;
      aspect-ratio: 4 / 5;
      object-fit: cover;
    }
    .me.cam {
      object-fit: contain;
      padding: 40px;
      background: var(--paper);
    }
    .sig {
      display: block;
      padding: 14px 0 18px;
      font-size: 32px;
      text-align: center;
    }
    .p-flower {
      left: -50px;
      bottom: -70px;
      width: 170px;
      z-index: 3;
      transform: rotate(-14deg);
    }
    .p-stamp {
      right: -30px;
      top: 40px;
      width: 90px;
      z-index: 3;
      transform: rotate(10deg);
    }
    h1 {
      margin: 6px 0 22px;
      font-size: clamp(58px, 8vw, 96px);
      font-weight: 600;
    }
    .lead {
      max-width: 640px;
      margin-bottom: 18px;
      font-size: 19px;
    }
    .contact {
      margin-top: 40px;
      padding: 30px 32px 34px;
      transform: rotate(0.5deg);
    }
    .contact h2 {
      font-size: 44px;
      font-weight: 600;
    }
    .contact p {
      margin: 6px 0 22px;
      color: var(--ink-soft);
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    @media (max-width: 900px) {
      .grid {
        grid-template-columns: 1fr;
        gap: 60px;
      }
      .pic {
        width: min(300px, 80%);
        margin: 0 auto;
      }
      .contact {
        padding: 24px 20px 26px;
      }
    }
  `,
})
export class About {
  protected readonly i18n = inject(I18n);
  private readonly data = inject(Data);
  readonly site = this.data.site;

  readonly paragraphs = computed(() => {
    const s = this.site();
    if (!s) return [];
    const t = this.i18n.lang() === 'sr' ? s.aboutSr : s.aboutEn || s.aboutSr;
    return t.split(/\n+/).filter((x) => x.trim());
  });
}
