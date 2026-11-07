# Catalogo sorgente TZFIT — procedura operativa interna

**Stato:** implementato per acquisizione e normalizzazione iniziale  
**Uso:** documento interno; il nome del fornitore, i suoi URL e i testi originali non devono comparire nel sito pubblico.

La prima acquisizione completa e le eccezioni rilevate sono riepilogate nel [report del 13 settembre 2026](./report-importazione-tzfit-2026-09-13.md).

**Aggiornamento branding, 7 novembre 2026:** approvate e integrate nel repository 754 immagini elaborate per i 744 prodotti pubblici; la coda contiene 754 lavori `integrated` e nessun lavoro residuo. Il catalogo completo ? pubblicato con il commit `281355b`: gli otto campioni dell'ultimo rilascio e i relativi file immagine rispondono 200 con gli asset aggiornati ([report](../data/site-audits/2026-11-07-branding-release-9.json)). Il [controllo completo degli asset locali](../data/site-audits/2026-11-07-catalog-branding-integrity.json) non rileva errori. La revisione delle immagini non chiude le eccezioni tecniche dell'importazione o le attività della [checklist di lancio SEO](./checklist-lancio-seo.md).

## Completamento GF, 7 novembre 2026

La risoluzione revisionata di `GF-005` conserva entrambe le pagine sorgente e seleziona la scheda `fitness-equipment-strength-incline-chest-press-gf005` per normalizzazione, descrizione e immagini. I dieci asset esclusivi dell’alias hanno stato `excluded-source-alias` e restano esclusi anche rigenerando manifest e approvazioni. Le due fotografie canoniche sono state personalizzate e revisionate ([QA](../data/catalog-branding/generated/gf-completion-01/qa.json)). Il catalogo corrente contiene 745 prodotti, 756 viste integrate e 14 codici ancora in quarantena.

Il [catalogo GF](../brochures/fullmuscle-gf/README.md) riprende la brochure G5 con cinque schede singole e prezzo di 1.870 € + IVA deciso dal titolare. Il sito conserva il flusso preventivo senza prezzi nelle schede.

La generazione pubblica associa ora la descrizione alla coppia SKU e URL sorgente. Questo corregge anche 414 descrizioni preesistenti: la pulizia dei codici TZ le faceva collidere sulla stessa chiave e poteva assegnare un testo bicipiti/tricipiti a una bike. Nomi, SKU, specifiche, immagini e URL dei 744 prodotti già presenti rimangono invariati.

## Scopo e confini

La pipeline censisce il catalogo pubblico del fornitore e prepara bozze FullMuscle. Non pubblica automaticamente nessun prodotto. Le descrizioni recuperate servono come materiale di lavoro: i testi finali italiani e inglesi devono essere riscritti, verificati e approvati. Prezzi, disponibilità, garanzia, certificazioni e dichiarazioni sull'azienda non vengono importati come affermazioni commerciali FullMuscle.

L'acquisizione usa soltanto pagine HTML e sitemap pubbliche consentite da `robots.txt`. Il percorso `/wp-json/` è escluso. Ogni esecuzione rilegge `robots.txt` e interrompe il lavoro se una URL necessaria risulta vietata.

## Comandi

Installazione iniziale:

```bash
npm install
```

Verifica su un campione senza scrivere dati:

```bash
npm run catalog:crawl -- --dry-run --limit 10
```

Acquisizione completa dei metadati:

```bash
npm run catalog:crawl
```

Creazione delle bozze FullMuscle:

```bash
npm run catalog:normalize
```

Confronto con l'inventario precedente:

```bash
npm run catalog:diff
```

Il download, la revisione e la preparazione degli asset sono intenzionalmente separati, perché un catalogo completo può occupare molto spazio e nessuna immagine deve diventare pubblica senza controllo:

```bash
npm run catalog:assets -- download
npm run catalog:assets -- contact-sheets
npm run catalog:assets -- apply-review --input data/catalog-assets/review-decisions.json
npm run catalog:assets -- stage
npm run catalog:assets -- validate
npm run catalog:normalize
```

