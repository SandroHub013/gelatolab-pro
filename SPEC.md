# GelatoLab Pro — Specifica

*Documento di riferimento per il passaggio da applicazione locale a servizio in abbonamento. Le decisioni già prese in implementazione stanno in [DECISIONS.md](./DECISIONS.md); questo documento descrive dove siamo e dove andiamo.*

> **Due nomi da confermare.** I piani sono chiamati qui **Sol** e **Luna**, e l'interprete del Jarvis è descritto come *combinato* (parser deterministico più modello linguistico opzionale, di qualsiasi fornitore). È l'interpretazione di un'indicazione abbreviata: se l'intenzione era diversa, si correggono i nomi in §4 e la strategia in §5 senza toccare il resto.

---

## 1. Dove siamo

Applicazione Next.js funzionante e in produzione locale, con:

- motore di calcolo puro in `src/domain/` — POD, PAC, solidi, zuccheri per tipo, grassi, MSNF, costi;
- solver lineare HiGHS che propone tre soluzioni deterministiche;
- 12 preset di calibrazione, 33 ingredienti, versioni immutabili, export JSON e CSV;
- assistente vocale sull'intera applicazione (§5), con trascrizione Azure Speech e interpretazione Claude su Foundry;
- CI su quattro controlli, 80 test, repository pubblico con sito.

Sul Jarvis serve una precisazione, perché la differenza conta: il percorso è verificato nelle sue parti — validazione, gestione degli errori, esecuzione dei comandi, separazione della cache — ma **la chiamata reale al modello non è mai stata eseguita**, per mancanza di credenziali. È codice che non ha ancora visto una risposta riuscita. Vedi §12.

**Un utente solo, nessuna autenticazione, database locale.** È il vincolo che decide tutto ciò che segue.

## 2. Il salto da fare

Vendere abbonamenti non è una funzione da aggiungere: è un cambio di natura dell'applicazione.

Lo schema Prisma non ha il concetto di utente né di laboratorio. Le ricette stanno in tabelle piatte e chiunque raggiunga l'applicazione le vede tutte. Oggi è corretto — è un'applicazione locale monoutente. Il giorno che la si espone in rete diventa una violazione di dati.

**Nessuna riga di codice sui piani di abbonamento ha senso prima che esistano autenticazione e isolamento dei dati.** L'ordine delle fasi in §3 non è negoziabile per questo motivo.

Un fatto che è insieme obbligo legale e argomento di vendita: **le ricette sono il segreto industriale del cliente**. Un gelatiere affida al servizio la formula su cui campa la sua attività. Questo impone contratti di trattamento dati con i fornitori cloud, una privacy policy vera e la possibilità di esportare e cancellare tutto. È anche la leva commerciale più forte che il prodotto abbia, se raccontata bene.

## 3. Roadmap

Le fasi sono ordinate per dipendenza, non per appetibilità. Ognuna è rilasciabile.

### F1 — Fondamenta multi-tenant *(blocca tutto il resto)*

- Entità `Organizzazione` (il laboratorio) e `Utente`, con appartenenza.
- Chiave di tenant su ricette, ingredienti, preset, versioni e snapshot.
- Isolamento applicato **a livello di query**, non di interfaccia: ogni accesso al database filtra per organizzazione, e il filtro va testato come si testano gli escaping.
- Migrazione dei dati esistenti dentro un'organizzazione predefinita.
- Autenticazione: email più link magico, oppure OAuth. Niente password da gestire se evitabile.

Schema, nella forma minima che regge:

```
Organizzazione  id, nome, piano, statoAbbonamento, stripeCustomerId, creataIl
Utente          id, email, nome, creatoIl
Appartenenza    utenteId, organizzazioneId, ruolo (titolare | collaboratore)
```

