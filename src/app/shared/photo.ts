import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Photo } from '../core/models';
import { fullUrl, thumbUrl } from '../core/data';

/**
 * Prikazuje jednu fotografiju sa isečkom (crop) i uvećanjem iz admina.
 * Okvir ima fiksan odnos strana (podrazumevano 4:5), a slika ga popunjava.
 */
@Component({
  selector: 'app-photo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.aspect-ratio]': 'ratio()' },
  template: `
    <img
      [src]="src()"
      [alt]="alt()"
      [attr.loading]="eager() ? 'eager' : 'lazy'"
      [attr.fetchpriority]="eager() ? 'high' : null"
      decoding="async"
      draggable="false"
      [style.object-position]="pos()"
      [style.transform-origin]="pos()"
      [style.transform]="'scale(' + photo().crop.zoom + ')'"
    />
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      overflow: hidden;
      background: #d9cbb0;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      user-select: none;
    }
  `,
})
export class PhotoView {
  readonly photo = input.required<Photo>();
  readonly size = input<'thumb' | 'full'>('thumb');
  readonly ratio = input('4 / 5');
  readonly alt = input('');
  readonly eager = input(false);

  readonly src = computed(() => (this.size() === 'full' ? fullUrl(this.photo()) : thumbUrl(this.photo())));
  readonly pos = computed(() => `${this.photo().crop.x}% ${this.photo().crop.y}%`);
}
