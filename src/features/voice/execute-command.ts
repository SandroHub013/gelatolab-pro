"use client";
import { useEditorStore } from "@/stores/editor-store";
// Le server action entrano con il suffisso `Action`: sotto, ogni esecutore si
// chiama come il `kind` che serve, e il suffisso segna dove si esce dal client.
import {
  createRecipe as createRecipeAction,
  duplicateRecipe as duplicateRecipeAction,
  saveSnapshot as saveSnapshotAction,
  applySolutionAndSnapshot,
} from "@/app/actions/recipes";
import { runCalibration as runCalibrationAction } from "@/app/actions/solver";
import type { Ingredient } from "@/types";
import type { NavTarget, VoiceCommand } from "./commands";

/**
 * Esegue un comando gia' interpretato.
 *
 * Passa per lo store dell'editor e per le stesse server action dei bottoni:
 * nessuna scorciatoia, nessuna seconda strada verso il database. Le modifiche
 * all'editor restano quindi coperte dall'undo di `zundo` esattamente come se
 * fossero state fatte a mano.
 */

export interface ExecuteDeps {
  push: (href: string) => void;
  refresh: () => void;
  /** Ricetta aperta, se ce n'e' una. */
  recipeId?: string;
  /** Preset attivo sulla ricetta aperta, usato quando il comando non ne indica uno. */
  activePresetId?: string;
  /** Catalogo, per risolvere `ingredientId` in un `Ingredient` completo. */
  ingredients: Ingredient[];
  /** Ricette esistenti, per risolvere un nome in un id durante la navigazione. */
  recipes: Array<{ id: string; name: string }>;
}

export interface ExecuteResult {
  /** Messaggio da mostrare e, se il parlato e' attivo, da leggere. */
  message: string;
  ok: boolean;
}

const ok = (message: string): ExecuteResult => ({ message, ok: true });
const fail = (message: string): ExecuteResult => ({ message, ok: false });

/** Il singolo comando dell'unione, scelto per `kind`. */
type Command<K extends VoiceCommand["kind"]> = Extract<VoiceCommand, { kind: K }>;

function recipeHref(target: NavTarget, recipeId: string): string | null {
  switch (target) {
    case "editor":
      return `/recipes/${recipeId}/editor`;
    case "calibrazione":
      return `/recipes/${recipeId}/calibration`;
    case "confronto":
      return `/recipes/${recipeId}/comparison`;
    case "scheda":
      return `/recipes/${recipeId}/print`;
    default:
      return null;
  }
}

const STATIC_HREF: Partial<Record<NavTarget, string>> = {
  dashboard: "/",
  ricettario: "/recipes",
  ingredienti: "/ingredients",
  preset: "/presets",
  documentazione: "/documentation",
};

function navigate(command: Command<"navigate">, deps: ExecuteDeps): ExecuteResult {
  const staticHref = STATIC_HREF[command.target];
  if (staticHref) {
    deps.push(staticHref);
    return ok(`Vado a ${command.target}.`);
  }

  // Destinazione legata a una ricetta: quella nominata, altrimenti quella aperta.
  const named = command.recipeName
    ? deps.recipes.find(
        (r) => r.name.toLowerCase() === command.recipeName!.toLowerCase(),
      )
    : undefined;
  if (command.recipeName && !named) {
    return fail(`Non trovo la ricetta "${command.recipeName}".`);
  }
  const targetId = named?.id ?? deps.recipeId;
  if (!targetId) {
    return fail("Non c'e' nessuna ricetta aperta: dimmi quale.");
  }
  const href = recipeHref(command.target, targetId);
  if (!href) return fail("Destinazione non riconosciuta.");
  deps.push(href);
  const which = named ? ` di ${named.name}` : "";
  return ok(`Apro ${command.target}${which}.`);
}

function requireRow(rowId: string): string | null {
  const recipe = useEditorStore.getState().recipe;
  if (!recipe) return "Nessuna ricetta aperta nell'editor.";
  return recipe.ingredients.some((ri) => ri.id === rowId)
    ? null
    : "Quella riga non esiste piu' nella ricetta.";
}

function addIngredient(command: Command<"addIngredient">, deps: ExecuteDeps): ExecuteResult {
  const ingredient = deps.ingredients.find((i) => i.id === command.ingredientId);
  if (!ingredient) return fail("Quell'ingrediente non e' in catalogo.");
  const store = useEditorStore.getState();
  if (!store.recipe) return fail("Nessuna ricetta aperta nell'editor.");
  store.addIngredient(ingredient, command.grams);
  return ok(`Aggiunti ${command.grams} g di ${ingredient.name}.`);
}

function setQuantity(command: Command<"setQuantity">): ExecuteResult {
  const problem = requireRow(command.rowId);
  if (problem) return fail(problem);
  useEditorStore.getState().setQuantity(command.rowId, command.grams);
  return ok(`Impostati ${command.grams} g.`);
}

function removeIngredient(
  command: Command<"removeIngredient">,
  deps: ExecuteDeps,
): ExecuteResult {
  const problem = requireRow(command.rowId);
  if (problem) return fail(problem);
  const store = useEditorStore.getState();
  const row = store.recipe?.ingredients.find((ri) => ri.id === command.rowId);
  const name = deps.ingredients.find((i) => i.id === row?.ingredientId)?.name ?? "la riga";
  store.removeIngredient(command.rowId);
  return ok(`Rimosso ${name}. Annullabile con undo.`);
}

function toggleLock(command: Command<"toggleLock">): ExecuteResult {
  const problem = requireRow(command.rowId);
  if (problem) return fail(problem);
  useEditorStore.getState().toggleLock(command.rowId);
  return ok("Blocco invertito.");
}