Su `Recipe`, `Ingredient`, `CalibrationPreset` e `RecipeSnapshot` si aggiunge
`organizzazioneId` non nullo, con indice. Gli ingredienti di sistema e i 12
preset di sistema restano condivisi: `organizzazioneId` nullo significa
"di tutti, non modificabile", ed è l'unico caso in cui il campo può mancare.

*Rischio principale:* un filtro dimenticato in una query espone i dati di un cliente a un altro. Il presidio non è la revisione umana ma un test che percorra **ogni** server action con due organizzazioni popolate e verifichi che nessuna veda l'altra — lo stesso trattamento che hanno già gli escaping in `export.test.ts`.

*Fatto quando:* due organizzazioni coesistono nello stesso database, il test di isolamento gira in CI, e i dati preesistenti sono migrati senza perdita.

### F2 — Fatturazione

- Integrazione Stripe: prodotti, prezzi, portale di gestione, webhook per lo stato dell'abbonamento.
- Stato del piano come dato dell'organizzazione, non del singolo utente.
- Periodo di prova senza carta di credito.
- Gestione dei fallimenti di pagamento: sospensione in sola lettura, mai cancellazione dei dati.

*Fatto quando:* un abbonamento si sottoscrive, si aggiorna, si mette in pausa e si disdice senza intervento manuale, e lo stato sopravvive a un webhook perso.

### F3 — Jarvis gratuito

Parser deterministico come percorso normale (§5). È in questa fase perché è ciò che rende la voce includibile in ogni piano senza costo marginale — vedi i conti in §4.

*Fatto quando:* i comandi dell'elenco in §5 funzionano senza rete e senza chiavi configurate, e il ripiego a modello linguistico si attiva solo se qualcuno lo configura.

### F4 — Conformità e fiducia

- Privacy policy, condizioni d'uso, contratti di trattamento dati con i fornitori.
- Export completo e cancellazione dell'account, per obbligo GDPR e per togliere l'obiezione del vincolo.
- Registro degli accessi ai dati.
- Backup con procedura di ripristino **provata**, non solo configurata.

*Fatto quando:* un cliente può scaricare tutto ciò che è suo e cancellare l'account da solo, e un ripristino da backup è stato eseguito davvero almeno una volta su dati reali.

### F5 — Ciò che giustifica il piano superiore

- Più utenti per laboratorio, con ruoli.
- Storico delle versioni con confronto esteso.
- Scheda tecnica di produzione stampabile e brandizzata.
- Costi con storico dei prezzi degli ingredienti.

*Fatto quando:* esiste almeno una ragione, dichiarabile in una riga, per cui un laboratorio passa da Sol a Luna — e quella riga regge davanti a un gelatiere, non solo davanti a noi.

### Fuori fase, da valutare dopo

Ricettari condivisi fra laboratori, integrazione con fornitori di materie prime, applicazione mobile nativa.

## 4. Piani di abbonamento

### Il vincolo economico che decide la struttura

Con l'abbonamento i costi di intelligenza artificiale diventano nostri. Costo mensile per utente, solo per la voce, a cache fredda — che è lo scenario reale: si dettano pochi comandi, si lavora venti minuti, se ne dettano altri, e la cache del prompt scade in cinque minuti.

| Uso | Solo Opus 5 | Solo Haiku 4.5 | Parser + Haiku sul 15% |
|---|---|---|---|
| Leggero (20 comandi/giorno) | €10,80 | €2,16 | **€0,32** |
| Medio (50) | €27 | €5,40 | **€0,81** |
| Pesante (200) | €108 | €21,60 | **€3,24** |

Senza parser deterministico, un singolo cliente entusiasta brucia il margine di dieci abbonamenti. **Il parser non è un'ottimizzazione: è la condizione perché la voce sia includibile in un prezzo che questo mercato paghi.**

### Struttura

**Due piani, per laboratorio e non per postazione.** Un laboratorio da tre persone che deve contare le licenze smette di usare il prodotto. Il valore è la ricetta, che è una per laboratorio.

