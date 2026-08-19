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

Sul Jarvis serve una precisazione, perché la differenza conta: il percorso è verificato nelle sue parti — validazione, gestione degli errori, esecuzione dei comandi, separazione della cache — ma **la chiamata reale al modello non è mai stata eseguita**, per mancanza di credenziali. È codice che non ha ancora visto una risposta riuscita. Vedi §13.

**Un utente solo, nessuna autenticazione, database locale.** È il vincolo che decide tutto ciò che segue.

## 2. Il salto da fare

Vendere abbonamenti non è una funzione da aggiungere: è un cambio di natura dell'applicazione.

Lo schema Prisma non ha il concetto di utente né di laboratorio. Le ricette stanno in tabelle piatte e chiunque raggiunga l'applicazione le vede tutte. Oggi è corretto — è un'applicazione locale monoutente. Il giorno che la si espone in rete diventa una violazione di dati.

**Nessuna riga di codice sui piani di abbonamento ha senso prima che esistano autenticazione e isolamento dei dati.** L'ordine di F1-F5 in §3 non è negoziabile per questo motivo.

L'unica eccezione è la fase V, che precede tutto e non scrive codice di prodotto:
valida che esista un compratore. Non viola il vincolo perché non espone nulla —
se lo facesse, ricadrebbe sotto il cancello di §7 come qualsiasi altro deploy.

Un fatto che è insieme obbligo legale e argomento di vendita: **le ricette sono il segreto industriale del cliente**. Un gelatiere affida al servizio la formula su cui campa la sua attività. Questo impone contratti di trattamento dati con i fornitori cloud, una privacy policy vera e la possibilità di esportare e cancellare tutto. È anche la leva commerciale più forte che il prodotto abbia, se raccontata bene.

## 3. Roadmap

Le fasi sono ordinate per dipendenza, non per appetibilità. Ognuna è rilasciabile.

### V — Validazione, prima di costruire il servizio *(due settimane)*

*Si chiama V e non F0 per non confonderla col tier gratuito F0 di Azure, citato
in §4.*

F1, F2 e F4 sono mesi di lavoro il cui unico risultato visibile a un gelatiere è
una schermata di accesso. Il ragionamento di §2 — nessuna riga sui piani prima
dell'isolamento — è corretto **se si sta costruendo un servizio**; ma non dimostra
che si debba costruirlo adesso.

**Il segnale da cercare è uno solo: uno sconosciuto che paga.** Non tre
conoscenti che accettano un'installazione seguita a mano con supporto diretto
dell'autore — quelli dimostrano che tre persone accettano un favore, non che
esiste un mercato. Una versione precedente di questo documento proponeva proprio
quello, ed era lo stesso errore che denunciava: una premessa validata male, solo
spostata di un livello.

Tre cose in parallelo, due settimane:

**V1 — Un pre-ordine da un estraneo.** Una pagina di listino con i prezzi di §4 e
un pulsante che incassa. Dieci conversazioni con gelatieri, con la domanda posta
come *"quanto paghi oggi per tenere in ordine le ricette"* e non *"quanto
pagheresti"*: la seconda produce cortesia, la prima produce numeri. Il criterio è
**un incasso da qualcuno che non ci conosce**.

**V2 — Quanto è grande il mercato.** Quanti laboratori di gelateria artigianale
esistono in Italia, dai dati ISTAT e Registro Imprese per codice ATECO. È un
pomeriggio di lavoro e decide se il progetto vale 50 o 500 clienti, cioè la
domanda che §10 dichiara di non poter chiudere. Che finora fosse elencata come
lavoro futuro invece che come primo pomeriggio era la scelta più difficile da
giustificare in tutto il piano.

**V3 — Il parser (F3).** Non dipende dal multi-tenant, è l'unica fase che si può
fare adesso, e senza di essa qualunque prova reale della voce costa la colonna
sinistra di §4 — 108 € al mese per utente pesante, a carico nostro. Va spostata
qui dal suo posto dopo F2: non c'era alcuna dipendenza che la tenesse là.

*Fatto quando:* c'è un incasso da uno sconosciuto e il numero di V2; oppure sono
passate **sei settimane e venti contatti senza un pagamento**, e allora F1 non va
iniziata.

**Perché non installazioni presso tre laboratori.** Era la proposta precedente e
va scartata per tre motivi che il resto del documento rende evidenti: violerebbe
il cancello di §7, perché un'installazione raggiungibile senza autenticazione è
esattamente ciò che quel cancello vieta; richiederebbe comunque partita IVA e
trasmissione allo SdI (§3 F2), perché *"fattura fatta a mano"* verso un'impresa
italiana non è conforme dal 2019; e trasformerebbe la migrazione di F1 da 1-a-N
in 3-a-N, con le collisioni di `slug` e `name` che F1 stessa identifica — cioè
renderebbe più costosa la fase che dovrebbe proteggere.

Se si vuole comunque mettere il prodotto in mano a qualcuno prima di F1, l'unica
forma difendibile è **installazione locale sulla rete del laboratorio**, non
raggiungibile da internet, come già prescrive `SECURITY.md`.

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
`organizzazioneId` **non nullo**, con indice.

Il dato di sistema sta in un'**organizzazione di sistema** con id fisso, non in
un campo nullo. La ragione non è, come diceva una versione precedente di questo
documento, che una chiave nullable impedisca Row Level Security: una policy
`org_id = current_setting(...) OR org_id IS NULL` funziona esattamente come
funziona `OR org_id = '<sistema>'`. Quell'argomento era falso e va scartato.

