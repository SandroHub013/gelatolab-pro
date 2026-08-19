# GelatoLab Pro — Specifica

*Documento di riferimento per il passaggio da applicazione locale a servizio in abbonamento. Le decisioni già prese in implementazione stanno in [DECISIONS.md](./DECISIONS.md); questo documento descrive dove siamo e dove andiamo.*

> **Due nomi da confermare.** I piani sono chiamati qui **Sol** e **Luna**, e l'interprete del Jarvis è descritto come *combinato* (parser deterministico più modello linguistico opzionale, di qualsiasi fornitore). È l'interpretazione di un'indicazione abbreviata: se l'intenzione era diversa, si correggono i nomi in §4 e la strategia in §5 senza toccare il resto.

---

## 1. Dove siamo

Applicazione Next.js funzionante e in produzione locale, con:

- motore di calcolo puro in `src/domain/` — POD, PAC, solidi, zuccheri per tipo, grassi, MSNF, costi;
- solver lineare HiGHS che propone tre soluzioni deterministiche;
- 12 preset di calibrazione, 33 ingredienti, versioni immutabili, export JSON e CSV;
- CI su quattro controlli, 80 test, repository pubblico con sito.

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

*Rischio principale:* un filtro dimenticato in una query espone i dati di un cliente a un altro. Serve un test che percorra ogni server action con due organizzazioni e verifichi che nessuna veda l'altra.

### F2 — Fatturazione

- Integrazione Stripe: prodotti, prezzi, portale di gestione, webhook per lo stato dell'abbonamento.
- Stato del piano come dato dell'organizzazione, non del singolo utente.
- Periodo di prova senza carta di credito.
- Gestione dei fallimenti di pagamento: sospensione in sola lettura, mai cancellazione dei dati.

### F3 — Jarvis gratuito

Parser deterministico come percorso normale (§5). È in questa fase perché è ciò che rende la voce includibile in ogni piano senza costo marginale — vedi i conti in §4.

### F4 — Conformità e fiducia

- Privacy policy, condizioni d'uso, contratti di trattamento dati con i fornitori.
- Export completo e cancellazione dell'account, per obbligo GDPR e per togliere l'obiezione del vincolo.
- Registro degli accessi ai dati.
- Backup con procedura di ripristino **provata**, non solo configurata.

### F5 — Ciò che giustifica il piano superiore

- Più utenti per laboratorio, con ruoli.
- Storico delle versioni con confronto esteso.
- Scheda tecnica di produzione stampabile e brandizzata.
- Costi con storico dei prezzi degli ingredienti.

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

**Sol** — il laboratorio che lavora.
Ricette e ingredienti illimitati, calcolo completo, calibrazione sui preset di sistema, versioni, export, Jarvis vocale incluso.

**Luna** — il laboratorio che ottimizza.
Tutto Sol, più: solver con preset personalizzati, più utenti con ruoli, storico prezzi e costi, scheda di produzione brandizzata, supporto prioritario.

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

**I numeri esatti restano da validare.** La struttura dei costi qui sopra è solida; i punti di prezzo vanno verificati parlando con dieci gelatieri prima di stampare un listino.

## 5. Jarvis

### Il confine che non si sposta

`PRODUCT.md` impegna il prodotto a **non usare modelli linguistici nei calcoli**. Il Jarvis lo rispetta perché la linea passa nel punto giusto: **il modello sceglie quale azione e con quali parametri, e nient'altro.**

"Aggiungi duecentocinquanta grammi di panna" diventa una chiamata alla stessa funzione che invoca il pulsante. Il 250 è un parametro trascritto, non calcolato. POD, PAC e solidi restano di `src/domain/`. Le metriche che il Jarvis può riferire gli arrivano già calcolate e già formattate, apposta perché le legga soltanto.

### Interprete combinato

**Parser deterministico come percorso normale.** Il vocabolario è chiuso: quindici comandi, ingredienti da un catalogo noto, numeri in italiano. Non è comprensione del linguaggio aperta, è parsing di un dominio ristretto. Costo zero, nessuna rete, nessuna latenza, e a parità di frase fa sempre la stessa cosa — coerente con un prodotto che dichiara un solver deterministico.

**Modello linguistico come ripiego opzionale**, per le parafrasi che il parser non copre. Lo strato è indifferente al fornitore: Claude, GPT o un modello locale si sostituiscono cambiando un solo file, perché tutto ciò che sta a valle lavora sul tipo `VoiceCommand` e non sa da dove venga.

Questa indifferenza è deliberata. Il fornitore migliore fra due anni non è quello di oggi, e il costo per token è la voce che si muove di più.

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

## 6. Vincoli che non cambiano

Valgono per ogni fase e per ogni funzione futura.

1. **Il dominio resta puro.** `src/domain/` non importa Prisma, Next o React.
2. **Nessun modello linguistico nei calcoli.** Le euristiche sono dichiarate tali nell'interfaccia.
3. **Onestà sui numeri.** Un target impossibile fallisce con un messaggio esplicito, non con una stima plausibile.
4. **Le versioni salvate sono immutabili.**
5. **Ogni comportamento nuovo ha un test; ogni bug corretto ha un test che fallisce prima della correzione.**

## 7. Rischi aperti

| Rischio | Perché conta | Contromisura |
|---|---|---|
| Filtro di tenant dimenticato in una query | Espone i dati di un cliente a un altro: è l'errore che chiude un'attività | Test a due organizzazioni su ogni server action, in CI |
| Stagionalità delle gelaterie | Disdette di massa a ottobre | Annuale scontato e pausa invernale, entrambi |
| Costo AI fuori controllo su un utente pesante | Margine negativo su singoli clienti | Parser come percorso normale, uso equo sul ripiego |
| Mercato non abituato a comprare software | Il prezzo giusto può essere comunque troppo | Validare con dieci laboratori prima del listino |
| Dipendenza da un solo fornitore di modelli | Prezzi e disponibilità cambiano | Strato di interpretazione indifferente al fornitore, già progettato così |
