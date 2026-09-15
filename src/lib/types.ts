export type Locale = 'it' | 'en';
export type TaxonomyKind = 'category' | 'line' | 'type';

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
  featuredTypeIds: string[];
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
  primaryImageWidth: number;
  primaryImageHeight: number;
  gallery: string[];
  availableForQuote: true;
}

export interface CatalogListItem {
  sku: string;
  name: string;
  summary: string;
  href: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  categoryId: string;
  categoryName: string;
  lineId?: string;
  lineName?: string;
}
