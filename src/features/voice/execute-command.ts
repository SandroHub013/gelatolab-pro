"use client";
import { useEditorStore } from "@/stores/editor-store";
import {
  createRecipe,
  duplicateRecipe,
  saveSnapshot,
  applySolutionAndSnapshot,
} from "@/app/actions/recipes";
import { runCalibration } from "@/app/actions/solver";
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

function navigate(command: Extract<VoiceCommand, { kind: "navigate" }>, deps: ExecuteDeps) {
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
  return ok(`Apro ${command.target}${named ? ` di ${named.name}` : ""}.`);
}

function requireRow(rowId: string): string | null {
  const recipe = useEditorStore.getState().recipe;
  if (!recipe) return "Nessuna ricetta aperta nell'editor.";
  return recipe.ingredients.some((ri) => ri.id === rowId)
    ? null
    : "Quella riga non esiste piu' nella ricetta.";
}

export async function executeCommand(
  command: VoiceCommand,
  deps: ExecuteDeps,
): Promise<ExecuteResult> {
  const store = useEditorStore.getState();

  switch (command.kind) {
    case "answer":
      return ok(command.text);
    case "clarify":
      return ok(command.question);
    case "unsupported":
      return fail(command.reason);

    case "navigate":
      return navigate(command, deps);

    case "addIngredient": {
      const ingredient = deps.ingredients.find((i) => i.id === command.ingredientId);
      if (!ingredient) return fail("Quell'ingrediente non e' in catalogo.");
      if (!store.recipe) return fail("Nessuna ricetta aperta nell'editor.");
      store.addIngredient(ingredient, command.grams);
      return ok(`Aggiunti ${command.grams} g di ${ingredient.name}.`);
    }

    case "setQuantity": {
      const problem = requireRow(command.rowId);
      if (problem) return fail(problem);
      store.setQuantity(command.rowId, command.grams);
      return ok(`Impostati ${command.grams} g.`);
    }

    case "removeIngredient": {
      const problem = requireRow(command.rowId);
      if (problem) return fail(problem);
      const row = store.recipe?.ingredients.find((ri) => ri.id === command.rowId);
      const name =
        deps.ingredients.find((i) => i.id === row?.ingredientId)?.name ?? "la riga";
      store.removeIngredient(command.rowId);
      return ok(`Rimosso ${name}. Annullabile con undo.`);
    }

    case "toggleLock": {
      const problem = requireRow(command.rowId);
      if (problem) return fail(problem);
      store.toggleLock(command.rowId);
      return ok("Blocco invertito.");
    }

    case "setBatchWeight": {
      if (!store.recipe) return fail("Nessuna ricetta aperta nell'editor.");
      store.setBatchWeight(command.grams);
      return ok(`Peso batch a ${command.grams} g.`);
    }

    case "setRecipeName": {
      if (!store.recipe) return fail("Nessuna ricetta aperta nell'editor.");
      store.setName(command.name);
      return ok(`Rinominata in ${command.name}.`);
    }

    case "scaleToBatch": {
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

    case "saveSnapshot": {
      if (!deps.recipeId) return fail("Nessuna ricetta aperta.");
      await saveSnapshot(deps.recipeId, command.label ?? "Versione da comando vocale");
      deps.refresh();
      return ok("Versione salvata.");
    }

    case "createRecipe": {
      const created = await createRecipe({
        name: command.name,
        family: command.family,
        targetBatchWeight: 1000,
      });
      deps.push(`/recipes/${created.id}/editor`);
      return ok(`Creata "${command.name}" e aperta nell'editor.`);
    }

    case "duplicateRecipe": {
      if (!deps.recipeId) return fail("Nessuna ricetta aperta da duplicare.");
      const copy = await duplicateRecipe(deps.recipeId, command.newName);
      deps.push(`/recipes/${copy.id}/editor`);
      return ok("Ricetta duplicata.");
    }

    case "runCalibration": {
      if (!deps.recipeId) return fail("Nessuna ricetta aperta.");
      const presetId = command.presetId ?? deps.activePresetId;
      if (!presetId) return fail("Nessun preset attivo: dimmi quale usare.");
      const result = await runCalibration(deps.recipeId, presetId);
      if (!result.feasible) return fail(result.message);
      deps.push(`/recipes/${deps.recipeId}/calibration`);
      return ok(`Calibrazione eseguita: ${result.solutions.length} soluzioni proposte.`);
    }

    case "applySolution": {
      if (!deps.recipeId) return fail("Nessuna ricetta aperta.");
      const presetId = deps.activePresetId;
      if (!presetId) return fail("Nessun preset attivo sulla ricetta.");
      // Il solver e' deterministico, quindi rieseguirlo qui restituisce le
      // stesse soluzioni mostrate a schermo. E' preferibile a tenere il
      // risultato in uno stato condiviso fra la pagina di calibrazione e la
      // console vocale, che sarebbe una seconda fonte di verita' da allineare.
      const result = await runCalibration(deps.recipeId, presetId);
      if (!result.feasible) return fail(result.message);
      const solution = result.solutions.find((s) => s.variant === command.variant);
      if (!solution) return fail("Quella variante non e' fra le soluzioni proposte.");
      await applySolutionAndSnapshot(deps.recipeId, solution.quantities, command.variant);
      deps.refresh();
      return ok("Soluzione applicata e versione salvata.");
    }
  }
}
