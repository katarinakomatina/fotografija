import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Photo } from '../core/models';
import { Data } from '../core/data';
import { I18n } from '../core/i18n';
import { PhotoView } from './photo';

/** Fotografija u polaroid okviru sa natpisom mesta. Klik otvara lightbox. */
@Component({
  selector: 'app-polaroid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhotoView],
  template: `
    <button type="button" class="pol" [style.--tilt.deg]="photo().tilt" (click)="open.emit()" [attr.aria-label]="label()">
      <app-photo [photo]="photo()" [alt]="label()" [eager]="eager()" />
      <span class="cap">
        <span class="place hand">{{ i18n.pick(photo().place) }}</span>
        @if (showCountry() && country(); as c) {
          <span class="ctry"><span class="flag fi fi-{{ c.iso }}"></span>{{ i18n.pick(c.name) }}</span>
        }
      </span>
    </button>
  `,
  styles: `
    :host {
      display: block;
    }
    .pol {
      display: block;
      width: 100%;
      padding: 9px 9px 0;
      border: 0;
      text-align: left;
      cursor: zoom-in;
      background: #fbf7ee;
      box-shadow: var(--shadow);
      transform: rotate(var(--tilt, 0deg));
      transition:
        transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1),
        box-shadow 0.45s;
    }
    .pol:hover,
    .pol:focus-visible {
      transform: rotate(0deg) translateY(-8px) scale(1.025);
      box-shadow: 0 22px 40px rgba(45, 36, 28, 0.28);
      position: relative;
      z-index: 2;
    }
    .cap {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 0 10px;
      padding: 8px 2px 10px;
      min-height: 46px;
    }
    .place {
      font-size: 24px;
      color: var(--ink);
    }
    .ctry {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--type);
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }
    @media (max-width: 700px) {
      .pol {
        padding: 6px 6px 0;
      }
      .place {
        font-size: 19px;
      }
      .cap {
        min-height: 36px;
        padding: 5px 1px 7px;
      }
      .ctry {
        font-size: 9px;
        letter-spacing: 0.08em;
      }
    }
  `,
})
export class Polaroid {
  protected readonly i18n = inject(I18n);
  private readonly data = inject(Data);

  readonly photo = input.required<Photo>();
  readonly showCountry = input(true);
  readonly eager = input(false);
  readonly open = output<void>();

  readonly country = computed(() => this.data.country(this.photo().country));
  readonly label = computed(() => {
    const c = this.country();
    return this.i18n.pick(this.photo().place) + (c ? ', ' + this.i18n.pick(c.name) : '');
  });
}
