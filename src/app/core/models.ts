// Tipovi podataka iz public/data/content.json

export type Lang = 'sr' | 'en';

export interface Text {
  sr: string;
  en: string;
}

export interface Crop {
  x: number; // 0–100, koji deo slike je u centru (horizontalno)
  y: number; // 0–100, koji deo slike je u centru (vertikalno)
  zoom: number; // 1 = bez uvećanja
}

export interface Photo {
  id: string;
  file: string;
  country: string;
  place: Text;
  /** deo mesta, npr. opština u Beogradu (nije obavezno) */
  area?: Text;
  /** ručni isečak iz admina (delovi originala 0–1); fajl je već isečen, ovo služi da se okvir ponovo prikaže */
  cut?: { x: number; y: number; w: number; h: number };
  w: number;
  h: number;
  crop: Crop;
  tilt: number; // blagi nagib u stepenima, npr. -2
  v: number; // verzija fajla (menja se kad se slika rotira)
  featured?: boolean;
}

export interface Country {
  id: string;
  iso: string; // dvoslovni kod za zastavu, npr. "rs"
  name: Text;
  lat: number;
  lng: number;
  card: { x: number; y: number; rot: number }; // polaroid na mapi
  cover: string; // id fotografije za polaroid na mapi
  illustrations: string[];
  desc: Text;
}

export interface SiteText {
  hero: string;
  heroSmall?: string; // mala slika (polaroid) na početnoj
  taglineSr: string;
  taglineEn: string;
  aboutSr: string;
  aboutEn: string;
  email: string;
  instagram: string;
  aboutPhoto?: string; // npr. "img/o-meni.jpg?v=3" — postavlja se u adminu
}

export interface Content {
  site: SiteText;
  countries: Country[];
  photos: Photo[];
}

export interface MapData {
  width: number;
  height: number;
  lon0: number;
  lat1: number;
  cos: number;
  k: number;
  others: string[];
  countries: Record<string, string>;
}
