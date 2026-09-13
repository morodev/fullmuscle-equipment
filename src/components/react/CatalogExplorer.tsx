import { useEffect, useMemo, useState } from 'react';
import type { CatalogListItem, Locale } from '../../lib/types';
import { ui } from '../../lib/i18n';
import AddToQuote from './AddToQuote';

interface Option { id: string; name: string }
interface Props {
  products: CatalogListItem[];
  categories: Option[];
  lines: Option[];
  locale: Locale;
  initialCategory?: string;
  initialLine?: string;
}
const PAGE_SIZE = 24;

export default function CatalogExplorer({ products, categories, lines, locale, initialCategory = '', initialLine = '' }: Props) {
  const t = ui(locale);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [line, setLine] = useState(initialLine);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return products.filter((product) => {
      if (category && product.categoryId !== category) return false;
      if (line && product.lineId !== line) return false;
      return !needle || `${product.name} ${product.sku} ${product.categoryName} ${product.lineName ?? ''}`.toLocaleLowerCase(locale).includes(needle);
    });
  }, [products, query, category, line, locale]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [query, category, line]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <div className="catalog-explorer">
      <div className="catalog-toolbar" aria-label={locale === 'it' ? 'Filtri catalogo' : 'Catalogue filters'}>
        <label className="search-control">
          <span className="visually-hidden">{t.search}</span>
          <input className="catalog-control" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
        </label>
        <label>
          <span className="visually-hidden">{t.allCategories}</span>
          <select className="catalog-control" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">{t.allCategories}</option>
            {categories.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>
        <label>
          <span className="visually-hidden">{t.allLines}</span>
          <select className="catalog-control" value={line} onChange={(event) => setLine(event.target.value)}>
            <option value="">{t.allLines}</option>
            {lines.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>
      </div>
      <div className="catalog-result-meta" aria-live="polite"><strong>{filtered.length}</strong> {t.results}</div>
      {visible.length ? (
        <div className="catalog-product-grid">
          {visible.map((product, index) => (
            <article className="product-card" key={product.sku} data-pagefind-ignore>
              <a className="product-card-media" href={product.href}>
                <img src={product.image} alt={product.name} width="600" height="600" loading={index < 4 ? 'eager' : 'lazy'} />
              </a>
              <div className="product-card-body">
                <div className="product-meta"><span>{product.categoryName}</span><span>{product.sku}</span></div>
                <h2><a href={product.href}>{product.name}</a></h2>
                <p>{product.summary}</p>
                <div className="product-card-actions">
                  <a className="text-link" href={product.href}>{t.viewProduct} →</a>
                  <AddToQuote sku={product.sku} label={t.add} addedLabel={t.added} />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : <p className="empty-state">{t.noResults}</p>}
      {pageCount > 1 && (
        <nav className="pagination" aria-label={locale === 'it' ? 'Paginazione prodotti' : 'Product pagination'}>
          <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>← {t.previous}</button>
          <span>{page} / {pageCount}</span>
          <button type="button" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>{t.next} →</button>
        </nav>
      )}
      <style>{`
        .catalog-toolbar{position:sticky;z-index:10;top:5.75rem;display:grid;grid-template-columns:2fr 1fr 1fr;gap:.75rem;margin-bottom:1.25rem;padding:.85rem;border:1px solid #dce2dc;border-radius:1rem;background:rgba(245,247,244,.94);box-shadow:0 12px 35px rgba(9,12,10,.07);backdrop-filter:blur(12px)}
        .search-control{position:relative}.catalog-result-meta{margin:0 0 1.25rem;color:#657067;font-size:.85rem}.catalog-result-meta strong{color:#090c0a;font-size:1.1rem}.catalog-product-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.empty-state{padding:4rem 1rem;border:1px dashed #bdc6be;border-radius:1.25rem;text-align:center}.pagination{display:flex;align-items:center;justify-content:center;gap:1rem;margin-top:2.5rem}.pagination button{min-height:2.8rem;border:1px solid #cad2cb;border-radius:999px;padding:.6rem 1rem;background:#fff;font-weight:750}.pagination button:disabled{cursor:not-allowed;opacity:.35}.pagination span{font-size:.8rem;font-weight:800}.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
        @media(max-width:900px){.catalog-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.catalog-toolbar{grid-template-columns:1fr 1fr}.search-control{grid-column:1/-1}}
        @media(max-width:620px){.catalog-product-grid{grid-template-columns:1fr}.catalog-toolbar{position:static;grid-template-columns:1fr}.search-control{grid-column:auto}.pagination button{font-size:.76rem}}
      `}</style>
    </div>
  );
}
