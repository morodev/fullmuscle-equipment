export type Locale = 'it' | 'en';

export interface LocalizedValue {
  it: string;
  en: string;
}

export interface CatalogTaxonomy {
  id: string;
  slug: LocalizedValue;
  name: LocalizedValue;
  description: LocalizedValue;
  count: number;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface CatalogProduct {
  sku: string;
  categoryId: string;
  lineId?: string;
  slug: LocalizedValue;
  name: LocalizedValue;
  summary: LocalizedValue;
  seoTitle: LocalizedValue;
  seoDescription: LocalizedValue;
  imageAlt: LocalizedValue;
  description: { it: string[]; en: string[] };
  features: { it: string[]; en: string[] };
  selectionNotes: { it: string[]; en: string[] };
  specifications: { it: ProductSpecification[]; en: ProductSpecification[] };
  primaryImage: string;
  gallery: string[];
  availableForQuote: true;
}

export interface CatalogListItem {
  sku: string;
  name: string;
  summary: string;
  href: string;
  image: string;
  categoryId: string;
  categoryName: string;
  lineId?: string;
  lineName?: string;
}
