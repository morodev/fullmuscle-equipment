import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import selection from '../../data/catalog-editorial/catalog-selection.json';

type SourceAsset = {
  role?: string;
  reviewStatus?: string;
  localPath?: string;
  width?: number;
  height?: number;
};

type SourceProduct = {
  publicSku?: string;
  categoryId?: string;
  lineId?: string;
  specifications?: Record<string, unknown>;
  assets?: SourceAsset[];
  localization?: { it?: { name?: string }; en?: { name?: string } };
  sourceReference?: { sourceSku?: string; sourceUrl?: string };
};

type SourceDocument = { products?: SourceProduct[] };
type LocalizedNote = { it: string; en: string };
type EditorialProduct = {
  publicSku: string;
  categoryId: string;
  lineId?: string;
  descriptor: string;
  technicalDescription?: string;
  specifications: Record<string, unknown>;
  assets: SourceAsset[];
  imageNote?: LocalizedNote;
};
type EditorialDocument = { products?: EditorialProduct[] };
type CatalogEntry = { kind: 'source'; product: SourceProduct } | { kind: 'editorial'; product: EditorialProduct };
type InventoryProduct = { sourceSku?: string; sourceUrl?: string; sourceDescription?: string };
type InventoryDocument = { products?: InventoryProduct[] };
type AssetManifestItem = { stagedPath?: string; width?: number; height?: number };
type AssetManifest = { items?: AssetManifestItem[] };
type ProductOverride = { categoryId: string; slug: { it: string; en: string } };

const strengthCategories = new Set(['pin-loaded-machine', 'plate-loaded-machine']);
const activeStrengthLines = new Set<string>(selection.strengthLineIds);
const categorySkus: Record<string, string[]> = { treadmill: selection.treadmillSkus, ...selection.categorySkus };
const activeCategorySkus = new Map(Object.entries(categorySkus).map(([categoryId, skus]) => [categoryId, new Set(skus)]));
const retiredCategoryIds = new Set<string>(selection.retiredCategoryIds);
const excludedSkus = new Set<string>(selection.excludedSkus);
const independentProducts: Record<string, ProductOverride> = selection.independentProducts;

const workspace = process.cwd();
const sourcePath = resolve(workspace, 'data/catalog-drafts/products.json');
const inventoryPath = resolve(workspace, 'data/catalog-source/tzfit/inventory.json');
const assetManifestPath = resolve(workspace, 'data/catalog-assets/manifest.json');
const editorialPath = resolve(workspace, 'data/catalog-editorial/descriptions.json');
const editorialProductsPath = resolve(workspace, 'data/catalog-editorial/products.json');
const outputPath = resolve(workspace, 'data/catalog-public/products.json');
const activeSkusPath = resolve(workspace, 'data/catalog-public/active-skus.json');
const imageImportsPath = resolve(workspace, 'src/lib/generated/catalog-images.ts');
const unsafeContent = /tz\s*[-_]?\s*fit|tzfit|tianzh|factory|manufacturer|oem|odm|warranty|guarantee|certificat|patent|brand|logo|customer|production line/i;
const supplierReference = /\b(?:tz\s*fitness|tzfit|tianzh\w*)\b|\bTZ[-\s]?[A-Z0-9-]+\b/gi;
const supplierReferenceCheck = /\b(?:tz\s*fitness|tzfit|tianzh\w*)\b|\bTZ[-\s]?[A-Z0-9-]+\b/i;
const retiredSeriesReference = /\b(?:FM[\s-]*)?(?:5XP|8XP|N8|GB[\s-]*5|GM|GT|X6|X82|51|77|78|82|88|5)\s+(?:(?:strength|fitness|equipment)\s+)?series\b|\b(?:serie|series)\s+(?:FM[\s-]*)?(?:5XP|8XP|N8|GB[\s-]*5|GM|GT|X6|X82|51|77|78|82|88|5)\b/gi;

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(supplierReference, ' ')
    .replace(retiredSeriesReference, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTechnicalDescription(value: unknown, sourceSku: string, publicSku: string): string {
  const sourceText = String(value ?? '');
  const withPublicSku = sourceSku ? sourceText.replaceAll(sourceSku, publicSku) : sourceText;
  const sentences = withPublicSku
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => cleanText(sentence))
    .filter((sentence) => sentence && !unsafeContent.test(sentence));
  return sentences.join(' ');
}