Le ragioni vere sono tre, più modeste: una colonna `NOT NULL` con vincolo di
chiave esterna è verificabile dal database invece che per convenzione; l'indice
non deve gestire i NULL; e un `INSERT` che dimentica l'organizzazione fallisce
subito invece di creare in silenzio una riga visibile a tutti.

Gli ingredienti e i preset di sistema appartengono quindi a
un'**organizzazione di sistema** con id fisso e noto, e la loro non
modificabilità resta espressa dai flag che lo schema ha già: `isSystemPreset`
(`schema.prisma:249`) e `isCustom` (`schema.prisma:111`). Non se ne introduce un
terzo.

**Le unicità globali vanno rese composite, e senza questo F1 va rifatto.** Oggi
`Ingredient.name`, `Ingredient.slug` (`schema.prisma:66-67`) e `Recipe.slug`
(`schema.prisma:129`) sono `@unique` su tutto il database. Al secondo cliente:
`createIngredient` (`src/app/actions/ingredients.ts:18`) risponde *"Esiste già un
ingrediente chiamato Panna 38%"* — che è insieme un blocco funzionale e una fuga
di informazione su un altro laboratorio attraverso un messaggio d'errore; e
`uniqueSlug` (`src/lib/slug.ts:34`) fa uno scan globale, così il laboratorio B si
ritrova `fior-di-latte-2` negli URL perché il laboratorio A ha usato quel nome
prima. Servono `@@unique([organizzazioneId, name])` e simili, e `uniqueSlug` e
`createIngredient` devono ricevere l'organizzazione come parametro.

**Le tabelle da tenantizzare sono otto, non quattro.** Oltre a `Recipe`,
`Ingredient`, `CalibrationPreset` e `RecipeSnapshot`, restano fuori
`RecipeIngredient` (`schema.prisma:159`), `SnapshotIngredient` (`:195`) e
`Collection` (`:258`). Se la difesa è RLS, una tabella senza policy è leggibile
per intero: le righe di ricetta contengono le quantità, cioè la formula. Vanno
tenantizzate anche loro, o coperte da una policy che risalga al genitore.

**Cosa riceve un'organizzazione nuova.** Oggi `prisma/seed.ts` crea globalmente
33 ingredienti, 12 preset e 15 ricette dimostrative. All'iscrizione un
laboratorio deve vedere ingredienti e preset di sistema — condivisi, non copiati
— e **nessuna ricetta dimostrativa**: le ricette demo sono utili in sviluppo e
confondenti in un ricettario vero.

**I nomi possono collidere col sistema.** `@@unique([organizzazioneId, name])`
lascia creare un ingrediente "Panna 38%" identico a quello di sistema: due voci
uguali nella stessa lista, nessun errore. Va deciso se vietarlo o se la voce
propria prevale su quella di sistema. Stesso problema per i preset, che oggi non
hanno alcun vincolo di unicità sul nome.

Due campi già presenti vanno decisi, non ignorati: `Recipe.ownerId`
(`schema.prisma:151`, commentato "predisposizione auth v2") va riusato o rimosso,
e `Collection` (`schema.prisma:258`) **va eliminata nella migrazione di F1**: è
codice morto, zero riferimenti in `src/`, e il suo `recipes String[]` di id senza
vincolo referenziale non è tenantizzabile per relazione. Tenerla significherebbe
mantenere una tabella senza difese per una funzione che non esiste.

**Autenticazione: link magico via email.** L'alternativa OAuth resta possibile ma
non è una scelta da rimandare all'implementazione: cambia le tabelle di sessione,
e F1 è la fase che definisce lo schema. Il link magico evita di gestire password,
che per un utente solo per laboratorio è il compromesso giusto.

Le tabelle che ne conseguono, e che lo schema qui sopra ometteva pur essendo
l'argomento per cui la scelta va fatta ora:

```
Sessione       id, utenteId, scadenza, creataIl
TokenAccesso   hash, email, scadenza, usatoIl
```

E una dipendenza che nessuna sezione nominava: **un fornitore di posta
transazionale**. Se l'email non arriva nessuno entra, quindi è un punto di guasto
del prodotto, non un dettaglio; è un costo che §4 non conta; ed è un
sub-responsabile da dichiarare nel DPA di F4, perché tratta gli indirizzi dei
clienti.

*Rischio principale:* un filtro dimenticato in una query espone i dati di un cliente a un altro. Il presidio non è la revisione umana ma un test che percorra **ogni** server action con due organizzazioni popolate e verifichi che nessuna veda l'altra — lo stesso trattamento che hanno già gli escaping in `export.test.ts`.

*Fatto quando:* due organizzazioni coesistono nello stesso database, il test di isolamento gira in CI, e i dati preesistenti sono migrati senza perdita.

### F2 — Fatturazione

- Integrazione Stripe: prodotti, prezzi, portale di gestione, webhook per lo stato dell'abbonamento.
- Stato del piano come dato dell'organizzazione, non del singolo utente.
- Periodo di prova senza carta di credito.
- Gestione dei fallimenti di pagamento: sospensione in sola lettura, mai cancellazione dei dati.

