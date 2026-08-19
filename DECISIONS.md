# DECISIONS.md

Decisioni autonome prese durante lo sviluppo di GelatoLab Pro, in ordine cronologico.

| Contesto | Decisione | Motivazione |
|---|---|---|
| Scelta del nome del pacchetto HiGHS | Usare `highs` (npm) invece di `highs-js` | `highs-js` non esiste su npm; `highs` (lovasoa) è il package HiGHS WASM ufficiale |
| Nome repository | `gelatolab-pro` | Coerente con il nome del progetto e lo slug del file prompt |
| Delivery mode | `no-mistakes` | Progetto con severi requisiti di qualità (typecheck, lint, test, build) che beneficia del pipeline di validazione |
| | | |

## Decisioni di implementazione P0

| Contesto | Decisione | Motivazione |
|---|---|---|
| Prisma 7 driver adapters | Usare `@prisma/adapter-pg` + `pg`; rimosso `url` dal datasource (in `prisma.config.ts`) | Prisma 7 non supporta più `url` nello schema; richiede adapter lato client |
| DB in ambiente dev | PostgreSQL 18 installato localmente (apt); Docker Compose resta per deployment | Docker non disponibile nell'ambiente di esecuzione; serve un DB per validare `db:setup` e il flusso P0 |
| Export API route | Route API `/api/recipes/:id/export` per JSON e CSV invece di Server Action | download file necessita response stream nativo; separazione netta da azioni mutative |
| Print page server component | `src/app/recipes/[id]/print/page.tsx` rende una scheda tecnica stampabile con CSS `@media print` | Spec §9 richiede scheda stampabile; server component evita JS lato stampa |
| Preset pages | Pagine separate per lista, dettaglio e nuovo preset; dettaglio readonly per preset sistema | Parità con specifica; sistema vs personalizzato con badge visivo |
| RecipeMetrics type export | Rimosso `export type { RecipeMetrics }` da actions/recipes.ts | Causava errore Turbopack in build; type non serve in Actions (importato da `@/types`) |
| Scala POD/PAC | `podCoefficient`/`pacCoefficient` relativi al saccarosio=100. Metrica headline `pod`/`pac` = Σ(g·coeff)/pesoTotale×100 (convezione "% saccarosio-equivalente", range tipico 16-26). `podPerKg` = `pod`×10 | Allineata alla letteratura gelato artigianale (Penco/Della Scala) e produce range di preset sensati |
| "Grezzo" vs normalizzato | `podRaw`=Σ(g·coeff) memorizzato come contributo; headline `pod`=normalizzato in % | Formula spec "contributo=quantità×coeff" preservata; UI/preset usano il normalizzato |
| MSNF derivato | Se `msnfPercent` assente, derivato = proteine+lattosio+minerali per categorie latte; flag `msnfDerived` in UI | Spec §3: "derivalo e marcalo come derivato" |
| kcal stimate | Coefficienti: carboidrati/zuccheri 4 kcal/g, grassi 9, proteine 4, alcol 7, fibre 2, polioli 2.4 | Coefficienti Atwater standard; dichiarato come stima indicativa |
| Temperatura servizio stima | Euristica: T = -12 + (pac−24)×0.4 − (solidi−38)×0.15, clamp [-20,-6] | Stima indicativa coerente con PAC (anticongelante) e solidi; presentata come stima |
| Indice equilibrio | Composito 0-100 penalizzando deviazioni da target equi (solidi ~36%, zuccheri ~17%, grassi ~8%, PAC ~22, POD ~18) | Euristica trasparente per confronto rapido varianti solver |
| Snapshot denormalizzazione | `SnapshotIngredient` congela tutte le % e coeff dell'ingrediente al salvataggio | Storico immutabile: modifiche alla scheda ingrediente non alterano le versioni |
| shadcn base-nova + base-ui | Componenti UI su `@base-ui/react` (non radix); rimosso `@import "shadcn/tailwind.css"` inesistente | Scaffold fornito usa base-nova; il path `shadcn/tailwind.css` non è un package npm |

## Decisioni di implementazione P1 (completamento flusso §9 + fix review gate)

| Contesto | Decisione | Motivazione |
|---|---|---|
| Finding ingredient-pod-pac-zeroed (decisione capitano) | Omessi `podCoefficient`/`pacCoefficient` dal form nuovo ingrediente; resi opzionali in `IngredientInput` | `0 ?? x === 0` bloccava `resolveSeedCoefficients`; omettere attiva il fallback automatico. L'entità `Ingredient` li mantiene required (sempre popolati a post-creazione) |
| `resolveSeedCoefficients` senza dettaglio zuccheri | Se nessun breakdown (saccarosio/destrosio/...) è presente ma `sugarsPercent>0`, approssima il totale come saccarosio (POD/PAC=100) | Il form nuovo ingrediente raccoglie solo `sugarsPercent` totale; senza questo fallback ogni ingrediente custom resterebbe a POD/PAC=0 vanificando la decisione sopra. Gli ingredienti seed (che dichiarano il breakdown) non sono toccati (somma>0) |
| Finding preset-edit-404 (decisione capitano) | Creata pagina `/presets/[id]/edit` (server + form client con `updatePreset`) | La pagina di dettaglio linkava a una route inesistente; `updatePreset` era irraggiungibile dalla UI |
| `targetRangesSchema` Zod v4 | Sostituito `z.record(targetKeySchema, rangeSchema)` con `z.object({…TARGET_KEYS…}).partial()` | In Zod v4 un record con chiave enum richiede TUTTE le chiavi dell'enum; i preset specificano solo un sottoinsieme e la validazione falliva (bug latente esposto dal fix "validate-before-write") |
| Fix review gate importati | Cherry-pick dei commit no-mistakes `3475829` (print/export, autosave constraint, slug univoco, validazione preset) e `dc2edd2` (highs come `serverExternalPackages`) | Fix già scritti e ri-verificati dal pipeline no-mistakes; riutilizzo invece di riscriverli. La decisione POD/PAC del capitano sovrascrive la variante no-mistakes (che manteneva `0`) |

