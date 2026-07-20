# DECISIONS.md

Decisioni autonome prese durante lo sviluppo di GelatoLab Pro, in ordine cronologico.

| Contesto | Decisione | Motivazione |
|---|---|---|
| Scelta del nome del pacchetto HiGHS | Usare `highs` (npm) invece di `highs-js` | `highs-js` non esiste su npm; `highs` (lovasoa) è il package HiGHS WASM ufficiale |
| Nome repository | `gelatolab-pro` | Coerente con il nome del progetto e lo slug del file prompt |
| Delivery mode | `no-mistakes` | Progetto con severi requisiti di qualità (typecheck, lint, test, build) che beneficia del pipeline di validazione |
| | | |