**Fattura elettronica: è un cancello, non un adempimento successivo.** Vendere
abbonamenti a gelaterie italiane significa vendere B2B a soggetti IVA, e quindi
emettere **fattura elettronica XML attraverso lo SdI**. Stripe non lo fa e non lo
farà: emette ricevute, non FatturaPA. Servono partita IVA propria, raccolta di
P.IVA e codice destinatario o PEC al momento dell'iscrizione, un intermediario
per la trasmissione (Fatture in Cloud, Aruba, ACube o equivalenti), note di
credito automatiche sui rimborsi, e la gestione di OSS o inversione contabile se
un cliente è estero.

Senza questo, il criterio qui sotto può risultare soddisfatto mentre il servizio
incassa in modo non conforme — che non è un difetto di prodotto ma un problema
fiscale. L'intermediario va scelto **prima** di scrivere il primo webhook Stripe,
perché determina quali dati vanno raccolti al checkout.

*Fatto quando:* un abbonamento si sottoscrive, si aggiorna, si mette in pausa e
si disdice senza intervento manuale; lo stato sopravvive a un webhook perso; e
per ogni incasso parte una fattura elettronica valida senza che nessuno la scriva
a mano.

**Regole che vanno decise qui, perché sono i primi `if` che Stripe impone.** Chi
ha pagato l'annuale a marzo, a novembre non congela nulla: la pausa invernale
riguarda il mensile, e sull'annuale lo sconto la sostituisce. Un pagamento
mensile fallito che si trascina oltre trenta giorni diventa disdetta, e da lì
partono i 90 giorni di conservazione di §8. Una richiesta esplicita di
cancellazione vince sempre sulla conservazione, anche durante una sospensione.
Senza queste tre righe, chi implementa F2 le inventa.

### F3 — Jarvis gratuito *(anticipata in V, vedi sopra)*

Resta numerata qui per continuità, ma **si esegue durante V**: non dipende dal
multi-tenant, e senza di essa qualunque prova reale della voce costa la colonna
sinistra di §4.

Parser deterministico come percorso normale (§5). È in questa fase perché è ciò che rende la voce includibile in ogni piano senza costo marginale — vedi i conti in §4.

**Il ripiego va portato sul modello economico, e non è il cambio di una
costante.** Tutta la colonna su cui §4 costruisce i prezzi assume Haiku, ma
`src/app/api/voice/interpret/route.ts:25` usa `claude-opus-5`, e la richiesta
passa `output_config: { effort: "low" }` (riga 74), parametro che i modelli della
famiglia Haiku non accettano. Serve: modello configurabile da variabile
d'ambiente, parametri condizionati al modello scelto, e una verifica reale che la
risposta arrivi.

Va sistemato nello stesso passaggio anche `max_tokens: 1024` (riga 67): su Opus 5
il ragionamento è attivo di default e consuma quel budget, quindi un turno che
pensa a lungo viene troncato, la risposta non contiene alcun blocco `tool_use`, e
la riga 100 lo degrada in un `unsupported` indistinguibile da una frase non
capita — falsando la metrica di §9.

*Fatto quando:* i comandi dell'elenco in §5 funzionano senza rete e senza chiavi
configurate; il ripiego si attiva solo se qualcuno lo configura; e il modello del
ripiego è quello su cui §4 ha fatto i conti, verificato con una chiamata reale.

### F4 — Conformità e fiducia

- Privacy policy, condizioni d'uso, contratti di trattamento dati con i fornitori.
- Export completo e cancellazione dell'account, per obbligo GDPR e per togliere l'obiezione del vincolo.
- Registro degli accessi ai dati.
- Backup con procedura di ripristino **provata**, non solo configurata.

*Fatto quando:* un cliente può scaricare tutto ciò che è suo e cancellare l'account da solo, e un ripristino da backup è stato eseguito davvero almeno una volta su dati reali.

### F5 — Ciò che giustifica il piano superiore

- Ruoli e permessi per i collaboratori: chi modifica i preset, chi solo consulta. Il numero di utenti non è limitato in nessun piano (§4).
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

### Ciò che quella tabella non conta

Tre voci mancano, e insieme cambiano la conclusione.

**La trascrizione, che il parser non tocca.** Azure Speech è a consumo, circa
1 $ per ora di audio, e il parser lavora sul testo *già trascritto*: non abbatte
un centesimo di questa voce. A quattro secondi per comando, l'utente pesante
genera ~6,7 h di audio al mese, cioè **~6 €** — più del costo di interpretazione
col parser davanti. Il tier gratuito F0 di Azure copre 5 ore al mese **sulla
nostra sottoscrizione totale**, non per cliente: si esaurisce col terzo
laboratorio.

**Le commissioni di incasso.** Stripe prende circa 1,5% + 0,25 € su carta
europea: ~0,84 € su un abbonamento da 39 €.

**L'IVA.** I prezzi in §4 sono da intendersi **IVA esclusa**, perché il cliente è
un soggetto IVA che la detrae. Su un listino B2C sarebbe un'altra cifra, ed è la
distinzione che rende onesto il confronto con "il ricavo di poche vaschette".

Rifatto il conto con tutto dentro, il margine lordo sull'utente pesante sta
**sopra il 70%**, non sopra il 90% come diceva una versione precedente di questo
documento. Resta sano; ma il numero giusto è quello, e la voce dominante non è il
modello linguistico: è la trascrizione.

