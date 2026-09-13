import type { Locale } from './types';

export const UI = {
  it: {
    catalog: 'Catalogo', solutions: 'Soluzioni', company: 'Azienda', contact: 'Contatti', quote: 'Richiedi preventivo',
    viewProduct: 'Scopri il prodotto', add: 'Aggiungi alla richiesta', added: 'Aggiunto', search: 'Cerca per nome o codice',
    allCategories: 'Tutte le categorie', allLines: 'Tutte le linee', results: 'prodotti', noResults: 'Nessun prodotto corrisponde ai filtri.',
    previous: 'Precedente', next: 'Successiva', specifications: 'Specifiche tecniche', features: 'Caratteristiche principali',
    breadcrumbHome: 'Home', related: 'Prodotti correlati',
  },
  en: {
    catalog: 'Catalogue', solutions: 'Solutions', company: 'Company', contact: 'Contact', quote: 'Request a quote',
    viewProduct: 'View product', add: 'Add to request', added: 'Added', search: 'Search by name or code',
    allCategories: 'All categories', allLines: 'All lines', results: 'products', noResults: 'No products match these filters.',
    previous: 'Previous', next: 'Next', specifications: 'Technical specifications', features: 'Key features',
    breadcrumbHome: 'Home', related: 'Related products',
  },
} as const;

export function ui(locale: Locale) {
  return UI[locale];
}

export function alternateLocale(locale: Locale): Locale {
  return locale === 'it' ? 'en' : 'it';
}
