import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Data, thumbUrl } from '../core/data';
import { Content, Country, Photo, SiteText } from '../core/models';
import { PhotoView } from '../shared/photo';
import { Cropper, Cut } from './cropper';

type Tab = 'photos' | 'countries' | 'texts';

/** Prevod naziva mesta na engleski kad već postoji (npr. Beograd → Belgrade). */
function knownEnglish(content: Content, country: string, placeSr: string): string {
  const hit = content.photos.find((p) => p.country === country && p.place.sr === placeSr);
  return hit?.place.en || placeSr;
}

function slug(s: string): string {
  return s
    .replace(/đ/g, 'dj')
    .replace(/Đ/g, 'Dj')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Opštine Beograda — u adminu se vide uvek (i prazne), posetioci vide samo one koje imaju slike */
const KNOWN_AREAS: Record<string, [string, string][]> = {
  Beograd: [
    ['Barajevo', 'Barajevo'],
    ['Voždovac', 'Voždovac'],
    ['Vračar', 'Vračar'],
    ['Grocka', 'Grocka'],
    ['Zvezdara', 'Zvezdara'],
    ['Zemun', 'Zemun'],
    ['Lazarevac', 'Lazarevac'],
    ['Mladenovac', 'Mladenovac'],
    ['Novi Beograd', 'New Belgrade'],
    ['Obrenovac', 'Obrenovac'],
    ['Palilula', 'Palilula'],
    ['Rakovica', 'Rakovica'],
    ['Savski venac', 'Savski Venac'],
    ['Sopot', 'Sopot'],
    ['Stari grad', 'Stari Grad'],
    ['Surčin', 'Surčin'],
    ['Čukarica', 'Čukarica'],
  ],
};
const NONE = '__bez__';

@Component({
  selector: 'app-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CdkDropList, CdkDrag, CdkDragPlaceholder, PhotoView, Cropper],
  host: { '(document:keydown)': 'onKey($event)', '(window:beforeunload)': 'beforeUnload($event)' },
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  protected readonly NONE = NONE;
  private readonly data = inject(Data);

  readonly content = signal<Content | null>(null);
  readonly saved = signal('');
  readonly dirty = computed(() => !!this.content() && JSON.stringify(this.content()) !== this.saved());
  readonly status = signal<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null);
  readonly serverDown = signal(false);
  readonly busy = signal(false);

  readonly tab = signal<Tab>('photos');
  readonly filter = signal('');
  readonly selectedId = signal('');
  /** filter po mestu i delu mesta (vraćaju se na "sve" kad promeniš državu / mesto) */
  readonly placeFilter = linkedSignal({ source: this.filter, computation: () => '' });
  readonly areaFilter = linkedSignal({ source: this.placeFilter, computation: () => '' });
  /** slike označene kvadratićem (za dodelu opštine više slika odjednom) */
  /** kad promeniš filter, oznake se brišu — da se nikad ne promene slike koje trenutno ne vidiš */
  readonly picked = linkedSignal<string, ReadonlySet<string>>({
    source: () => this.filter() + '|' + this.placeFilter() + '|' + this.areaFilter(),
    computation: () => new Set(),
  });
  readonly bulkArea = signal('');

  // dodavanje
  readonly upCountry = signal('');
  readonly upPlaceSr = signal('');
  readonly upPlaceEn = signal('');
  readonly upArea = signal('');
  readonly allAreas = computed(() => [...new Set(this.photos().map((p) => p.area?.sr).filter((a): a is string => !!a))].sort());
  readonly upFiles = signal<File[]>([]);
  readonly dragOver = signal(false);

  // nova država
  readonly nc = signal({ iso: '', sr: '', en: '', lat: 44, lng: 20 });

  protected readonly thumb = thumbUrl;

  readonly countries = computed(() => this.content()?.countries ?? []);
  readonly photos = computed(() => this.content()?.photos ?? []);
  readonly site = computed(() => this.content()?.site);

  readonly visible = computed(() => {
    const f = this.filter();
    const pl = this.placeFilter();
    const a = this.areaFilter();
    return this.photos().filter(
      (p) =>
        (!f || p.country === f) &&
        (!pl || p.place.sr === pl) &&
        (!a || (a === NONE ? !p.area?.sr : p.area?.sr === a)),
    );
  });

  /** mesta u izabranoj državi, sa brojem slika */
  readonly placeList = computed(() => {
    const f = this.filter();
    if (!f) return [];
    const m = new Map<string, number>();
    for (const p of this.photos()) if (p.country === f) m.set(p.place.sr, (m.get(p.place.sr) ?? 0) + 1);
    return [...m].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  });

  /** delovi izabranog mesta: poznate opštine (i prazne) + one koje si sama upisala */
  readonly areaList = computed(() => {
    const pl = this.placeFilter();
    if (!pl) return [];
    const inPlace = this.photos().filter((p) => p.country === this.filter() && p.place.sr === pl);
    const m = new Map<string, number>((KNOWN_AREAS[pl] ?? []).map(([sr]) => [sr, 0]));
    for (const p of inPlace) if (p.area?.sr) m.set(p.area.sr, (m.get(p.area.sr) ?? 0) + 1);
    return [...m].map(([name, n]) => ({ name, n })).sort((a, b) => a.name.localeCompare(b.name, 'sr-Latn'));
  });
  readonly noAreaCount = computed(
    () => this.photos().filter((p) => p.country === this.filter() && p.place.sr === this.placeFilter() && !p.area?.sr).length,
  );

  readonly selected = computed(() => this.photos().find((p) => p.id === this.selectedId()));
  readonly selectedIndex = computed(() => this.photos().findIndex((p) => p.id === this.selectedId()));

  readonly counts = computed(() => {
    const m = new Map<string, number>();
    for (const p of this.photos()) m.set(p.country, (m.get(p.country) ?? 0) + 1);
    return m;
  });

  readonly placesFor = computed(() => {
    const c = this.upCountry();
    return [...new Set(this.photos().filter((p) => p.country === c).map((p) => p.place.sr))].sort();
  });

  readonly placesOfSelected = computed(() => {
    const s = this.selected();
    if (!s) return [];
    return [...new Set(this.photos().filter((p) => p.country === s.country).map((p) => p.place.sr))].sort();
  });

  /** delovi mesta (opštine) koji već postoje za isto mesto — za brzi izbor */
  readonly areasOfSelected = computed(() => {
    const s = this.selected();
    if (!s) return [];
    return this.areaOptions(s.place.sr);
  });

  /** predlozi opština za neko mesto (poznate + već upisane) */
  areaOptions(place: string): string[] {
    const used = this.photos().filter((p) => p.place.sr === place && p.area?.sr).map((p) => p.area!.sr);
    return [...new Set([...(KNOWN_AREAS[place] ?? []).map(([sr]) => sr), ...used])].sort((a, b) => a.localeCompare(b, 'sr-Latn'));
  }

  /** opcije za grupnu dodelu: opštine mesta svih označenih slika */
  readonly bulkOptions = computed(() => {
    const ids = this.picked();
    const places = new Set(this.photos().filter((p) => ids.has(p.id)).map((p) => p.place.sr));
    return [...new Set([...places].flatMap((pl) => this.areaOptions(pl)))];
  });

  togglePick(id: string, e: Event): void {
    e.stopPropagation();
    const s = new Set(this.picked());
    if (s.has(id)) s.delete(id);
    else s.add(id);
    this.picked.set(s);
  }

  clearPicked(): void {
    this.picked.set(new Set());
  }

  pickAllVisible(): void {
    this.picked.set(new Set(this.visible().map((p) => p.id)));
  }

  /** dodeli (ili ukloni, ako je prazno) opštinu svim označenim slikama */
  bulkSetArea(value: string): void {
    value = value.trim();
    const ids = this.picked();
    if (!ids.size) return;
    this.patch((c) => ({
      ...c,
      photos: c.photos.map((p) => {
        if (!ids.has(p.id)) return p;
        const { area: _a, ...rest } = p;
        return value ? { ...rest, area: { sr: value, en: this.areaEn(value, p.place.sr) } } : (rest as Photo);
      }),
    }));
    this.flash('info', value ? `Opština "${value}" dodeljena na ${ids.size} slika — ne zaboravi da sačuvaš.` : `Opština uklonjena sa ${ids.size} slika.`);
    this.picked.set(new Set());
    this.bulkArea.set('');
  }

  /** engleski naziv opštine: iz spiska poznatih, ili sa neke druge slike, ili isti kao srpski */
  private areaEn(sr: string, place: string): string {
    return (
      KNOWN_AREAS[place]?.find(([s]) => s === sr)?.[1] ??
      this.photos().find((p) => p.area?.sr === sr && p.area.en)?.area?.en ??
      sr
    );
  }

  /** da li je otvoren alat za ručno isecanje (zatvara se kad izabereš drugu sliku) */
  readonly cropping = linkedSignal({ source: () => this.selectedId(), computation: () => false });

  constructor() {
    this.reload();
  }

  // ============ učitavanje i čuvanje ============

  async reload(): Promise<void> {
    try {
      const r = await fetch('/api/content', { cache: 'no-store' });
      if (!r.ok) throw new Error();
      const c = (await r.json()) as Content;
      this.content.set(c);
      this.saved.set(JSON.stringify(c));
      this.serverDown.set(false);
      if (!this.upCountry() && c.countries[0]) this.upCountry.set(c.countries[0].id);
    } catch {
      this.serverDown.set(true);
      // bez servera: prikaži ono što sajt već ima, ali bez čuvanja
      const c = this.data.content();
      if (c) {
        this.content.set(structuredClone(c));
        this.saved.set(JSON.stringify(c));
      }
    }
  }

  async save(): Promise<void> {
    const c = this.content();
    if (!c || this.busy()) return;
    this.busy.set(true);
    try {
      const r = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c),
      });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || 'Greška');
      this.saved.set(JSON.stringify(c));
      this.data.content.set(structuredClone(c));
      const t = res.trashed?.length ? ` · ${res.trashed.length} obrisanih fajlova je u folderu admin-server/kanta` : '';
      this.flash('ok', 'Sačuvano ✓ Sad uradi git push da se vidi na sajtu.' + t);
    } catch (e) {
      this.flash('err', 'Nije sačuvano: ' + ((e as Error).message || 'da li radi npm run admin?'));
    } finally {
      this.busy.set(false);
    }
  }

  discard(): void {
    if (confirm('Poništiti sve nesačuvane izmene?')) this.reload();
  }

  flash(kind: 'ok' | 'err' | 'info', text: string): void {
    this.status.set({ kind, text });
    setTimeout(() => {
      if (this.status()?.text === text) this.status.set(null);
    }, 7000);
  }

  onKey(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      this.save();
    }
  }

  beforeUnload(e: BeforeUnloadEvent): void {
    if (this.dirty()) e.preventDefault();
  }

  // ============ izmene ============

  private patch(fn: (c: Content) => Content): void {
    const c = this.content();
    if (c) this.content.set(fn(c));
  }

  updatePhoto(id: string, ch: Partial<Photo>): void {
    this.patch((c) => ({ ...c, photos: c.photos.map((p) => (p.id === id ? { ...p, ...ch } : p)) }));
  }

  updateCrop(id: string, ch: Partial<Photo['crop']>): void {
    const p = this.photos().find((x) => x.id === id);
    if (p) this.updatePhoto(id, { crop: { ...p.crop, ...ch } });
  }

  updatePlace(id: string, lang: 'sr' | 'en', value: string): void {
    const p = this.photos().find((x) => x.id === id);
    if (!p) return;
    const place = { ...p.place, [lang]: value };
    if (lang === 'sr' && (!p.place.en || p.place.en === p.place.sr)) place.en = value;
    this.updatePhoto(id, { place });
  }

  updateArea(id: string, lang: 'sr' | 'en', value: string): void {
    const p = this.photos().find((x) => x.id === id);
    if (!p) return;
    value = value.trim();
    if (lang === 'sr' && !value) {
      const { area: _a, ...rest } = p;
      this.patch((c) => ({ ...c, photos: c.photos.map((x) => (x.id === id ? (rest as Photo) : x)) }));
      return;
    }
    const old = p.area ?? { sr: '', en: '' };
    const area = { ...old, [lang]: value };
    if (lang === 'sr') {
      // engleski naziv: iz spiska poznatih opština ili sa druge slike
      if (!old.en || old.en === old.sr) area.en = this.areaEn(value, p.place.sr);
    }
    this.updatePhoto(id, { area });
  }

  updateSite(ch: Partial<SiteText>): void {
    this.patch((c) => ({ ...c, site: { ...c.site, ...ch } }));
  }

  updateCountry(id: string, ch: Partial<Country>): void {
    this.patch((c) => ({ ...c, countries: c.countries.map((x) => (x.id === id ? { ...x, ...ch } : x)) }));
  }

  /** Prevlačenje: radi i kad je uključen filter po državi */
  drop(e: CdkDragDrop<Photo[]>): void {
    if (e.previousIndex === e.currentIndex) return;
    const all = [...this.photos()];
    const subset = [...this.visible()];
    const slots = subset.map((p) => all.indexOf(p));
    moveItemInArray(subset, e.previousIndex, e.currentIndex);
    slots.forEach((slot, i) => (all[slot] = subset[i]));
    this.patch((c) => ({ ...c, photos: all }));
  }

  move(id: string, where: 'top' | 'bottom' | -1 | 1): void {
    const all = [...this.photos()];
    const i = all.findIndex((p) => p.id === id);
    if (i < 0) return;
    const [p] = all.splice(i, 1);
    if (where === 'top') all.unshift(p);
    else if (where === 'bottom') all.push(p);
    else all.splice(Math.max(0, Math.min(all.length, i + where)), 0, p);
    this.patch((c) => ({ ...c, photos: all }));
  }

  remove(p: Photo): void {
    if (!confirm(`Da li si sigurna da brišeš "${p.place.sr}" (${p.file})?\n\nPosle čuvanja fajl ide u folder admin-server/kanta.`)) return;
    const next = this.visible()[this.visible().indexOf(p) + 1];
    this.patch((c) => ({ ...c, photos: c.photos.filter((x) => x.id !== p.id) }));
    this.selectedId.set(next?.id ?? '');
  }

  async rotate(p: Photo, deg: 90 | -90): Promise<void> {
    if (this.serverDown()) return this.flash('err', 'Pokreni npm run admin');
    this.busy.set(true);
    try {
      const r = await fetch('/api/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: p.file, deg }),
      });
      const s = await r.json();
      if (!r.ok) throw new Error(s.error);
      const { cut: _c, ...rest } = p;
      this.patch((c) => ({
        ...c,
        photos: c.photos.map((x) => (x.id === p.id ? { ...rest, w: s.w, h: s.h, v: (p.v || 1) + 1, crop: { x: 50, y: 50, zoom: 1 } } : x)),
      }));
      this.flash('info', 'Rotirano — ne zaboravi da sačuvaš.');
    } catch (e) {
      this.flash('err', 'Rotacija nije uspela: ' + (e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async applyCut(p: Photo, cut: Cut): Promise<void> {
    await this.cutCall(p, '/api/crop', { file: p.file, ...cut }, cut);
  }

  async uncut(p: Photo): Promise<void> {
    await this.cutCall(p, '/api/uncrop', { file: p.file }, undefined);
  }

  private async cutCall(p: Photo, url: string, body: object, cut: Cut | undefined): Promise<void> {
    if (this.serverDown()) return this.flash('err', 'Pokreni npm run admin');
    this.busy.set(true);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const s = await r.json();
      if (!r.ok) throw new Error(s.error);
      const { cut: _old, ...rest } = p;
      const next: Photo = { ...rest, w: s.w, h: s.h, v: (p.v || 1) + 1, crop: { x: 50, y: 50, zoom: 1 } };
      if (cut) next.cut = cut;
      this.patch((c) => ({ ...c, photos: c.photos.map((x) => (x.id === p.id ? next : x)) }));
      this.cropping.set(false);
      this.flash('info', cut ? 'Isečeno — ne zaboravi da sačuvaš.' : 'Vraćen ceo original — ne zaboravi da sačuvaš.');
    } catch (e) {
      this.flash('err', 'Nije uspelo: ' + (e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  setHero(p: Photo): void {
    this.updateSite({ hero: p.id });
    this.flash('info', 'Ovo je sada glavna fotografija na početnoj.');
  }

  setHeroSmall(p: Photo): void {
    this.updateSite({ heroSmall: p.id });
    this.flash('info', 'Ovo je sada mala slika (polaroid) na početnoj.');
  }

  setCover(p: Photo): void {
    this.updateCountry(p.country, { cover: p.id });
    this.flash('info', 'Ovo je sada slika države na mapi.');
  }

  isCover(p: Photo): boolean {
    return this.countries().find((c) => c.id === p.country)?.cover === p.id;
  }

  countryName(id: string): string {
    return this.countries().find((c) => c.id === id)?.name.sr ?? id;
  }

  iso(id: string): string {
    return this.countries().find((c) => c.id === id)?.iso ?? '';
  }

  // ============ isečak mišem ============

  private panStart: { x: number; y: number; cx: number; cy: number; w: number; h: number } | null = null;

  panDown(e: PointerEvent, p: Photo): void {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    this.panStart = { x: e.clientX, y: e.clientY, cx: p.crop.x, cy: p.crop.y, w: r.width, h: r.height };
  }

  panMove(e: PointerEvent, p: Photo): void {
    const s = this.panStart;
    if (!s) return;
    const k = 1.4 / p.crop.zoom;
    const x = Math.max(0, Math.min(100, s.cx - ((e.clientX - s.x) / s.w) * 100 * k));
    const y = Math.max(0, Math.min(100, s.cy - ((e.clientY - s.y) / s.h) * 100 * k));
    this.updateCrop(p.id, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }

  panUp(): void {
    this.panStart = null;
  }

  num(e: Event): number {
    return Number((e.target as HTMLInputElement).value);
  }

  val(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  // ============ dodavanje fotografija ============

  pickFiles(e: Event): void {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    this.upFiles.set(files);
  }

  dropFiles(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => /\.(jpe?g|png|webp|tiff?)$/i.test(f.name));
    this.upFiles.set(files);
  }

  async uploadNow(): Promise<void> {
    const c = this.content();
    const files = this.upFiles();
    const country = this.upCountry();
    const placeSr = this.upPlaceSr().trim();
    if (!c || !files.length) return this.flash('err', 'Izaberi fotografije.');
    if (!country) return this.flash('err', 'Izaberi državu.');
    if (!placeSr) return this.flash('err', 'Upiši mesto (npr. Beograd).');
    if (this.serverDown()) return this.flash('err', 'Pokreni npm run admin');

    const fd = new FormData();
    fd.append('country', country);
    fd.append('place', placeSr);
    files.forEach((f) => fd.append('files', f));
    this.busy.set(true);
    this.flash('info', `Šaljem ${files.length} fotografija…`);
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const res = (await r.json()) as { file?: string; w?: number; h?: number; error?: string }[];
      if (!r.ok) throw new Error((res as unknown as { error: string }).error);
      const en = this.upPlaceEn().trim() || knownEnglish(c, country, placeSr);
      const areaSr = this.upArea().trim();
      const areaEn = this.areaEn(areaSr, placeSr);
      const added: Photo[] = res
        .filter((x) => x.file)
        .map((x) => ({
          id: x.file!.replace(/\.jpg$/, ''),
          file: x.file!,
          country,
          place: { sr: placeSr, en },
          w: x.w!,
          h: x.h!,
          crop: { x: 50, y: 50, zoom: 1 },
          tilt: Math.round((Math.random() * 3.2 - 1.6) * 10) / 10,
          v: 1,
          ...(areaSr ? { area: { sr: areaSr, en: areaEn } } : {}),
        }));
      this.patch((cc) => ({ ...cc, photos: [...added, ...cc.photos] }));
      const errs = res.filter((x) => x.error).map((x) => x.error);
      this.upFiles.set([]);
      this.filter.set(country);
      this.flash(errs.length ? 'err' : 'ok', `Dodato: ${added.length}. ` + (errs.length ? 'Greške: ' + errs.join('; ') : 'Sad ih poređaj i klikni Sačuvaj.'));
    } catch (e) {
      this.flash('err', 'Slanje nije uspelo: ' + (e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  // ============ države ============

  addCountry(): void {
    const n = this.nc();
    const iso = n.iso.trim().toLowerCase();
    if (!/^[a-z]{2}$/.test(iso) || !n.sr.trim()) return this.flash('err', 'Upiši dvoslovni kod (npr. it) i ime države.');
    const id = slug(n.sr);
    if (this.countries().some((c) => c.id === id)) return this.flash('err', 'Ta država već postoji.');
    const country: Country = {
      id,
      iso,
      name: { sr: n.sr.trim(), en: n.en.trim() || n.sr.trim() },
      lat: Number(n.lat),
      lng: Number(n.lng),
      card: { x: 500, y: 480, rot: 0 },
      cover: '',
      illustrations: [],
      desc: { sr: '', en: '' },
    };
    this.patch((c) => ({ ...c, countries: [...c.countries, country] }));
    this.nc.set({ iso: '', sr: '', en: '', lat: 44, lng: 20 });
    this.upCountry.set(id);
    this.flash('info', 'Država dodata. Sad joj dodaj fotografije.');
  }

  removeCountry(c: Country): void {
    if (this.counts().get(c.id)) return this.flash('err', 'Prvo obriši ili premesti njene fotografije.');
    if (!confirm(`Obrisati državu ${c.name.sr}?`)) return;
    this.patch((cc) => ({ ...cc, countries: cc.countries.filter((x) => x.id !== c.id) }));
  }

  moveCountry(id: string, step: -1 | 1): void {
    const list = [...this.countries()];
    const i = list.findIndex((c) => c.id === id);
    const j = i + step;
    if (i < 0 || j < 0 || j >= list.length) return;
    moveItemInArray(list, i, j);
    this.patch((c) => ({ ...c, countries: list }));
  }

  photosOf(id: string): Photo[] {
    return this.photos().filter((p) => p.country === id);
  }

  async uploadAbout(e: Event): Promise<void> {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append('file', f);
    try {
      const r = await fetch('/api/about-photo', { method: 'POST', body: fd });
      const s = await r.json();
      if (!r.ok) throw new Error(s.error);
      this.updateSite({ aboutPhoto: s.src });
      this.flash('info', 'Slika postavljena — klikni Sačuvaj.');
    } catch (err) {
      this.flash('err', 'Nije uspelo: ' + (err as Error).message);
    }
  }
}