**Le assunzioni sotto la tabella, perché sia rifacibile.** ~3.000 token di
ingresso e ~150 di uscita per comando; quattro secondi di audio per comando;
cambio 1 € = 1,08 $. Sono i numeri che generano le cifre sopra, e vanno
ricontrollati quando cambia il prompt: il contesto cresce col catalogo del
cliente (§5), quindi 3.000 è un valore iniziale, non una costante.

**Quattro secondi è un pavimento, non una misura.** Oggi il riconoscimento apre
il microfono e lo tiene aperto finché non arriva una frase completa, senza alcun
timeout (`src/features/voice/use-speech-recognition.ts`): esitazioni, silenzi e
rumore di laboratorio vengono fatturati. A dieci secondi effettivi per comando il
margine sull'utente pesante scende dal 74% al 51%. **Va misurato prima di
pubblicare qualunque margine, e va messo un timeout nel codice** — che è una
correzione di costo indipendente da questo documento.

**Conseguenza sulla trascrizione.** Se il margine deve salire, la leva non è il
parser ma passare a Web Speech del browser, che costa zero e scala all'infinito.

Il prezzo però non è solo la copertura — Chrome ed Edge contro i quattro browser
promessi in §8. **Web Speech manda l'audio ai server di Google**, ed è esattamente
la fuga che §5 dedica una sezione a denunciare per il modello linguistico: qui
uscirebbe la voce del gelatiere che detta la sua formula. È anche un dietrofront,
perché Azure è stato scelto proprio per questo. Resta una scelta aperta, ma il
suo costo vero è di riservatezza, non di compatibilità.

### Una nota sulla cache, perché il documento sembrava contraddirsi

La tabella sopra usa i costi **a cache fredda**, mentre il contesto vocale è
progettato apposta per sfruttare la cache (`src/features/voice/context.ts`, con
un test che protegge la separazione). Non è una contraddizione ma una scelta
prudenziale: si dimensiona sul caso peggiore. Due precisazioni che il documento
prima non faceva:

- il TTL della cache **è un parametro**, non una costante: esiste l'opzione a
  un'ora invece dei cinque minuti predefiniti, e sposterebbe molti comandi nella
  colonna calda. Va valutata prima di dare per persa la cache;
- il prefisso cacheabile contiene l'elenco delle ricette, che `createRecipe`,
  `setRecipeName` e `duplicateRecipe` modificano: **la cache si autoinvalida
  proprio mentre l'utente lavora**. È un motivo in più per togliere quell'elenco
  dal contesto, come chiede §5.

### Struttura

**Due piani, per laboratorio e non per postazione.** Un laboratorio da tre persone che deve contare le licenze smette di usare il prodotto. Il valore è la ricetta, che è una per laboratorio.

Per questo **nessuno dei due piani limita il numero di utenti**: una versione
precedente dava un solo utente a Sol, che era esattamente il conteggio di licenze
dichiarato letale due righe sopra. Luna si distingue per **ruoli e permessi** —
chi può modificare i preset, chi solo consultare — non per quante persone
entrano. I tetti veri sono quelli di consumo, e sono per laboratorio.

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
| Utenti per laboratorio | illimitati, senza ruoli | illimitati, con ruoli e permessi |
| Storico prezzi ingredienti e costi nel tempo | — | ✓ |
| Scheda di produzione brandizzata | — | ✓ |
| Supporto | email | prioritario |
| Comandi vocali al ripiego linguistico | 1.000/mese | 5.000/mese |
| Minuti di audio dettato | 300/mese | 1.200/mese |

Il tetto sull'ultima riga riguarda **solo** le frasi che il parser non capisce.
Superato il tetto il Jarvis continua a funzionare col parser: non si spegne, si
limita alle forme che conosce.

I tetti sono **per laboratorio**, non per persona: i cinque utenti di Luna li
consumano insieme. Luna ne ha cinque volte gli utenti di Sol e cinque volte i
ripieghi, così il rapporto per persona non peggiora salendo di piano — con 4.000
sarebbe stato 800 a testa contro i 1.000 di Sol, cioè si sarebbe pagato il doppio
per averne meno.

I numeri vengono dalla tabella dei costi, non da un'intuizione. Al tasso di
ripiego del 15% assunto sopra, 1.000 ripieghi corrispondono a ~6.600 comandi al
mese, cioè ~220 al giorno: appena sopra la riga "pesante" della tabella, che
altrimenti il tetto avrebbe tagliato — una versione precedente di questo documento
fissava 500, e con quel numero l'utente pesante che la tabella modella non
sarebbe potuto esistere. A costo Haiku e cache fredda i due tetti valgono circa
3,60 € e 14,40 € al mese di costo nostro, nel caso peggiore in cui vengano
davvero esauriti.

**Serve un secondo tetto, sui minuti di audio.** Il primo limita il ripiego
linguistico, che §4 stessa dimostra **non** essere la voce dominante: la
trascrizione lo è, e il parser non la tocca. Un laboratorio che detta mille
comandi al giorno tutti capiti dal parser ci costa zero di modello e decine di
euro di Azure — cioè il meccanismo pensato per proteggere il margine non
toccherebbe la voce che lo consuma. Quindi: **300 minuti di audio al mese per Sol
e 1.200 per Luna**, che agli stessi tassi coprono i profili della tabella con
margine.

