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
| Comando di avvio | `npm start` |
| Output directory | `dist` |
| Entry file, se richiesto | `server.mjs` |

Hostinger installa le dipendenze dal `package-lock.json`. Non caricare `node_modules` o `dist` nel repository.

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

## 3. Anteprima non indicizzabile

Il primo deploy usa `npm run build` e `PUBLIC_SITE_READY=false`. Verificare sul dominio:

- HTTPS valido e risposta `200` su `/`, `/it/` e `/en/`;
- catalogo, paginazione, ricerca, immagini e schede prodotto;
- selezione prodotti e ricezione reale di una richiesta preventivo;
- `https://fullmuscle-equipment.com/robots.txt` con `Disallow: /`;
- meta `noindex,nofollow` nelle pagine;
- canonical sempre sul dominio `.com` senza `www`;
- risposta `301` da HTTP e `www` verso HTTPS senza `www`;
- log runtime e deploy privi di errori.

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

## 5. Search Console

Creare una proprietà Dominio `fullmuscle-equipment.com`, completare la verifica DNS e inviare:

```text
https://fullmuscle-equipment.com/sitemap-index.xml
```

Usare Controllo URL su homepage italiana e inglese, una categoria, una guida e una scheda prodotto. Configurare poi il Profilo dell’attività Google con gli stessi dati pubblicati nella pagina showroom.
