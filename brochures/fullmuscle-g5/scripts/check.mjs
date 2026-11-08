import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PDFDocument, PDFName} from 'pdf-lib';
import crypto from 'node:crypto';
import {buildRetailCsv, formatListPrice, validateCatalogPrices} from '../content/pricing.mjs';
import {printPages, printSkus, validatePrintPlan} from '../content/print-plan.mjs';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(base, '../..');
const onlyBrochure = process.argv.includes('--brochure-only');
const readJson = async relative => JSON.parse(await fs.readFile(path.join(base, relative), 'utf8'));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const failures = [];
const catalogue = await readJson('content/catalog.json');
const config = await readJson('content/pricing-config.json');
const purchases = await readJson('content/purchase-prices.json');
const sources = [];
const normalize = text => String(text).replace(/\s+/g, ' ').trim();
const mm = points => points * 25.4 / 72;
const close = (actual, expected) => Math.abs(actual - expected) < 0.1;

try {
  validateCatalogPrices(catalogue.products, purchases, config);
  validatePrintPlan(catalogue);
} catch (error) { failures.push(error.message); }
for (const [relative, filename, expectedPages, isPrint] of [
  ['exports/preflight-stampa.json', 'brochure-stampa.pdf', printPages.length, true],
  ...(!onlyBrochure ? [['exports/preflight.json', 'catalogo-completo.pdf', 56, false]] : []),
]) {
  try {
    const report = await readJson(relative);
    const matches = report.documents.filter(document => document.filename === filename);
    if (matches.length !== 1) failures.push(relative + ': expected one ' + filename + ' document');
    else sources.push({report, document: matches[0], expectedPages, isPrint});
  } catch (error) {
    failures.push(relative + ': ' + (error.code === 'ENOENT' ? 'report missing; rebuild this document' : error.message));
  }
}

const sourceBytes = await fs.readFile(path.join(root, purchases.source.filename));
if (sha256(sourceBytes) !== purchases.source.sha256) failures.push('Purchase spreadsheet changed since import');
if (await fs.readFile(path.join(base, 'exports/listino-rivendita.csv'), 'utf8') !== buildRetailCsv(catalogue.products)) failures.push('Retail CSV differs from catalogue prices');
if (catalogue.products.length !== 105) failures.push('Expected 105 catalogue models');

