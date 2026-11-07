# Checklist lancio SEO

Queste attività completano la parte esterna al codice. Il sito resta intenzionalmente in `noindex` finché i dati definitivi non sono stati configurati e la build `release` non è riuscita.

## Stato verificato il 7 novembre 2026

- [x] Dominio principale HTTPS disponibile; HTTP → HTTPS risponde 301 e conserva percorso e query.
- [x] Sitemap con 1.755 URL unici, 744 schede prodotto per lingua, senza privacy/richiesta/conferma.
- [x] Canonical e collegamenti tra lingue presenti nelle pagine campione; URL inesistente restituisce 404.
- [ ] Indicizzazione: `robots.txt` risponde ancora `Disallow: /` e le pagine commerciali sono `noindex,nofollow`.
- [ ] `https://www.fullmuscle-equipment.com/it/` risponde 200; manca il redirect 301 al dominio senza `www`.
- [ ] Dati aziendali e privacy definitivi: il titolare deve confermarli; il testo pubblico contiene ancora la nota di bozza.
- [ ] Turnstile: la chiave pubblica non è presente nella pagina richiesta. Segreto e verifica server vanno controllati nella configurazione privata.
- [ ] Email: nessun invio reale di collaudo effettuato in questo audit; destinatario e ricezione vanno confermati.
- [ ] Search Console: nessun account autenticato disponibile nel browser di lavoro; proprietà, verifica DNS e sitemap inviata restano da controllare.
- [ ] Rich Results Test, prestazioni mobili e Profilo dell'attività Google: verifiche da completare con dati definitivi.

Il censimento del catalogo e il lancio SEO sono verifiche distinte: le immagini possono essere sostituite progressivamente, conservando URL e SKU. Nessuna configurazione va segnata completata soltanto perché è presente il relativo codice.

Ripetere l'audit pubblico, senza inviare form né cambiare impostazioni:

```bash
node scripts/site/audit-live-seo.mjs
```

Il rapporto distingue metadati e risposte HTTP osservabili dalle verifiche che richiedono accesso agli account. Il comando non certifica ricezione email, proprietà Search Console o assenza di vulnerabilità Hostinger.

## Dominio e pubblicazione

- collegare `fullmuscle-equipment.com` all’hosting;
- collegare `www.fullmuscle-equipment.com` in Hostinger e configurare il redirect 301 verso il dominio senza `www`;
- configurare il certificato HTTPS per `.com` e `www`;
- se in futuro verrà acquistato `fullmuscle-equipment.it`, collegarlo in Hostinger e configurare un redirect 301 verso `https://fullmuscle-equipment.com`;
- compilare `.env` con ragione sociale, partita IVA, indirizzo completo, città, email, telefono e orari showroom;
- usare orari interpretabili senza ambiguità, ad esempio `Lun-Ven 09:00-13:00,14:00-18:00; Sab 09:00-12:00`; il testo resta visibile e genera `OpeningHoursSpecification`;
- completare la privacy in italiano e inglese sulla base dei dati e dei trattamenti reali; la build di rilascio blocca la nota di bozza;
- configurare Turnstile e SMTP, quindi collaudare una richiesta concordata con e senza prodotti su una casella interna;
- impostare `PUBLIC_SITE_READY=true` ed eseguire `npm run build:release`;
- verificare su produzione canonical, redirect, `robots.txt` e `sitemap-index.xml`.

## Google

- creare una proprietà Dominio in Google Search Console e completare la verifica DNS;
- inviare `https://fullmuscle-equipment.com/sitemap-index.xml`;
- controllare un campione di homepage, categoria, guida e scheda prodotto con Controllo URL;
- creare o aggiornare il Profilo dell’attività su Google con gli stessi dati della pagina showroom;
- collegare il sito e aggiungere fotografie reali della sede, mantenendo coerenti nome, indirizzo, telefono e orari.

## Dopo il lancio

- controllare ogni settimana pagine indicizzate, errori di scansione, query, clic e Core Web Vitals;
- migliorare prima le pagine che ricevono impressioni ma pochi clic;
- continuare i lotti di immagini Full Muscle revisionate, mantenendo SKU e URL delle schede; registrare l'origine delle elaborazioni senza classificarle come originali OEM;
- pubblicare casi reali nella futura sezione Progetti solo quando sono disponibili fotografie, contesto e risultati verificabili;
- valutare i risultati SEO su periodi di 30, 60 e 90 giorni: il posizionamento dipende anche da autorevolezza, concorrenza e contenuti successivi al lancio.

La sitemap aiuta la scoperta delle pagine ma non garantisce indicizzazione o posizionamento. Un URL bloccato in `robots.txt` non permette a Google di leggere il suo `noindex`: la combinazione attuale è una configurazione di anteprima, non una prova di assenza assoluta dai risultati. Riferimenti: [sitemap Google](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [noindex Google](https://developers.google.com/search/docs/crawling-indexing/block-indexing), [LocalBusiness e orari](https://developers.google.com/search/docs/appearance/structured-data/local-business).
