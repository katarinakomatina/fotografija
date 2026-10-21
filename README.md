# Katarina Komatina — foto portfolio

Angular 21 sajt u stilu putnog dnevnika (papir, polaroidi, pečati), sa mapom država, galerijom,
lightbox-om, SR/EN prevodom i **lokalnim adminom** za redosled, isečak, rotaciju, dodavanje i brisanje fotografija.

---

## 1. Šta ti treba (jednom)

| Program | Gde | Napomena |
|---|---|---|
| **Node.js 22 LTS** | nodejs.org | proveri u terminalu: `node -v` (treba 20.19+ ili 22+) |
| **VS Code** | code.visualstudio.com | već ga imaš |
| **Git** | git-scm.com | već ga imaš od Upadaja |
| **GitHub** i **Vercel** nalog | github.com, vercel.com | isti kao za Upadaj |

---

## 2. Prvo pokretanje

1. Raspakuj zip gde želiš, npr. `Documents/katarina-komatina`.
2. VS Code → **File → Open Folder…** → izaberi taj folder.
3. **Terminal → New Terminal** i ukucaj:

```bash
npm install
```

Sačekaj da završi (1–2 minuta, samo prvi put).

4. Pokreni sajt:

```bash
npm start
```

5. Otvori **http://localhost:4200** — to je tvoj sajt, ali samo na tvom računaru.
6. Zaustavljanje: klikni u terminal i pritisni **Ctrl + C**.

---

## 3. Postavljanje na GitHub (jednom)

1. Na github.com klikni **New repository**, ime `katarina-komatina`, **bez** README fajla → **Create**.
2. U terminalu u VS Code-u (zameni `TVOJ-NALOG`):

```bash
git init
git add .
git commit -m "Prvi put: foto portfolio"
git branch -M main
git remote add origin https://github.com/TVOJ-NALOG/katarina-komatina.git
git push -u origin main
```

Prvi push traje malo duže jer šalje ~100 MB fotografija.

## 4. Objavljivanje na Vercelu (jednom)

1. vercel.com → **Add New… → Project** → izaberi repo `katarina-komatina` → **Import**.
2. Ništa ne menjaj (sve je podešeno u `vercel.json`) → **Deploy**.
3. Za par minuta dobiješ adresu tipa `katarina-komatina.vercel.app`.
4. Svoj domen (npr. katarinakomatina.rs) dodaješ u **Settings → Domains**.

Od sada, **svaki git push automatski objavi novu verziju sajta**.

---

## 5. Admin — kako menjaš sajt

### Pokretanje

```bash
npm run admin
```

Otvori **http://localhost:4200/admin**.

> Admin postoji **samo na tvom računaru**. Kada Vercel pravi pravi sajt, admin se izbacuje iz koda,
> pa ako neko na internetu ukuca `/admin`, samo ga vrati na početnu.

### Tab „Fotografije"

| Šta želiš | Kako |
|---|---|
| Promeni redosled | prevuci sliku mišem na novo mesto (radi i kad gledaš samo jednu državu) |
| Uredi sliku | klikni na nju — desno se otvori panel |
| Iseci detalj (nije obavezno) | pojačaj **Uvećanje**, pa prevuci veliku sliku mišem — inače se vidi cela slika u originalnom obliku |
| Nagib izdvojenih slika na početnoj | klizač **Nagib** (npr. −3°), ili **Ravno** |
| Okreni za 90° | **↺ Rotiraj levo / ↻ Rotiraj desno** (menja i sam fajl) |
| Promeni mesto / državu | polja **Mesto** i **Država** |
| Izdvoji na početnoj | štikliraj **Izdvojeno na početnoj** |
| Glavna slika na početnoj | **⌂ Glavna slika na početnoj** |
| Slika države na mapi | **Slika države na mapi** |
| Brzo pomeranje | **⇈ Na početak**, **↑**, **↓**, **⇊ Na kraj** |
| Obriši | **🗑 Obriši fotografiju** |
| Dodaj nove | levo: izaberi državu, upiši mesto, prevuci slike → **Dodaj** |

Na sajtu se svaka slika prikazuje u svom originalnom obliku (uspravna, položena, kvadrat) i slike se same slože u redove. Mesto se ne piše ispod slike — vidi se tek kad neko klikne na sliku (lightbox).

### Tab „Države"
Imena, opisi (SR/EN), slika na mapi, redosled i **nova država** (dvoslovni kod za zastavu: `it`, `es`, `fr`…).

### Tab „Tekstovi i naslovna"
Rečenica ispod imena, tekst „O meni", tvoja slika za „O meni", email i Instagram.

### Čuvanje i objavljivanje

1. Klikni **Sačuvaj** (ili **Ctrl + S**). Sve se upiše u `public/data/content.json`.
2. Objavi izmene:

```bash
git add .
git commit -m "Nove fotografije"
git push
```

(ili u VS Code-u: ikonica **Source Control** levo → upiši poruku → **Commit** → **Sync Changes**)

3. Za 1–2 minuta izmene su na sajtu.
4. Zaustavljanje admina: **Ctrl + C** u terminalu.

### Sigurnosne mreže
- **Brisanje nije zauvek**: obrisane slike posle čuvanja odu u `admin-server/kanta/`. Ako se predomisliš, vrati fajlove u `public/photos/full` i `public/photos/thumb` i dodaj ih ponovo.
- **Rezervne kopije**: pre svakog čuvanja stari spisak se kopira u `admin-server/rezervne-kopije/` (čuva se poslednjih 30).
- Kanta i kopije **ne idu** na GitHub.

---

## 6. Česti problemi

| Problem | Rešenje |
|---|---|
| Admin kaže „server nije pokrenut" | pokreni `npm run admin` (ne `npm start`) |
| `Port 4200 is already in use` | negde već radi — zatvori drugi terminal ili Ctrl + C |
| Slike sa iPhone-a se ne dodaju (HEIC) | na iPhone-u: Settings → Camera → Formats → **Most Compatible**, ili ih prvo pretvori u JPG |
| `npm install` javlja grešku | proveri `node -v`; instaliraj Node 22 LTS i probaj ponovo |
| Vercel build ne prolazi | u Vercelu → Settings → General → Node.js Version: **22.x** |

---

## 7. Gde je šta u kodu

| Fajl | Šta je |
|---|---|
| `public/data/content.json` | spisak fotografija, država i tekstova (menja ga admin) |
| `public/photos/full`, `public/photos/thumb` | fotografije (velike i male) |
| `public/img/ilustracije`, `public/img/ukrasi` | ilustracije i ukrasi |
| `src/app/core/i18n.ts` | svi kratki tekstovi sajta na SR i EN |
| `src/styles.scss` | boje, fontovi, zajednički stilovi |
| `src/app/pages/` | stranice: početna, fotografije, mapa, država, o meni |
| `src/app/shared/` | polaroid, lightbox, mapa, lista država |
| `src/app/admin/` | admin stranica |
| `admin-server/server.mjs` | lokalni server za admin |
