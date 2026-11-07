import crypto from 'node:crypto';

export const expectedSkus = ['FM-GF-001', 'FM-GF-002', 'FM-GF-003', 'FM-GF-004', 'FM-GF-005'];
export const expectedScenes = [
  {id: 'gym', source: 'assets/scenes/gym.png', prepared: 'layout/prepared/scene-gym.jpg', page: 1, productSku: null, placement: 'cover', widthMm: 158, heightMm: 103, caption: 'Rendering illustrativo di ambientazione', alt: 'Ambientazione illustrativa di una palestra con macchine Full Muscle GF'},
  {id: 'chest-training', source: 'assets/scenes/chest-training.png', prepared: 'layout/prepared/scene-chest-training.jpg', page: 3, productSku: 'FM-GF-001', placement: 'training', widthMm: 62, heightMm: 32, caption: 'Rendering illustrativo', alt: 'Allenamento illustrativo sulla Chest Press Full Muscle GF-001'},
  {id: 'lat-training', source: 'assets/scenes/lat-training.png', prepared: 'layout/prepared/scene-lat-training.jpg', page: 6, productSku: 'FM-GF-004', placement: 'training', widthMm: 62, heightMm: 32, caption: 'Rendering illustrativo', alt: 'Allenamento illustrativo sulla Lat Pulldown Full Muscle GF-004'},
];
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

export function sceneAssetIssues(assets) {
  const issues = [];
  if (!Array.isArray(assets) || assets.length !== expectedScenes.length) issues.push('Expected exactly three scene assets.');
  const available = Array.isArray(assets) ? assets : [];
  for (const scene of expectedScenes) {
    const matches = available.filter(asset => asset.id === scene.id);
    if (matches.length !== 1) {issues.push(`Missing or duplicate scene asset: ${scene.id}.`); continue;}
    const asset = matches[0];
    if (asset.source !== scene.source || asset.prepared !== scene.prepared) issues.push(`Unexpected scene file: ${scene.id}.`);
    if (![asset.width, asset.height].every(value => Number.isFinite(value) && value > 0)) issues.push(`Invalid scene dimensions: ${scene.id}.`);
    if (![asset.sourceHash, asset.preparedHash].every(value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value))) issues.push(`Missing scene source/prepared hashes: ${scene.id}.`);
  }
  return issues;
}

/** Validate rendered usage independently for each PDF, preserving uncropped scenes. */
export function sceneUsageIssues(usages, assets) {
  const issues = [];
  if (!Array.isArray(usages) || usages.length !== expectedScenes.length) issues.push('Expected exactly three rendered scenes.');
  const available = Array.isArray(usages) ? usages : [];
  for (const scene of expectedScenes) {
    const matches = available.filter(usage => usage.id === scene.id);
    if (matches.length !== 1) {issues.push(`Missing or duplicate rendered scene: ${scene.id}.`); continue;}
    const usage = matches[0];
    if (usage.page !== scene.page || usage.productSku !== scene.productSku || usage.placement !== scene.placement) issues.push(`Incorrect scene placement: ${scene.id}.`);
    if (scene.placement === 'training' && usage.belowPrice !== true) issues.push(`Training scene must sit below the price: ${scene.id}.`);
    if (usage.src !== scene.prepared.replace('layout/', '') || usage.caption !== scene.caption) issues.push(`Incorrect scene image/caption: ${scene.id}.`);
    if (usage.objectFit !== 'contain' || ![usage.widthMm, usage.heightMm].every(Number.isFinite) || Math.abs(usage.widthMm - scene.widthMm) > 0.1 || Math.abs(usage.heightMm - scene.heightMm) > 0.1) issues.push(`Incorrect scene box or cropping: ${scene.id}.`);
    if (!usage.loaded || !Number.isFinite(usage.ppi) || usage.ppi < 240) issues.push(`Invalid scene resolution: ${scene.id}.`);
    const asset = (assets ?? []).find(asset => asset.id === scene.id);
    if (!asset || usage.sourceHash !== asset.sourceHash || usage.preparedHash !== asset.preparedHash) issues.push(`Scene usage does not match verified input: ${scene.id}.`);
  }
  return issues;
}
