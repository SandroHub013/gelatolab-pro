import { RECIPE_FAMILIES, SOLVER_VARIANT_LABELS } from "@/types";
import type { RecipeFamily, SolverVariant } from "@/types";

/**
 * Il vocabolario dell'assistente vocale.
 *
 * Questo modulo e' puro: nessun import di React, Prisma o Anthropic. Serve sia
 * alla route che costruisce gli strumenti per il modello, sia al client che
 * esegue il comando, e i test lo caricano senza database ne' rete.
 *
 * Il confine da non spostare: il modello sceglie *quale* azione e con *quali*
 * parametri, e nient'altro. Non calcola POD, PAC, solidi o costi — quei numeri
 * nascono solo in `src/domain/`. `answer` puo' riportare una metrica soltanto
 * perche' gliela passiamo gia' calcolata nel contesto.
 */

export const NAV_TARGETS = [
  "dashboard",
  "ricettario",
  "ingredienti",
  "preset",
  "documentazione",
  "editor",
  "calibrazione",
  "confronto",
  "scheda",
] as const;

export type NavTarget = (typeof NAV_TARGETS)[number];

/**
 * Derivato dalle etichette del solver invece di essere riscritto a mano: se
 * una variante viene aggiunta o rinominata in `src/types/solver.ts`, il
 * vocabolario vocale la segue senza che nessuno se ne ricordi.
 */
export const SOLVER_VARIANTS = Object.keys(SOLVER_VARIANT_LABELS) as SolverVariant[];

export type VoiceCommand =
  // --- conversazione ---------------------------------------------------
  | { kind: "answer"; text: string }
  | { kind: "clarify"; question: string }
  | { kind: "unsupported"; reason: string }
  // --- navigazione -----------------------------------------------------
  | { kind: "navigate"; target: NavTarget; recipeName?: string }
  // --- editor: annullabili con undo ------------------------------------
  | { kind: "addIngredient"; ingredientId: string; grams: number }
  | { kind: "setQuantity"; rowId: string; grams: number }
  | { kind: "removeIngredient"; rowId: string }
  | { kind: "toggleLock"; rowId: string }
  | { kind: "setBatchWeight"; grams: number }
  | { kind: "setRecipeName"; name: string }
  | { kind: "scaleToBatch" }
  // --- scritture sul server: non annullabili ---------------------------
  | { kind: "saveSnapshot"; label?: string }
  | { kind: "createRecipe"; name: string; family: RecipeFamily }
  | { kind: "duplicateRecipe"; newName?: string }
  | { kind: "runCalibration"; presetId?: string }
  | { kind: "applySolution"; variant: SolverVariant };

export type VoiceCommandKind = VoiceCommand["kind"];

/**
 * Comandi che scrivono sul server e che `zundo` non puo' annullare: per questi
 * l'interfaccia chiede conferma prima di eseguire. Le modifiche all'editor non
 * sono qui di proposito — sono gia' reversibili con un undo, e chiedere
 * conferma a ogni "aggiungi 200 grammi di panna" renderebbe la voce piu' lenta
 * del mouse, cioe' inutile.
 */
const NEEDS_CONFIRMATION = new Set<VoiceCommandKind>([
  "saveSnapshot",
  "createRecipe",
  "duplicateRecipe",
  "runCalibration",
  "applySolution",
]);

export function needsConfirmation(command: VoiceCommand): boolean {
  return NEEDS_CONFIRMATION.has(command.kind);
}

/** Comandi che non toccano nulla: si eseguono senza attriti. */
export function isReadOnly(command: VoiceCommand): boolean {
  return (
    command.kind === "answer" ||
    command.kind === "clarify" ||
    command.kind === "unsupported"
  );
}

interface JsonSchema {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
  // L'SDK Anthropic tipa lo schema come indicizzabile: senza questa riga
  // l'oggetto non e' assegnabile a `InputSchema` e la chiamata non compila.
  [key: string]: unknown;
}

export interface VoiceTool {
  name: VoiceCommandKind;
  description: string;
  input_schema: JsonSchema;
}

const obj = (
  properties: Record<string, unknown>,
  required: string[] = [],
): JsonSchema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const rowId = {
  type: "string",
  description:
    "L'id della riga di ricetta, preso dall'elenco `righe` del contesto. Non e' l'id dell'ingrediente.",
};

const grams = {
  type: "number",
  description: "Quantita' in grammi. Numero, non testo: 'duecentocinquanta' vale 250.",
};

