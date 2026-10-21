// ============================================================
//  Lokalni admin server — radi SAMO na tvom računaru.
//  Pokreće se komandom:  npm run admin
//  Nikad ne ide na Vercel/internet.
// ============================================================
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const CONTENT = path.join(PUB, 'data', 'content.json');
const FULL = path.join(PUB, 'photos', 'full');
const THUMB = path.join(PUB, 'photos', 'thumb');
const BACKUP = path.join(ROOT, 'admin-server', 'rezervne-kopije');
const TRASH = path.join(ROOT, 'admin-server', 'kanta');
const PORT = 4300;

const FULL_SIZE = 2000; // najduža strana velike slike (px)
const THUMB_SIZE = 800; // najduža strana male slike (px)

const app = express();
app.use(express.json({ limit: '20mb' }));

// Dozvoli samo zahteve sa ovog računara
app.use((req, res, next) => {
  const ip = req.socket.remoteAddress ?? '';
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) return res.status(403).send('Samo lokalno.');
  next();
});

// Slike i podaci se u admin režimu služe direktno sa diska (da se odmah vide nove slike)
app.use('/photos', express.static(path.join(PUB, 'photos'), { cacheControl: false, etag: false }));
app.use('/data', express.static(path.join(PUB, 'data'), { cacheControl: false, etag: false }));
app.use('/img', express.static(path.join(PUB, 'img'), { cacheControl: false, etag: false }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 80 * 1024 * 1024, files: 100 } });

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

async function readContent() {
  return JSON.parse(await fs.readFile(CONTENT, 'utf8'));
}

async function backup() {
  await fs.mkdir(BACKUP, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  await fs.copyFile(CONTENT, path.join(BACKUP, `content-${stamp}.json`));
  // čuvaj poslednjih 30 kopija
  const files = (await fs.readdir(BACKUP)).filter((f) => f.startsWith('content-')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - 30))) await fs.unlink(path.join(BACKUP, f));
}

function validate(c) {
  if (!c || typeof c !== 'object') return 'Prazan sadržaj';
  if (!Array.isArray(c.photos) || !Array.isArray(c.countries) || typeof c.site !== 'object') return 'Neispravan format';
  for (const p of c.photos) {
    if (!p.id || !p.file || !p.country) return 'Fotografija bez id/file/country';
    if (p.file.includes('/') || p.file.includes('\\')) return 'Neispravno ime fajla';
  }
  return '';
}

// Fajlovi koji više nisu u spisku idu u kantu (ne brišu se zauvek)
async function moveOrphansToTrash(content) {
  const used = new Set(content.photos.map((p) => p.file));
  const moved = [];
  for (const dir of [FULL, THUMB]) {
    if (!existsSync(dir)) continue;
    for (const f of await fs.readdir(dir)) {
      if (used.has(f)) continue;
      const sub = path.join(TRASH, path.basename(dir));
      await fs.mkdir(sub, { recursive: true });
      await fs.rename(path.join(dir, f), path.join(sub, f));
      if (dir === FULL) moved.push(f);
    }
  }
  return moved;
}

async function nextName(base) {
  for (let i = 1; i < 10000; i++) {
    const name = `${base}-${String(i).padStart(2, '0')}.jpg`;
    if (!existsSync(path.join(FULL, name)) && !existsSync(path.join(TRASH, 'full', name))) return name;
  }
  throw new Error('Previše fajlova');
}

// ---------- API ----------

app.get('/api/content', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await readContent());
});

app.put('/api/content', async (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  await backup();
  await fs.writeFile(CONTENT, JSON.stringify(req.body, null, 1) + '\n', 'utf8');
  const trashed = await moveOrphansToTrash(req.body);
  console.log(`✓ Sačuvano (${req.body.photos.length} fotografija)` + (trashed.length ? `, u kantu: ${trashed.length}` : ''));
  res.json({ ok: true, trashed });
});

app.post('/api/upload', upload.array('files'), async (req, res) => {
  const country = slug(req.body.country || '');
  const place = slug(req.body.place || '') || 'foto';
  if (!country) return res.status(400).json({ error: 'Izaberi državu' });
  await fs.mkdir(FULL, { recursive: true });
  await fs.mkdir(THUMB, { recursive: true });
  const out = [];
  for (const f of req.files ?? []) {
    try {
      const name = await nextName(`${country}-${place}`);
      const img = sharp(f.buffer, { failOn: 'none' }).rotate(); // .rotate() = ispravi orijentaciju sa telefona
      const info = await img
        .clone()
        .resize(FULL_SIZE, FULL_SIZE, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82, progressive: true, mozjpeg: true })
        .toFile(path.join(FULL, name));
      await img
        .clone()
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 78, progressive: true, mozjpeg: true })
        .toFile(path.join(THUMB, name));
      out.push({ file: name, w: info.width, h: info.height, original: f.originalname });
      console.log(`+ ${f.originalname} → ${name}`);
    } catch (e) {
      out.push({ error: `${f.originalname}: ${e.message}`, original: f.originalname });
      console.error(`✗ ${f.originalname}: ${e.message}`);
    }
  }
  res.json(out);
});

app.post('/api/rotate', async (req, res) => {
  const { file, deg } = req.body ?? {};
  if (!file || /[\\/]/.test(file) || ![90, -90, 180].includes(deg)) return res.status(400).json({ error: 'Loš zahtev' });
  let size = { w: 0, h: 0 };
  for (const [dir, q] of [
    [FULL, 82],
    [THUMB, 78],
  ]) {
    const p = path.join(dir, file);
    const buf = await fs.readFile(p);
    const info = await sharp(buf).rotate(deg).jpeg({ quality: q, progressive: true, mozjpeg: true }).toFile(p);
    if (dir === FULL) size = { w: info.width, h: info.height };
  }
  console.log(`↻ ${file} ${deg}°`);
  res.json(size);
});

app.post('/api/about-photo', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nema fajla' });
  await sharp(req.file.buffer)
    .rotate()
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 84, progressive: true, mozjpeg: true })
    .toFile(path.join(PUB, 'img', 'o-meni.jpg'));
  res.json({ src: `img/o-meni.jpg?v=${Date.now()}` });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  Admin server radi.');
  console.log('  Otvori:  http://localhost:4200/admin');
  console.log('');
});