**Come si applicano.** Quote mensili per **organizzazione**, non per utente e non
per indirizzo IP, con azzeramento al rinnovo dell'abbonamento e non a data fissa.
Sopra il tetto dei ripieghi il parser continua da solo; sopra quello dell'audio
la dettatura si ferma e resta la tastiera. È il rate limit di §7 a farli
rispettare, quindi non sono implementabili prima di F1 — "per organizzazione"
richiede che l'organizzazione esista.

**Il caso peggiore, contato per intero.** Luna al tetto di entrambi: 4.000
ripieghi (14,40 €), 1.200 minuti di audio (~18 €), incasso (1,44 €), totale
~34 € su 79 €, cioè **margine 57%**. Non "sopra il 70%": quel numero vale al
profilo medio, non al tetto. Una versione precedente dichiarava 3,60 € e 14,40 €
come caso peggiore contando la sola interpretazione.

La differenza fra i piani sta sul **solver e sulle versioni**, cioè su ciò che ha valore professionale — non sulla voce. La voce costa quasi nulla grazie al parser, e metterla nel piano alto significherebbe rinunciare a farla provare proprio a chi deve affezionarsi al prodotto.

### La stagionalità è la variabile principale

Molte gelaterie italiane chiudono o rallentano da novembre a febbraio. Un abbonamento mensile viene disdetto a ottobre e forse non torna a marzo.

Due contromisure, non alternative:

- **Prezzo annuale scontato in modo aggressivo**, dodici mesi al prezzo di dieci, incassato a inizio stagione quando il gelatiere ha appena chiuso l'estate.
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

Con questi numeri e **tutti** i costi contati sopra — interpretazione,
trascrizione, incasso — il margine lordo sull'utente pesante sta sopra il 70%.
Il rischio non è il costo: è che il mercato non compri software a nessun prezzo.

I prezzi si intendono **IVA esclusa**: il cliente è un soggetto IVA che la
detrae.

**Come validare:** è la fase V di §3, che vale per tutto il documento. Non ci sono programmi di validazione alternativi.

**Periodo di prova: 30 giorni senza carta**, che copre l'apertura di stagione ed
è il momento in cui il gelatiere rifà le ricette.

## 5. Jarvis

### Il confine che non si sposta

Il prodotto è impegnato a **non usare modelli linguistici nei calcoli** (vincolo 2 in §11; il documento `PRODUCT.md` che lo enuncia per esteso vive oggi solo nel branch del redesign e non è ancora su `main`). Il Jarvis lo rispetta perché la linea passa nel punto giusto: **il modello sceglie quale azione e con quali parametri, e nient'altro.**

"Aggiungi duecentocinquanta grammi di panna" diventa una chiamata alla stessa funzione che invoca il pulsante. Il 250 è un parametro trascritto, non calcolato. POD, PAC e solidi restano di `src/domain/`. Le metriche che il Jarvis può riferire gli arrivano già calcolate e già formattate, apposta perché le legga soltanto.

### Interprete combinato

**Parser deterministico come percorso normale.** Il vocabolario è chiuso: sedici comandi, ingredienti da un catalogo noto, numeri in italiano. Non è comprensione del linguaggio aperta, è parsing di un dominio ristretto. Costo zero, nessuna rete, nessuna latenza, e a parità di frase fa sempre la stessa cosa — coerente con un prodotto che dichiara un solver deterministico.

**Modello linguistico come ripiego opzionale**, per le parafrasi che il parser non copre. Lo strato è indifferente al fornitore: Claude, GPT o un modello locale si sostituiscono cambiando un solo file, perché tutto ciò che sta a valle lavora sul tipo `VoiceCommand` e non sa da dove venga.

Questa indifferenza è deliberata. Il fornitore migliore fra due anni non è quello di oggi, e il costo per token è la voce che si muove di più.

### Vocabolario

Sedici comandi, chiusi. È questa chiusura che rende possibile il parser
deterministico: non serve capire l'italiano, serve capire sedici forme.

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
senza attrito; il resto chiede conferma. La distinzione vive in
`needsConfirmation`, non nel giudizio di chi legge il codice.

Il criterio esatto è **"non annullabile con un undo"**, non "scrive sul server":
`runCalibration` è nel set delle conferme e non scrive niente
(`src/app/actions/solver.ts:13` fa tre letture), ma è lenta e porta altrove, e
interromperla a metà lascia l'utente in una pagina che non ha chiesto. Chi
aggiunge il diciassettesimo comando applica quel criterio, non l'altro.

Un caso che la tabella classifica male: `navigate` è segnato "non modifica", ma
l'idratazione dell'editor azzera la cronologia di undo
(`src/stores/editor-store.ts:58`). Un "vai alla calibrazione" detto con modifiche
non salvate le perde, e l'undo non le riprende. Va trattato come i comandi con
conferma quando lo store è `dirty` — cioè chiedere, non navigare e basta.

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

### La ricetta esce dal perimetro, e va detto

§2 costruisce la leva commerciale sul fatto che le ricette sono il segreto
industriale del cliente. Il ripiego linguistico manda quel segreto a un fornitore
esterno: `renderState` (`src/features/voice/context.ts:109`) invia la ricetta
aperta riga per riga, ingrediente e grammi, e `renderCatalog`
(`context.ts:72`) invia **l'elenco completo delle ricette del laboratorio con i
loro nomi**.

Portare la chiave del cliente non risolve niente: cambia chi paga, non dove
vanno i dati.

