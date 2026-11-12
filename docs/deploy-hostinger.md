# Deploy su Hostinger Business

Il sito viene distribuito come applicazione Node.js Astro dal repository privato `morodev/fullmuscle-equipment`, branch `master`. Il dominio canonical è `https://fullmuscle-equipment.com`.

## 1. Collegamento del repository

In hPanel aprire **Websites → Add Website → Deploy Web App → Import Git Repository**, autorizzare GitHub e selezionare il repository e il branch indicati sopra. Prima del collegamento verificare in GitHub che la visibilità del repository sia **Private**.

Usare queste impostazioni:

| Impostazione | Valore |
| --- | --- |
| Runtime | Node.js 24.x |
| Directory progetto | radice del repository |
| Build di anteprima | `npm run build` |
| Comando di avvio, se presente | `npm start` |
| Output directory | `dist` |
| Entry file | `server/entry.mjs` |

Hostinger installa le dipendenze dal `package-lock.json`. Non caricare `node_modules` o `dist` nel repository.

Quando vengono ritirati prodotti o linee, distribuire una build completa sostituendo l'output precedente: non sovrapporre i nuovi file a una vecchia copia di `dist`. Le schede eliminate devono restituire 404 e scomparire anche dall'indice Pagefind, rigenerato da `npm run build`. Eventuali HTML residui continuerebbero a essere serviti come file statici.

## 2. Variabili d’ambiente

Importare in hPanel i nomi presenti in `.env.example`. Non committare un file `.env` e non inserire password nel codice.

```dotenv
PUBLIC_SITE_URL=https://fullmuscle-equipment.com
PUBLIC_SITE_READY=false
PUBLIC_TURNSTILE_SITE_KEY=<site-key>
TURNSTILE_SECRET_KEY=<secret-key>
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<casella-email-completa>
SMTP_PASSWORD=<password-casella>
QUOTE_TO_EMAIL=<destinatario-preventivi>
QUOTE_FROM_EMAIL=<stessa-casella-di-SMTP_USER>
COMPANY_LEGAL_NAME=<ragione-sociale>
COMPANY_VAT=<partita-iva>
COMPANY_ADDRESS=<indirizzo-showroom>
COMPANY_CITY=<città>
COMPANY_EMAIL=<email-pubblica>
COMPANY_PHONE=<telefono-pubblico>
COMPANY_SHOWROOM_HOURS=<esempio: Mo-Fr 09:00-18:00>
COMPANY_SOCIAL_URLS=<URL-ufficiali-separati-da-virgola>
```

Creare in Cloudflare Turnstile un widget per `fullmuscle-equipment.com`. La site key è pubblica; secret key e password SMTP devono esistere soltanto nelle variabili protette di Hostinger.

Gli orari accettano abbreviazioni italiane o inglesi, pause separate da virgola e gruppi di giorni separati da punto e virgola: `Lun-Ven 09:00-13:00,14:00-18:00; Sab 09:00-12:00`. Il testo alimenta sia lo showroom sia gli orari strutturati per i motori di ricerca; descrizioni libere come “da concordare” vanno chiarite prima della release.

## 3. Anteprima non indicizzabile

Al 7 novembre 2026 il sito è già distribuito sul dominio pubblico in questa modalità. Homepage e catalogo sono stati aggiornati; questo non equivale al completamento del rilascio indicizzabile. Stato verificato e attività ancora aperte sono nella [checklist di lancio SEO](./checklist-lancio-seo.md).

Il primo deploy usa `npm run build` e `PUBLIC_SITE_READY=false`. Verificare sul dominio:

- HTTPS valido e risposta `200` su `/` con la homepage italiana completa e su `/en/` con quella inglese;
- risposta HTTP `301` da `/it` e `/it/` verso `/`, anche con parametri: `/it/?project=gym` deve portare a `/?project=gym`;
- cambio lingua dal menu in entrambe le direzioni, canonical e alternates delle homepage su `/` e `/en/`, `x-default` su `/`;
- sitemap con una sola voce per ciascuna homepage canonica, senza la vecchia homepage `/it/`;
- catalogo, paginazione, ricerca, immagini e schede prodotto;
- selezione prodotti e ricezione reale di una richiesta preventivo;
- `https://fullmuscle-equipment.com/robots.txt` con `Disallow: /`;
- meta `noindex,nofollow` nelle pagine;
- canonical sempre sul dominio `.com` senza `www`;
- risposta `301` da HTTP e `www` verso HTTPS senza `www`;
- log runtime e deploy privi di errori.

Configurare in Hostinger i redirect permanenti da HTTP a HTTPS e da `www.fullmuscle-equipment.com` al dominio senza `www`. Se verrà collegato `fullmuscle-equipment.it`, configurare anche il relativo redirect permanente verso il dominio `.com`.

Il redirect del dominio deve conservare percorso e parametri: `https://www.fullmuscle-equipment.com/it/catalogo/?project=gym` deve rispondere 301 con destinazione `https://fullmuscle-equipment.com/it/catalogo/?project=gym`. Il redirect della vecchia homepage `/it/` verso `/` è gestito separatamente dall’applicazione e non riguarda le pagine interne. La sola presenza del canonical non sostituisce il redirect. Il controllo pubblico è ripetibile con `node scripts/site/audit-live-seo.mjs`.

La presenza delle credenziali SMTP e Turnstile consente di collaudare il form anche mentre il sito è in `noindex`.

## 4. Rilascio indicizzabile

Dopo il collaudo modificare le impostazioni Hostinger:

1. impostare `PUBLIC_SITE_READY=true`;
2. cambiare il comando di build in `npm run build:release`;
3. salvare e avviare un nuovo deploy;
4. verificare che `robots.txt` contenga `Allow: /` e il riferimento a `sitemap-index.xml`;
5. verificare che homepage, catalogo, guide e prodotti usino `index,follow,max-image-preview:large`;
6. verificare che privacy, richiesta e conferma rimangano `noindex,follow`;
7. inviare una seconda richiesta preventivo e controllare email e `Reply-To`.

La build `release` si interrompe automaticamente se manca una variabile obbligatoria o se il dominio canonical è diverso da `https://fullmuscle-equipment.com`.

Controlla anche indirizzi email, porta/protocollo SMTP, orari interpretabili e la nota di bozza nella privacy. La validazione precede la generazione del catalogo e carica l'eventuale `.env` locale senza sostituire le variabili già impostate dall'hosting. Non prova la consegna SMTP o l'approvazione dei dati aziendali: queste verifiche restano necessarie prima del rilascio.

Verifica dei controlli di configurazione e degli orari:

```bash
npx tsx --test scripts/site/launch.test.ts
```

Playwright avvia il server su `127.0.0.1` con `NODE_ENV=test` e `FULLMUSCLE_QUOTE_TEST_MODE=true`: soltanto questa combinazione simula la consegna e salta i servizi esterni. Non impostare la modalità test su Hostinger. `PUBLIC_SITE_READY=false` controlla l'indicizzazione e da solo non disattiva l'invio email quando SMTP è configurato. Sul sito distribuito, SMTP o antispam mancanti producono un errore senza confermare falsamente la ricezione della richiesta; la selezione resta nel browser.

## 5. Search Console

Creare una proprietà Dominio `fullmuscle-equipment.com`, completare la verifica DNS e inviare:

```text
https://fullmuscle-equipment.com/sitemap-index.xml
```

Usare Controllo URL su homepage italiana e inglese, una categoria, una guida e una scheda prodotto. Configurare poi il Profilo dell’attività Google con gli stessi dati pubblicati nella pagina showroom.
