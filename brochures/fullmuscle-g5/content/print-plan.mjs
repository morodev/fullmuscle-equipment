// The print selection is intentionally independent of the complete catalogue.
const sku = code => `FM-GC-${code}`;
const entry = (type, title, codes = [], extra = {}) => ({type, title, skus: codes.map(sku), ...extra});

export const printPages = [
  entry('cover', 'La forza prende forma.'),
  entry('intro', 'Dalle macchine alla tua palestra.'),
  entry('featured', 'Leg Press orizzontale', ['5016']),
  entry('grid', 'Le basi della tua area gambe.', ['5001', '5002', '5014', '5033'], {eyebrow: 'Gambe e glutei', subtitle: 'Flessione, estensione e lavoro delle anche: quattro postazioni complementari.'}),
  entry('featured', 'Hip Thrust', ['5092']),
  entry('scene', 'La tua palestra, dalla planimetria alla fornitura.', [], {scene: 'gym-project', variant: 'project'}),
  entry('featured', 'Chest Press', ['5005']),
  entry('grid', 'Spinte e aperture. Una scelta completa.', ['5012', '5010', '5007', '5047'], {eyebrow: 'Petto e spalle', subtitle: 'Movimenti complementari per costruire la dotazione della parte superiore.'}),
  entry('featured', 'Lat Pulldown', ['5008']),
  entry('grid', 'Dalla schiena al lavoro sulle braccia.', ['5004', '5019', '5046', '5011'], {eyebrow: 'Schiena e braccia', subtitle: 'Trazioni, remata e lavoro specifico per bicipiti e tricipiti.'}),
  entry('scene', 'Dai spazio alla prossima fase della tua palestra.', [], {scene: 'gym-renewal', variant: 'renewal'}),
  entry('featured', 'Functional Trainer', ['5090']),
  entry('grid', 'Completa la tua zona pesi liberi.', ['5024', '5023', '5031', '5051', '5013', '5028'], {eyebrow: 'Panche, rack e accessori', subtitle: 'Sei elementi per allenare, organizzare e dare ordine alla sala.'}),
  entry('featured', 'Total Abdominal', ['5015']),
  entry('process', 'Ogni macchina trova posto nel tuo progetto.'),
  entry('contact', 'Parliamo della tua palestra.'),
];

export const printSkus = printPages.flatMap(page => page.skus);
export const commonSpecLabels = ['Struttura', 'Tubolare principale', 'Finitura'];

export function commonTechnicalRows(products) {
  if (!products.length) throw new Error('Cannot share specifications for an empty selection');
  return commonSpecLabels.map(label => {
    const rows = products.map(product => product.technicalRows?.find(row => row.label === label));
    if (rows.some(row => !row?.value || row.value !== rows[0]?.value)) {
      throw new Error(`Shared specification differs or is missing: ${label}`);
    }
    return rows[0];
  });
}

export function validatePrintPlan(catalogue, pages = printPages) {
  const products = new Map(catalogue.products.map(product => [product.sku, product]));
  const selected = pages.flatMap(page => page.skus);
  if (pages.length !== 16) throw new Error('Print brochure must contain 16 pages');
  if (selected.length !== 24 || new Set(selected).size !== 24) throw new Error('Print brochure must contain 24 unique models');
  for (const code of selected) if (!products.has(code)) throw new Error(`Unknown print model: ${code}`);
  for (const code of catalogue.featuredSkus) if (!selected.includes(code)) throw new Error(`Original print model is missing: ${code}`);
  for (const page of pages) {
    if (page.type === 'featured' && page.skus.length !== 1) throw new Error('Featured page must contain one model');
    if (page.type === 'grid' && ![4, 6].includes(page.skus.length)) throw new Error('Grid page must contain four or six models');
    if (page.type === 'grid' && page.skus.length === 6) commonTechnicalRows(page.skus.map(code => products.get(code)));
  }
}
