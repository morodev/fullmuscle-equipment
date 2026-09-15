import { actions } from 'astro:actions';
import { useEffect, useMemo, useState, type SubmitEvent } from 'react';
import type { CatalogListItem, Locale } from '../../lib/types';
import { route } from '../../lib/site';
import { isProjectType, PROJECT_TYPE_LABELS, PROJECT_TYPE_VALUES, type ProjectType } from '../../lib/project-types';
import { onQuoteChange, readQuote, removeFromQuote, writeQuote, type QuoteItem } from '../../lib/quote-store';

type QuoteProduct = Pick<CatalogListItem, 'sku' | 'name' | 'href' | 'image'>;

interface Props { locale: Locale; products: QuoteProduct[]; turnstileSiteKey?: string }

export default function QuoteForm({ locale, products, turnstileSiteKey = '' }: Props) {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('gym');
  const productMap = useMemo(() => new Map(products.map((product) => [product.sku, product])), [products]);
  const isIt = locale === 'it';

  useEffect(() => {
    const sync = () => setItems(readQuote());
    sync();
    return onQuoteChange(sync);
  }, []);

  useEffect(() => {
    const requestedProject = new URLSearchParams(window.location.search).get('project');
    if (isProjectType(requestedProject)) setProjectType(requestedProject);
  }, []);

  useEffect(() => {
    if (!turnstileSiteKey || document.querySelector('script[data-turnstile]')) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = 'true';
    document.head.appendChild(script);
  }, [turnstileSiteKey]);

  function updateQuantity(sku: string, quantity: number) {
    const next = items.map((item) => item.sku === sku ? { ...item, quantity: Math.min(99, Math.max(1, quantity || 1)) } : item);
    writeQuote(next);
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const message = String(form.get('message') || '').trim();
    if (!items.length && message.length < 20) {
      setError(isIt ? 'Descrivi il progetto con almeno 20 caratteri.' : 'Describe your project using at least 20 characters.');
      return;
    }
    setSubmitting(true);
    if (form.get('privacy') !== 'on') {
      setError(isIt ? 'Devi accettare l’informativa privacy.' : 'You must accept the privacy notice.');
      setSubmitting(false);
      return;
    }
    const { error: actionError } = await actions.submitQuote({
      locale,
      firstName: String(form.get('firstName') || ''),
      lastName: String(form.get('lastName') || ''),
      email: String(form.get('email') || ''),
      phone: String(form.get('phone') || '') || undefined,
      company: String(form.get('company') || '') || undefined,
      country: String(form.get('country') || ''),
      customerType: String(form.get('customerType') || 'other') as ProjectType,
      message: message || undefined,
      items,
      privacyAcknowledged: true,
      website: String(form.get('website') || ''),
      turnstileToken: String(form.get('cf-turnstile-response') || '') || undefined,
    });
    if (actionError) {
      setError(isIt ? 'Non è stato possibile inviare la richiesta. Controlla i campi e riprova.' : 'We could not send your request. Check the fields and try again.');
      setSubmitting(false);
      return;
    }
    writeQuote([]);
    window.location.assign(route(locale).confirmation);
  }

  return (
    <form className="quote-layout" onSubmit={submit}>
      <section className="quote-products" aria-labelledby="selected-products">
        {items.length ? <>
          <div className="quote-heading"><div><span>{isIt ? '01 · Selezione' : '01 · Selection'}</span><h2 id="selected-products">{isIt ? 'Attrezzature richieste' : 'Selected equipment'}</h2></div><strong>{items.length}</strong></div>
          <div className="quote-list">
            {items.map((item) => {
              const product = productMap.get(item.sku);
              if (!product) return null;
              return <article className="quote-item" key={item.sku}>
                <img src={product.image} alt="" width="110" height="110" />
                <div><span>{item.sku}</span><h3><a href={product.href}>{product.name}</a></h3><button type="button" onClick={() => removeFromQuote(item.sku)}>{isIt ? 'Rimuovi' : 'Remove'}</button></div>
                <label><span>{isIt ? 'Quantità' : 'Quantity'}</span><input type="number" min="1" max="99" value={item.quantity} onChange={(event) => updateQuantity(item.sku, Number(event.target.value))} /></label>
              </article>;
            })}
          </div>
        </> : <div className="quote-empty-selection">
          <span>{isIt ? '01 · Il progetto' : '01 · Your project'}</span>
          <h2 id="selected-products">{isIt ? 'Puoi iniziare anche senza una lista di prodotti.' : 'You can start without a product list.'}</h2>
          <p>{isIt ? 'Indica il tipo di struttura e raccontaci spazi, tempi e obiettivi. Potrai definire le attrezzature insieme a noi.' : 'Choose the facility type and tell us about the space, timeline and goals. The equipment selection can follow.'}</p>
          <a className="text-link" href={route(locale).catalog}>{isIt ? 'Preferisci scegliere prima i prodotti?' : 'Would you rather choose products first?'} →</a>
        </div>}
      </section>
      <section className="quote-contact" aria-labelledby="contact-details">
        <div className="quote-heading"><div><span>{isIt ? '02 · Contatto' : '02 · Contact'}</span><h2 id="contact-details">{isIt ? 'Parliamo del progetto' : 'Tell us about your project'}</h2></div></div>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="firstName">{isIt ? 'Nome' : 'First name'} *</label><input id="firstName" name="firstName" autoComplete="given-name" required minLength={2} maxLength={80} /></div>
          <div className="form-field"><label htmlFor="lastName">{isIt ? 'Cognome' : 'Last name'} *</label><input id="lastName" name="lastName" autoComplete="family-name" required minLength={2} maxLength={80} /></div>
          <div className="form-field"><label htmlFor="email">Email *</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={160} /></div>
          <div className="form-field"><label htmlFor="phone">{isIt ? 'Telefono' : 'Phone'}</label><input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40} /></div>
          <div className="form-field"><label htmlFor="company">{isIt ? 'Azienda o struttura' : 'Company or facility'}</label><input id="company" name="company" autoComplete="organization" maxLength={120} /></div>
          <div className="form-field"><label htmlFor="country">{isIt ? 'Paese' : 'Country'} *</label><input id="country" name="country" autoComplete="country-name" required maxLength={80} /></div>
          <div className="form-field full"><label htmlFor="customerType">{isIt ? 'Tipo di progetto' : 'Project type'} *</label><select id="customerType" name="customerType" required value={projectType} onChange={(event) => setProjectType(event.target.value as ProjectType)}>{PROJECT_TYPE_VALUES.map((value) => <option key={value} value={value}>{PROJECT_TYPE_LABELS[value][locale]}</option>)}</select></div>
          <div className="form-field full"><label htmlFor="message">{isIt ? 'Messaggio' : 'Message'} {!items.length && '*'}</label><textarea id="message" name="message" required={!items.length} minLength={items.length ? undefined : 20} maxLength={2000} placeholder={isIt ? 'Dimensioni dello spazio, tempi, obiettivi…' : 'Space, timeline, goals…'} /></div>
          <div className="honeypot" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
          <label className="privacy full"><input type="checkbox" name="privacy" required /> <span>{isIt ? 'Ho letto l’informativa privacy e autorizzo il trattamento dei dati per ricevere risposta alla richiesta.' : 'I have read the privacy notice and agree to the processing of my data to receive a response.'} <a href={route(locale).privacy}>Privacy</a></span></label>
          {turnstileSiteKey && <div className="cf-turnstile full" data-sitekey={turnstileSiteKey}></div>}
          {error && <p className="submit-error full" role="alert">{error}</p>}
          <button className="button button-dark full" type="submit" disabled={submitting}>{submitting ? (isIt ? 'Invio in corso…' : 'Sending…') : (isIt ? 'Invia richiesta di preventivo' : 'Send quote request')}</button>
        </div>
      </section>
      <style>{`
        .quote-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);gap:1rem;align-items:start}.quote-products,.quote-contact{border:1px solid #dce2dc;border-radius:1.5rem;padding:clamp(1.2rem,3vw,2rem);background:#fff}.quote-contact{position:sticky;top:6rem}.quote-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.5rem}.quote-heading span,.quote-empty-selection>span{color:#347a1b;font-size:.7rem;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.quote-heading h2{margin:.25rem 0 0;font-size:clamp(1.5rem,3vw,2.2rem);letter-spacing:-.04em}.quote-heading>strong{display:grid;width:2.6rem;height:2.6rem;place-items:center;border-radius:50%;background:#69be28}.quote-empty-selection{display:flex;min-height:25rem;align-items:flex-start;flex-direction:column;justify-content:center}.quote-empty-selection h2{max-width:16ch;margin:.65rem 0 1rem;font-size:clamp(2rem,4vw,3.5rem);letter-spacing:-.05em;line-height:1}.quote-empty-selection p{max-width:48ch;color:#657067}.quote-empty-selection .text-link{margin-top:1rem}.quote-list{display:grid;gap:.75rem}.quote-item{display:grid;grid-template-columns:5.5rem 1fr auto;gap:1rem;align-items:center;padding:.75rem;border:1px solid #e1e6e1;border-radius:1rem}.quote-item img{width:5.5rem;height:5.5rem;object-fit:contain;border-radius:.65rem;background:#eef1ee}.quote-item div>span{color:#657067;font-size:.67rem;font-weight:800;letter-spacing:.08em}.quote-item h3{margin:.2rem 0;font-size:.95rem;line-height:1.2}.quote-item button{border:0;padding:0;background:transparent;color:#9a2727;font-size:.72rem;text-decoration:underline}.quote-item label{display:grid;gap:.25rem;color:#657067;font-size:.65rem}.quote-item input{width:4.5rem;min-height:2.6rem;border:1px solid #cbd3cc;border-radius:.65rem;padding:.4rem;text-align:center}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.full{grid-column:1/-1}.privacy{display:flex;align-items:flex-start;gap:.65rem;font-size:.78rem;line-height:1.4}.privacy input{flex:none;margin-top:.2rem}.privacy a{text-decoration:underline}.honeypot{position:absolute;left:-9999px}.submit-error{margin:0;color:#a62121;font-size:.82rem}.form-grid .button{width:100%}
        @media(max-width:900px){.quote-layout{grid-template-columns:1fr}.quote-contact{position:static}}@media(max-width:560px){.form-grid{grid-template-columns:1fr}.quote-item{grid-template-columns:4.5rem 1fr}.quote-item img{width:4.5rem;height:4.5rem}.quote-item label{grid-column:2}.quote-products,.quote-contact{padding:1rem}}
      `}</style>
    </form>
  );
}
