const euroInteger = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, useGrouping: 'always' });

function positiveNumber(value, label, allowZero = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
    throw new Error(`${label}: valore numerico ${allowZero ? 'non negativo' : 'positivo'} richiesto.`);
  }
}

// Keep decimal inputs exact between the two approved whole-euro rounding steps.
function fraction(value) {
  const [coefficient, exponentText = '0'] = String(value).toLowerCase().split('e');
  const [whole, decimals = ''] = coefficient.split('.');
  const scale = decimals.length - Number(exponentText);
  const numerator = BigInt(whole + decimals);
  return scale >= 0 ? [numerator, 10n ** BigInt(scale)] : [numerator * 10n ** BigInt(-scale), 1n];
}

export function validatePricingConfig(config) {
  if (config?.currency !== 'EUR' || config.vatIncluded !== false ||
      config.exchangeRate?.baseCurrency !== 'EUR' || config.exchangeRate.quoteCurrency !== 'USD' ||
      config.rounding !== 'nearest-euro-half-up') {
    throw new Error('Configurazione prezzi: richiesti USD/EUR, IVA esclusa e arrotondamento finale all’euro.');
  }
  positiveNumber(config.exchangeRate.usdPerEur, 'Cambio USD per EUR');
  positiveNumber(config.surchargeEur, 'Maggiorazione EUR', true);
  positiveNumber(config.multiplier, 'Moltiplicatore');
  positiveNumber(config.commercialDiscountRate, 'Sconto commerciale', true);
  if (config.commercialDiscountRate >= 1) throw new Error('Sconto commerciale: deve essere inferiore al 100%.');
}

function roundEuro(numerator, denominator) {
  const result = Number((2n * numerator + denominator) / (2n * denominator));
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error('Prezzo di listino fuori intervallo.');
  return result;
}

export function calculateBasePrice(amountUsd, config) {
  validatePricingConfig(config);
  positiveNumber(amountUsd, 'Prezzo di acquisto USD');
  const [purchase, purchaseScale] = fraction(amountUsd);
  const [rate, rateScale] = fraction(config.exchangeRate.usdPerEur);
  const [surcharge, surchargeScale] = fraction(config.surchargeEur);
  const [multiplier, multiplierScale] = fraction(config.multiplier);
  const numerator = (purchase * rateScale * surchargeScale + surcharge * purchaseScale * rate) * multiplier;
  const denominator = purchaseScale * rate * surchargeScale * multiplierScale;
  return roundEuro(numerator, denominator);
}

export function calculateListPrice(amountUsd, config) {
  // Derive the original rounded price from the purchase cost on every build;
  // never apply the adjustment to a previously generated full list price.
  const basePrice = calculateBasePrice(amountUsd, config);
  const [discount, discountScale] = fraction(config.commercialDiscountRate);
  return roundEuro(BigInt(basePrice) * discountScale, discountScale - discount);
}

export function formatListPrice(value) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Prezzo di listino: euro interi positivi richiesti.');
  return `Prezzo di listino ${euroInteger.format(value)} € + IVA`;
}

export function buildPriceMap(products, snapshot, config) {
  validatePricingConfig(config);
  if (snapshot?.source?.currency !== 'USD' || !Array.isArray(snapshot.rows) || !snapshot.rows.length) {
    throw new Error('Listino di acquisto USD mancante o non valido.');
  }
  const purchases = new Map();
  for (const row of snapshot.rows) {
    if (typeof row.sourceSku !== 'string' || !row.sourceSku.trim() || row.currency !== 'USD' ||
        !Number.isSafeInteger(row.row) || row.row < 1) throw new Error('Riga listino non valida.');
    positiveNumber(row.amountUsd, `Prezzo ${row.sourceSku}`);
    if (purchases.has(row.sourceSku)) throw new Error(`Codice duplicato nel listino: ${row.sourceSku}`);
    purchases.set(row.sourceSku, row);
  }
  const prices = new Map();
  const used = new Set();
  for (const product of products) {
    const sku = product.sourceSku;
    if (typeof sku !== 'string' || !sku.trim()) throw new Error('Codice prodotto mancante.');
    if (prices.has(sku)) throw new Error(`Codice duplicato nel catalogo: ${sku}`);
    const alias = config.aliases?.[sku]?.sourceSku;
    if (alias && purchases.has(sku) && alias !== sku) throw new Error(`Abbinamento prezzo ambiguo: ${sku}`);
    const purchase = purchases.get(alias || sku);
    if (!purchase) throw new Error(`Prezzo mancante per ${sku}${alias ? ` (alias ${alias})` : ''}`);
    if (used.has(purchase.sourceSku)) throw new Error(`Prezzo associato a più prodotti: ${purchase.sourceSku}`);
    used.add(purchase.sourceSku);
    prices.set(sku, calculateListPrice(purchase.amountUsd, config));
  }
  return prices;
}

export function validateCatalogPrices(products, snapshot, config) {
  const prices = buildPriceMap(products, snapshot, config);
  for (const product of products) {
    formatListPrice(product.listPriceEur);
    if (product.listPriceEur !== prices.get(product.sourceSku)) {
      throw new Error(`Prezzo di listino non aggiornato: ${product.sku || product.sourceSku}`);
    }
  }
  return prices;
}

export function buildRetailCsv(products) {
  const quote = value => `"${String(value).replaceAll('"', '""')}"`;
  const rows = [['Codice FullMuscle', 'Prodotto', 'Prezzo di listino EUR', 'Valuta', 'IVA']];
  for (const product of products) {
    formatListPrice(product.listPriceEur);
    rows.push([product.sku, product.name, product.listPriceEur, 'EUR', 'esclusa']);
  }
  return '\uFEFF' + rows.map(row => row.map(quote).join(';')).join('\r\n') + '\r\n';
}
