# Checklist lancio SEO

Queste attività completano la parte esterna al codice. Il sito resta intenzionalmente in `noindex` finché i dati definitivi non sono stati configurati e la build `release` non è riuscita.

## Stato verificato il 7 novembre 2026

- [x] Homepage orientata a nuove aperture, rinnovi e forniture complete; richiesta di progetto palestra disponibile anche senza prodotti selezionati.
- [x] Catalogo completo nel repository: 754 immagini Full Muscle revisionate e integrate per 744 prodotti, nessun elemento della coda in attesa. Originali, prompt e QA conservati; stato degli asset `approved-provisional`.
- [x] Catalogo completo pubblicato, commit `281355b`: otto schede campione dell'ultimo rilascio e i relativi file immagine rispondono 200 con gli asset aggiornati ([verifica online](../data/site-audits/2026-11-07-branding-release-9.json)).
- [x] Dominio principale HTTPS disponibile; HTTP → HTTPS risponde 301 e conserva percorso e query.
- [x] Sitemap con 1.755 URL unici, 744 schede prodotto per lingua, senza privacy/richiesta/conferma.
- [x] Canonical e collegamenti tra lingue presenti nelle pagine campione; URL inesistente restituisce 404.
- [ ] Indicizzazione: `robots.txt` risponde ancora `Disallow: /` e le pagine commerciali sono `noindex,nofollow`.
- [ ] `https://www.fullmuscle-equipment.com/it/` risponde 200; manca il redirect 301 al dominio senza `www`.
- [ ] Dati aziendali e privacy definitivi: il titolare deve confermarli; il testo pubblico contiene ancora la nota di bozza.
- [ ] Turnstile: la chiave pubblica non è presente nella pagina richiesta. Segreto e verifica server vanno controllati nella configurazione privata.
- [ ] Email: nessun invio reale di collaudo effettuato in questo audit; destinatario e ricezione vanno confermati.
- [ ] Search Console: nessun account autenticato disponibile nel browser di lavoro; proprietà, verifica DNS e sitemap inviata restano da controllare.
- [x] Prestazioni mobili sul sito pubblicato: Lighthouse 13.6.0, homepage 100/100 e catalogo 100/100; CLS 0 su entrambi. Accessibilità rispettivamente 100/100 e 96/100. Misure di laboratorio del 7 novembre, non dati sul campo.
- [x] Homepage e menu verificati su Chrome a 390 e 1.440 px; richiesta di fornitura completa con progetto palestra preselezionato. Nessun invio reale durante il controllo.
- [ ] Rich Results Test e Profilo dell'attività Google: verifiche da completare con dati definitivi.

Risultati osservabili e campioni delle pubblicazioni progressive delle immagini: [`data/site-audits/`](../data/site-audits/). Il punteggio SEO Lighthouse resta 69/100 per il blocco intenzionale dell'indicizzazione; non misura la presenza effettiva in Google.

Il completamento del catalogo e il lancio SEO sono verifiche distinte. Le immagini sono state sostituite conservando URL e SKU; nessuna configurazione va segnata completata soltanto perché è presente il relativo codice.

La build finale del catalogo ha superato i 10 controlli di output. Il [rapporto di integrità](../data/site-audits/2026-11-07-catalog-branding-integrity.json) registra zero errori su tutte le 754 immagini: hash delle fonti e dei WebP, dimensioni, associazioni ai prodotti ed esclusione degli elementi in quarantena. Questo controllo tecnico integra la revisione visiva dei singoli lotti e non certifica l'attivazione dei servizi esterni.

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
- verificare dopo il deploy che `/` mostri direttamente la homepage italiana e `/en/` quella inglese, entrambe con risposta 200;
- verificare HTTP 301 da `/it` e `/it/` a `/`, con query conservata, e accesso invariato alle pagine interne `/it/...`;
- verificare canonical, alternates reciproci e `x-default` delle homepage, con `/` presente una sola volta nella sitemap e `/it/` esclusa;
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
- per future aggiunte o sostituzioni, applicare la stessa revisione delle immagini Full Muscle mantenendo SKU e URL delle schede; registrare l'origine delle elaborazioni senza classificarle come originali OEM;
- pubblicare casi reali nella futura sezione Progetti solo quando sono disponibili fotografie, contesto e risultati verificabili;
- valutare i risultati SEO su periodi di 30, 60 e 90 giorni: il posizionamento dipende anche da autorevolezza, concorrenza e contenuti successivi al lancio.

La sitemap aiuta la scoperta delle pagine ma non garantisce indicizzazione o posizionamento. Un URL bloccato in `robots.txt` non permette a Google di leggere il suo `noindex`: la combinazione attuale è una configurazione di anteprima, non una prova di assenza assoluta dai risultati. Riferimenti: [sitemap Google](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [noindex Google](https://developers.google.com/search/docs/crawling-indexing/block-indexing), [LocalBusiness e orari](https://developers.google.com/search/docs/appearance/structured-data/local-business).