function setBatchWeight(command: Command<"setBatchWeight">): ExecuteResult {
  const store = useEditorStore.getState();
  if (!store.recipe) return fail("Nessuna ricetta aperta nell'editor.");
  store.setBatchWeight(command.grams);
  return ok(`Peso batch a ${command.grams} g.`);
}

function setRecipeName(command: Command<"setRecipeName">): ExecuteResult {
  const store = useEditorStore.getState();
  if (!store.recipe) return fail("Nessuna ricetta aperta nell'editor.");
  store.setName(command.name);
  return ok(`Rinominata in ${command.name}.`);
}

function scaleToBatch(): ExecuteResult {
  const store = useEditorStore.getState();
  const recipe = store.recipe;
  if (!recipe) return fail("Nessuna ricetta aperta nell'editor.");
  const total = recipe.ingredients.reduce((s, ri) => s + ri.quantityGrams, 0);
  if (total <= 0) return fail("La ricetta e' vuota: non c'e' niente da scalare.");
  const factor = recipe.targetBatchWeight / total;
  store.setRecipe({
    ...recipe,
    ingredients: recipe.ingredients.map((ri) => ({
      ...ri,
      quantityGrams: Math.round(ri.quantityGrams * factor * 10) / 10,
    })),
  });
  return ok(`Scalata a ${recipe.targetBatchWeight} g.`);
}

async function saveSnapshot(
  command: Command<"saveSnapshot">,
  deps: ExecuteDeps,
): Promise<ExecuteResult> {
  if (!deps.recipeId) return fail("Nessuna ricetta aperta.");
  await saveSnapshotAction(deps.recipeId, command.label ?? "Versione da comando vocale");
  deps.refresh();
  return ok("Versione salvata.");
}

async function createRecipe(
  command: Command<"createRecipe">,
  deps: ExecuteDeps,
): Promise<ExecuteResult> {
  const created = await createRecipeAction({
    name: command.name,
    family: command.family,
    targetBatchWeight: 1000,
  });
  deps.push(`/recipes/${created.id}/editor`);
  return ok(`Creata "${command.name}" e aperta nell'editor.`);
}

async function duplicateRecipe(
  command: Command<"duplicateRecipe">,
  deps: ExecuteDeps,
): Promise<ExecuteResult> {
  if (!deps.recipeId) return fail("Nessuna ricetta aperta da duplicare.");
  const copy = await duplicateRecipeAction(deps.recipeId, command.newName);
  deps.push(`/recipes/${copy.id}/editor`);
  return ok("Ricetta duplicata.");
}

async function runCalibration(
  command: Command<"runCalibration">,
  deps: ExecuteDeps,
): Promise<ExecuteResult> {
  if (!deps.recipeId) return fail("Nessuna ricetta aperta.");
  const presetId = command.presetId ?? deps.activePresetId;
  if (!presetId) return fail("Nessun preset attivo: dimmi quale usare.");
  const result = await runCalibrationAction(deps.recipeId, presetId);
  if (!result.feasible) return fail(result.message);
  deps.push(`/recipes/${deps.recipeId}/calibration`);
  return ok(`Calibrazione eseguita: ${result.solutions.length} soluzioni proposte.`);
}

async function applySolution(
  command: Command<"applySolution">,
  deps: ExecuteDeps,
): Promise<ExecuteResult> {
  if (!deps.recipeId) return fail("Nessuna ricetta aperta.");
  const presetId = deps.activePresetId;
  if (!presetId) return fail("Nessun preset attivo sulla ricetta.");
  // Il solver e' deterministico, quindi rieseguirlo qui restituisce le stesse
  // soluzioni mostrate a schermo. E' preferibile a tenere il risultato in uno
  // stato condiviso fra la pagina di calibrazione e la console vocale, che
  // sarebbe una seconda fonte di verita' da allineare.
  const result = await runCalibrationAction(deps.recipeId, presetId);
  if (!result.feasible) return fail(result.message);
  const solution = result.solutions.find((s) => s.variant === command.variant);
  if (!solution) return fail("Quella variante non e' fra le soluzioni proposte.");
  await applySolutionAndSnapshot(deps.recipeId, solution.quantities, command.variant);
  deps.refresh();
  return ok("Soluzione applicata e versione salvata.");
}

/**
 * Smista il comando al suo esecutore.
 *
 * Lo `switch` resta perche' `VoiceCommand` e' un'unione discriminata: e' quello
 * che restringe `command` ramo per ramo senza un solo cast, ed e' quello che
 * fa fallire la compilazione se un `kind` nuovo non trova la sua riga.
 */
export async function executeCommand(
  command: VoiceCommand,
  deps: ExecuteDeps,
): Promise<ExecuteResult> {
  switch (command.kind) {
    case "answer":
      return ok(command.text);
    case "clarify":
      return ok(command.question);
    case "unsupported":
      return fail(command.reason);
    case "navigate":
      return navigate(command, deps);
    case "addIngredient":
      return addIngredient(command, deps);
    case "setQuantity":
      return setQuantity(command);
    case "removeIngredient":
      return removeIngredient(command, deps);
    case "toggleLock":
      return toggleLock(command);
    case "setBatchWeight":
      return setBatchWeight(command);
    case "setRecipeName":
      return setRecipeName(command);
    case "scaleToBatch":
      return scaleToBatch();
    case "saveSnapshot":
      return saveSnapshot(command, deps);
    case "createRecipe":
      return createRecipe(command, deps);
    case "duplicateRecipe":
      return duplicateRecipe(command, deps);
    case "runCalibration":
      return runCalibration(command, deps);
    case "applySolution":
      return applySolution(command, deps);
  }
}
