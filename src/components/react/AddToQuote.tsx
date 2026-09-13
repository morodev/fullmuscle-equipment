import { useEffect, useState } from 'react';
import { addToQuote, onQuoteChange, readQuote } from '../../lib/quote-store';

interface Props { sku: string; label: string; addedLabel: string; className?: string }

export default function AddToQuote({ sku, label, addedLabel, className = '' }: Props) {
  const [added, setAdded] = useState(false);
  useEffect(() => {
    const sync = () => setAdded(readQuote().some((item) => item.sku === sku));
    sync();
    return onQuoteChange(sync);
  }, [sku]);

  return (
    <button
      className={`button button-small ${className}`}
      type="button"
      aria-label={`${label}: ${sku}`}
      onClick={() => {
        addToQuote(sku);
        setAdded(true);
      }}
    >
      {added ? `✓ ${addedLabel}` : `+ ${label}`}
    </button>
  );
}