for (const {report, document, expectedPages, isPrint} of sources) {
  const prefix = document.filename + ': ';
  // The legacy combined report includes an old print edition. Only its complete
  // catalogue document belongs to this pass; current print has its own report.
  failures.push(...(document.issues || []).map(issue => prefix + issue));
  if (report.mode !== 'final-export') failures.push(prefix + 'not a final export');
  if (report.pendingImages?.length) failures.push(prefix + 'pending product/scene images');
  if (report.catalogModels !== 105) failures.push(prefix + 'expected 105 source models');
  for (const relative of ['content/catalog.json', 'content/pricing-config.json', 'content/purchase-prices.json']) {
    if (report.pricingInputs?.[relative] !== sha256(await fs.readFile(path.join(base, relative)))) failures.push(prefix + 'pricing input changed since preflight: ' + relative);
  }
  if (isPrint) {
    if (JSON.stringify(report.brochureModels) !== JSON.stringify(printSkus)) failures.push(prefix + 'selection differs from current print plan');
    for (const relative of ['content/print-plan.mjs', 'layout/print-brochure.mjs', 'layout/print-brochure.css', 'scripts/build.mjs']) {
      if (report.editorialInputs?.[relative] !== sha256(await fs.readFile(path.join(base, relative)))) failures.push(prefix + 'editorial input changed since preflight: ' + relative);
    }
    failures.push(...(report.issues || []).map(issue => prefix + issue));
  }
  for (const asset of report.assets || []) {
    try {
      if (sha256(await fs.readFile(path.resolve(root, asset.source))) !== asset.inputHash) failures.push(prefix + 'source image changed since preflight: ' + asset.source);
    } catch { failures.push(prefix + 'source image unavailable: ' + asset.source); }
  }

  let pdf;
  try {
    const bytes = await fs.readFile(path.join(base, 'exports', document.filename));
    pdf = await PDFDocument.load(bytes);
    if (sha256(bytes) !== document.sha256) failures.push(prefix + 'hash changed since preflight');
  } catch (error) {
    failures.push(prefix + 'PDF unavailable or invalid: ' + error.message);
    continue;
  }
  if (pdf.getPageCount() !== expectedPages || document.pages !== expectedPages || document.expectedPages !== expectedPages) failures.push(prefix + 'wrong page count');
  for (const [index, page] of pdf.getPages().entries()) {
    if (!page.node.has(PDFName.of('TrimBox')) || !page.node.has(PDFName.of('BleedBox'))) {
      failures.push(prefix + 'page ' + (index + 1) + ' boxes missing');
      continue;
    }
    const trim = page.getTrimBox(), bleed = page.getBleedBox();
    const origin = isPrint ? 3 : 0, size = isPrint ? [216, 303] : [210, 297];
    if (!close(mm(trim.x), origin) || !close(mm(trim.y), origin) || !close(mm(trim.width), 210) || !close(mm(trim.height), 297)
      || !close(mm(bleed.x), 0) || !close(mm(bleed.y), 0) || !close(mm(bleed.width), size[0]) || !close(mm(bleed.height), size[1])) failures.push(prefix + 'page ' + (index + 1) + ' incorrect trim/bleed dimensions');
  }
  if (!document.embeddedFonts?.length || document.embeddedFonts.some(font => !font.embedded)) failures.push(prefix + 'missing or unembedded fonts');
  if (!document.images?.length || document.images.some(image => !image.loaded || image.ppi < 239)) failures.push(prefix + 'missing or low-resolution images');
  if (document.overflow?.length) failures.push(prefix + 'layout overflow');

  const expectedProducts = isPrint ? printSkus.map(sku => catalogue.products.find(product => product.sku === sku)) : catalogue.products;
  const prices = document.priceChecks;
  if (!prices || prices.expectedCount !== expectedProducts.length || prices.renderedCount !== expectedProducts.length || prices.entries.length !== expectedProducts.length) failures.push(prefix + 'incomplete price coverage');
  else {
    failures.push(...(prices.issues || []).map(issue => prefix + issue));
    for (const product of expectedProducts.filter(Boolean)) {
      const entries = prices.entries.filter(entry => entry.sku === product.sku);
      if (entries.length !== 1 || entries[0].amountEur !== product.listPriceEur || normalize(entries[0].text) !== normalize(formatListPrice(product.listPriceEur))) failures.push(prefix + 'missing, duplicated or incorrect price for ' + product.sku);
    }
  }
  if (isPrint) {
    const technical = document.technicalChecks;
    if (!technical || technical.expectedCount !== expectedProducts.length || technical.renderedCount !== expectedProducts.length || technical.entries.length !== expectedProducts.length) failures.push(prefix + 'incomplete technical data coverage');
    else {
      failures.push(...(technical.issues || []).map(issue => prefix + issue));
      for (const product of expectedProducts.filter(Boolean)) {
        const entries = technical.entries.filter(entry => entry.sku === product.sku);
        const expectedRows = product.technicalRows.map(row => normalize(row.label) + '|' + normalize(row.value)).sort();
        const actualRows = entries.length === 1 ? entries[0].rows.map(row => normalize(row.label) + '|' + normalize(row.value)).sort() : [];
        if (JSON.stringify(actualRows) !== JSON.stringify(expectedRows)) failures.push(prefix + 'incorrect technical data for ' + product.sku);
      }
    }
    if (!document.layoutChecks) failures.push(prefix + 'layout checks missing');
    else failures.push(...document.layoutChecks.issues.map(issue => prefix + issue));
    if (report.qr?.destination !== 'https://fullmuscle-equipment.com/cataloghi/fullmuscle-g5.pdf' || !report.qr.encoded) failures.push(prefix + 'incorrect catalogue QR destination');
  }
}
if (!onlyBrochure) {
  const completePdf = sources.find(source => !source.isPrint)?.document;
  if (sha256(await fs.readFile(path.join(root, 'public/cataloghi/fullmuscle-g5.pdf'))) !== completePdf?.sha256) failures.push('Public catalogue differs from verified export');
}
console.log(JSON.stringify({
  passed: failures.length === 0,
  scope: onlyBrochure ? 'print-only' : 'print-and-complete',
  documents: sources.map(({document}) => ({filename: document.filename, pages: document.pages, prices: document.priceChecks?.renderedCount})),
  printModels: printSkus.length,
  modelCount: catalogue.products.length,
  failures: [...new Set(failures)],
  qrPublicAvailability: sources.find(source => source.isPrint)?.report.qr?.publicHttpStatus,
  physicalPrintScan: sources.find(source => source.isPrint)?.report.qr?.physicalPrintScan,
}, null, 2));
process.exitCode = failures.length ? 1 : 0;