**Una sola delle misure qui sotto è un rimedio; le altre due sono costo e
conformità.** Il segreto industriale è la formula, ed è in `renderState`: quella
non è rimovibile, è tutto il punto dell'assistente. L'unico controllo reale è
poter spegnere il ripiego.

- un **interruttore per organizzazione** "non inviare mai le mie ricette a un
  modello esterno", che disattiva il ripiego e lascia il solo parser;
- il fornitore dichiarato come sub-responsabile nel DPA di F4, e nominato nella
  privacy policy;
- il catalogo delle ricette **fuori** dal contesto inviato — che è una riduzione
  di esposizione e di costo, non una protezione della formula. Attenzione però:
  `navigate` e `addIngredient` istruiscono il modello a scegliere fra gli id del
  contesto e a non inventarli (`src/features/voice/commands.ts`). Togliere il
  catalogo senza risolvere prima i nomi lato client rompe entrambi.

L'ultima è anche un problema di costo che §4 non modella: `renderCatalog` invia
tutte le ricette a ogni richiesta, quindi **il costo per comando cresce con la
dimensione del cliente**. Il laboratorio con trecento ricette — cioè quello
affezionato, cioè quello che si vuole — costa per comando molto più di quello con
cinque.

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

### E non sono i soli

Un cancello che elenca è un cancello che si dimentica qualcosa. Verificato con
`grep` su tutto `src/`: **non esiste alcun controllo di sessione, in nessun
punto**. Quindi:

- `GET /api/recipes/[id]/export` restituisce **la ricetta completa con le
  quantità** dato un id, senza autenticazione — cioè esattamente l'oggetto che §2
  chiama segreto industriale. I cuid non si indovinano a forza bruta, ma finiscono
  negli URL, nella cronologia del browser, nei referer e nei log dei proxy.
- Le **server action sono endpoint HTTP pubblici**: `runCalibration(recipeId,
  presetId)` accetta qualsiasi id da chiunque sappia invocarla. Vale per tutte.

**Il cancello, nella sua forma corretta:** nessuna route e nessuna server action
risponde senza una sessione valida, e ogni accesso a un'entità verifica che
appartenga all'organizzazione della sessione. Non "i due endpoint vocali".

Il limite di frequenza serve anche a noi, non solo contro l'abuso: è il
meccanismo con cui il tetto sul ripiego linguistico di §4 viene applicato davvero
invece che sperato.

**Abuso del periodo di prova.** Trenta giorni senza carta (§3) più endpoint che
chiamano API a pagamento significa costo per noi a ogni email nuova. Il tetto per
organizzazione lo limita solo se anche la **creazione di organizzazioni** è
limitata: un indirizzo email verificato per organizzazione, e un tetto di prova
più basso di quello a pagamento.

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
| Comando vocale col parser | **da misurare**, obiettivo 2 s | Oltre, conviene il mouse. Ma il percorso col parser contiene gli stessi token Azure, lo stesso streaming fino a fine frase e l'import dell'SDK del percorso col ripiego: il parser non toglie nessuna delle incognite che rendono non dichiarabile la riga sotto |
| Comando vocale col ripiego linguistico | **da misurare** | Nessuna misura esiste: la chiamata reale al modello non è mai stata eseguita (§1). Quel budget deve contenere token Azure, streaming fino a fine frase, andata e ritorno al modello, validazione ed esecuzione. Dichiararlo prima di misurarlo sarebbe inventarselo |
| Disponibilità | 99% mensile | Circa 7 ore di fermo al mese. Onesto per un servizio a questo prezzo; prometterne di più significa doverlo mantenere |
| Perdita dati massima accettabile | 24 ore | Con backup a punto nel tempo si sta molto sotto, ma è il limite che ci impegniamo a rispettare |
| Browser | ultime due versioni di Chrome, Edge, Firefox, Safari | La voce con Azure Speech li copre tutti; con Web Speech resterebbe ai primi due |
| Conservazione dati dopo la disdetta | 90 giorni, poi cancellazione | Il tempo perché un gelatiere ci ripensi a inizio stagione, senza tenere dati per sempre |

L'applicazione è pensata per desktop e tablet in laboratorio. Il telefono deve funzionare per consultare, non necessariamente per formulare.

## 9. Metriche

Poche, e scelte perché possano dire che stiamo sbagliando.

**Il prodotto funziona se:** un laboratorio che ha creato la prima ricetta ne ha almeno cinque dopo un mese, e torna almeno una volta a settimana durante la stagione. Una sola ricetta e nessun ritorno significa che l'hanno provato e non gli è servito.

**Il Jarvis funziona se**, misurato **per organizzazione** e non in aggregato —
un laboratorio al 40% di ripiego resta invisibile dentro una media del 10%, e il
rischio di §12 riguarda il singolo utente pesante:

- la quota di comandi risolti dal parser sta **sopra l'85%** — è la metrica di
  costo;
- la quota di **ripieghi** che tornano `unsupported` sta sotto il 15% — è la
  metrica di qualità.

Le due misurano cose diverse su denominatori diversi. Una versione precedente le
metteva entrambe sui comandi totali, dove la seconda era un sottoinsieme della
prima e non poteva scattare da sola.

L'85 non è un numero tondo scelto a caso: è esattamente l'assunzione su cui §4
costruisce i prezzi, cioè un ripiego al 15%. Una versione precedente di questo
documento faceva scattare l'allarme all'80%, lasciando una fascia fra il 15% e il
20% in cui il costo per utente era già salito di un terzo e nessuna metrica
suonava. La soglia d'allarme e l'assunzione economica devono essere lo stesso
numero, altrimenti il monitoraggio è tarato per non accorgersi del problema che
esiste per sorvegliare.

