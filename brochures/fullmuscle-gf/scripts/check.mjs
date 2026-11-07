import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { validateCatalog, expectedSkus, priceLabel, retailCsv, sha256 } from './validation.mjs';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(base, '../..');
const read = relative => fs.readFile(path.join(base, relative));
const catalog = JSON.parse(await read('content/catalog.json'));
const report = JSON.parse(await read('exports/preflight.json'));
const issues = [...report.issues];
try {validateCatalog(catalog);} catch (error) {issues.push(error.message);}
if (report.mode !== 'final-export' || report.catalogModels !== 5 || report.documents.length !== 2) issues.push('Incomplete final export.');
if (report.pricing.listPriceEur !== 1870 || report.pricing.vatIncluded !== false || report.pricing.mode !== 'fixed-user-price') issues.push('Incorrect pricing configuration.');
if (report.qr.destination !== catalog.publicPdfUrl) issues.push('Incorrect QR destination.');
for (const [file, expectedHash] of Object.entries(report.inputs)) if (sha256(await read(file)) !== expectedHash) issues.push(`Input changed since export: ${file}`);
if ((await read('exports/listino-rivendita.csv')).toString() !== retailCsv(catalog)) issues.push('Retail CSV differs from catalog.');
if (report.assets.length !== 5) issues.push('Expected five branded source images.');
for (const asset of report.assets) {
  if (sha256(await fs.readFile(path.join(root, asset.source))) !== asset.sourceHash) issues.push(`Branded image changed: ${asset.sku}`);
  if (sha256(await read(`assets/products/${asset.sku}.png`)) !== asset.sourceHash) issues.push(`Branded image copy changed: ${asset.sku}`);
  if (sha256(await read(asset.prepared)) !== asset.preparedHash) issues.push(`Prepared image changed: ${asset.sku}`);
}
const files = new Set(['brochure-stampa.pdf', 'catalogo-completo.pdf']);
for (const document of report.documents) {
  if (!files.delete(document.filename)) issues.push(`Unexpected or duplicate PDF: ${document.filename}`);
  const bytes = await read(`exports/${document.filename}`);
  const pdf = await PDFDocument.load(bytes);
  if (sha256(bytes) !== document.sha256) issues.push(`PDF changed since preflight: ${document.filename}`);
  if (pdf.getPageCount() !== 8 || document.pages !== 8) issues.push(`${document.filename}: expected eight pages.`);
  const isDigital = document.filename === 'catalogo-completo.pdf';
  const expectedPageMm = isDigital ? [210, 297] : [216, 303];
  for (const page of pdf.getPages()) {
    const trim = page.getTrimBox(); const bleed = page.getBleedBox();
    const near = (points, mm) => Math.abs(points * 25.4 / 72 - mm) < 0.1;
    if (!near(page.getWidth(), expectedPageMm[0]) || !near(page.getHeight(), expectedPageMm[1]) || !near(trim.width, 210) || !near(trim.height, 297) || !near(trim.x, isDigital ? 0 : 3) || !near(trim.y, isDigital ? 0 : 3) || !near(bleed.width, expectedPageMm[0]) || !near(bleed.height, expectedPageMm[1])) issues.push(`${document.filename}: incorrect page/trim/bleed dimensions.`);
  }
  if (JSON.stringify(document.productSkus) !== JSON.stringify(expectedSkus)) issues.push(`${document.filename}: incorrect model coverage.`);
  if (document.priceChecks.length !== 5) issues.push(`${document.filename}: expected five prices.`);
  for (const sku of expectedSkus) {
    const matches = document.priceChecks.filter(price => price.sku === sku);
    if (matches.length !== 1 || matches[0].productSku !== sku || matches[0].amountEur !== 1870 || matches[0].text !== priceLabel(1870)) issues.push(`${document.filename}: incorrect price for ${sku}.`);
    if (!document.images.some(image => image.sku === sku && image.page >= 3 && image.page <= 7)) issues.push(`${document.filename}: missing product image for ${sku}.`);
  }
  if (!document.embeddedFonts.length || document.embeddedFonts.some(font => !font.embedded)) issues.push(`${document.filename}: unembedded fonts.`);
  if (document.images.some(image => !image.loaded || image.ppi < 239.9)) issues.push(`${document.filename}: invalid image resolution.`);
}
if (files.size) issues.push('Missing final PDF.');
const publicPdf = await fs.readFile(path.join(root, 'public/cataloghi/fullmuscle-gf.pdf'));
if (sha256(publicPdf) !== report.documents.find(doc => doc.filename === 'catalogo-completo.pdf')?.sha256) issues.push('Public copy differs from verified catalog.');
console.log(JSON.stringify({passed: issues.length === 0, models: 5, priceEurExVat: 1870, documents: report.documents.map(doc => ({filename: doc.filename, pages: doc.pages, prices: doc.priceChecks.length})), issues, publicUrlStatus: report.qr.publicHttpStatus}, null, 2));
if (issues.length) process.exitCode = 1;
