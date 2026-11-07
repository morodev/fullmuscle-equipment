import crypto from 'node:crypto';

export const expectedSkus = ['FM-GF-001', 'FM-GF-002', 'FM-GF-003', 'FM-GF-004', 'FM-GF-005'];
export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const priceLabel = amount => {
  if (amount !== 1870) throw new Error('La serie GF richiede il prezzo diretto approvato di 1870 EUR + IVA.');
  return 'Prezzo di listino 1.870 € + IVA';
};

export function validateCatalog(catalog) {
  if (catalog.brand?.line !== 'GF' || catalog.pricing?.currency !== 'EUR' || catalog.pricing.vatIncluded !== false || catalog.pricing.fixedListPriceEur !== 1870) throw new Error('Configurazione serie/prezzo GF non valida.');
  if (JSON.stringify(catalog.products.map(p => p.sku)) !== JSON.stringify(expectedSkus)) throw new Error('Attesi i cinque modelli GF, una sola volta e in ordine di codice.');
  for (const product of catalog.products) {
    priceLabel(product.listPriceEur);
    if (!product.name || !product.description || product.features?.length !== 3 || !product.brandedImage || !/^\d+ × \d+ × \d+ mm$/.test(product.dimensions) || !/^\d+ kg$/.test(product.weight) || product.load !== 'A dischi') throw new Error(`Scheda incompleta: ${product.sku}`);
  }
}

export function retailCsv(catalog) {
  const quote = value => `"${String(value).replaceAll('"', '""')}"`;
  return '\uFEFF' + [['Codice', 'Modello', 'Prezzo EUR IVA esclusa', 'Valuta'], ...catalog.products.map(p => [p.sku, p.name, p.listPriceEur, 'EUR'])].map(row => row.map(quote).join(';')).join('\r\n') + '\r\n';
}