| | **Sol** | **Luna** |
|---|---|---|
| | *il laboratorio che lavora* | *il laboratorio che ottimizza* |
| Ricette e ingredienti | illimitati | illimitati |
| Calcolo completo (POD, PAC, solidi, costi) | ✓ | ✓ |
| Calibrazione sui 12 preset di sistema | ✓ | ✓ |
| Versioni immutabili e confronto | ✓ | ✓ |
| Export JSON e CSV | ✓ | ✓ |
| **Jarvis vocale** | ✓ | ✓ |
| Preset di calibrazione personalizzati | — | ✓ |
| Solver con pesi di ottimizzazione propri | — | ✓ |
| Utenti per laboratorio | 1 | fino a 5, con ruoli |
| Storico prezzi ingredienti e costi nel tempo | — | ✓ |
| Scheda di produzione brandizzata | — | ✓ |
| Supporto | email | prioritario |
| Comandi vocali al ripiego linguistico | 500/mese | 2.000/mese |

Il tetto sull'ultima riga riguarda **solo** le frasi che il parser non capisce.
Superato il tetto il Jarvis continua a funzionare col parser: non si spegne, si
limita alle forme che conosce. A costo Haiku e cache fredda quei tetti valgono
circa 1,80 € e 7,20 € di costo nostro per utente al mese — il caso peggiore, non
quello medio.

La differenza fra i piani sta sul **solver e sulle versioni**, cioè su ciò che ha valore professionale — non sulla voce. La voce costa quasi nulla grazie al parser, e metterla nel piano alto significherebbe rinunciare a farla provare proprio a chi deve affezionarsi al prodotto.

### La stagionalità è la variabile principale

Molte gelaterie italiane chiudono o rallentano da novembre a febbraio. Un abbonamento mensile viene disdetto a ottobre e forse non torna a marzo.

Due contromisure, non alternative:

- **Prezzo annuale scontato in modo aggressivo**, dieci mesi al prezzo di dodici, incassato a inizio stagione quando il gelatiere ha appena chiuso l'estate.
- **Pausa invernale esplicita**: l'abbonamento si congela a costo ridotto invece di essere disdetto. Conserva i dati e, cosa che conta di più, l'abitudine.

### Scelte deliberate

**Niente contatori visibili.** Un tassametro scoraggia proprio l'uso che genera abitudine. Il limite sul ripiego a modello linguistico esiste come uso equo, generoso al punto che il 95% non lo tocca mai, e quando viene superato il Jarvis continua a funzionare col solo parser invece di fermarsi.

**Niente crediti a consumo.** Funzionano con chi compra software di mestiere. Un gelatiere non è quel compratore, e la fatturazione a consumo aggiunge complicazione che al lancio non serve.

**Chiave propria del cliente solo nel piano alto.** Un gelatiere non sa cosa sia una chiave API, e chiedergliela è attrito letale. Ha senso solo per chi ha vincoli aziendali sui dati.

### Punti di prezzo: ipotesi da validare

Servono numeri per poter ragionare, ma sono **ipotesi, non decisioni**. La
struttura dei costi sopra è verificabile; questi no.

| | Mensile | Annuale | Pausa invernale |
|---|---|---|---|
| **Sol** | 39 € | 390 € *(dieci mesi su dodici)* | 9 €/mese |
| **Luna** | 79 € | 790 € | 19 €/mese |

Il ragionamento dietro l'ordine di grandezza: un laboratorio spende in materie
prime migliaia di euro al mese, e 39 € sono il ricavo di poche vaschette. Sotto
i 20 € il prodotto segnala di essere un giocattolo a un compratore che di
mestiere valuta attrezzature; sopra i 100 € entra in una fascia dove pretende un
venditore, non un sito.

Con questi numeri e i costi di §4, il margine lordo resta sopra il 90% anche
sull'utente pesante. Il rischio non è il costo: è che il mercato non compri
software a nessun prezzo.

