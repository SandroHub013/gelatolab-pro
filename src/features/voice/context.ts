/**
 * Il contesto che il modello riceve per interpretare un comando.
 *
 * Diviso in due blocchi di proposito. Il **catalogo** cambia raramente e apre
 * il prompt, quindi entra nella cache di Anthropic e dalla seconda richiesta in
 * poi costa un decimo. Lo **stato** cambia a ogni comando e viene dopo il punto
 * di cache: se i due fossero mescolati, ogni singola battuta invaliderebbe
 * l'intero prefisso e la cache non servirebbe a niente.
 *
 * Modulo puro: nessun import di React o Prisma, cosi' i test lo caricano da soli.
 */

export interface VoiceCatalogItem {
  id: string;
  name: string;
  category?: string;
}

export interface VoiceRecipeRow {
  rowId: string;
  ingredientName: string;
  grams: number;
  locked: boolean;
}

/**
 * Metriche gia' calcolate da `src/domain/`. Il modello puo' leggerle e
 * riportarle, mai ricalcolarle: sono stringhe gia' formattate proprio per
 * togliergli la tentazione di fare aritmetica.
 */
export interface VoiceMetrics {
  pesoTotale: string;
  solidi: string;
  zuccheri: string;
  grassi: string;
  pod: string;
  pac: string;
  equilibrio: string;
  costoPerKg: string;
}

export interface VoiceContext {
  page: string;
  ingredients: VoiceCatalogItem[];
  presets: VoiceCatalogItem[];
  recipes: VoiceCatalogItem[];
  openRecipe?: {
    id: string;
    name: string;
    family: string;
    batchWeightGrams: number;
    rows: VoiceRecipeRow[];
    metrics?: VoiceMetrics;
    warnings?: string[];
  };
}

function table(rows: string[][], header: string[]): string {
  return [header, ...rows].map((r) => r.join(" | ")).join("\n");
}

/** Blocco stabile: catalogo ingredienti, preset e ricette. Va in cache. */
export function renderCatalog(context: VoiceContext): string {
  const ingredients = table(
    context.ingredients.map((i) => [i.id, i.name, i.category ?? ""]),
    ["id", "nome", "categoria"],
  );
  const presets = table(
    context.presets.map((p) => [p.id, p.name]),
    ["id", "nome"],
  );
  const recipes = table(
    context.recipes.map((r) => [r.id, r.name]),
    ["id", "nome"],
  );
  return [
    "## Catalogo ingredienti",
    ingredients,
    "",
    "## Preset di calibrazione",
    presets,
    "",
    "## Ricette esistenti",
    recipes,
  ].join("\n");
}

/** Blocco volatile: dove siamo e cosa c'e' aperto. Fuori dalla cache. */
export function renderState(context: VoiceContext): string {
  const parts: string[] = [`## Pagina attuale\n${context.page}`];

  const recipe = context.openRecipe;
  if (!recipe) {
    parts.push(
      "\n## Ricetta aperta\nNessuna. I comandi sull'editor non sono applicabili finche' non se ne apre una.",
    );
    return parts.join("\n");
  }

  parts.push(
    [
      "\n## Ricetta aperta",
      `nome: ${recipe.name}`,
      `famiglia: ${recipe.family}`,
      `peso batch obiettivo: ${recipe.batchWeightGrams} g`,
    ].join("\n"),
  );

  parts.push(
    "\n### Righe\n" +
      table(
        recipe.rows.map((r) => [
          r.rowId,
          r.ingredientName,
          `${r.grams}`,
          r.locked ? "bloccata" : "",
        ]),
        ["rowId", "ingrediente", "grammi", "stato"],
      ),
  );

  if (recipe.metrics) {
    const m = recipe.metrics;
    parts.push(
      "\n### Metriche gia' calcolate\n" +
        [
          `peso totale: ${m.pesoTotale}`,
          `solidi: ${m.solidi}`,
          `zuccheri: ${m.zuccheri}`,
          `grassi: ${m.grassi}`,
          `POD: ${m.pod}`,
          `PAC: ${m.pac}`,
          `equilibrio: ${m.equilibrio}`,
          `costo/kg: ${m.costoPerKg}`,
        ].join("\n"),
    );
  }

  if (recipe.warnings?.length) {
    parts.push("\n### Avvisi\n" + recipe.warnings.map((w) => `- ${w}`).join("\n"));
  }

  return parts.join("\n");
}

export const VOICE_SYSTEM_PROMPT = `Sei l'assistente vocale di GelatoLab Pro, un banco di formulazione per gelato artigianale. L'utente e' un gelatiere che parla italiano, spesso con le mani occupate, e detta un comando alla volta.

Il tuo unico compito e' tradurre quel comando in **una** chiamata di strumento.

Regole che non si negoziano:

1. **Non calcoli nulla.** POD, PAC, solidi, costi e percentuali li calcola il motore dell'applicazione. Puoi riportare un valore solo se compare gia' nel contesto, esattamente come e' scritto li'. Se ti chiedono un numero che nel contesto non c'e', rispondi con \`unsupported\`.
2. **Non inventi identificatori.** \`ingredientId\`, \`rowId\` e \`presetId\` vanno presi dalle tabelle del contesto. Se il nome pronunciato corrisponde a piu' voci, o a nessuna, usa \`clarify\`.
3. **I numeri detti a parole diventano cifre.** "duecentocinquanta grammi" e' 250. "un chilo" e' 1000. "mezzo chilo" e' 500.
4. **Una battuta, una chiamata.** Se l'utente chiede due cose insieme, esegui la prima e con \`clarify\` chiedi conferma per la seconda.
5. **Nel dubbio chiedi.** Un comando vocale frainteso costa piu' di una domanda in piu'.

Parla sempre italiano, in modo breve: sei una voce in un laboratorio, non una chat.`;
