import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { editorial, featured, featuredFeatures } from './editorial.mjs';
import { buildPriceMap, buildRetailCsv } from './pricing.mjs';

const contentDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(contentDir, '../../..');
const readJson = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const inventory = await readJson('data/catalog-source/tzfit/inventory.json');
const assets = await readJson('data/catalog-assets/manifest.json');
const source = inventory.products.filter(product => product.sourceSeriesIds.includes('g5-series-pin-loaded-machine'));
if (source.length !== 105 || new Set(source.map(p => p.sourceSku)).size !== 105) throw new Error('La baseline G5 attesa contiene 105 codici univoci: riesaminare le variazioni prima di esportare.');
if (source.filter(p => p.sourceSku.startsWith('GC-')).length !== 101) throw new Error('Attesi 101 codici GC nella categoria G5.');
const missingText = source.filter(p => !editorial[p.sourceSku]).map(p => p.sourceSku);
if (missingText.length) throw new Error(`Testi editoriali mancanti: ${missingText.join(', ')}`);
const pricingConfig = JSON.parse(await readFile(resolve(contentDir, 'pricing-config.json'), 'utf8'));
const purchasePrices = JSON.parse(await readFile(resolve(contentDir, 'purchase-prices.json'), 'utf8'));
const purchaseFile = await readFile(resolve(root, purchasePrices.source.filename));
if (createHash('sha256').update(purchaseFile).digest('hex') !== purchasePrices.source.sha256) {
  throw new Error('Il listino Excel è cambiato: eseguire scripts/import-prices.ps1 prima di rigenerare il catalogo.');
}
const listPrices = buildPriceMap(source, purchasePrices, pricingConfig);

const unavailable = 'Su richiesta';
const publicSku = sku => `FM-${sku.toUpperCase().replace(/\s+/g, '-').replace(/^-+|-+$/g, '')}`;
const formatMass = value => value ? value.trim().replace(/kg/gi, ' kg').replace(/\s+/g, ' ').replace(/\*/g, ' × ').replace(/(\d)\.(\d)/g, '$1,$2') : unavailable;
const formatDimensions = value => value ? `${value.replace(/mm/gi, '').trim().replace(/\*/g, ' × ').replace(/(\d)\.(\d)/g, '$1,$2')} mm` : unavailable;
const noStack = new Set(['GA-5073-1','GC-5013','GC-5019-1','GC-5019-2','GC-5023','GC-5024','GC-5024-1','GC-5024B','GC-5025','GC-5025A','GC-5026','GC-5027','GC-5028','GC-5029','GC-5030','GC-5031','GC-5032','GC-5034','GC-5035','GC-5043','GC-5045','GC-5051','GC-5052','GC-5073','GC-5091','GC-5096','GC-5105','GC-5114']);
noStack.add('GC-5113'); // Stazione a corpo libero, verificata sull'immagine originale.
const visuallyVerifiedPlateLoaded = new Set(['GC-5094','GC-5101','GC-5115']);
const stationLoads = {
  'GC-5097A': [['Trazioni e dip assistiti','Assisted Chin Up Dip'],['Lat Pulldown','Lat Pulldown'],['Low Row','Low Row'],['Cavo regolabile','Adjustable Pulley']],
  'GC-5098A-5202': [['Low Row','Low Row'],['Lat Pulldown','Lat Pulldown'],['Cavo singolo','Single Pulley'],['Pectoral Fly','Butterfly']],
  'GC-5098A-5203': [['Leg Press','Leg press'],['Cavo regolabile','Adjustable Pulley'],['Chest Press','Adjustable Chest Press'],['Leg Curl / Extension','Leg Curl &Extension']],
};
const anomalies = {
  'GC-5003': { fields:['dimensions','weight','stack'], reason:'La scheda non fornisce dimensioni, peso macchina o massa del pacco pesi.' },
  'GC-5021': { fields:['stack'], reason:'Valore letterale della fonte: 100g. Unità incoerente; nessuna conversione in kg presunta.' },
  'GC-5025': { fields:['weight'], reason:'La fonte riporta 52/ 55kg senza identificare le varianti.' },
  'GC-5044-1': { fields:['weight','stack'], reason:'La fonte riporta pacco 169kg e macchina 80kg; sospetta inversione rispetto al modello GC-5044, non corretta per inferenza.' },
  'GC-5097': { fields:['dimensions','weight','stack'], reason:'La scheda non fornisce dimensioni, peso macchina o massa dei pacchi pesi.' },
};

