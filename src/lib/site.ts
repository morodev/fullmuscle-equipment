import type { Locale } from './types';

export const SITE = {
  name: 'FullMuscle Equipment',
  shortName: 'FullMuscle',
  url: import.meta.env.PUBLIC_SITE_URL || 'https://fullmuscle.invalid',
  ready: import.meta.env.PUBLIC_SITE_READY === 'true',
  legalName: import.meta.env.COMPANY_LEGAL_NAME || '',
  vat: import.meta.env.COMPANY_VAT || '',
  address: import.meta.env.COMPANY_ADDRESS || '',
  city: import.meta.env.COMPANY_CITY || '',
  email: import.meta.env.COMPANY_EMAIL || '',
  phone: import.meta.env.COMPANY_PHONE || '',
  showroomHours: import.meta.env.COMPANY_SHOWROOM_HOURS || '',
  socialUrls: (import.meta.env.COMPANY_SOCIAL_URLS || '').split(',').map((value) => value.trim()).filter(Boolean),
  turnstileSiteKey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '',
} as const;

export const ROUTES = {
  it: {
    home: '/it/', catalog: '/it/catalogo/', categories: '/it/catalogo/categorie', lines: '/it/catalogo/linee',
    products: '/it/prodotti', solutions: '/it/soluzioni', company: '/it/azienda/', contact: '/it/contatti/',
    guides: '/it/guide', showroom: '/it/showroom/', quote: '/it/richiesta/', privacy: '/it/privacy/', confirmation: '/it/conferma/',
  },
  en: {
    home: '/en/', catalog: '/en/catalogue/', categories: '/en/catalogue/categories', lines: '/en/catalogue/lines',
    products: '/en/products', solutions: '/en/solutions', company: '/en/company/', contact: '/en/contact/',
    guides: '/en/guides', showroom: '/en/showroom/', quote: '/en/quote-request/', privacy: '/en/privacy/', confirmation: '/en/confirmation/',
  },
} as const;

export function route(locale: Locale) {
  return ROUTES[locale];
}

export function productUrl(locale: Locale, slug: string): string {
  return `${ROUTES[locale].products}/${slug}/`;
}

export function categoryUrl(locale: Locale, slug: string): string {
  return `${ROUTES[locale].categories}/${slug}/`;
}

export function lineUrl(locale: Locale, slug: string): string {
  return `${ROUTES[locale].lines}/${slug}/`;
}

export function guideUrl(locale: Locale, slug: string): string {
  return `${ROUTES[locale].guides}/${slug}/`;
}

export function paginatedUrl(baseUrl: string, locale: Locale, page: number): string {
  if (page <= 1) return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}${locale === 'it' ? 'pagina' : 'page'}/${page}/`;
}