/**
 * Gli strumenti passati al modello. L'ordine e' stabile perche' entra nel
 * prefisso della cache: cambiarlo invalida la cache a ogni richiesta.
 */
export const VOICE_TOOLS: VoiceTool[] = [
  {
    name: "answer",
    description:
      "Rispondi a una domanda sullo stato attuale usando SOLO i valori presenti nel contesto. " +
      "Non calcolare, non stimare, non arrotondare in modo diverso da come appare nel contesto. " +
      "Se il dato che serve non c'e', usa `unsupported` invece di inventarlo.",
    input_schema: obj(
      { text: { type: "string", description: "Risposta breve, in italiano." } },
      ["text"],
    ),
  },
  {
    name: "clarify",
    description:
      "Usa questo quando il comando e' ambiguo: piu' ingredienti corrispondono al nome detto, " +
      "manca la quantita', o non e' chiaro su quale ricetta agire. Meglio una domanda che un'ipotesi.",
    input_schema: obj(
      { question: { type: "string", description: "La domanda da porre, in italiano." } },
      ["question"],
    ),
  },
  {
    name: "unsupported",
    description:
      "Il comando e' fuori da cio' che l'applicazione sa fare, oppure il dato richiesto non e' nel contesto.",
    input_schema: obj(
      { reason: { type: "string", description: "Spiegazione breve, in italiano." } },
      ["reason"],
    ),
  },
  {
    name: "navigate",
    description:
      "Vai a una pagina. `editor`, `calibrazione`, `confronto` e `scheda` riguardano una ricetta: " +
      "se non si e' gia' dentro quella ricetta, passa `recipeName` scegliendo fra le ricette del contesto.",
    input_schema: obj(
      {
        target: { type: "string", enum: [...NAV_TARGETS] },
        recipeName: {
          type: "string",
          description: "Nome esatto di una ricetta presente nel contesto.",
        },
      },
      ["target"],
    ),
  },
  {
    name: "addIngredient",
    description:
      "Aggiungi un ingrediente alla ricetta aperta. `ingredientId` deve essere uno degli id del " +
      "catalogo nel contesto: non inventarlo e non dedurlo dal nome. Se il nome detto corrisponde " +
      "a piu' ingredienti, usa `clarify`.",
    input_schema: obj(
      {
        ingredientId: { type: "string", description: "Id dal catalogo del contesto." },
        grams,
      },
      ["ingredientId", "grams"],
    ),
  },
  {
    name: "setQuantity",
    description: "Cambia i grammi di una riga gia' presente nella ricetta.",
    input_schema: obj({ rowId, grams }, ["rowId", "grams"]),
  },
  {
    name: "removeIngredient",
    description: "Togli una riga dalla ricetta.",
    input_schema: obj({ rowId }, ["rowId"]),
  },
  {
    name: "toggleLock",
    description:
      "Inverti il blocco di una riga. Una riga bloccata non viene modificata dal solver in calibrazione.",
    input_schema: obj({ rowId }, ["rowId"]),
  },
  {
    name: "setBatchWeight",
    description: "Imposta il peso batch obiettivo della ricetta, in grammi.",
    input_schema: obj({ grams }, ["grams"]),
  },
  {
    name: "setRecipeName",
    description: "Rinomina la ricetta aperta.",
    input_schema: obj({ name: { type: "string" } }, ["name"]),
  },
  {
    name: "scaleToBatch",
    description:
      "Scala proporzionalmente tutti gli ingredienti finche' la somma non corrisponde al peso batch.",
    input_schema: obj({}, []),
  },
  {
    name: "saveSnapshot",
    description: "Salva una versione immutabile della ricetta aperta.",
    input_schema: obj(
      { label: { type: "string", description: "Etichetta della versione. Opzionale." } },
      [],
    ),
  },
  {
    name: "createRecipe",
    description: "Crea una ricetta nuova e vuota, e aprila nell'editor.",
    input_schema: obj(
      {
        name: { type: "string" },
        family: { type: "string", enum: [...RECIPE_FAMILIES] },
      },
      ["name", "family"],
    ),
  },
  {
    name: "duplicateRecipe",
    description: "Duplica la ricetta aperta.",
    input_schema: obj(
      { newName: { type: "string", description: "Nome della copia. Opzionale." } },
      [],
    ),
  },
  {
    name: "runCalibration",
    description:
      "Lancia la calibrazione della ricetta aperta. Senza `presetId` usa il preset gia' attivo.",
    input_schema: obj(
      { presetId: { type: "string", description: "Id di un preset dal contesto." } },
      [],
    ),
  },
  {
    name: "applySolution",
    description:
      "Applica una delle soluzioni proposte dal solver e salva una versione. " +
      "Richiede che la calibrazione sia gia' stata eseguita.",
    input_schema: obj(
      {
        variant: {
          type: "string",
          enum: [...SOLVER_VARIANTS],
          description: Object.entries(SOLVER_VARIANT_LABELS)
            .map(([k, label]) => `${k} = ${label}`)
            .join("; "),
        },
      },
      ["variant"],
    ),
  },
];