**Come validare, prima di stampare un listino.** Dieci laboratori, la domanda
posta come "quanto paghi oggi per tenere in ordine le ricette" invece di "quanto
pagheresti" — la seconda produce cortesia, la prima produce numeri. Poi far
usare il prodotto per una stagione a tre di loro gratis, e chiedere alla fine.

**Periodo di prova: 30 giorni senza carta**, che copre l'apertura di stagione ed
è il momento in cui il gelatiere rifà le ricette.

## 5. Jarvis

### Il confine che non si sposta

Il prodotto è impegnato a **non usare modelli linguistici nei calcoli** (vincolo 2 in §10; il documento `PRODUCT.md` che lo enuncia per esteso vive oggi solo nel branch del redesign e non è ancora su `main`). Il Jarvis lo rispetta perché la linea passa nel punto giusto: **il modello sceglie quale azione e con quali parametri, e nient'altro.**

"Aggiungi duecentocinquanta grammi di panna" diventa una chiamata alla stessa funzione che invoca il pulsante. Il 250 è un parametro trascritto, non calcolato. POD, PAC e solidi restano di `src/domain/`. Le metriche che il Jarvis può riferire gli arrivano già calcolate e già formattate, apposta perché le legga soltanto.

### Interprete combinato

**Parser deterministico come percorso normale.** Il vocabolario è chiuso: quindici comandi, ingredienti da un catalogo noto, numeri in italiano. Non è comprensione del linguaggio aperta, è parsing di un dominio ristretto. Costo zero, nessuna rete, nessuna latenza, e a parità di frase fa sempre la stessa cosa — coerente con un prodotto che dichiara un solver deterministico.

**Modello linguistico come ripiego opzionale**, per le parafrasi che il parser non copre. Lo strato è indifferente al fornitore: Claude, GPT o un modello locale si sostituiscono cambiando un solo file, perché tutto ciò che sta a valle lavora sul tipo `VoiceCommand` e non sa da dove venga.

Questa indifferenza è deliberata. Il fornitore migliore fra due anni non è quello di oggi, e il costo per token è la voce che si muove di più.

### Vocabolario

Quindici comandi, chiusi. È questa chiusura che rende possibile il parser
deterministico: non serve capire l'italiano, serve capire quindici forme.

| Comando | Esempio parlato | Reversibile |
|---|---|---|
| `answer` | "quanto POD ha" | non modifica |
| `clarify` | *chiesto dal Jarvis quando il nome è ambiguo* | non modifica |
| `unsupported` | *fuori vocabolario o dato assente* | non modifica |
| `navigate` | "vai alla calibrazione" | non modifica |
| `addIngredient` | "aggiungi duecentocinquanta grammi di panna" | undo |
| `setQuantity` | "metti il latte a cinquecento" | undo |
| `removeIngredient` | "togli il destrosio" | undo |
| `toggleLock` | "blocca la panna" | undo |
| `setBatchWeight` | "peso batch un chilo" | undo |
| `setRecipeName` | "chiamala fior di latte più morbida" | undo |
| `scaleToBatch` | "scala a batch" | undo |
| `saveSnapshot` | "salva questa versione" | **conferma** |
| `createRecipe` | "nuova ricetta crema base latte" | **conferma** |
| `duplicateRecipe` | "duplica questa ricetta" | **conferma** |
| `runCalibration` | "calibra" | **conferma** |
| `applySolution` | "applica la soluzione bilanciata" | **conferma** |

La colonna a destra non è descrittiva: è la regola. Ciò che `zundo` annulla parte
senza attrito; ciò che scrive sul server chiede conferma, perché l'undo non lo
raggiunge. La distinzione vive in `needsConfirmation`, non nel giudizio di chi
legge il codice.

Quando il parser non riconosce una forma, l'ordine è: ripiego linguistico se
configurato e sotto il tetto del piano, altrimenti `clarify`. **Mai un'ipotesi:**
un `ingredientId` inventato o dei grammi fraintesi costano più di una domanda.