Va misurato anche il **motivo** di ogni `unsupported`: oggi un troncamento per
`max_tokens` e una frase incomprensibile producono lo stesso esito
(`src/app/api/voice/interpret/route.ts:100`), e confonderli significa leggere un
guasto tecnico come un limite di comprensione.

**Il prezzo funziona se:** l'abbonamento sopravvive al primo inverno. La disdetta di ottobre è il momento della verità, non l'iscrizione di marzo.

**Nulla di tutto questo è misurabile oggi.** Non esiste una riga di telemetria
nel repository e nessuna fase la introduce: le metriche qui sopra sono, allo
stato, dichiarazioni di intento. Serve una tabella minima —
`EventoUso(organizzazioneId, tipo, comando, esito, creatoIl)` — scritta dalle
stesse azioni che già eseguono i comandi, e va aggiunta a **F1**, perché senza
`organizzazioneId` non si può segmentare per laboratorio come questa sezione
richiede.

**Segnale che qualcosa è rotto:** un laboratorio che smette di salvare versioni continuando a usare l'editor. Vuol dire che non si fida dello storico, ed è il primo passo verso il ritorno al foglio di calcolo.

## 10. Quanti clienti servono

Il documento fin qui dice quanto costa servire un cliente. Non diceva quanti ne
servono, che è la domanda che decide se il progetto ha senso.

Con Sol a 39 € al mese, IVA esclusa, e il costo variabile di §4 — ~10 € al
profilo pesante, che arrotondo a 12 € per tenere margine sull'incertezza dei
secondi di audio — restano circa 27 € al mese per cliente. Su questi vanno i costi fissi: database gestito,
esercizio, dominio, intermediario per le fatture — realisticamente 100-200 € al
mese all'inizio.

| Clienti | Ricavo lordo annuo | Cosa significa |
|---|---|---|
| 10 | ~4.700 € | Copre i costi fissi. Non paga nessuno |
| 50 | ~23.000 € | Un progetto collaterale, non un lavoro |
| 200 | ~94.000 € | Una persona a tempo pieno, senza margine per crescere |
| 500 | ~234.000 € | Un'attività |

**§6 dimensiona l'infrastruttura per "decine di laboratori". Quella riga e la
tabella qui sopra dicono cose diverse su cosa vogliamo essere**, ed è una
decisione che non ho gli elementi per prendere: cinquanta clienti e cinquecento
implicano prodotti, prezzi e architetture differenti.

**Il regime fiscale del venditore cambia due righe della tabella.** Il forfettario
si ferma a 85.000 € di ricavi: la riga da 200 clienti lo supera, quindi passa a
regime ordinario con contabilità piena. E finché si è in forfettario **l'IVA sugli
acquisti non si detrae**: Azure, Anthropic e Stripe in inversione contabile
portano il costo variabile da ~12 € a ~14,60 €. §4 argomenta l'IVA solo dal lato
del cliente e mai dal lato di chi vende.

La colonna "cosa significa" parla inoltre di **ricavo lordo**: da lì vanno tolti
i costi variabili, il commercialista, i contributi e l'imposta. "Una persona a
tempo pieno" alla riga da 200 è il lordo, non il reddito.

Il numero che manca per chiudere il ragionamento è quanti laboratori di gelateria
artigianale esistono in Italia e quanti sono raggiungibili. Senza quello, la
tabella dice quanto serve ma non se sia ottenibile — ed è una ricerca da fare
prima di F1, non dopo.

## 11. Vincoli che non cambiano

Valgono per ogni fase e per ogni funzione futura.

1. **Il dominio resta puro.** `src/domain/` non importa Prisma, Next o React.
2. **Nessun modello linguistico nei calcoli.** Le euristiche sono dichiarate tali nell'interfaccia.
3. **Onestà sui numeri.** Un target impossibile fallisce con un messaggio esplicito, non con una stima plausibile.
4. **Le versioni salvate sono immutabili.**
5. **Ogni comportamento nuovo ha un test; ogni bug corretto ha un test che fallisce prima della correzione.**

