# Dodici post per due settimane — Full Muscle Equipment

**Edizione:** 8 novembre 2026  
**Consegna:** 12 caroselli da 4 slide, 48 PNG da 1080 × 1350 px, caption e testi alternativi.  
**Stato:** raccolta temporanea pronta per pubblicazione manuale; nessun post pubblicato o programmato da questa procedura.

## Come usare la raccolta

Questi contenuti mantengono il profilo attivo mentre il team rivede il [piano marketing e social](../docs/piano-marketing-social.md). La frequenza quotidiana è una scelta temporanea di questo pacchetto, non una modifica alla cadenza del piano generale né una garanzia di crescita.

1. Apri la cartella del post seguendo il calendario sotto.
2. Consulta `anteprima.jpg` e leggi `post.md`.
3. Carica soltanto `01.png`, `02.png`, `03.png`, `04.png`, nell'ordine numerico, come unico carosello. Mantieni il formato verticale 4:5 senza ritagliare le slide.
4. Copia la sezione **Caption pronta da copiare**, compresi gli hashtag. I riferimenti interni e le note sulle fonti non vanno copiati nella caption.
5. Inserisci i testi alternativi delle quattro immagini e verifica l'anteprima nell'app.
6. Pubblica manualmente quando desideri e controlla eventuali commenti o richieste di informazioni.

[Apri la panoramica delle dodici copertine](anteprima-12-post.jpg). Le anteprime sono materiali di consultazione: non sono slide aggiuntive del carosello.

## Calendario senza date vincolanti

Pubblica un carosello al giorno dal lunedì al sabato per due settimane. Le due domeniche restano libere. Se inizi in un altro giorno, conserva semplicemente l'ordine 01–12 e distribuisci due pause nell'arco di quattordici giorni. Non è necessario attendere integrazioni, nuove riprese o materiali del progettista.

| Settimana | Giorno | Post | Tema e cartella | Obiettivo |
| --- | --- | --- | --- | --- |
| 1 | Lunedì | 01 | [Chest Press GF-001](01-chest-press-gf/post.md) | Presentare una postazione a dischi attraverso funzione, configurazione e dati utili alla selezione. |
| 1 | Martedì | 02 | [Pacco pesi o dischi?](02-pacco-pesi-o-dischi/post.md) | Chiarire la differenza tra due modalità di carico senza dichiarare un sistema superiore. |
| 1 | Mercoledì | 03 | [Leg Extension G5](03-leg-extension-g5/post.md) | Presentare funzione e dati essenziali della Leg Extension FM-GC-5002. |
| 1 | Giovedì | 04 | [Leg Extension e Leg Curl](04-leg-extension-leg-curl/post.md) | Spiegare due movimenti differenti usando modelli della stessa serie con dati confrontabili. |
| 1 | Venerdì | 05 | [Lat Pulldown GF-004](05-lat-pulldown-gf/post.md) | Far conoscere la configurazione della Lat Pulldown a dischi senza attribuirle prestazioni non documentate. |
| 1 | Sabato | 06 | [Macchina guidata e cavi](06-macchina-guidata-cavi/post.md) | Confrontare una postazione dedicata e una stazione a doppio cavo in base a movimento e spazio. |
| 2 | Lunedì | 07 | [Hip Thrust G5](07-hip-thrust-g5/post.md) | Presentare il modello dedicato all’hip thrust e separare dati tecnici da valutazione dello spazio. |
| 2 | Martedì | 08 | [Ingombro e spazio di utilizzo](08-ingombro-spazio-utilizzo/post.md) | Spiegare perché le dimensioni dichiarate non costituiscono da sole una misura dell’area operativa. |
| 2 | Mercoledì | 09 | [Shoulder Press X82](09-shoulder-press-x82/post.md) | Presentare la Shoulder Press FM-X8202 attraverso destinazione e dati dichiarati. |
| 2 | Giovedì | 10 | [Come leggere una scheda tecnica](10-leggere-scheda-tecnica/post.md) | Insegnare a distinguere identità del prodotto, dimensioni, carico e peso macchina. |
| 2 | Venerdì | 11 | [Tapis roulant FM-2000B](11-tapis-roulant-2000b/post.md) | Presentare il modello cardio distinguendo area di corsa, ingombro e intervalli dichiarati. |
| 2 | Sabato | 12 | [Cardio, forza e functional](12-cardio-forza-functional/post.md) | Collegare tre famiglie di attrezzature alla scelta delle attività e all’organizzazione degli spazi. |

## Linea visiva e messaggi

Stile sportivo scuro: antracite, titoli bianchi, accenti verdi e logo Full Muscle. Le macchine sono mostrate intere su pannelli chiari che rispettano il fondo delle immagini esistenti. Ogni carosello contiene una copertina, due slide informative e una chiusura con un riepilogo e un invito utile.

La raccolta alterna sei presentazioni di prodotto e sei contenuti educativi. Le CTA invitano a salvare il confronto oppure a scrivere in DM indicando il modello: non promettono prezzi, promozioni, progettazione inclusa o disponibilità. Non si pubblicano indicazioni di allenamento, risultati fisici garantiti o confronti di superiorità.

Le immagini provengono dal catalogo brandizzato già approvato e sono illustrative. Non vengono presentate come fotografie di installazioni cliente. Colori, configurazioni e accessori rappresentati vanno confermati in fase commerciale. Ogni post mantiene le fonti interne e i codici dei modelli in `post.md`.

## Modifiche e rigenerazione

I PNG sono autonomi e pronti da caricare. Per modificare la raccolta nel repository, i sorgenti si trovano in [`_src`](_src/README.md): testi e sequenze in `posts.json`, registro dei prodotti in `products.json`, impaginazione in `style.css` e generatore in `build.mjs`. Il generatore riusa font, logo e immagini originali del progetto senza modificarli.

Dalla root del repository:

```powershell
node social/_src/build.mjs
```

La rigenerazione sovrascrive soltanto i file prodotti da questa procedura nelle dodici cartelle, il documento indice, l'anteprima generale e i report. Per conservare modifiche, aggiornare prima i sorgenti. Non cambia sito, cataloghi o piano marketing.

## Verifica

Il [report di esportazione](_src/preflight.json) registra dimensioni, caricamento di font e immagini, overflow, sovrapposizioni e hash dei file. La revisione visiva e il controllo finale sono riportati in [`_src/quality-review.md`](_src/quality-review.md). La procedura non accede a Instagram e non configura pubblicazioni o automazioni.
