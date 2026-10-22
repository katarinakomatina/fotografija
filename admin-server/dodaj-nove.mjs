// Jednokratno: dodaje slike iz admin-server/nove/ na sajt.
// Svaka nova slika ide na KRAJ svog mesta (posle poslednje slike iz tog grada).
// Tvoje postojeće izmene (redosled, opštine, isečci) ostaju netaknute.
// Pokretanje (iz foldera projekta):  node admin-server/dodaj-nove.mjs
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEW = path.join(ROOT, 'admin-server', 'nove');
const CONTENT = path.join(ROOT, 'public', 'data', 'content.json');
const FULL = path.join(ROOT, 'public', 'photos', 'full');
const THUMB = path.join(ROOT, 'public', 'photos', 'thumb');
const TRASH = path.join(ROOT, 'admin-server', 'kanta', 'full');
const BACKUP = path.join(ROOT, 'admin-server', 'rezervne-kopije');

function slug(s) {
  return String(s)
    .replace(/đ/g, 'dj')
    .replace(/Đ/g, 'Dj')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function nextName(base) {
  for (let i = 1; i < 10000; i++) {
    const name = `${base}-${String(i).padStart(2, '0')}.jpg`;
    if (!existsSync(path.join(FULL, name)) && !existsSync(path.join(TRASH, name))) return name;
  }
  throw new Error('Previše fajlova');
}

const listFile = path.join(NEW, 'spisak.json');
if (!existsSync(listFile)) {
  console.log('Nema novih slika (admin-server/nove/spisak.json ne postoji). Verovatno si ovo već pokrenula.');
  process.exit(0);
}
const list = JSON.parse(await fs.readFile(listFile, 'utf8'));
const content = JSON.parse(await fs.readFile(CONTENT, 'utf8'));

// rezervna kopija pre izmene
await fs.mkdir(BACKUP, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
await fs.copyFile(CONTENT, path.join(BACKUP, `content-${stamp}-pre-novih.json`));

let added = 0;
for (const n of list) {
  const name = nextName(`${n.country}-${slug(n.place.sr)}`);
  await fs.copyFile(path.join(NEW, 'full', n.tmp), path.join(FULL, name));
  await fs.copyFile(path.join(NEW, 'thumb', n.tmp), path.join(THUMB, name));
  const photo = {
    id: name.replace(/\.jpg$/, ''),
    file: name,
    country: n.country,
    place: n.place,
    w: n.w,
    h: n.h,
    crop: { x: 50, y: 50, zoom: 1 },
    tilt: Math.round((Math.random() * 3.2 - 1.6) * 10) / 10,
    v: 1,
  };
  // posle poslednje slike iz istog mesta; ako mesto ne postoji, posle poslednje iz te države; inače na kraj
  const ps = content.photos;
  let at = ps.findLastIndex((p) => p.country === n.country && p.place.sr === n.place.sr);
  if (at < 0) at = ps.findLastIndex((p) => p.country === n.country);
  ps.splice(at < 0 ? ps.length : at + 1, 0, photo);
  added++;
  console.log(`+ ${n.original} → ${name}`);
}

await fs.writeFile(CONTENT, JSON.stringify(content, null, 1) + '\n', 'utf8');
// obriši privremeni folder da se slike ne bi dodale dvaput
await fs.rm(NEW, { recursive: true, force: true });
console.log(`\n✓ Dodato ${added} slika. Otvori admin (npm run admin) da ih vidiš na dnu svakog grada.`);
