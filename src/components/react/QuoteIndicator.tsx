import { useEffect, useState } from 'react';
import type { Locale } from '../../lib/types';
import { route } from '../../lib/site';
import { onQuoteChange, quoteQuantity } from '../../lib/quote-store';

interface Props { locale: Locale; compact?: boolean; floating?: boolean }

export default function QuoteIndicator({ locale, compact = false, floating = false }: Props) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const sync = () => setCount(quoteQuantity());
    sync();
    return onQuoteChange(sync);
  }, []);
  const label = locale === 'it' ? 'La tua richiesta' : 'Your request';

  if (floating) {
    if (!count) return null;
    return <a className="quote-float" href={route(locale).quote}><span>{label}</span><b className="quote-badge">{count}</b></a>;
  }
  return (
    <a className={compact ? 'header-quote' : 'button'} href={route(locale).quote} aria-label={`${label}: ${count}`}>
      <span>{compact ? (locale === 'it' ? 'Preventivo' : 'Quote') : label}</span>
      <b>{count}</b>
      <style>{`.header-quote{display:inline-flex;align-items:center;gap:.55rem;border-radius:999px;padding:.45rem .55rem .45rem .85rem;background:#69be28;color:#090c0a!important;font-size:.76rem!important;font-weight:850!important}.header-quote b{display:grid;min-width:1.8rem;height:1.8rem;place-items:center;border-radius:50%;background:#090c0a;color:#fff;font-size:.72rem}`}</style>
    </a>
  );
}
