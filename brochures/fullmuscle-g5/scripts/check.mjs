import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PDFDocument,PDFName} from 'pdf-lib';
import crypto from 'node:crypto';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const report=JSON.parse(await fs.readFile(path.join(base,'exports/preflight.json'),'utf8'));
const failures=[...report.issues];
if(report.pendingImages.length)failures.push('Pending product/scene images');
if(report.mode!=='final-export')failures.push('Not a final export');
for(const document of report.documents){const bytes=await fs.readFile(path.join(base,'exports',document.filename));const pdf=await PDFDocument.load(bytes);if(pdf.getPageCount()!==document.expectedPages)failures.push(`${document.filename}: wrong page count`);if(crypto.createHash('sha256').update(bytes).digest('hex')!==document.sha256)failures.push(`${document.filename}: hash changed since preflight`);for(const page of pdf.getPages()){if(!page.node.has(PDFName.of('TrimBox'))||!page.node.has(PDFName.of('BleedBox')))failures.push(`${document.filename}: page boxes missing`);}}
const publicPdf=await fs.readFile(path.resolve(base,'../../public/cataloghi/fullmuscle-g5.pdf'));
const catalogue=report.documents.find(d=>d.filename==='catalogo-completo.pdf');if(crypto.createHash('sha256').update(publicPdf).digest('hex')!==catalogue.sha256)failures.push('Public catalogue differs from verified export');
console.log(JSON.stringify({passed:failures.length===0,documents:report.documents.map(d=>({filename:d.filename,pages:d.pages})),modelCount:report.catalogModels,failures,qrPublicAvailability:report.qr.publicHttpStatus,physicalPrintScan:report.qr.physicalPrintScan},null,2));
process.exitCode=failures.length?1:0;
