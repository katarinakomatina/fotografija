import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Photo } from '../core/models';
import { fullUrl, thumbUrl } from '../core/data';

/**
 * Jedan zajednički "posmatrač" za sve slike: slika počinje da se učitava
 * kad je ~1,5 ekran udaljena od vidljivog dela, pa je spremna pre nego što stigneš do nje.
 */
const waiting = new Map<Element, () => void>();
let io: IntersectionObserver | null = null;
function watch(el: Element, cb: () => void): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    cb();
    return () => {};
  }
  io ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const f = waiting.get(e.target);
        waiting.delete(e.target);
        io!.unobserve(e.target);
        f?.();
      }
    },
    { rootMargin: '150% 0px 150% 0px' },
  );
  waiting.set(el, cb);
  io.observe(el);
  return () => {
    waiting.delete(el);
    io?.unobserve(el);
  };
}

/**
 * Prikazuje jednu fotografiju. Ako učitavanje ne uspe (slab internet),
 * pokuša ponovo još 2 puta, umesto da ostane prazan okvir.
 */
@Component({
  selector: 'app-photo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.aspect-ratio]': 'ratio()', '[class.ok]': 'loaded()' },
  template: `
    @if (near()) {
      <img
        [src]="src()"
        [alt]="alt()"
        [attr.fetchpriority]="eager() ? 'high' : null"
        decoding="async"
        draggable="false"
        (load)="done.set(src())"
        (error)="retry()"
        [style.object-position]="pos()"
        [style.transform-origin]="pos()"
        [style.transform]="photo().crop.zoom !== 1 ? 'scale(' + photo().crop.zoom + ')' : null"
      />
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      overflow: hidden;
      background: #d9cbb0;
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      user-select: none;
      opacity: 0;
      transition: opacity 0.35s ease;
    }
    :host(.ok) img {
      opacity: 1;
    }
  `,
})
export class PhotoView {
  readonly photo = input.required<Photo>();
  readonly size = input<'thumb' | 'full'>('thumb');
  readonly ratio = input('4 / 5');
  readonly alt = input('');
  readonly eager = input(false);

  readonly near = signal(false);
  /** adresa slike koja je stvarno stigla */
  readonly done = signal('');
  private readonly tries = signal(0);
  readonly loaded = computed(() => this.done() !== '' && this.done() === this.src());

  readonly src = computed(() => {
    const u = this.size() === 'full' ? fullUrl(this.photo()) : thumbUrl(this.photo());
    const t = this.tries();
    return t ? `${u}&r=${t}` : u;
  });
  readonly pos = computed(() => `${this.photo().crop.x}% ${this.photo().crop.y}%`);

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    let stop = () => {};
    effect(() => {
      if (this.eager()) this.near.set(true);
      else if (!this.near()) stop = watch(el, () => this.near.set(true));
    });
    inject(DestroyRef).onDestroy(() => stop());
  }

  retry(): void {
    if (this.tries() >= 2) {
      this.done.set(this.src()); // bar prikaži šta god je stiglo
      return;
    }
    setTimeout(() => this.tries.update((t) => t + 1), 600 * (this.tries() + 1));
  }
}
