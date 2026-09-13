import { z } from 'zod';
import { assertNoPublicSkuCollisions, normalizeSourceSku, slugify, toPublicSku, toPublicText } from './brand.js';
import type { CatalogAssetManifest, ProductDraft, SourceCategory, SourceInventory, SourceProduct } from './types.js';

const inventorySchema = z.object({
  schemaVersion: z.literal(1),
  source: z.literal('tzfit'),
  baseUrl: z.url(),
  crawledAt: z.iso.datetime(),
  categories: z.array(z.object({ sourceId: z.string().min(1), publicId: z.string().min(1), kind: z.enum(['category', 'series']) })),
  products: z.array(
    z.object({
      sourceSku: z.string().min(1),
      sourceUrl: z.url(),
      sourceName: z.string().min(1),
      contentHash: z.string().length(64),
    }),
  ),
});

export interface NormalizedCatalog {
  schemaVersion: 1;
  generatedAt: string;
  status: 'internal-drafts';
  products: ProductDraft[];
  quarantined: Array<{
    publicSku: string;
    reason: 'duplicate-source-sku';
    sources: Array<{ sourceSku: string; sourceUrl: string; sourceName: string }>;
  }>;
}

export function normalizeInventory(inventory: SourceInventory, assetManifest?: CatalogAssetManifest): NormalizedCatalog {
  inventorySchema.parse(inventory);
  assertNoPublicSkuCollisions(inventory.products.map((product) => product.sourceSku));
  const inventoryWithLocalAssets = applyAssetManifest(inventory, assetManifest);
  const categories = new Map(inventory.categories.map((category) => [category.sourceId, category]));
  const grouped = new Map<string, SourceProduct[]>();
  for (const product of inventoryWithLocalAssets.products) {
    const key = normalizeSourceSku(product.sourceSku);
    grouped.set(key, [...(grouped.get(key) ?? []), product]);
  }
  const unambiguous = [...grouped.values()].filter((products) => products.length === 1).map((products) => products[0]!);
  const products = unambiguous.map((product) => normalizeProduct(product, categories));
  const quarantined = [...grouped.values()]
    .filter((products) => products.length > 1)
    .map((sources) => ({
      publicSku: toPublicSku(sources[0]!.sourceSku),
      reason: 'duplicate-source-sku' as const,
      sources: sources.map((source) => ({
        sourceSku: source.sourceSku,
        sourceUrl: source.sourceUrl,
        sourceName: source.sourceName,
      })),
    }))
    .sort((a, b) => a.publicSku.localeCompare(b.publicSku));

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: 'internal-drafts',
    products: products.sort((a, b) => a.publicSku.localeCompare(b.publicSku)),
    quarantined,
  };
}

export type PublicProductRecord = Omit<ProductDraft, 'sourceReference' | 'assets' | 'review'> & {
  assets: Array<Omit<ProductDraft['assets'][number], 'sourceUrl'>>;
};

export function toPublicProductRecord(product: ProductDraft): PublicProductRecord {
  const { sourceReference: _, review: __, ...publicRecord } = product;
  return {
    ...publicRecord,
    specifications: Object.fromEntries(
      Object.entries(publicRecord.specifications).map(([key, value]) => [toPublicText(key), toPublicText(value)]),
    ),
    localization: {
      it: publicLocalization(publicRecord.localization.it),
      en: publicLocalization(publicRecord.localization.en),
    },
    assets: publicRecord.assets
      .filter((asset) => ['approved', 'approved-provisional', 'approved-oem'].includes(asset.reviewStatus) && asset.localPath)
      .map(({ sourceUrl: _, ...asset }) => ({ ...asset, alt: toPublicText(asset.alt) })),
  };
}

function applyAssetManifest(inventory: SourceInventory, manifest: CatalogAssetManifest | undefined): SourceInventory {
  if (!manifest) return inventory;
  const assets = new Map(
    manifest.items.map((item) => [`${item.sourceSku}\u0000${item.sourceUrl}`, item]),
  );
  return {
    ...inventory,
    products: inventory.products.map((product) => ({
      ...product,
      assets: product.assets.map((asset) => {
        const item = assets.get(`${product.sourceSku}\u0000${asset.sourceUrl}`);
        if (!item) return asset;
        return {
          ...asset,
          reviewStatus: item.status,
          ...(item.stagedPath ? { localPath: item.stagedPath } : {}),
        };
      }),
    })),
  };
}

function normalizeProduct(product: SourceProduct, categories: Map<string, SourceCategory>): ProductDraft {
  const publicSku = toPublicSku(product.sourceSku);
  const category = product.sourceCategoryIds.map((id) => categories.get(id)).find(Boolean);
  const line = product.sourceSeriesIds.map((id) => categories.get(id)).find(Boolean);
  const publicName = toPublicText(product.sourceName);
  const notes = [
    'Riscrivere descrizione e vantaggi in italiano e inglese prima della pubblicazione.',
    'Verificare dati tecnici, conformità, garanzia e disponibilità con la documentazione commerciale approvata.',
  ];
  if (product.warnings.length) notes.push(`Avvisi importazione: ${product.warnings.join(', ')}.`);

  const localized = (locale: 'it' | 'en') => ({
    status: 'draft' as const,
    reviewed: false as const,
    slug: slugify(`${publicSku}-${publicName}`),
    name: publicName,
    summary: '',
    description: '',
    features: [],
    seoTitle: '',
    seoDescription: '',
    locale,
  });
  const { locale: _itLocale, ...it } = localized('it');
  const { locale: _enLocale, ...en } = localized('en');

  return {
    internalId: `product-${publicSku.toLowerCase()}`,
    publicSku,
    categoryId: category?.publicId ?? 'da-classificare',
    ...(line ? { lineId: line.publicId } : {}),
    status: 'draft',
    availableForQuote: false,
    specifications: product.specifications,
    assets: product.assets,
    sourceReference: {
      supplier: 'tzfit',
      sourceSku: product.sourceSku,
      sourceUrl: product.sourceUrl,
      contentHash: product.contentHash,
    },
    localization: { it, en },
    review: {
      technicalDataVerified: false,
      assetsVerified: false,
      copyApproved: false,
      notes,
    },
  };
}

function publicLocalization(localization: ProductDraft['localization']['it']): ProductDraft['localization']['it'] {
  return {
    ...localization,
    slug: slugify(toPublicText(localization.slug)),
    name: toPublicText(localization.name),
    summary: toPublicText(localization.summary),
    description: toPublicText(localization.description),
    features: localization.features.map(toPublicText),
    seoTitle: toPublicText(localization.seoTitle),
    seoDescription: toPublicText(localization.seoDescription),
  };
}
