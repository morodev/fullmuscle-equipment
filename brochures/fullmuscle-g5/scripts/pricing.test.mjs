import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildPriceMap, buildRetailCsv, calculateBasePrice, calculateListPrice, formatListPrice, validateCatalogPrices } from '../content/pricing.mjs';

const load = async relative => JSON.parse(await readFile(new URL(relative, import.meta.url), 'utf8'));
const config = await load('../content/pricing-config.json');
const snapshot = await load('../content/purchase-prices.json');
const catalog = await load('../content/catalog.json');

test('conserva il prezzo base originale e il suo arrotondamento all’euro', () => {
  assert.equal(calculateBasePrice(398, config), 1187);
  assert.equal(calculateBasePrice(602, config), 1662);
  // 139 USD is 124.496... EUR: rounding the purchase to euros would incorrectly yield 582.
  assert.equal(calculateBasePrice(139, config), 584);
  const half = { ...config, exchangeRate: { ...config.exchangeRate, usdPerEur: 2 }, surchargeEur: 0, multiplier: 1 };
  assert.equal(calculateBasePrice(5, half), 3);
});

test('calcola il listino pieno dal prezzo base intero diviso per 0,65', () => {
  assert.equal(config.commercialDiscountRate, 0.35);
  assert.equal(calculateListPrice(398, config), 1826);
  assert.equal(calculateListPrice(602, config), 2557);
  assert.equal(calculateListPrice(139, config), 898);
  assert.equal(calculateListPrice(2029, config), 7669);
  assert.equal(calculateListPrice(398, { ...config, commercialDiscountRate: 0 }), 1187);
  // The base rounds to 3 euros; 3 / 0.4 = 7.5 must round up to 8.
  const half = { ...config, exchangeRate: { ...config.exchangeRate, usdPerEur: 2 }, surchargeEur: 0, multiplier: 1, commercialDiscountRate: 0.6 };
  assert.equal(calculateListPrice(5, half), 8);
});

test('blocca prezzi e parametri non validi', () => {
  for (const price of [0, -1, NaN, Infinity, '398', null]) assert.throws(() => calculateListPrice(price, config));
  assert.throws(() => calculateListPrice(398, { ...config, exchangeRate: { ...config.exchangeRate, usdPerEur: 0 } }));
  assert.throws(() => calculateListPrice(398, { ...config, multiplier: -2.6 }));
  assert.throws(() => calculateListPrice(398, { ...config, vatIncluded: true }));
  for (const discount of [undefined, null, '0.35', NaN, Infinity, -0.01, 1, 1.35]) {
    assert.throws(() => calculateListPrice(398, { ...config, commercialDiscountRate: discount }));
  }
});

test('mantiene codici originali e applica solo i due alias verificati', () => {
  const result = buildPriceMap([{ sourceSku: 'G-45' }, { sourceSku: 'GC-5017' }], snapshot, config);
  assert.equal(result.get('G-45'), calculateListPrice(670, config));
  assert.equal(result.get('GC-5017'), calculateListPrice(558, config));
  assert.equal(snapshot.rows.find(row => row.sourceSku === 'G45').row, 50);
  assert.equal(snapshot.rows.find(row => row.sourceSku === 'GC-5017-1').row, 56);
  assert.throws(() => buildPriceMap([{ sourceSku: 'GC-UNKNOWN' }], snapshot, config), /Prezzo mancante/);
});

test('rifiuta duplicati, prezzi mancanti e alias ambigui', () => {
  const first = snapshot.rows[0];
  assert.throws(() => buildPriceMap([], { ...snapshot, rows: [...snapshot.rows, first] }, config), /duplicato/);
  assert.throws(() => buildPriceMap([{ sourceSku: first.sourceSku }, { sourceSku: first.sourceSku }], snapshot, config), /duplicato/);
  assert.throws(() => buildPriceMap([{ sourceSku: first.sourceSku }], { ...snapshot, rows: snapshot.rows.slice(1) }, config), /mancante/);
  assert.throws(() => buildPriceMap([{ sourceSku: 'G-45' }], { ...snapshot, rows: [...snapshot.rows, { ...first, sourceSku: 'G-45' }] }, config), /ambiguo/);
  assert.throws(() => buildPriceMap([], { ...snapshot, rows: [{ ...first, amountUsd: 0 }] }, config), /positivo/);
  assert.throws(() => buildPriceMap([], { ...snapshot, rows: [{ ...first, currency: 'EUR' }] }, config), /non valida/);
});

