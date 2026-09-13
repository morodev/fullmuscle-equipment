export type AssetReviewStatus =
  | 'pending-review'
  | 'needs-review'
  | 'needs-cleaning'
  | 'edited-review'
  | 'approved'
  | 'approved-provisional'
  | 'approved-oem'
  | 'missing'
  | 'blocked-branding';

export interface SourceCategory {
  url: string;
  sourceId: string;
  sourceName: string;
  publicId: string;
  publicName: string;
  kind: 'category' | 'series';
  parentSourceId?: string;
  lastModified?: string;
}

export interface SourceAsset {
  sourceUrl: string;
  alt: string;
  role: 'primary' | 'gallery';
  reviewStatus: AssetReviewStatus;
  localPath?: string;
}

export interface SourceProduct {
  supplier: 'tzfit';
  sourceUrl: string;
  sourceSlug: string;
  sourceSku: string;
  sourceName: string;
  sourceDescription: string;
  sourceFeatures: string[];
  specifications: Record<string, string>;
  sourceCategoryIds: string[];
  sourceSeriesIds: string[];
  assets: SourceAsset[];
  lastModified?: string;
  crawledAt: string;
  contentHash: string;
  warnings: string[];
}

export interface CatalogDocument {
  title: string;
  url: string;
  kind: 'pdf' | 'other';
}

export interface RejectedSourcePage {
  url: string;
  reasons: string[];
}

export interface SourceInventory {
  schemaVersion: 1;
  source: 'tzfit';
  baseUrl: string;
  crawledAt: string;
  robotsUrl: string;
  robotsHash: string;
  categories: SourceCategory[];
  catalogDocuments: CatalogDocument[];
  products: SourceProduct[];
  rejected: RejectedSourcePage[];
}

export interface ProductDraft {
  internalId: string;
  publicSku: string;
  categoryId: string;
  lineId?: string;
  status: 'draft';
  availableForQuote: false;
  specifications: Record<string, string>;
  assets: SourceAsset[];
  sourceReference: {
    supplier: 'tzfit';
    sourceSku: string;
    sourceUrl: string;
    contentHash: string;
  };
  localization: {
    it: LocalizedDraft;
    en: LocalizedDraft;
  };
  review: {
    technicalDataVerified: false;
    assetsVerified: false;
    copyApproved: false;
    notes: string[];
  };
}

export interface LocalizedDraft {
  status: 'draft';
  reviewed: false;
  slug: string;
  name: string;
  summary: string;
  description: string;
  features: string[];
  seoTitle: string;
  seoDescription: string;
}

export interface InventoryDiff {
  createdAt: string;
  new: Array<{ sourceSku: string; sourceUrl: string }>;
  changed: Array<{ sourceSku: string; sourceUrl: string; previousHash: string; currentHash: string }>;
  removed: Array<{ sourceSku: string; sourceUrl: string; action: 'manual-review' }>;
  unchanged: number;
  duplicateSourceSkus: string[];
  missingImages: string[];
  missingSpecifications: string[];
  missingDescriptions: string[];
  specificationConflicts: Array<{ sourceSku: string; key: string; values: string[] }>;
}

export type SupplierMarkKind = 'wordmark' | 'logo' | 'source-code';

export interface CatalogAssetManifestItem {
  assetId: string;
  publicSku: string;
  sourceSku: string;
  sourceUrl: string;
  role: 'primary' | 'gallery';
  sortOrder: number;
  status: AssetReviewStatus;
  supplierMarks: Array<{
    kind: SupplierMarkKind;
    note: string;
  }>;
  originalPath?: string;
  editedPath?: string;
  stagedPath?: string;
  sourceHash?: string;
  outputHash?: string;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
  reviewNotes: string[];
}

export interface CatalogAssetManifest {
  schemaVersion: 1;
  generatedAt: string;
  updatedAt: string;
  sourceInventoryHash: string;
  items: CatalogAssetManifestItem[];
}

export interface CatalogAssetReviewDecisions {
  schemaVersion: 1;
  sourceInventoryHash: string;
  reviewedAt: string;
  defaultStatus: 'needs-cleaning';
  defaultNote: string;
  approvedAssetIds: string[];
  blockedSourceBasenames: string[];
}
