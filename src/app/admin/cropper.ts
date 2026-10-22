import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';

/** Pravougaonik isečka, u delovima cele slike (0–1). */
export interface Cut {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

const PRESETS: { label: string; r: number | 'free' | 'orig' }[] = [
  { label: 'Slobodno', r: 'free' },
  { label: 'Original', r: 'orig' },
  { label: '1:1', r: 1 },
  { label: '4:5', r: 4 / 5 },
  { label: '3:2', r: 3 / 2 },
  { label: '2:3', r: 2 / 3 },
  { label: '16:9', r: 16 / 9 },
  { label: '9:16', r: 9 / 16 },
];

/**
 * Ručno isecanje: prevuci okvir, vuci uglove/ivice da promeniš veličinu.
 * Ne menja ništa dok ne klikneš "Primeni".
 */
@Component({
  selector: 'app-cropper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="presets">
      @for (p of presets; track p.label) {
        <button type="button" [class.on]="preset() === p.label" (click)="choose(p)">{{ p.label }}</button>
      }
    </div>

    <div class="area" #area>
      <img [src]="src()" alt="" draggable="false" (load)="loaded($event)" />
      @if (nat()) {
        <div class="shade" [style.clip-path]="hole()"></div>
        <div
          class="box"
          [style.left.%]="cut().x * 100"
          [style.top.%]="cut().y * 100"
          [style.width.%]="cut().w * 100"
          [style.height.%]="cut().h * 100"
          (pointerdown)="down($event, 'move')"
        >
          <i class="g g1"></i><i class="g g2"></i><i class="g g3"></i><i class="g g4"></i>
          @for (h of handles; track h) {
            <span class="h {{ h }}" (pointerdown)="down($event, h)"></span>
          }
        </div>
      }
    </div>

    <div class="info">{{ px() }}</div>
    <div class="row">
      <button type="button" class="primary" (click)="apply.emit(cut())" [disabled]="busy()">✂ Primeni isecanje</button>
      <button type="button" (click)="reset()">Ceo kadar</button>
      <button type="button" (click)="cancel.emit()">Otkaži</button>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .presets,
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 8px 0;
    }
    .presets button {
      padding: 5px 9px;
      font-size: 12px;
    }
    .presets button.on {
      background: #2d241c;
      color: #fbf7ee;
    }
    .area {
      position: relative;
      line-height: 0;
      user-select: none;
      touch-action: none;
    }
    .area img {
      width: 100%;
      height: auto;
      max-height: 62vh;
      object-fit: contain;
    }
    .shade {
      position: absolute;
      inset: 0;
      background: rgba(20, 15, 10, 0.6);
      pointer-events: none;
    }
    .box {
      position: absolute;
      outline: 2px solid #fff;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
      cursor: move;
    }
    .g {
      position: absolute;
      background: rgba(255, 255, 255, 0.45);
      pointer-events: none;
    }
    .g1,
    .g2 {
      top: 0;
      bottom: 0;
      width: 1px;
    }
    .g1 {
      left: 33.33%;
    }
    .g2 {
      left: 66.66%;
    }
    .g3,
    .g4 {
      left: 0;
      right: 0;
      height: 1px;
    }
    .g3 {
      top: 33.33%;
    }
    .g4 {
      top: 66.66%;
    }
    .h {
      position: absolute;
      width: 18px;
      height: 18px;
      margin: -9px 0 0 -9px;
      background: #fff;
      border: 2px solid #2d241c;
      border-radius: 50%;
    }
    .nw {
      left: 0;
      top: 0;
      cursor: nwse-resize;
    }
    .ne {
      left: 100%;
      top: 0;
      cursor: nesw-resize;
    }
    .sw {
      left: 0;
      top: 100%;
      cursor: nesw-resize;
    }
    .se {
      left: 100%;
      top: 100%;
      cursor: nwse-resize;
    }
    .n,
    .s,
    .e,
    .w {
      width: 14px;
      height: 14px;
      margin: -7px 0 0 -7px;
      border-radius: 3px;
    }
    .n {
      left: 50%;
      top: 0;
      cursor: ns-resize;
    }
    .s {
      left: 50%;
      top: 100%;
      cursor: ns-resize;
    }
    .e {
      left: 100%;
      top: 50%;
      cursor: ew-resize;
    }
    .w {
      left: 0;
      top: 50%;
      cursor: ew-resize;
    }
    .info {
      margin-top: 6px;
      font-size: 12px;
      opacity: 0.7;
    }
    .primary {
      background: #2d241c;
      color: #fbf7ee;
    }
  `,
})
export class Cropper {
  readonly src = input.required<string>();
  readonly initial = input<Cut | undefined>();
  readonly busy = input(false);
  readonly apply = output<Cut>();
  readonly cancel = output<void>();

  protected readonly presets = PRESETS;
  protected readonly handles: Handle[] = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
  private readonly area = viewChild.required<ElementRef<HTMLElement>>('area');

  readonly nat = signal<{ w: number; h: number } | null>(null);
  readonly cut = signal<Cut>({ x: 0, y: 0, w: 1, h: 1 });
  readonly preset = signal('Slobodno');
  /** odnos strana u pikselima (širina/visina), ili null = slobodno */
  private ratio: number | null = null;

  readonly hole = computed(() => {
    const c = this.cut();
    const [l, t, r, b] = [c.x, c.y, c.x + c.w, c.y + c.h].map((v) => (v * 100).toFixed(2) + '%');
    // ceo pravougaonik minus rupa (isečak) — "evenodd" preko polygon-a
    return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${l} ${t}, ${r} ${t}, ${r} ${b}, ${l} ${b}, ${l} ${t})`;
  });

  readonly px = computed(() => {
    const n = this.nat();
    if (!n) return 'Učitavam…';
    const c = this.cut();
    return `Isečak: ${Math.round(c.w * n.w)} × ${Math.round(c.h * n.h)} px (od ${n.w} × ${n.h})`;
  });

  loaded(e: Event): void {
    const img = e.target as HTMLImageElement;
    this.nat.set({ w: img.naturalWidth, h: img.naturalHeight });
    const i = this.initial();
    this.cut.set(i ? { ...i } : { x: 0, y: 0, w: 1, h: 1 });
  }

  reset(): void {
    this.preset.set('Slobodno');
    this.ratio = null;
    this.cut.set({ x: 0, y: 0, w: 1, h: 1 });
  }

  choose(p: (typeof PRESETS)[number]): void {
    const n = this.nat();
    if (!n) return;
    this.preset.set(p.label);
    this.ratio = p.r === 'free' ? null : p.r === 'orig' ? n.w / n.h : p.r;
    if (this.ratio === null) return;
    // najveći okvir tog oblika, centriran oko trenutnog isečka
    const c = this.cut();
    const k = this.ratio * (n.h / n.w); // w/h u delovima slike
    let w = 1;
    let h = w / k;
    if (h > 1) {
      h = 1;
      w = k;
    }
    const cx = c.x + c.w / 2;
    const cy = c.y + c.h / 2;
    this.cut.set({ w, h, x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h) });
  }

  // -------- prevlačenje --------
  private drag: { h: Handle; x: number; y: number; c: Cut; W: number; H: number } | null = null;

  down(e: PointerEvent, h: Handle): void {
    e.stopPropagation();
    e.preventDefault();
    const r = this.area().nativeElement.getBoundingClientRect();
    this.drag = { h, x: e.clientX, y: e.clientY, c: { ...this.cut() }, W: r.width, H: r.height };
    const move = (ev: PointerEvent) => this.move(ev);
    const up = () => {
      this.drag = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  private move(e: PointerEvent): void {
    const d = this.drag;
    const n = this.nat();
    if (!d || !n) return;
    const dx = (e.clientX - d.x) / d.W;
    const dy = (e.clientY - d.y) / d.H;
    const c = d.c;
    const MIN = 0.05;

    if (d.h === 'move') {
      this.cut.set({ ...c, x: clamp(c.x + dx, 0, 1 - c.w), y: clamp(c.y + dy, 0, 1 - c.h) });
      return;
    }

    // ivice koje se pomeraju
    let l = c.x;
    let t = c.y;
    let r = c.x + c.w;
    let b = c.y + c.h;
    if (d.h.includes('w')) l = clamp(l + dx, 0, r - MIN);
    if (d.h.includes('e')) r = clamp(r + dx, l + MIN, 1);
    if (d.h.includes('n')) t = clamp(t + dy, 0, b - MIN);
    if (d.h.includes('s')) b = clamp(b + dy, t + MIN, 1);

    if (this.ratio !== null) {
      const k = this.ratio * (n.h / n.w);
      let w = r - l;
      let h = b - t;
      // ivica gore/dole → širina prati visinu; inače visina prati širinu
      if (d.h === 'n' || d.h === 's') w = h * k;
      else h = w / k;
      // ne izlazi van slike
      const maxW = d.h.includes('w') ? c.x + c.w : d.h.includes('e') ? 1 - c.x : 1;
      const maxH = d.h.includes('n') ? c.y + c.h : d.h.includes('s') ? 1 - c.y : 1;
      if (w > maxW) {
        w = maxW;
        h = w / k;
      }
      if (h > maxH) {
        h = maxH;
        w = h * k;
      }
      // sidro = suprotan ugao/ivica
      if (d.h.includes('w')) l = c.x + c.w - w;
      else if (d.h.includes('e')) l = c.x;
      else l = clamp(c.x + c.w / 2 - w / 2, 0, 1 - w);
      if (d.h.includes('n')) t = c.y + c.h - h;
      else if (d.h.includes('s')) t = c.y;
      else t = clamp(c.y + c.h / 2 - h / 2, 0, 1 - h);
      r = l + w;
      b = t + h;
    }
    this.cut.set({ x: l, y: t, w: r - l, h: b - t });
  }
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}
