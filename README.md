# Katarina Komatina — Photography Portfolio

A travel-photography portfolio styled as a vintage travel journal, with paper textures, polaroids, stamps and an illustrated world map. Built with **Angular 21**.

**Live:** [katarinakomatina.rs](https://katarinakomatina.rs)

## Features

- **Justified gallery.** Photos keep their original aspect ratio and are packed into rows that fill the full width. The layout recomputes on resize, and "Show more" always reveals complete rows.
- **Interactive map.** An SVG world map, rendered from TopoJSON with an equirectangular projection, with a pin and polaroid card for each visited country.
- **Filtering.** Visitors browse by country (flag chips with tooltips), then by city. Cities with many photos (e.g. Belgrade) can be split further into districts.
- **Lightbox.**
  - Keyboard navigation, swipe on touch devices and a thumbnail strip.
  - Pinch-to-zoom and double-tap zoom on mobile; mouse-wheel zoom and drag-to-pan on desktop.
- **Bilingual.** The interface is in Serbian and English, and the chosen language is remembered.
- **Responsive.** Designed for both desktop and mobile.
- **Image loading.** One shared `IntersectionObserver` loads images about 1.5 screens ahead. Failed requests are retried automatically, and images fade in once loaded.
- **Local admin panel.** It is excluded from the production bundle and is used to:
  - reorder photos with drag & drop;
  - crop by hand with aspect-ratio presets and keep the original so it can be restored;
  - rotate, upload and delete photos;
  - edit country data and site texts.

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | Angular 21: standalone components, signals, zoneless change detection, `OnPush`, new control flow |
| UI | SCSS, Angular CDK (drag & drop), flag-icons, self-hosted fonts (@fontsource) |
| Admin API | Node.js, Express 5, Multer, Sharp (resize, crop, rotate, EXIF stripping) |
| Hosting | Vercel (static build, SPA rewrites, long-term caching for images) |

## Architecture

The site is fully static. All content lives in a single JSON file plus pre-processed images, so the production build needs no backend or database.

```
public/
  data/content.json      # countries, photos (order, place, size, crop), site texts
  data/mapa.json         # pre-computed map paths
  photos/full/           # large images (max 2000 px)
  photos/thumb/          # thumbnails (max 800 px)
src/app/
  core/                  # models, data service (signals), i18n
  shared/                # justified grid, lightbox, map, photo component
  pages/                 # home, gallery, country, map, about
  admin/                 # admin UI (dev only), manual cropper
admin-server/server.mjs  # local Express API used by the admin
```

**Admin in production:** `admin.routes.ts` is swapped for an empty `admin.routes.prod.ts` through `fileReplacements`. The admin code is therefore never shipped to the live site.

**Admin API security:** the API listens only on `127.0.0.1` and rejects non-local requests.

## Getting started

Requires **Node.js 20.19+** (or 22+).

```bash
npm install
npm start          # dev server at http://localhost:4200
npm run build      # production build → dist/katarina-komatina/browser
```

### Admin panel (local only)

```bash
npm run admin      # starts the API (port 4300) and the dev server with a proxy
```

Open `http://localhost:4200/admin`, make your changes and save. The changes are written to `public/data/content.json` and `public/photos/`. Commit and push them to deploy.

## Deployment

Every push to `main` is built and deployed by Vercel. Build settings are in `vercel.json`.