const products = source.map(product => {
  const text = editorial[product.sourceSku];
  const specs = product.specifications;
  const sku = publicSku(product.sourceSku);
  const primary = product.assets.find(asset => asset.role === 'primary');
  const asset = assets.items.find(item => item.sourceUrl === primary?.sourceUrl && item.sourceSku === product.sourceSku);
  if (!asset?.originalPath) throw new Error(`Originale non trovato per ${product.sourceSku}`);
  const isPlateLoaded = (specs.Type === 'Plate Loaded Machines' || visuallyVerifiedPlateLoaded.has(product.sourceSku)) && !noStack.has(product.sourceSku);
  const fields = {
    dimensions: formatDimensions(specs['Machine Size(L*W*H)mm'] || specs.Size),
    weight: formatMass(specs['Machine Weight'] || specs.Weight),
    stack: noStack.has(product.sourceSku) || isPlateLoaded ? 'Non previsto' : formatMass(specs['Weight Stack']),
  };
  for (const field of anomalies[product.sourceSku]?.fields || []) fields[field] = unavailable;
  const loads = (stationLoads[product.sourceSku] || []).map(([label,key]) => ({label, value:formatMass(specs[key])}));
  if (loads.length) fields.stack = loads.map(row => `${row.label}: ${row.value}`).join('; ');
  const technicalRows = [
    { label:'Dimensioni (L × P × H)', value:fields.dimensions },
    { label:'Peso macchina', value:fields.weight },
    ...(isPlateLoaded ? [{ label:'Carico', value:'A dischi' }] : noStack.has(product.sourceSku) ? [] : loads.length ? loads : [{ label:product.sourceSku === 'GC-5039' ? 'Carico' : 'Pacco pesi', value:fields.stack }]),
    ...(specs.Material === 'Q235 Steel Tube' ? [{label:'Struttura',value:'Acciaio Q235'}] : []),
    ...(specs['Main Tube 1'] ? [{label:'Tubolare principale',value:formatDimensions(specs['Main Tube 1'].replace(/rectangle tube|square tube/gi,''))}] : []),
    ...(specs.Painting ? [{label:'Finitura',value:'Verniciatura a polvere'}] : []),
  ];
  return {
    sku, sourceSku:product.sourceSku, name:text.name, description:text.description,
    features:featuredFeatures[product.sourceSku] || [text.description.split('. ')[0].replace(/\.$/, '')],
    category:text.category, ...fields, technicalRows,
    listPriceEur:listPrices.get(product.sourceSku),
    image:`assets/products/${sku}.png`,
    sourceUrl:product.sourceUrl, sourceImage:primary.sourceUrl, sourceImagePath:asset.originalPath,
    sourceCrawledAt:product.crawledAt,
    ...(anomalies[product.sourceSku] ? {reviewNote:anomalies[product.sourceSku].reason} : {}),
  };
});

const catalog = {
  schemaVersion:1,
  brand:{name:'FullMuscle Equipment',line:'G5',green:'#356B35'},
  contact:{name:'Matteo',phone:'392 550 1779',phoneLink:'+393925501779',email:'info@fullmuscle-equipment.com',website:'https://fullmuscle-equipment.com'},
  featuredSkus:featured.map(publicSku),
  products,
};
await writeFile(resolve(contentDir,'catalog.json'), `${JSON.stringify(catalog,null,2)}\n`, 'utf8');
await mkdir(resolve(contentDir, '../exports'), { recursive:true });
await writeFile(resolve(contentDir, '../exports/listino-rivendita.csv'), buildRetailCsv(products), 'utf8');
console.log(`Catalogo G5: ${products.length} modelli con prezzi, ${catalog.featuredSkus.length} schede selezionate. CSV di rivendita aggiornato. Dati interni e fonti non destinati al PDF.`);