Quando arrivano le immagini OEM, si importano con:

```bash
npm run catalog:assets -- import-oem --input <cartella-oem>
npm run catalog:assets -- stage
npm run catalog:normalize
```

Il nome di ogni file OEM deve seguire il formato `<sku>__<primary|gallery>__<ordine>.<estensione>`, con ordine a partire da 1; per esempio `FM-5101__primary__1.jpg`.

La coda branding esistente si consulta e aggiorna con i report di revisione visiva dei singoli lotti:

```bash
npx tsx scripts/catalog/branding.ts status
npx tsx scripts/catalog/branding.ts review <report-qa.json>
npx tsx scripts/catalog/branding.ts apply
```

`review` richiede un'approvazione esplicita, con `assetId`, SKU, `sourceHash`, percorso del risultato e nota QA coerenti con la coda. `apply` integra le sole elaborazioni approvate; il rilascio e la verifica online restano passaggi successivi. La coda già presente non va reinizializzata.

Opzioni disponibili: `--concurrency`, `--delay-ms` e, soltanto insieme a `--dry-run`, `--limit`. Il valore predefinito è tre richieste concorrenti e almeno 350 ms fra gli avvii. Timeout e tentativi temporanei sono gestiti dal client.

## File prodotti

| Percorso | Contenuto | Pubblico |
|---|---|---:|
| `data/catalog-source/tzfit/inventory.json` | dati originali, URL, specifiche, hash e provenienza | No |
| `data/catalog-source/tzfit/inventory.previous.json` | inventario precedente per il confronto | No, ignorato da Git |
| `data/catalog-source/tzfit/diff-report.json` | nuovi, modificati, rimossi da verificare e anomalie | No |
| `data/catalog-assets/manifest.json` | stato, hash, dimensioni e destinazione di ogni immagine | No |
| `data/catalog-assets/review-decisions.json` | esito ripetibile della revisione visiva | No |
| `data/catalog-assets/originals/` | copie locali originali | No, ignorato da Git |
| `data/catalog-assets/edited/` | copie provvisorie ripulite e controllate | No, ignorato da Git |
| `data/catalog-branding/jobs.json` | coda delle elaborazioni, modello, hash originale, percorsi, approvazione e integrazione | No |
| `data/catalog-branding/generated/` | risultati dei lotti, prompt e report `qa.json` della revisione visiva | No; solo i WebP approvati vengono preparati per la build |
| `src/assets/catalog/` | soli WebP approvati, pronti per la build | Sì, attraverso le schede pubblicate |
| `data/catalog-drafts/products.json` | prodotti FM ancora in stato `draft` | No, finché non superano la revisione |

La scrittura dell'inventario è atomica. Un crawl fallito o vuoto non sostituisce il file valido. Un prodotto scomparso dal sito sorgente viene elencato come `manual-review`: non viene cancellato automaticamente. Se due pagine dichiarano lo stesso SKU, entrambe restano nell'inventario sorgente ma quel codice viene messo in quarantena e non genera una bozza pubblicabile finché non viene scelto il modello corretto.

## Identità FullMuscle

La conversione dello SKU è stabile:

| Sorgente | FullMuscle |
|---|---|
| `TZ-5101` | `FM-5101` |
| `TZ-X82-01` | `FM-X82-01` |
| `GS-5001` | `FM-GS-5001` |
| `GC-5001` | `FM-GC-5001` |

Per le serie, il prefisso `TZ` diventa `FM`; alle sigle senza quel prefisso viene anteposto `FM`. Due codici sorgente che producono lo stesso SKU FullMuscle bloccano la normalizzazione e richiedono una decisione manuale.

Il file delle bozze conserva una `sourceReference` interna per la tracciabilità. La funzione che prepara un record pubblico elimina quel riferimento, gli URL originali e qualsiasi asset non approvato. Il sito usa esclusivamente questa vista filtrata.

## Immagini