const TOOL_NAMES = new Set<string>(VOICE_TOOLS.map((t) => t.name));

/**
 * Converte la chiamata di strumento del modello in un comando tipizzato.
 *
 * `strict: true` fa gia' validare lo schema lato API, ma questa funzione e' il
 * confine di fiducia dell'applicazione: quello che arriva dalla rete non viene
 * dato per buono, e un nome di strumento sconosciuto diventa `unsupported`
 * invece di propagarsi come `any` fino al dispatcher.
 */
export function toCommand(name: string, input: unknown): VoiceCommand {
  if (!TOOL_NAMES.has(name)) {
    return { kind: "unsupported", reason: `Comando sconosciuto: ${name}` };
  }
  const raw = (input ?? {}) as Record<string, unknown>;
  const str = (k: string): string | undefined =>
    typeof raw[k] === "string" && raw[k] !== "" ? (raw[k] as string) : undefined;
  const num = (k: string): number | undefined =>
    typeof raw[k] === "number" && Number.isFinite(raw[k]) ? (raw[k] as number) : undefined;

  const missing = (field: string): VoiceCommand => ({
    kind: "unsupported",
    reason: `Parametro mancante o non valido per ${name}: ${field}`,
  });

  switch (name as VoiceCommandKind) {
    case "answer": {
      const text = str("text");
      return text ? { kind: "answer", text } : missing("text");
    }
    case "clarify": {
      const question = str("question");
      return question ? { kind: "clarify", question } : missing("question");
    }
    case "unsupported":
      return { kind: "unsupported", reason: str("reason") ?? "Comando non supportato." };
    case "navigate": {
      const target = str("target");
      if (!target || !NAV_TARGETS.includes(target as NavTarget)) return missing("target");
      return { kind: "navigate", target: target as NavTarget, recipeName: str("recipeName") };
    }
    case "addIngredient": {
      const ingredientId = str("ingredientId");
      const g = num("grams");
      if (!ingredientId) return missing("ingredientId");
      if (g === undefined || g < 0) return missing("grams");
      return { kind: "addIngredient", ingredientId, grams: g };
    }
    case "setQuantity": {
      const id = str("rowId");
      const g = num("grams");
      if (!id) return missing("rowId");
      if (g === undefined || g < 0) return missing("grams");
      return { kind: "setQuantity", rowId: id, grams: g };
    }
    case "removeIngredient": {
      const id = str("rowId");
      return id ? { kind: "removeIngredient", rowId: id } : missing("rowId");
    }
    case "toggleLock": {
      const id = str("rowId");
      return id ? { kind: "toggleLock", rowId: id } : missing("rowId");
    }
    case "setBatchWeight": {
      const g = num("grams");
      return g !== undefined && g > 0 ? { kind: "setBatchWeight", grams: g } : missing("grams");
    }
    case "setRecipeName": {
      const n = str("name");
      return n ? { kind: "setRecipeName", name: n } : missing("name");
    }
    case "scaleToBatch":
      return { kind: "scaleToBatch" };
    case "saveSnapshot":
      return { kind: "saveSnapshot", label: str("label") };
    case "createRecipe": {
      const n = str("name");
      const family = str("family");
      if (!n) return missing("name");
      if (!family || !RECIPE_FAMILIES.includes(family as RecipeFamily)) return missing("family");
      return { kind: "createRecipe", name: n, family: family as RecipeFamily };
    }
    case "duplicateRecipe":
      return { kind: "duplicateRecipe", newName: str("newName") };
    case "runCalibration":
      return { kind: "runCalibration", presetId: str("presetId") };
    case "applySolution": {
      const variant = str("variant");
      if (!variant || !SOLVER_VARIANTS.includes(variant as SolverVariant)) {
        return missing("variant");
      }
      return { kind: "applySolution", variant: variant as SolverVariant };
    }
  }
}
