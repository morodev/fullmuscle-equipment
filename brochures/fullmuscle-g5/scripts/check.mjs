import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PDFDocument, PDFName} from 'pdf-lib';
import crypto from 'node:crypto';
import {buildRetailCsv, formatListPrice, validateCatalogPrices} from '../content/pricing.mjs';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(base, '../..');
const readJson = async relative => JSON.parse(await fs.readFile(path.join(base, relative), 'utf8'));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const report = await readJson('exports/preflight.json');
const catalogue = await readJson('content/catalog.json');
const config = await readJson('content/pricing-config.json');
const purchases = await readJson('content/purchase-prices.json');
const failures = [...report.issues];

try {
  validateCatalogPrices(catalogue.products, purchases, config);
} catch (error) {
  failures.push(`Invalid catalogue prices: ${error.message}`);
}
for (const relative of ['content/catalog.json', 'content/pricing-config.json', 'content/purchase-prices.json']) {
  if (report.pricingInputs?.[relative] !== sha256(await fs.readFile(path.join(base, relative)))) {
    failures.push(`Pricing input changed since preflight: ${relative}`);
  }
}
const sourceBytes = await fs.readFile(path.join(root, purchases.source.filename));
if (sha256(sourceBytes) !== purchases.source.sha256) failures.push('Purchase spreadsheet changed since import');
const csv = await fs.readFile(path.join(base, 'exports/listino-rivendita.csv'), 'utf8');
if (csv !== buildRetailCsv(catalogue.products)) failures.push('Retail CSV differs from catalogue prices');
if (report.pendingImages.length) failures.push('Pending product/scene images');
if (report.mode !== 'final-export') failures.push('Not a final export');
if (catalogue.products.length !== 105 || report.catalogModels !== 105) failures.push('Expected 105 catalogue models');
const expectedDocuments = new Map([['brochure-stampa.pdf', 12], ['catalogo-completo.pdf', 56]]);
if (report.documents.length !== expectedDocuments.size) failures.push('Expected both final PDFs');

for (const document of report.documents) {
  const bytes = await fs.readFile(path.join(base, 'exports', document.filename));
  const pdf = await PDFDocument.load(bytes);
  if (pdf.getPageCount() !== expectedDocuments.get(document.filename)) failures.push(`${document.filename}: wrong page count`);
  if (sha256(bytes) !== document.sha256) failures.push(`${document.filename}: hash changed since preflight`);
  for (const page of pdf.getPages()) {
    if (!page.node.has(PDFName.of('TrimBox')) || !page.node.has(PDFName.of('BleedBox'))) failures.push(`${document.filename}: page boxes missing`);
  }
  const expectedProducts = document.filename === 'brochure-stampa.pdf'
    ? catalogue.products.filter(product => catalogue.featuredSkus.includes(product.sku))
    : catalogue.products;
  const prices = document.priceChecks;
  if (!prices || prices.expectedCount !== expectedProducts.length || prices.renderedCount !== expectedProducts.length || prices.entries.length !== expectedProducts.length) {
    failures.push(`${document.filename}: incomplete price coverage`);
    continue;
  }
  for (const product of expectedProducts) {
    const entries = prices.entries.filter(entry => entry.sku === product.sku);
    if (entries.length !== 1 || entries[0].amountEur !== product.listPriceEur || entries[0].text !== formatListPrice(product.listPriceEur)) {
      failures.push(`${document.filename}: missing, duplicated or incorrect price for ${product.sku}`);
    }
  }
}

const publicPdf = await fs.readFile(path.join(root, 'public/cataloghi/fullmuscle-g5.pdf'));
const completePdf = report.documents.find(document => document.filename === 'catalogo-completo.pdf');
if (sha256(publicPdf) !== completePdf?.sha256) failures.push('Public catalogue differs from verified export');
console.log(JSON.stringify({
  passed: failures.length === 0,
  documents: report.documents.map(document => ({filename: document.filename, pages: document.pages, prices: document.priceChecks?.renderedCount})),
  modelCount: report.catalogModels,
  failures,
  qrPublicAvailability: report.qr.publicHttpStatus,
  physicalPrintScan: report.qr.physicalPrintScan,
}, null, 2));
process.exitCode = failures.length ? 1 : 0;
