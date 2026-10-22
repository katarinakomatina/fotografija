import { Injectable, computed, effect, signal } from '@angular/core';
import { Lang } from './models';

// Svi tekstovi sajta na srpskom i engleskom.
const DICT = {
  sr: {
    photography: 'Fotografija',
    navHome: 'Početna',
    navPhotos: 'Fotografije',
    navMap: 'Mapa',
    navAbout: 'O meni',
    menu: 'Meni',
    close: 'Zatvori',
    explorePhotos: 'Istraži fotografije',
    exploreByCountry: 'Istraži po državi',
    collecting: 'Skupljam mesta, svetlo i male trenutke',
    chooseCountry: 'Izaberi državu',
    chooseCountryHint: 'Izaberi državu i pogledaj fotografije sa tog mesta',
    searchCountry: 'Pretraži državu…',
    all: 'Sve',
    allCountries: 'Sve države',
    photos: 'fotografija',
    photosOne: 'fotografija',
    showMore: 'Prikaži još',
    backToMap: 'Nazad na mapu',
    featured: 'Izdvojeno',
    featuredSub: 'Nekoliko kadrova koje volim najviše',
    countries: 'države',
    places: 'mesta',
    allPlaces: 'Sva mesta',
    aboutTitle: 'O meni',
    aboutCta: 'Više o meni',
    contact: 'Kontakt',
    contactLine: 'Ako ti se neki kadar dopada ili želiš saradnju, javi mi se.',
    prev: 'Prethodna',
    next: 'Sledeća',
    seeAllFrom: 'Pogledaj sve iz',
    noResults: 'Nema države sa tim imenom.',
    madeWith: 'Sve fotografije su moje',
    letsGo: 'Kreni',
    scroll: 'Skroluj',
  },
  en: {
    photography: 'Photography',
    navHome: 'Home',
    navPhotos: 'Photographs',
    navMap: 'Map',
    navAbout: 'About',
    menu: 'Menu',
    close: 'Close',
    explorePhotos: 'Explore photographs',
    exploreByCountry: 'Explore by country',
    collecting: 'Collecting places, light and little moments',
    chooseCountry: 'Choose a country',
    chooseCountryHint: 'Choose a country to explore photos from that place',
    searchCountry: 'Search country…',
    all: 'All',
    allCountries: 'All countries',
    photos: 'photographs',
    photosOne: 'photograph',
    showMore: 'Show more',
    backToMap: 'Back to map',
    featured: 'Featured',
    featuredSub: 'A few frames I love the most',
    countries: 'countries',
    places: 'places',
    allPlaces: 'All places',
    aboutTitle: 'About me',
    aboutCta: 'More about me',
    contact: 'Contact',
    contactLine: 'If a frame speaks to you, or you would like to work together, get in touch.',
    prev: 'Previous',
    next: 'Next',
    seeAllFrom: 'See everything from',
    noResults: 'No country with that name.',
    madeWith: 'All photographs are my own',
    letsGo: 'Let’s go',
    scroll: 'Scroll',
  },
} as const;

export type Key = keyof (typeof DICT)['sr'];

@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>(I18n.initial());
  readonly dict = computed(() => DICT[this.lang()]);

  constructor() {
    effect(() => {
      const l = this.lang();
      document.documentElement.lang = l === 'sr' ? 'sr-Latn' : 'en';
      try {
        localStorage.setItem('kk-lang', l);
      } catch {
        /* privatni prozor — nije bitno */
      }
    });
  }

  t(key: Key): string {
    return this.dict()[key];
  }

  /**
   * Broj + reč u pravilnom obliku.
   * Srpski: 1 država, 2–4 države, 5+ država (21 država, 22 države, 11–14 država).
   */
  count(n: number, what: 'photos' | 'countries' | 'places'): string {
    const forms = {
      sr: {
        photos: ['fotografija', 'fotografije', 'fotografija'],
        countries: ['država', 'države', 'država'],
        places: ['mesto', 'mesta', 'mesta'],
      },
      en: {
        photos: ['photograph', 'photographs', 'photographs'],
        countries: ['country', 'countries', 'countries'],
        places: ['place', 'places', 'places'],
      },
    }[this.lang()][what];
    let i: number;
    if (this.lang() === 'en') {
      i = n === 1 ? 0 : 2;
    } else {
      const d = n % 10;
      const h = n % 100;
      i = d === 1 && h !== 11 ? 0 : d >= 2 && d <= 4 && (h < 12 || h > 14) ? 1 : 2;
    }
    return `${n} ${forms[i]}`;
  }

  /** Bira srpski ili engleski deo iz objekta { sr, en } */
  pick(text: { sr: string; en: string } | undefined): string {
    if (!text) return '';
    return text[this.lang()] || text.sr;
  }

  private static initial(): Lang {
    try {
      return localStorage.getItem('kk-lang') === 'en' ? 'en' : 'sr';
    } catch {
      return 'sr';
    }
  }
}
