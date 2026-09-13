# Checklist lancio SEO

Queste attività completano la parte esterna al codice. Il sito resta intenzionalmente in `noindex` finché i dati definitivi non sono stati configurati e la build `release` non è riuscita.

## Dominio e pubblicazione

- registrare e collegare `fullmuscle-equipment.com` all’hosting;
- collegare anche `fullmuscle-equipment.it` allo stesso servizio, così il server può applicare il redirect 301;
- configurare i certificati HTTPS per `.com`, `www` e `.it`;
- compilare `.env` con ragione sociale, partita IVA, indirizzo completo, città, email, telefono e orari showroom;
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
- sostituire le immagini provvisorie con gli asset OEM tramite SKU, mantenendo invariati gli URL;
- pubblicare casi reali nella futura sezione Progetti solo quando sono disponibili fotografie, contesto e risultati verificabili;
- valutare i risultati SEO su periodi di 30, 60 e 90 giorni: il posizionamento dipende anche da autorevolezza, concorrenza e contenuti successivi al lancio.