### Strati

| Strato | Oggi | Sostituibile con |
|---|---|---|
| Trascrizione | Azure Speech `it-IT` | Web Speech del browser (gratis, solo Chrome ed Edge), Whisper locale |
| Interpretazione | Claude su Foundry | Parser deterministico, GPT, modello locale |
| Esecuzione | store e server action esistenti | — non si sostituisce, è l'applicazione |

Lo strato di esecuzione non reimplementa niente. Un assistente con una propria strada verso il database sarebbe una seconda implementazione da tenere allineata, e prima o poi divergerebbe.

### Sicurezza e reversibilità

Le modifiche all'editor si annullano con undo come quelle fatte a mano. Le scritture sul server — salva versione, crea ricetta, applica soluzione del solver — chiedono conferma, perché l'undo non le raggiunge. La distinzione è codificata in `needsConfirmation`, non lasciata al giudizio di chi legge il codice.

Le credenziali non raggiungono mai il browser: la chiave di trascrizione resta sul server, che rilascia token con scadenza breve.

## 6. Esercizio

L'applicazione oggi gira su una macchina sola, con PostgreSQL in un container e nessun ambiente separato. Per un uso locale è la scelta giusta. Per un servizio che qualcuno paga, tre cose diventano obbligatorie e nessuna delle tre esiste.

**Ambienti separati.** Sviluppo, staging, produzione. Serve soprattutto lo staging: le migrazioni Prisma su un database con dati di clienti veri non si provano in produzione, e la migrazione multi-tenant di F1 è irreversibile nella pratica — riportare indietro ricette già scritte in un tenant sbagliato non è un `down` di migrazione, è ricostruzione manuale.

**Database gestito, non un container.** Un PostgreSQL in Docker su una macchina è un incidente in attesa: nessuna replica, backup solo se qualcuno li ha configurati, ripristino mai provato. Un servizio gestito con backup a punto nel tempo costa poche decine di euro al mese e toglie di mezzo la classe di guasto peggiore — quella in cui perdi le ricette di un cliente, che per lui è la chiusura dell'attività e per noi la fine del prodotto.

**Ripristino provato.** Un backup mai ripristinato non è un backup, è un file. La verifica va fatta almeno una volta su dati reali e ripetuta a ogni cambio di schema importante, e il risultato va scritto — data, durata, cosa è andato storto.

Dimensionamento: il carico è trascurabile — decine di laboratori, poche richieste al minuto, il solver è la cosa più pesante e gira in millisecondi. Il costo dell'infrastruttura sarà dominato dal database gestito, non dal calcolo. Non serve pensare a scalabilità orizzontale finché non ci sono numeri che la giustifichino.

## 7. Sicurezza operativa

### Gli endpoint vocali oggi non sono protetti

`POST /api/voice/interpret` e `POST /api/voice/speech-token` non hanno **né autenticazione né limite di frequenza**.

Oggi è innocuo: l'applicazione è locale e senza credenziali configurate i due endpoint rispondono 503. Ma il repository è pubblico, quindi la loro forma è nota, e nel momento in cui il servizio viene esposto con le chiavi configurate diventano due problemi diversi e concreti:

- `interpret` chiama un'API a pagamento a ogni richiesta. Senza limite, chiunque conosca l'URL può generare costo per noi finché non ce ne accorgiamo dalla fattura.
- `speech-token` è peggio, perché **distribuisce token Azure validi a chiunque lo chieda**. Il token è effimero, ma un ciclo che ne chiede uno ogni nove minuti dà accesso illimitato al nostro servizio di trascrizione.

**Questo è un cancello, non un miglioramento.** Nessun deploy raggiungibile da internet prima che entrambi gli endpoint richiedano una sessione autenticata e abbiano un limite per organizzazione. Il limite serve anche a noi, non solo contro l'abuso: è il meccanismo con cui il tetto sul ripiego linguistico di §4 viene applicato davvero invece che sperato.

