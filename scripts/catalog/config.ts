import path from 'node:path';

export const SOURCE = {
  name: 'tzfit' as const,
  baseUrl: 'https://tzfit.com',
  robotsUrl: 'https://tzfit.com/robots.txt',
  sitemapIndexUrl: 'https://tzfit.com/sitemap_index.xml',
  categorySitemapUrl: 'https://tzfit.com/category-sitemap.xml',
  downloadPageUrl: 'https://tzfit.com/download/',
  userAgent: 'FullMuscleCatalogImporter/1.0 (+catalog maintenance; contact: website owner)',
};

export const PATHS = {
  sourceDirectory: path.resolve('data/catalog-source/tzfit'),
  inventory: path.resolve('data/catalog-source/tzfit/inventory.json'),
  previousInventory: path.resolve('data/catalog-source/tzfit/inventory.previous.json'),
  assets: path.resolve('data/catalog-source/tzfit/assets'),
  drafts: path.resolve('data/catalog-drafts/products.json'),
  diff: path.resolve('data/catalog-source/tzfit/diff-report.json'),
  assetManifest: path.resolve('data/catalog-assets/manifest.json'),
  assetReviewDecisions: path.resolve('data/catalog-assets/review-decisions.json'),
  assetOriginals: path.resolve('data/catalog-assets/originals'),
  assetEdited: path.resolve('data/catalog-assets/edited'),
  assetReview: path.resolve('data/catalog-assets/review'),
  stagedAssets: path.resolve('src/assets/catalog'),
};

export const PRODUCT_ROOT_SLUGS = new Set([
  'treadmill',
  'elliptical',
  'stair-climber',
  'exercise-bike',
  'rowing-machine',
  'surfing-machine',
  'ski-machine',
  'ab-coaster',
  'pin-loaded-machine',
  'plate-loaded-machine',
  'multi-functional-smith-machine-trainer',
  'crossfit-multi-station',
  'free-weight',
]);