function indexProducts<T extends { publicSku?: string }>(products: T[], label: string): Map<string, T> {
  const indexed = new Map<string, T>();
  for (const product of products) {
    const sku = cleanText(product.publicSku).toUpperCase();
    if (!sku) throw new Error(`Product without publicSku in ${label}.`);
    if (indexed.has(sku)) throw new Error(`Duplicate SKU in ${label}: ${sku}`);
    indexed.set(sku, product);
  }
  return indexed;
}

export async function generatePublicCatalog(): Promise<void> {
  const [document, inventory, assetManifest, editorial, editorialDocument] = await Promise.all([
    readFile(sourcePath, 'utf8').then((value) => JSON.parse(value) as SourceDocument),
    readFile(inventoryPath, 'utf8').then((value) => JSON.parse(value) as InventoryDocument),
    readFile(assetManifestPath, 'utf8').then((value) => JSON.parse(value) as AssetManifest),
    readFile(editorialPath, 'utf8').then((value) => JSON.parse(value) as Record<string, { technicalDescription: string }>),
    readFile(editorialProductsPath, 'utf8').then((value) => JSON.parse(value) as EditorialDocument),
  ]);
  const inventoryBySource = new Map((inventory.products ?? []).map((product) => [`${cleanText(product.sourceSku).toUpperCase()}\u0000${product.sourceUrl}`, product]));
  const dimensionsByPath = new Map((assetManifest.items ?? []).filter((item) => item.stagedPath).map((item) => [cleanText(item.stagedPath).replaceAll('\\', '/'), { width: item.width ?? 900, height: item.height ?? 900 }]));
  const sourceProducts = indexProducts(document.products ?? [], 'catalog drafts');
  const editorialProducts = indexProducts(editorialDocument.products ?? [], 'editorial products');
  for (const [sku, product] of editorialProducts) {
    if (sourceProducts.has(sku)) throw new Error(`Editorial SKU duplicates a sourced product: ${sku}`);
    if ('sourceReference' in product) throw new Error(`Editorial product must not claim a supplier source: ${sku}`);
  }
  const candidates: CatalogEntry[] = [
    ...Array.from(sourceProducts.values(), (product): CatalogEntry => ({ kind: 'source', product })),
    ...Array.from(editorialProducts.values(), (product): CatalogEntry => ({ kind: 'editorial', product })),
  ];
  for (const sku of Object.keys(independentProducts)) {
    if (!sourceProducts.has(sku)) throw new Error(`Preserved catalog product missing: ${sku}`);
  }
  if (retiredCategoryIds.size !== selection.retiredCategoryIds.length) {
    throw new Error('Retired category IDs must be unique.');
  }
  for (const [categoryId, skus] of activeCategorySkus) {
    if (retiredCategoryIds.has(categoryId)) throw new Error(`Retired category cannot contain active SKUs: ${categoryId}`);
    if (!skus.size || skus.size !== categorySkus[categoryId]!.length) {
      throw new Error(`Category selection must contain unique active SKUs: ${categoryId}`);
    }
    for (const sku of skus) {
      const product = sourceProducts.get(sku) ?? editorialProducts.get(sku);
      if (!product || product.categoryId !== categoryId) throw new Error(`Active product missing from category ${categoryId}: ${sku}`);
    }
  }
  if (excludedSkus.size !== selection.excludedSkus.length) {
    throw new Error('Excluded product SKUs must be unique.');
  }
  for (const sku of excludedSkus) {
    if (!sourceProducts.has(sku) && !editorialProducts.has(sku)) {
      throw new Error(`Excluded catalog product missing: ${sku}`);
    }
    if (independentProducts[sku] || [...activeCategorySkus.values()].some((skus) => skus.has(sku))) {
      throw new Error(`Excluded product is explicitly selected as active: ${sku}`);
    }
  }
  const selectedProducts = candidates.filter(({ product }) => {
    const sku = cleanText(product.publicSku).toUpperCase();
    if (excludedSkus.has(sku)) return false;
    const categoryId = product.categoryId ?? '';
    if (retiredCategoryIds.has(categoryId)) return false;
    const allowedSkus = activeCategorySkus.get(categoryId);
    if (allowedSkus) return allowedSkus.has(sku);
    return independentProducts[sku]
      || !strengthCategories.has(product.categoryId ?? '')
      || activeStrengthLines.has(product.lineId ?? '');
  });
  for (const lineId of activeStrengthLines) {
    if (!selectedProducts.some(({ product }) => product.lineId === lineId)) throw new Error(`Active catalog line missing: ${lineId}`);
  }
  const products = selectedProducts.map((entry) => {
    const product = entry.product;
    const publicSku = cleanText(product.publicSku).toUpperCase();
    const override = independentProducts[publicSku];
    const categoryId = override?.categoryId ?? cleanText(product.categoryId);
    const sourceSku = entry.kind === 'source' ? cleanText(entry.product.sourceReference?.sourceSku).toUpperCase() : '';
    if (!publicSku || !categoryId) throw new Error('Catalog draft contains a product without publicSku or categoryId.');

    const specifications = Object.fromEntries(
      Object.entries(product.specifications ?? {})
        .filter(([label, value]) => !unsafeContent.test(`${label} ${String(value ?? '')}`))
        .map(([label, value]) => [cleanText(label), cleanText(value)])
        .filter(([label, value]) => label && value && value.length <= 180),
    );
    const assets = (product.assets ?? [])
      .filter((asset) => asset.localPath && asset.role && ['approved', 'approved-provisional', 'approved-oem'].includes(asset.reviewStatus ?? ''))
      .map((asset) => {
        const localPath = cleanText(asset.localPath).replaceAll('\\', '/');
        const dimensions = dimensionsByPath.get(localPath) ?? { width: asset.width ?? 900, height: asset.height ?? 900 };
        return { role: asset.role, reviewStatus: asset.reviewStatus, localPath, ...dimensions };
      });
    const descriptor = cleanText(entry.kind === 'editorial'
      ? entry.product.descriptor
      : entry.product.localization?.en?.name || entry.product.localization?.it?.name || '');
    const sourceProduct = entry.kind === 'source'
      ? inventoryBySource.get(`${sourceSku}\u0000${entry.product.sourceReference?.sourceUrl}`)
      : undefined;
    if (entry.kind === 'source' && !sourceProduct) throw new Error(`Catalog source missing for ${publicSku}: the reviewed source URL must match the inventory.`);
    const description = entry.kind === 'editorial'
      ? entry.product.technicalDescription
      : editorial[publicSku]?.technicalDescription ?? sourceProduct?.sourceDescription;
    const technicalDescription = cleanTechnicalDescription(description, sourceSku, publicSku);
    const imageNote = entry.kind === 'editorial' && entry.product.imageNote
      ? { it: cleanText(entry.product.imageNote.it), en: cleanText(entry.product.imageNote.en) }
      : undefined;

    return {
      publicSku,
      categoryId,
      ...(!override && product.lineId ? { lineId: cleanText(product.lineId) } : {}),
      ...(override ? { slug: override.slug } : {}),
      descriptor,
      technicalDescription,
      ...(imageNote ? { imageNote } : {}),
      specifications,
      assets,
    };
  });

  if (!products.length || new Set(products.map((product) => product.publicSku)).size !== products.length) {
    throw new Error('Public catalog must contain unique active products.');
  }
  const serialized = `${JSON.stringify({ schemaVersion: 2, products }, null, 2)}\n`;
  if (supplierReferenceCheck.test(serialized) || /https?:\/\//i.test(serialized)) {
    throw new Error('The generated public catalog still contains a supplier reference or remote URL.');
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized, 'utf8');
  await writeFile(activeSkusPath, `${JSON.stringify(products.map((product) => product.publicSku), null, 2)}\n`, 'utf8');

  // Static imports keep retired product images out of both client and server bundles.
  const imagePaths = [...new Set(products.flatMap((product) => product.assets.map((asset) => asset.localPath)))].sort();
  for (const path of imagePaths) {
    if (!/^src\/assets\/catalog\/[^/]+\/[^/]+\.webp$/.test(path)) throw new Error(`Invalid catalog image path: ${path}`);
  }
  const imports = imagePaths.map((path, index) => `import image${index} from ${JSON.stringify(`../../${path.slice('src/'.length)}?url`)};`);
  const entries = imagePaths.map((path, index) => `  ${JSON.stringify(`/${path}`)}: image${index},`);
  await mkdir(dirname(imageImportsPath), { recursive: true });
  await writeFile(imageImportsPath, `// Generated by scripts/site/generate-public-catalog.ts.\n${imports.join('\n')}\n\nexport const catalogImages: Record<string, string> = {\n${entries.join('\n')}\n};\n`, 'utf8');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await generatePublicCatalog();
}
