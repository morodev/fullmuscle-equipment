export interface QuoteItem { sku: string; quantity: number }

const KEY = 'fullmuscle-quote-v1';
const EVENT = 'fullmuscle:quote-change';

export function readQuote(): QuoteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) || '[]') as QuoteItem[];
    return Array.isArray(value)
      ? value.filter((item) => typeof item.sku === 'string' && Number.isInteger(item.quantity) && item.quantity > 0).slice(0, 50)
      : [];
  } catch {
    return [];
  }
}

export function writeQuote(items: QuoteItem[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: items }));
}

export function addToQuote(sku: string): void {
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
