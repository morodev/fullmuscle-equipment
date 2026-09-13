import type { InventoryDiff, SourceInventory, SourceProduct } from './types.js';

export function compareInventories(previous: SourceInventory | undefined, current: SourceInventory): InventoryDiff {
  const oldProducts = new Map((previous?.products ?? []).map((product) => [productKey(product), product]));
  const newProducts = new Map(current.products.map((product) => [productKey(product), product]));
  const created: InventoryDiff['new'] = [];
  const changed: InventoryDiff['changed'] = [];
  const removed: InventoryDiff['removed'] = [];
  let unchanged = 0;

  for (const [key, product] of newProducts) {
    const oldProduct = oldProducts.get(key);
    if (!oldProduct) {
      created.push(reference(product));
    } else if (oldProduct.contentHash !== product.contentHash) {
      changed.push({ ...reference(product), previousHash: oldProduct.contentHash, currentHash: product.contentHash });
    } else {
      unchanged += 1;
    }
  }
  for (const [key, product] of oldProducts) {
    if (!newProducts.has(key)) removed.push({ ...reference(product), action: 'manual-review' });
  }

  return {
    createdAt: new Date().toISOString(),
    new: created.sort(bySku),
    changed: changed.sort(bySku),
    removed: removed.sort(bySku),
    unchanged,
    duplicateSourceSkus: findDuplicates(current.products.map((product) => product.sourceSku)),
    missingImages: current.products.filter((product) => !product.assets.length).map((product) => product.sourceSku).sort(),
    missingSpecifications: current.products
      .filter((product) => !Object.keys(product.specifications).length)
      .map((product) => product.sourceSku)
      .sort(),
    missingDescriptions: current.products
      .filter((product) => !product.sourceDescription)
      .map((product) => product.sourceSku)
      .sort(),
    specificationConflicts: findSpecificationConflicts(current.products),
  };
}

function findSpecificationConflicts(products: SourceProduct[]): InventoryDiff['specificationConflicts'] {
  const productsBySku = new Map<string, SourceProduct[]>();
  for (const product of products) {
    const key = product.sourceSku.toUpperCase();
    productsBySku.set(key, [...(productsBySku.get(key) ?? []), product]);
  }
  const conflicts: InventoryDiff['specificationConflicts'] = [];
  for (const [sourceSku, variants] of productsBySku) {
    if (variants.length < 2) continue;
    const keys = new Set(variants.flatMap((product) => Object.keys(product.specifications)));
    for (const key of keys) {
      const values = variants.map((product) => product.specifications[key]).filter((value): value is string => Boolean(value));
      const materiallyDifferent = new Map<string, string>();
      for (const value of values) materiallyDifferent.set(canonicalSpecificationValue(value), value);
      if (materiallyDifferent.size > 1) conflicts.push({ sourceSku, key, values: [...materiallyDifferent.values()] });
    }
  }
  return conflicts.sort((a, b) => `${a.sourceSku}:${a.key}`.localeCompare(`${b.sourceSku}:${b.key}`));
}

function canonicalSpecificationValue(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '').replace(/[×*]/g, 'x');
}

function findDuplicates(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value.toUpperCase(), (counts.get(value.toUpperCase()) ?? 0) + 1);
  return [...counts].filter(([, count]) => count > 1).map(([value]) => value).sort();
}

function productKey(product: SourceProduct): string {
  return product.sourceSku.trim().toUpperCase() || product.sourceUrl;
}

function reference(product: SourceProduct): { sourceSku: string; sourceUrl: string } {
  return { sourceSku: product.sourceSku, sourceUrl: product.sourceUrl };
}

function bySku(a: { sourceSku: string }, b: { sourceSku: string }): number {
  return a.sourceSku.localeCompare(b.sourceSku);
}
