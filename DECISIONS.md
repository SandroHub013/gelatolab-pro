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
