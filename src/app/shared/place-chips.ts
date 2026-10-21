import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Photo } from '../core/models';
import { I18n } from '../core/i18n';

/** Izbor mesta unutar jedne države. Prazno = sva mesta. */
@Component({
  selector: 'app-place-chips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (places().length > 1) {
      <div class="chips" role="group" [attr.aria-label]="i18n.t('places')">
        <button type="button" class="chip all" [class.on]="!selected()" (click)="pick.emit('')" [attr.aria-pressed]="!selected()">
          {{ i18n.t('allPlaces') }} <span class="n">{{ photos().length }}</span>
        </button>
        @for (pl of places(); track pl.key) {
          <button type="button" class="chip" [class.on]="selected() === pl.key" (click)="pick.emit(pl.key)" [attr.aria-pressed]="selected() === pl.key">
            <span class="hand">{{ pl.name }}</span> <span class="n">{{ pl.count }}</span>
          </button>
        }
      </div>
    }
  `,
  styles: `
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 10px;
    }
    .chip {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      min-height: 40px;
      padding: 4px 14px 6px;
      border: 1px dashed rgba(45, 36, 28, 0.45);
      background: rgba(247, 240, 225, 0.6);
      cursor: pointer;
      transition:
        background 0.2s,
        transform 0.2s;
    }
    .chip:hover {
      background: var(--paper-light);
      transform: translateY(-2px) rotate(-1deg);
    }
    .chip .hand {
      font-size: 22px;
      line-height: 1;
    }
    .chip.all {
      align-items: center;
      font-family: var(--type);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .n {
      font-family: var(--type);
      font-size: 11px;
      color: var(--muted);
    }
    .chip.on {
      border-style: solid;
      border-color: var(--ink);
      background: var(--ink);
      color: var(--paper-light);
    }
    .chip.on .n {
      color: var(--paper-dark);
    }
    @media (max-width: 700px) {
      .chips {
        flex-wrap: nowrap;
        overflow-x: auto;
        margin: 0 calc(-1 * var(--gutter));
        padding: 2px var(--gutter) 10px;
        scrollbar-width: none;
      }
      .chips::-webkit-scrollbar {
        display: none;
      }
      .chip {
        flex: 0 0 auto;
        white-space: nowrap;
        min-height: 36px;
        padding: 3px 10px 5px;
      }
      .chip .hand {
        font-size: 19px;
      }
    }
  `,
})
export class PlaceChips {
  protected readonly i18n = inject(I18n);

  readonly photos = input.required<Photo[]>();
  readonly selected = input('');
  readonly pick = output<string>();

  /** mesta sortirana po broju slika (key = srpsko ime, isto u oba jezika) */
  readonly places = computed(() => {
    const m = new Map<string, { key: string; name: string; count: number }>();
    for (const p of this.photos()) {
      const e = m.get(p.place.sr) ?? { key: p.place.sr, name: this.i18n.pick(p.place), count: 0 };
      e.count++;
      m.set(p.place.sr, e);
    }
    return [...m.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  });
}