test('copre esattamente i 105 prodotti e riconosce un catalogo con prezzi obsoleti', () => {
  assert.equal(snapshot.rows.length, 127);
  assert.equal(catalog.products.length, 105);
  assert.equal(validateCatalogPrices(catalog.products, snapshot, config).size, 105);
  const stale = catalog.products.map((product, index) => index ? product : { ...product, listPriceEur: product.listPriceEur + 1 });
  assert.throws(() => validateCatalogPrices(stale, snapshot, config), /non aggiornato/);
});

test('lo sconto del 35% recupera il prezzo base all’euro per tutti i 105 prodotti', () => {
  const purchases = new Map(snapshot.rows.map(row => [row.sourceSku, row.amountUsd]));
  assert.equal(catalog.products.length, 105);
  for (const product of catalog.products) {
    const sourceSku = config.aliases[product.sourceSku]?.sourceSku || product.sourceSku;
    const basePrice = calculateBasePrice(purchases.get(sourceSku), config);
    assert.equal(Math.round(product.listPriceEur * 0.65), basePrice, product.sku);
  }
});

test('rigenerare il listino non applica aumenti cumulativi ai prezzi già presenti', () => {
  const purchases = new Map(snapshot.rows.map(row => [row.sourceSku, row.amountUsd]));
  const previousProducts = catalog.products.map(product => {
    const sourceSku = config.aliases[product.sourceSku]?.sourceSku || product.sourceSku;
    return { ...product, listPriceEur: calculateBasePrice(purchases.get(sourceSku), config) };
  });
  const first = buildPriceMap(previousProducts, snapshot, config);
  const regenerated = previousProducts.map(product => ({ ...product, listPriceEur: first.get(product.sourceSku) }));
  assert.deepEqual(buildPriceMap(regenerated, snapshot, config), first);
  assert.deepEqual(buildPriceMap(regenerated.map(product => ({ ...product, listPriceEur: 999999 })), snapshot, config), first);
  assert.equal(first.get('GC-5001'), 1826);
});

test('lo snapshot corrisponde al file Excel di acquisto', async () => {
  const bytes = await readFile(new URL(`../../../${snapshot.source.filename}`, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), snapshot.source.sha256);
  assert.equal(snapshot.source.currency, 'USD');
});

test('mostra il prezzo italiano con IVA esclusa', () => {
  assert.equal(formatListPrice(1187), 'Prezzo di listino 1.187 € + IVA');
  assert.equal(formatListPrice(325), 'Prezzo di listino 325 € + IVA');
  assert.throws(() => formatListPrice(1186.82));
  assert.throws(() => formatListPrice(0));
});

test('il CSV contiene solo dati commerciali, 105 prezzi e intestazione, leggibile in Excel', async () => {
  const csv = buildRetailCsv(catalog.products);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.equal(csv.trimEnd().split('\r\n').length, 106);
  assert.match(csv, /"FM-GC-5001";"[^"]+";"1826";"EUR";"esclusa"/);
  assert.doesNotMatch(csv, /USD|FOB|TZFIT|amountUsd|surcharge|multiplier|1\.1165|scont|35\s*%|discount|basePrice/i);
  assert.equal(csv, await readFile(new URL('../exports/listino-rivendita.csv', import.meta.url), 'utf8'));
  assert.match(buildRetailCsv([{ sku: 'FM-TEST', name: 'Panca; "Speciale"', listPriceEur: 100 }]), /"Panca; ""Speciale"""/);
});