### Il resto

**Rotazione delle chiavi.** Le credenziali di Azure, Anthropic e Stripe vivono in variabili d'ambiente. Serve una procedura per sostituirle senza fermo servizio, e vanno sostituite dopo ogni sospetto — non "se succede qualcosa", ma alla prima incertezza.

**Secret scanning.** Oggi è disattivato. Su un repository pubblico è gratuito, e intercetta una chiave committata per sbaglio prima che finisca nell'indice di qualcun altro. Da attivare adesso, prima che il codice cominci a maneggiare credenziali Azure e Stripe.

**Segreti mai nel browser.** Vale già per Azure Speech, che passa da un token effimero. La stessa regola va tenuta per tutto ciò che arriverà: la chiave di Stripe pubblica è pubblica per progetto, quella segreta non lascia mai il server.

**Registro degli accessi ai dati.** Chi ha letto o modificato cosa, e quando. Serve per il GDPR, ma soprattutto serve il giorno in cui un cliente chiede se qualcun altro ha visto le sue ricette: senza registro la risposta onesta è "non lo so", che è la risposta che fa perdere il cliente.

## 8. Requisiti non funzionali

Non sono aspirazioni: sono le soglie sotto le quali il prodotto smette di essere usabile nel contesto in cui vive, cioè un laboratorio con le mani occupate e il tempo contato.

| Requisito | Soglia | Perché quella |
|---|---|---|
| Ricalcolo delle metriche dopo una modifica | sotto 100 ms | È percepito come istantaneo. Sopra, il gelatiere smette di sperimentare con le quantità, che è l'uso principale |
| Risposta del solver | sotto 3 s | Oltre, si passa ad altro e si perde il filo del confronto fra le tre soluzioni |
| Comando vocale, dalla fine della frase all'azione | sotto 2 s | Oltre, conviene il mouse — e un assistente più lento dell'alternativa non viene usato |
| Disponibilità | 99% mensile | Circa 7 ore di fermo al mese. Onesto per un servizio a questo prezzo; prometterne di più significa doverlo mantenere |
| Perdita dati massima accettabile | 24 ore | Con backup a punto nel tempo si sta molto sotto, ma è il limite che ci impegniamo a rispettare |
| Browser | ultime due versioni di Chrome, Edge, Firefox, Safari | La voce con Azure Speech li copre tutti; con Web Speech resterebbe ai primi due |
| Conservazione dati dopo la disdetta | 90 giorni, poi cancellazione | Il tempo perché un gelatiere ci ripensi a inizio stagione, senza tenere dati per sempre |

L'applicazione è pensata per desktop e tablet in laboratorio. Il telefono deve funzionare per consultare, non necessariamente per formulare.

## 9. Metriche

Poche, e scelte perché possano dire che stiamo sbagliando.

**Il prodotto funziona se:** un laboratorio che ha creato la prima ricetta ne ha almeno cinque dopo un mese, e torna almeno una volta a settimana durante la stagione. Una sola ricetta e nessun ritorno significa che l'hanno provato e non gli è servito.

**Il Jarvis funziona se:** la quota di comandi che finiscono in `clarify` o `unsupported` sta sotto il 15%, e la quota che il parser risolve senza ripiego linguistico sta sopra l'80%. La seconda è anche la metrica economica: se scende, il costo per utente sale nel modo descritto in §4.

**Il prezzo funziona se:** l'abbonamento sopravvive al primo inverno. La disdetta di ottobre è il momento della verità, non l'iscrizione di marzo.

**Segnale che qualcosa è rotto:** un laboratorio che smette di salvare versioni continuando a usare l'editor. Vuol dire che non si fida dello storico, ed è il primo passo verso il ritorno al foglio di calcolo.

## 10. Vincoli che non cambiano

Valgono per ogni fase e per ogni funzione futura.