La pipeline raccoglie l'immagine Open Graph e le immagini del contenuto, preferendo la variante più grande di `srcset` e rimuovendo i suffissi WordPress come `-300x300`. Non usa hotlink nel sito finale. Controlla tipo MIME, dimensioni, limite di peso e hash SHA-256; i duplicati binari condividono lo stesso file originale.

Ogni immagine entra come `needs-review`. Le tavole di contatto permettono la revisione completa. Gli esiti sono `needs-cleaning`, `blocked-branding`, `approved-provisional`, `approved-oem` o `missing`. Soltanto `approved-provisional` e `approved-oem` possono essere copiati in `src/assets/catalog/` e inclusi nella vista pubblica.

La coda branding usa stati separati: `pending`, `ready-for-review`, `approved` e `integrated`. L'integrazione di un'elaborazione mantiene `approved-provisional` nel manifest degli asset e conserva originale, `sourceHash`, prompt, risultato e nota QA. L'approvazione visiva non trasforma l'elaborazione in un originale OEM.

Il processo approvato sostituisce il nome o il logo del fornitore con il logo Full Muscle e applica il verde scuro di riferimento `#356B35` alle parti verniciate individuate. Ogni risultato viene confrontato con la fonte per preservare modello, geometria, materiali, inquadratura e sfondo. Cavi, meccanismi, fori e scale leggibili devono restare coerenti; cromature e colori dei controlli funzionali vanno preservati. Eventuali microtesti già illeggibili nella fonte restano annotati come illustrativi, senza introdurre numeri leggibili inventati. Queste elaborazioni non certificano da sole i colori o le configurazioni ordinabili. Banner promozionali, watermark e immagini non certe restano bloccati. La pubblicazione richiede inoltre:

1. diritto d'uso confermato per FullMuscle;
2. file originale o copia locale ad alta risoluzione;
3. assenza di loghi, watermark o riferimenti visivi al fornitore;
4. ritaglio e colore controllati;
5. testo alternativo italiano e inglese approvato.

Gli originali OEM consegnati direttamente dal fornitore hanno priorità sulle immagini provvisorie. L'importazione associa i file tramite SKU, ruolo e ordine e permette di sostituire le fotografie senza cambiare le URL delle schede. La consegna OEM non è un prerequisito per pubblicare i prodotti che hanno già un asset provvisorio approvato.

## Revisione di ogni prodotto

Una bozza diventa pubblicabile soltanto quando sono vere tutte queste condizioni:

- SKU, categoria e serie FullMuscle verificati;
- nome commerciale approvato;
- misure, peso, pacco pesi, materiali e configurazioni confrontati con la scheda tecnica ufficiale;
- descrizione, vantaggi e caratteristiche riscritti in italiano e inglese;
- nessuna affermazione del produttore attribuita a FullMuscle;
- immagini approvate e servite localmente;
- prezzo “a partire da” inserito da una fonte commerciale interna, se previsto;
- stato cambiato esplicitamente da `draft` a `published` e disponibilità preventivo abilitata.

La revisione parte da almeno un prodotto per ogni serie, poi procede a lotti omogenei. I PDF individuati nella pagina Download vengono registrati nell'inventario. Il confronto automatico del loro testo richiederà i file distributore definitivi e un parser dedicato; fino ad allora il controllo sito/PDF resta un passaggio umano tracciato nelle note di revisione.

## Report e controlli

`catalog:diff` confronta gli hash dei contenuti e produce:

- prodotti nuovi;
- schede modificate;
- prodotti non più trovati, sempre da verificare;
- SKU duplicati;
- prodotti senza immagini;
- specifiche discordanti fra pagine che condividono lo stesso SKU.

Prima di usare i dati in una build del sito eseguire:

```bash
npm run typecheck
npm test
npm run catalog:diff
npm run catalog:assets -- validate
```

Il controllo editoriale resta obbligatorio anche quando i test passano: i test verificano il contratto tecnico, non l'esattezza commerciale del contenuto.
