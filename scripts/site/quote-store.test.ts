import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { addToQuote, onQuoteChange, quoteQuantity, readQuote, writeQuote } from '../../src/lib/quote-store';
import { retiredBenches, retiredFreeWeight, retainedFreeWeight, retainedVariants, retainedSmith } from '../../tests/fixtures/bench-selection';

const key = 'fullmuscle-quote-v1';
const valid = { sku: 'FM-GF-001', quantity: 3 };
const retired = { sku: 'FM-X6053', quantity: 2 };

function browserStorage(t: TestContext, initial: unknown, failWrites = false) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let stored = JSON.stringify(initial);
  let writes = 0;
  const browser = Object.assign(new EventTarget(), {
    localStorage: {
      getItem: (name: string) => name === key ? stored : null,
      setItem: (name: string, value: string) => {
        assert.equal(name, key);
        writes += 1;
        if (failWrites) throw new Error('Storage quota unavailable');
        stored = value;
      },
    },
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  });
  return { stored: () => JSON.parse(stored), writes: () => writes };
}

test('la selezione salvata perde solo articoli ritirati o malformati, senza notifiche ricorsive', (t) => {
  const storage = browserStorage(t, [retired, null, valid, { sku: valid.sku, quantity: '4' }]);
  let notifications = 0;
  const unsubscribe = onQuoteChange(() => { notifications += 1; readQuote(); });
  try {
    assert.deepEqual(readQuote(), [valid]);
    assert.deepEqual(storage.stored(), [valid]);
    assert.equal(quoteQuantity(), 3);
    assert.equal(storage.writes(), 1);
    assert.equal(notifications, 0);
  } finally {
    unsubscribe();
  }
});

test('la pulizia conserva i prodotti validi anche quando non può riscrivere localStorage', (t) => {
  browserStorage(t, [retired, valid], true);
  assert.deepEqual(readQuote(), [valid]);
  assert.equal(quoteQuantity(), 3);
});

test('una selezione nulla è riparata e gli articoli ritirati non possono essere riaggiunti', (t) => {
  const storage = browserStorage(t, null);
  assert.deepEqual(readQuote(), []);
  assert.deepEqual(storage.stored(), []);
  writeQuote([retired, valid]);
  assert.deepEqual(storage.stored(), [valid]);
  const writes = storage.writes();
  addToQuote(retired.sku);
  assert.equal(storage.writes(), writes);
  addToQuote(valid.sku);
  assert.deepEqual(readQuote(), [{ ...valid, quantity: 4 }]);
});

test('la nuova selezione tapis roulant conserva la 7100A editoriale e scarta modelli e varianti ritirati', (t) => {
  const current = [{ sku: 'FM-9100A', quantity: 4 }, { sku: 'FM-7100A', quantity: 2 }];
  const storage = browserStorage(t, [
    { sku: 'FM-2000B', quantity: 1 }, current[0],
    { sku: 'FM-3000A', quantity: 3 }, { sku: 'FM-9100P', quantity: 1 }, current[1],
  ]);
  assert.deepEqual(readQuote(), current);
  assert.deepEqual(storage.stored(), current);
  assert.equal(quoteQuantity(), 6);
  addToQuote('FM-2000B');
  assert.deepEqual(readQuote(), current);
  addToQuote('FM-7100A');
  assert.deepEqual(readQuote(), [current[0], { sku: 'FM-7100A', quantity: 3 }]);
});

test('la selezione cardio rimuove tutti i modelli ritirati e mantiene la nuova 7045A', (t) => {
  const retiredCardio = ['FM-2020A', 'FM-2020B', 'FM-7010A', 'FM-7020', 'FM-7038', 'FM-7041A', 'FM-7041B', 'FM-7042', 'FM-L600B', 'FM-L600C', 'FM-N2040A', 'FM-N2040B', 'FM-7015', 'FM-7026', 'FM-SP-20'];
  const current = [{ sku: 'FM-7045A', quantity: 2 }, { sku: 'FM-7043A', quantity: 1 }, { sku: 'FM-7027', quantity: 3 }, { sku: 'FM-7029', quantity: 1 }];
  const storage = browserStorage(t, [...retiredCardio.map((sku) => ({ sku, quantity: 1 })), ...current]);
  assert.deepEqual(readQuote(), current);
  assert.deepEqual(storage.stored(), current);
  assert.equal(quoteQuantity(), 7);
  for (const sku of retiredCardio) addToQuote(sku);
  assert.deepEqual(readQuote(), current);
  addToQuote('FM-7045A');
  assert.deepEqual(readQuote(), [{ sku: 'FM-7045A', quantity: 3 }, ...current.slice(1)]);
});

test('panche e accessori ritirati spariscono dai preventivi mantenendo varianti, Smith e GC', (t) => {
  const retiredItems = [...retiredBenches, ...retiredFreeWeight];
  const current = [...retainedFreeWeight, ...retainedSmith, ...retainedVariants].map((sku, index) => ({ sku, quantity: index % 3 + 1 }));
  const storage = browserStorage(t, [...retiredItems.map((sku) => ({ sku, quantity: 1 })), ...current]);
  assert.deepEqual(readQuote(), current);
  assert.deepEqual(storage.stored(), current);
  assert.equal(quoteQuantity(), current.reduce((total, item) => total + item.quantity, 0));
  const writes = storage.writes();
  for (const sku of retiredItems) addToQuote(sku);
  assert.equal(storage.writes(), writes);
  assert.deepEqual(readQuote(), current);
});