## Decisioni sull'assistente vocale e sul passaggio a servizio

| Contesto | Decisione | Motivazione |
|---|---|---|
| Confine fra modello e calcoli | Il modello sceglie *quale* azione e con *quali* parametri; non produce mai un numero che entri nella ricetta | Unico modo di avere un assistente vocale senza violare "nessun LLM nei calcoli". Le metriche che può riferire gli arrivano già calcolate e già formattate come stringhe, apposta perché le legga soltanto |
| Esecuzione dei comandi vocali | Passa dallo store e dalle server action esistenti, le stesse dei pulsanti | Una seconda strada verso il database sarebbe una seconda implementazione da tenere allineata, e divergerebbe |
| Conferma sulle azioni vocali | Solo su ciò che `zundo` non annulla, cioè le scritture sul server | Confermare ogni "aggiungi 200 g di panna" renderebbe la voce più lenta del mouse, cioè inutile. La regola è codificata in `needsConfirmation`, non lasciata al giudizio di chi legge |
| Validazione dei comandi | `toCommand` rivalida lato applicazione anche con `strict: true` attivo sull'API | La garanzia di schema vive su un servizio esterno; il dispatcher non deve poter ricevere grammi come stringa o una variante di solver inesistente |
| Varianti del solver nel vocabolario vocale | Derivate da `SOLVER_VARIANT_LABELS` invece di riscritte | Le avevo ipotizzate `aggressive`; sono `minimal \| balanced \| cost`. Derivarle fa seguire da sole eventuali rinomine in `src/types/solver.ts` |
| Divisione del contesto vocale | Catalogo (stabile) prima del punto di cache, stato della ricetta dopo | Mescolarli farebbe invalidare il prefisso a ogni battuta: la cache smetterebbe di valere e il guasto si vedrebbe solo in bolletta. Un test protegge la separazione |
| Chiave di trascrizione | Mai nel browser: `/api/voice/speech-token` rilascia un token con scadenza 10 minuti | L'SDK di Azure Speech gira lato client; con `fromSubscription` la chiave finirebbe nel bundle |
| Caricamento dell'SDK vocale | `import()` dinamico | Pesa 369 KB. Verificato che la home in build di produzione non referenzi quel chunk |
| Interprete: parser prima del modello | Parser deterministico come percorso normale, modello linguistico come ripiego opzionale | Non è un'ottimizzazione ma la condizione economica del prodotto in abbonamento: a cache fredda un utente pesante costa 104 €/mese su Opus e 3,13 € con il parser davanti |
| Fornitore del modello | Strato di interpretazione indifferente al fornitore | Il migliore fra due anni non è quello di oggi, e il costo per token è la voce che si muove di più. A valle tutto lavora sul tipo `VoiceCommand` |
| Subscription consumer come credenziale | Escluse a monte (Claude Pro, ChatGPT Plus, Gemini Advanced) | Licenziate per uso personale attraverso l'interfaccia del fornitore; alimentarci un'altra applicazione ne viola le condizioni. Le subscription cloud (Azure, AWS, GCP) sono invece nate per questo |
| Ordine delle fasi verso il SaaS | Multi-tenancy prima di tutto il resto del **codice di prodotto** | Lo schema non ha utenti né laboratori: esposto in rete è una violazione di dati. Codice sui piani scritto prima sarebbe da buttare |
| Validazione prima della costruzione (rivisto) | Una fase V di due settimane precede F1: pre-ordine da uno sconosciuto, dimensione del mercato, e il parser | Il piano metteva mesi di infrastruttura prima di sapere se esiste un compratore, e ammetteva in fondo di non saperlo. Tre installazioni assistite presso conoscenti non sarebbero state una validazione: dimostrano che tre persone accettano un favore. Il parser entra qui perché è l'unica fase indipendente dal multi-tenant, e senza di essa ogni prova reale della voce costa la colonna Opus di SPEC.md §4 |
| Timeout sul riconoscimento vocale | **Due** limiti: 8 s di silenzio riarmabile, più un tetto assoluto di 60 s per sessione | Azure fattura l'audio a tempo. Il solo timer di silenzio non basta: in laboratorio il rumore produce risultati parziali che lo riarmano all'infinito, e senza tetto il soffitto reale diventa la scadenza del token — dieci minuti di audio contro i quattro secondi di un comando. Il solo tetto fisso non basta a sua volta, perché taglierebbe a metà chi comincia a parlare tardi |
| Test dei limiti vocali | Montare l'hook vero con l'SDK simulato, non replicare la politica nel test | Un test che riscrive la logica del timer passa anche cancellando i timer dall'hook: verifica `setTimeout`, non il prodotto. Verificato per mutazione che i test falliscano davvero togliendo il tetto (1 fallimento) e la guardia sul riarmo (2) |
| Ambiente di test DOM | `@vitest-environment jsdom` solo nel file che monta l'hook | La configurazione globale resta su `node` come deciso in origine; è l'unico file del repository che richieda un documento |
| Lockfile generato da Windows | Reinserire a mano le voci `@emnapi` solo-Linux prima di committare | `npm install` su Windows le pota, come descritto nel commento dentro `ci.yml`. Va rifatto ogni volta che si tocca il lockfile da Windows |