1. **Il dominio resta puro.** `src/domain/` non importa Prisma, Next o React.
2. **Nessun modello linguistico nei calcoli.** Le euristiche sono dichiarate tali nell'interfaccia.
3. **Onestà sui numeri.** Un target impossibile fallisce con un messaggio esplicito, non con una stima plausibile.
4. **Le versioni salvate sono immutabili.**
5. **Ogni comportamento nuovo ha un test; ogni bug corretto ha un test che fallisce prima della correzione.**

## 11. Rischi aperti

| Rischio | Perché conta | Contromisura |
|---|---|---|
| Filtro di tenant dimenticato in una query | Espone i dati di un cliente a un altro: è l'errore che chiude un'attività | Test a due organizzazioni su ogni server action, in CI |
| Stagionalità delle gelaterie | Disdette di massa a ottobre | Annuale scontato e pausa invernale, entrambi |
| Costo AI fuori controllo su un utente pesante | Margine negativo su singoli clienti | Parser come percorso normale, uso equo sul ripiego |
| Mercato non abituato a comprare software | Il prezzo giusto può essere comunque troppo | Validare con dieci laboratori prima del listino |
| Dipendenza da un solo fornitore di modelli | Prezzi e disponibilità cambiano | Strato di interpretazione indifferente al fornitore, già progettato così |
| Endpoint vocali senza autenticazione né limite | Chiunque conosca l'URL genera costo per noi, e `speech-token` distribuisce token Azure validi | Cancello prima di qualsiasi deploy esposto: sessione richiesta e limite per organizzazione (§7) |
| Migrazione multi-tenant irreversibile nella pratica | Ricette finite nel tenant sbagliato non si recuperano con un `down` di migrazione | Staging con dati realistici, e ripristino provato prima della migrazione (§6) |
| Perdita del database | Per il cliente è la chiusura dell'attività, per noi la fine del prodotto | Database gestito con backup a punto nel tempo, ripristino verificato su dati veri (§6) |
| Il parser copre meno dell'atteso | Il costo per utente sale come da §4 e il margine si assottiglia in silenzio | Misurare la quota risolta dal parser (§9): è insieme metrica di qualità e allarme economico |

## 12. Cosa serve da te

Domande che non posso risolvere leggendo il codice. Nessuna blocca il lavoro tecnico su F1.

**Nomi e strategia.** *Sol* e *Luna* e l'interprete combinato vengono da un'indicazione abbreviata (nota in cima). Confermali o correggili: sono due sezioni.

**Credenziali per la verifica.** La chiamata reale a Claude su Foundry non è mai stata eseguita — mancavano le credenziali. Servono un `ANTHROPIC_FOUNDRY_RESOURCE` e una chiave su una risorsa di prova per verificare che `strict`, `effort` e il prompt caching, che su Foundry sono in beta e non GA, siano davvero accettati. Finché non succede, il Jarvis è codice verificato nelle sue parti ma mai visto funzionare intero.

**Prezzi.** I numeri in §4 sono ipotesi. Servono dieci conversazioni con gelatieri veri, con la domanda posta come *"quanto paghi oggi per tenere in ordine le ricette"* e non *"quanto pagheresti"* — la seconda produce cortesia, la prima produce numeri.

**Decisioni che aspettano solo un sì.** Il redesign UI su `wip/ui-redesign` passa tutti e quattro i controlli ma non è mergiato, e `PRODUCT.md` vive solo lì. Il secret scanning è disattivato e su repository pubblico è gratuito (§7). I tre branch `fm/*` sul remote sono residui di PR mergiate mesi fa.

**Una cosa che non so.** Se esista già un laboratorio disposto a fare da primo cliente. Cambia l'ordine del lavoro: con un cliente reale F1 e F2 si stringono attorno a lui e si scoprono i problemi veri; senza, si costruisce al buio e si rischia di raffinare le funzioni sbagliate.
