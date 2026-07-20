"use server";

import { prisma } from "@/infrastructure/database/client";
import { solveCalibration } from "@/domain/calculations/solver";
import { toDomainIngredients, toDomainPreset, toDomainRecipe } from "@/infrastructure/repositories/mappers";
import type { CalibrationResult, SolverOptions } from "@/types";

/**
 * Server Action: esegue la calibrazione lato server (HiGHS WASM singleton).
 * Modalità P0: "stessi ingredienti". Restituisce fino a 3 varianti o una
 * diagnosi di target impossibile.
 */
export async function runCalibration(
  recipeId: string,
  presetId: string,
  options: SolverOptions = {},
): Promise<CalibrationResult> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { ingredients: true },
  });
  if (!recipe) throw new Error("Ricetta non trovata");

  const presetRow = await prisma.calibrationPreset.findUnique({
    where: { id: presetId },
  });
  if (!presetRow) throw new Error("Preset non trovato");

  const ingredientIds = recipe.ingredients.map((ri) => ri.ingredientId);
  const ingredientRows = await prisma.ingredient.findMany({
    where: { id: { in: ingredientIds } },
  });

  const domainRecipe = toDomainRecipe(recipe);
  const ingredients = toDomainIngredients(ingredientRows);
  const preset = toDomainPreset(presetRow);

  return solveCalibration(domainRecipe, ingredients, preset, options);
}
