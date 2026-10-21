import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Data } from '../core/data';
import { I18n } from '../core/i18n';

/** "Sveska" sa spiskom država, zastavama i pretragom. */
@Component({
  selector: 'app-country-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="book paper-card">
      <div class="rings" aria-hidden="true"></div>
      <h3 class="hand">{{ i18n.t('chooseCountry') }}</h3>
      @if (search()) {
        <label class="search">
          <span class="sr-only">{{ i18n.t('searchCountry') }}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input type="search" [placeholder]="i18n.t('searchCountry')" [value]="q()" (input)="q.set($any($event.target).value)" />
        </label>
      }
      <ul>
        @for (c of list(); track c.id) {
          <li>
            <a [routerLink]="['/drzava', c.id]">
              <span class="flag fi fi-{{ c.iso }}"></span>
              <span class="nm">{{ c.name }}</span>
              <span class="n">{{ c.count }}</span>
              <span class="arrow" aria-hidden="true">›</span>
            </a>
          </li>
        } @empty {
          <li class="empty">{{ i18n.t('noResults') }}</li>
        }
      </ul>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .book {
      position: relative;
      padding: 26px 22px 18px 44px;
      transform: rotate(0.8deg);
    }
    .rings {
      position: absolute;
      left: 10px;
      top: 18px;
      bottom: 18px;
      width: 18px;
      background: radial-gradient(circle at 9px 9px, #6b5a48 3.5px, transparent 4px) 0 0 / 18px 26px repeat-y;
      opacity: 0.8;
    }
    .rings::after {
      content: '';
      position: absolute;
      left: 9px;
      top: 0;
      bottom: 0;
      border-left: 1px solid rgba(156, 74, 44, 0.35);
      transform: translateX(16px);
    }
    h3 {
      font-size: 34px;
      font-weight: 600;
      margin-bottom: 14px;
    }
    .search {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      padding: 0 12px;
      border: 1px solid rgba(45, 36, 28, 0.3);
      background: rgba(255, 255, 255, 0.45);
    }
    .search svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: var(--muted);
      stroke-width: 2;
    }
    input {
      flex: 1;
      min-width: 0;
      height: 44px;
      border: 0;
      background: none;
      font: 15px var(--sans);
      color: var(--ink);
      outline: none;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li + li {
      border-top: 1px dashed rgba(45, 36, 28, 0.22);
    }
    a {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 46px;
      padding: 4px 4px;
      text-decoration: none;
      transition:
        background 0.2s,
        padding 0.2s;
    }
    a:hover {
      background: rgba(201, 173, 127, 0.25);
      padding-left: 10px;
    }
    .flag {
      font-size: 18px;
    }
    .nm {
      flex: 1;
      font-family: var(--serif);
      font-size: 20px;
      font-weight: 500;
    }
    .n {
      font-family: var(--type);
      font-size: 12px;
      color: var(--muted);
    }
    .arrow {
      font-size: 22px;
      color: var(--muted);
    }
    .empty {
      padding: 14px 4px;
      color: var(--muted);
    }
  `,
})
export class CountryList {
  protected readonly i18n = inject(I18n);
  private readonly data = inject(Data);

  readonly search = input(true);
  readonly q = signal('');

  readonly list = computed(() => {
    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'dj');
    const q = norm(this.q().trim());
    const counts = this.data.countByCountry();
    return this.data
      .countries()
      .map((c) => ({ id: c.id, iso: c.iso, name: this.i18n.pick(c.name), count: counts.get(c.id) ?? 0, all: norm(c.name.sr + ' ' + c.name.en) }))
      .filter((c) => !q || c.all.includes(q))
      .sort((a, b) => b.count - a.count);
  });
}
