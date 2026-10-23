import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';

/** Pravougaonik isečka, u delovima cele slike (0–1). */
export interface Cut {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Handle = 'new' | 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

/**
 * Isecanje preko celog ekrana:
 * prevuci mišem preko slike i označi deo koji želiš da ostane.
 * Označeno možeš da pomeraš, a kružićima na uglovima da ga povećaš ili smanjiš.
 */
@Component({
  selector: 'app-cropper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cancel.emit()' },
  template: `
    <div class="top">
      <b>Isecanje</b>
      <span>{{ cut() ? 'Prevuci okvir da ga pomeriš, vuci kružiće da promeniš veličinu.' : 'Prevuci mišem preko slike i označi deo koji želiš da ostane.' }}</span>
    </div>

    <div class="stage">
      <div class="area" #area (pointerdown)="down($event, 'new')">
        <img [src]="src()" alt="" draggable="false" (load)="onLoad()" />
        @if (cut(); as c) {
          <div class="shade" [style.clip-path]="hole()"></div>
          <div
            class="box"
            [style.left.%]="c.x * 100"
            [style.top.%]="c.y * 100"
            [style.width.%]="c.w * 100"
            [style.height.%]="c.h * 100"
            (pointerdown)="down($event, 'move')"
          >
            <i class="g g1"></i><i class="g g2"></i><i class="g g3"></i><i class="g g4"></i>
            @for (h of handles; track h) {
              <span class="h {{ h }}" (pointerdown)="down($event, h)"></span>
            }
          </div>
        }
      </div>
    </div>

    <div class="bar">
      <button type="button" class="primary" (click)="done()" [disabled]="!cut() || busy()">✂ Iseci</button>
      @if (cut()) {
        <button type="button" (click)="cut.set(null)">Obriši označeno</button>
      }
      <button type="button" (click)="cancel.emit()">Otkaži</button>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(20, 15, 10, 0.94);
      color: #fbf7ee;
    }
    .top {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: baseline;
      font-size: 15px;
    }
    .top b {
      font-size: 18px;
    }
    .stage {
      flex: 1;
      min-height: 0;
      width: 100%;
      display: grid;
      place-items: center;
    }
    .area {
      position: relative;
      line-height: 0;
      user-select: none;
      touch-action: none;
      cursor: crosshair;
    }
    .area img {
      display: block;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 140px);
      width: auto;
      height: auto;
      pointer-events: none;
    }
    .shade {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.62);
      pointer-events: none;
    }
    .box {
      position: absolute;
      outline: 2px solid #fff;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
      cursor: move;
    }
    .g {
      position: absolute;
      background: rgba(255, 255, 255, 0.4);
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
      width: 20px;
      height: 20px;
      margin: -10px 0 0 -10px;
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
      width: 16px;
      height: 16px;
      margin: -8px 0 0 -8px;
      border-radius: 4px;
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
    .bar {
      display: flex;
      gap: 10px;
    }
    .bar button {
      padding: 10px 18px;
      font-size: 15px;
      border-radius: 8px;
      border: 1px solid #fbf7ee;
      background: transparent;
      color: #fbf7ee;
      cursor: pointer;
    }
    .bar .primary {
      background: #fbf7ee;
      color: #2d241c;
      font-weight: 600;
    }
    .bar button:disabled {
      opacity: 0.4;
      cursor: default;
    }
  `,
})
export class Cropper {
  readonly src = input.required<string>();
  readonly initial = input<Cut | undefined>();
  readonly busy = input(false);
  readonly apply = output<Cut>();
  readonly cancel = output<void>();

  protected readonly handles: Handle[] = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
  private readonly area = viewChild.required<ElementRef<HTMLElement>>('area');

  readonly ready = signal(false);
  /** označeni deo (null = još ništa nije označeno) */
  readonly cut = signal<Cut | null>(null);

  readonly hole = computed(() => {
    const c = this.cut();
    if (!c) return 'none';
    const [l, t, r, b] = [c.x, c.y, c.x + c.w, c.y + c.h].map((v) => (v * 100).toFixed(2) + '%');
    return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${l} ${t}, ${r} ${t}, ${r} ${b}, ${l} ${b}, ${l} ${t})`;
  });

  onLoad(): void {
    this.ready.set(true);
    // ako je slika već bila isečena, pokaži prethodni okvir
    const i = this.initial();
    if (i && !(i.w > 0.999 && i.h > 0.999)) this.cut.set({ ...i });
  }

  done(): void {
    const c = this.cut();
    if (c) this.apply.emit(c);
  }

  // -------- miš / prst --------
  private drag: { h: Handle; x0: number; y0: number; c: Cut | null; r: DOMRect } | null = null;

  down(e: PointerEvent, h: Handle): void {
    if (!this.ready() || e.button > 0) return;
    e.stopPropagation();
    e.preventDefault();
    const r = this.area().nativeElement.getBoundingClientRect();
    const x0 = clamp((e.clientX - r.left) / r.width, 0, 1);
    const y0 = clamp((e.clientY - r.top) / r.height, 0, 1);
    this.drag = { h, x0, y0, c: this.cut() ? { ...this.cut()! } : null, r };
    const move = (ev: PointerEvent) => this.move(ev);
    const up = () => {
      // samo klik bez prevlačenja → ne ostavljaj sićušan okvir
      const c = this.cut();
      if (c && (c.w < 0.02 || c.h < 0.02)) this.cut.set(this.drag?.c ?? null);
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
    if (!d) return;
    const x = clamp((e.clientX - d.r.left) / d.r.width, 0, 1);
    const y = clamp((e.clientY - d.r.top) / d.r.height, 0, 1);

    // novi okvir: od mesta gde si pritisla do mesta gde je miš
    if (d.h === 'new' || !d.c) {
      this.cut.set({ x: Math.min(d.x0, x), y: Math.min(d.y0, y), w: Math.abs(x - d.x0), h: Math.abs(y - d.y0) });
      return;
    }

    const c = d.c;
    const dx = x - d.x0;
    const dy = y - d.y0;
    if (d.h === 'move') {
      this.cut.set({ ...c, x: clamp(c.x + dx, 0, 1 - c.w), y: clamp(c.y + dy, 0, 1 - c.h) });
      return;
    }
    const MIN = 0.03;
    let l = c.x;
    let t = c.y;
    let r = c.x + c.w;
    let b = c.y + c.h;
    if (d.h.includes('w')) l = clamp(l + dx, 0, r - MIN);
    if (d.h.includes('e')) r = clamp(r + dx, l + MIN, 1);
    if (d.h.includes('n')) t = clamp(t + dy, 0, b - MIN);
    if (d.h.includes('s')) b = clamp(b + dy, t + MIN, 1);
    this.cut.set({ x: l, y: t, w: r - l, h: b - t });
  }
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}
