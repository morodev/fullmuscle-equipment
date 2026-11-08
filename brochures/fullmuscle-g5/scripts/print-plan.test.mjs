import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {printPages, printSkus, commonTechnicalRows, validatePrintPlan} from '../content/print-plan.mjs';

const catalogue = JSON.parse(await readFile(new URL('../content/catalog.json', import.meta.url), 'utf8'));
const sixModels = () => printPages.find(page => page.skus.length === 6).skus
  .map(sku => structuredClone(catalogue.products.find(product => product.sku === sku)));

test('la stampa contiene 16 pagine e 24 modelli distinti, inclusi gli otto originali', () => {
  assert.doesNotThrow(() => validatePrintPlan(catalogue));
  assert.equal(printPages.length, 16);
  assert.equal(printSkus.length, 24);
  assert.equal(new Set(printSkus).size, 24);
  for (const sku of catalogue.featuredSkus) assert.ok(printSkus.includes(sku), sku);
  assert.equal(printPages.filter(page => page.type === 'featured').length, 6);
  assert.deepEqual(printPages.filter(page => page.type === 'grid').map(page => page.skus.length), [4, 4, 4, 6]);
  assert.equal(printPages.filter(page => page.type === 'scene').length, 2);
});

test('rifiuta un modello non presente nel catalogo e un modello duplicato', () => {
  const unknown = structuredClone(printPages);
  unknown.find(page => page.type === 'featured').skus[0] = 'FM-GC-UNKNOWN';
  assert.throws(() => validatePrintPlan(catalogue, unknown), /Unknown print model/);
  const duplicate = structuredClone(printPages);
  duplicate.find(page => page.type === 'grid').skus[0] = printSkus[0];
  assert.throws(() => validatePrintPlan(catalogue, duplicate), /24 unique models/);
});

test('rifiuta la perdita di uno degli otto modelli originali anche con 24 SKU validi', () => {
  const changed = structuredClone(printPages);
  changed.find(page => page.type === 'featured').skus[0] = 'FM-GC-5099';
  assert.throws(() => validatePrintPlan(catalogue, changed), /Original print model is missing/);
});

test('rifiuta una paginazione diversa o una griglia troppo densa', () => {
  assert.throws(() => validatePrintPlan(catalogue, printPages.slice(1)), /16 pages/);
  const changed = structuredClone(printPages);
  const grids = changed.filter(page => page.type === 'grid');
  grids[0].skus.push(grids[1].skus.pop());
  assert.throws(() => validatePrintPlan(catalogue, changed), /four or six models/);
});

test('la fascia comune della pagina da sei contiene solo tre specifiche identiche', () => {
  const products = sixModels();
  assert.deepEqual(commonTechnicalRows(products), [
    {label: 'Struttura', value: 'Acciaio Q235'},
    {label: 'Tubolare principale', value: '50 × 100 × 2,5 mm'},
    {label: 'Finitura', value: 'Verniciatura a polvere'},
  ]);
  assert.ok(new Set(products.map(product => product.dimensions)).size > 1);
  assert.ok(new Set(products.map(product => product.weight)).size > 1);
});

test('impedisce di attribuire una specifica comune a prodotti con dati diversi o mancanti', () => {
  const changed = sixModels();
  changed[1].technicalRows.find(row => row.label === 'Struttura').value = 'Acciaio diverso';
  assert.throws(() => commonTechnicalRows(changed), /Shared specification differs or is missing: Struttura/);
  const missing = sixModels();
  missing[2].technicalRows = missing[2].technicalRows.filter(row => row.label !== 'Finitura');
  assert.throws(() => commonTechnicalRows(missing), /Shared specification differs or is missing: Finitura/);
  assert.throws(() => commonTechnicalRows([]), /empty selection/);
});