## 12. Rischi aperti

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
| Il parser copre meno dell'atteso | Il costo per utente sale come da §4 e il margine si assottiglia in silenzio | Misurare la quota risolta dal parser con soglia allineata all'assunzione economica (§9) |
| **Costruire un servizio che non ha clienti** | È il rischio più grave del piano: mesi di lavoro su isolamento e fatturazione senza sapere se qualcuno paga | F0 (§3): tre laboratori paganti prima di iniziare F1 |
| Fatturazione elettronica non conforme | Non è un difetto di prodotto, è un problema fiscale: si incassa in modo irregolare | Cancello dentro F2, intermediario scelto prima del primo webhook |
| Le ricette escono verso il fornitore del modello | Contraddice la leva commerciale di §2 ed è la prima obiezione che il gelatiere solleverà | Interruttore per organizzazione, sub-responsabile nel DPA, catalogo fuori dal contesto (§5) |
| Il modello economico assume Haiku su Foundry, mai verificato | §4 fa i conti su Haiku, ma nessuno ha confermato che sia esposto sulla risorsa Foundry, e `effort` — che il codice passa oggi — quella famiglia non lo accetta | Verificare disponibilità del modello **prima** dei prezzi, non solo `strict` e caching — le credenziali sono richieste in §13 |
| Rifiuto del fornitore su una frase innocua | Il modello può declinare una richiesta: la route non legge `stop_reason` e lo degrada in "Non ho capito", indistinguibile da un limite di comprensione | Leggere `stop_reason` e distinguere `max_tokens`, `refusal` e assenza di strumento (§9) |
| Responsabilità di prodotto | L'app tratta allergeni e produce stime euristiche; F5 promette una scheda stampabile e brandizzata. Un allergene mancante su un documento col marchio del laboratorio è un danno reale | Limitazione di responsabilità nelle condizioni d'uso (F4), non solo l'onestà in interfaccia del vincolo 3 |
| Abuso del periodo di prova | Prova senza carta più endpoint a pagamento significa costo a ogni email nuova | Limite anche sulla creazione di organizzazioni, non solo sull'uso (§7) |
| Catena di fornitura delle dipendenze | `ci.yml:36` usa `npm install` e `ci.yml:81` fa `npm audit \|\| true`: nulla ferma una dipendenza compromessa | Due parti, perché l'audit copre solo metà: renderlo bloccante, **e** tornare a `npm ci` generando il lockfile su Linux, altrimenti ogni build risolve versioni fresche. La causa del `npm install` è la potatura Windows registrata in `DECISIONS.md` |
| Nessuna telemetria | Ogni metrica di §9 è inverificabile, e senza numeri non si distingue un prodotto che funziona da uno che nessuno usa | Tabella `EventoUso` dentro F1 (§9) |
| Fuga dall'export delle ricette | `/api/recipes/[id]/export` restituisce la formula completa senza autenticazione: è la fuga concreta del segreto industriale, non un rischio teorico | Compresa nel cancello di §7, che ora copre tutte le route e le server action |
| L'email del link magico non arriva | Se la posta transazionale fallisce, nessuno entra: è indisponibilità totale con l'applicazione perfettamente in salute | Fornitore dichiarato in F1, con monitoraggio della consegna |
| Una persona sola | SLA 99% e perdita massima 24 h (§8) retti da chi non ha sostituti; §6 impegna a un ripristino provato senza dire chi lo esegue di notte | Da affrontare prima di promettere lo SLA, o ridurre la promessa |
| Cambio euro-dollaro | Prezzi in euro, costi dei modelli in dollari | Margine dimensionato con scorta; rivedere se il cambio si muove oltre il 10% |
| Il costo cresce col cliente | `renderCatalog` invia tutte le ricette a ogni comando: il cliente affezionato costa più di quello nuovo | Togliere il catalogo dal contesto (§5); è anche la correzione al problema di riservatezza |

## 13. Cosa serve da te

Domande che non posso risolvere leggendo il codice. Nessuna blocca il lavoro tecnico su F1.

**Nomi e strategia.** *Sol* e *Luna* e l'interprete combinato vengono da un'indicazione abbreviata (nota in cima). Confermali o correggili: sono due sezioni.

**Credenziali per la verifica.** La chiamata reale a Claude su Foundry non è mai stata eseguita — mancavano le credenziali. Servono un `ANTHROPIC_FOUNDRY_RESOURCE` e una chiave su una risorsa di prova per verificare che `strict`, `effort` e il prompt caching, che su Foundry sono in beta e non GA, siano davvero accettati. Finché non succede, il Jarvis è codice verificato nelle sue parti ma mai visto funzionare intero.

**Prezzi.** I numeri in §4 sono ipotesi, e il modo di validarli è la fase V di
§3 — non un programma separato. Una versione precedente ne conteneva tre diversi
e incompatibili: dieci interviste qui, tre laboratori gratuiti in §4, tre
laboratori paganti in §3. Ora è uno solo, con un criterio di arresto: sei
settimane, venti contatti, un incasso da uno sconosciuto.

**Decisioni che aspettano solo un sì.** Il redesign UI su `wip/ui-redesign` passa tutti e quattro i controlli ma non è mergiato, e `PRODUCT.md` vive solo lì. Il secret scanning è disattivato e su repository pubblico è gratuito (§7). I tre branch `fm/*` sul remote sono residui di PR mergiate mesi fa.

**La domanda che viene prima di tutte, e che è diventata F0.** Esiste già un
laboratorio disposto a pagare? Non a provare: a pagare. Se la risposta è no, F1
non va iniziata — va cercato quel laboratorio, ed è lavoro diverso dallo scrivere
codice. Se è sì, tre di loro valgono più di dieci interviste, perché il prezzo si
valida con soldi veri.

Questa era l'ultima riga della versione precedente del documento, sotto il titolo
"una cosa che non so". La sua posizione era la diagnosi: il piano trattava una
premessa non verificata come un vincolo di ingegneria. Ora è §3 F0.

**Quanto è grande il mercato.** Quanti laboratori di gelateria artigianale
esistono in Italia e quanti sono raggiungibili senza una rete di vendita. Serve
per §10, e non è una ricerca che posso fare io leggendo il codice.

**Quanto vale il tuo tempo.** §10 dice cosa rendono 50 o 500 clienti, ma non
se quel ritorno giustifichi i mesi di F1-F4. È una decisione tua e la tabella
esiste per renderla esplicita, non per prenderla al posto tuo.
