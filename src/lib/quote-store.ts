import activeSkus from '../../data/catalog-public/active-skus.json';

export interface QuoteItem { sku: string; quantity: number }

const KEY = 'fullmuscle-quote-v1';
const EVENT = 'fullmuscle:quote-change';
const ACTIVE_SKUS = new Set<string>(activeSkus);

function activeItems(value: unknown): QuoteItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is QuoteItem => (
    typeof item === 'object' && item !== null
    && typeof item.sku === 'string' && ACTIVE_SKUS.has(item.sku)
    && Number.isInteger(item.quantity) && item.quantity > 0
  )).slice(0, 50).map(({ sku, quantity }) => ({ sku, quantity }));
}

export function readQuote(): QuoteItem[] {
  if (typeof window === 'undefined') return [];
  let stored: string | null;
  let value: unknown;
  try {
    stored = window.localStorage.getItem(KEY);
    value = JSON.parse(stored || '[]');
  } catch {
    return [];
  }
  const items = activeItems(value);
  const cleaned = JSON.stringify(items);
  if (stored !== null && stored !== cleaned) {
    try {
      // Read-time migration must not trigger quote listeners recursively.
      window.localStorage.setItem(KEY, cleaned);
    } catch {
      // A failed cleanup must not hide the valid selection already read.
    }
  }
  return items;
}

export function writeQuote(items: QuoteItem[]): void {
  const selection = activeItems(items);
  window.localStorage.setItem(KEY, JSON.stringify(selection));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: selection }));
}

export function addToQuote(sku: string): void {
  if (!ACTIVE_SKUS.has(sku)) return;
  const items = readQuote();
  const existing = items.find((item) => item.sku === sku);
  if (existing) existing.quantity = Math.min(existing.quantity + 1, 99);
  else if (items.length < 50) items.push({ sku, quantity: 1 });
  writeQuote(items);
}

export function removeFromQuote(sku: string): void {
  writeQuote(readQuote().filter((item) => item.sku !== sku));
}

export function quoteQuantity(): number {
  return readQuote().reduce((total, item) => total + item.quantity, 0);
}

export function onQuoteChange(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
