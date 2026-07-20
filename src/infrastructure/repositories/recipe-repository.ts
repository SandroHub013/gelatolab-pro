import { prisma } from "@/infrastructure/database/client";
import type {
  CalibrationPreset,
  Ingredient,
  Recipe,
} from "@/types";
import {
  toDomainIngredient,
  toDomainIngredients,
  toDomainPreset,
  toDomainPresets,
  toDomainRecipe,
} from "./mappers";

/** Recupera tutti gli ingredienti (tipo dominio). */
export async function findAllIngredients(): Promise<Ingredient[]> {
  const rows = await prisma.ingredient.findMany({ orderBy: { name: "asc" } });
  return toDomainIngredients(rows);
}

/** Recupera un ingrediente per id. */
export async function findIngredientById(
  id: string,
): Promise<Ingredient | null> {
  const row = await prisma.ingredient.findUnique({ where: { id } });
  return row ? toDomainIngredient(row) : null;
}

/** Recupera tutti i preset (sistema + personalizzati). */
export async function findAllPresets(): Promise<CalibrationPreset[]> {
  const rows = await prisma.calibrationPreset.findMany({
    orderBy: [{ isSystemPreset: "desc" }, { name: "asc" }],
  });
  return toDomainPresets(rows);
}

export async function findPresetById(
  id: string,
): Promise<CalibrationPreset | null> {
  const row = await prisma.calibrationPreset.findUnique({ where: { id } });
  return row ? toDomainPreset(row) : null;
}

/** Recupera una ricetta completa (con ingredienti) per id. */
export async function findRecipeById(id: string): Promise<Recipe | null> {
  const row = await prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: true },
  });
  return row ? toDomainRecipe(row) : null;
}

/** Recupera una ricetta completa per slug. */
export async function findRecipeBySlug(slug: string): Promise<Recipe | null> {
  const row = await prisma.recipe.findUnique({
    where: { slug },
    include: { ingredients: true },
  });
  return row ? toDomainRecipe(row) : null;
}

/** Elenca tutte le ricette (con ingredienti). */
export async function findAllRecipes(): Promise<Recipe[]> {
  const rows = await prisma.recipe.findMany({
    include: { ingredients: true },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toDomainRecipe);
}

/**
 * Carica una ricetta e gli ingredienti necessari per il calcolo
 * (ricetta + tutti gli ingredienti referenziati + preset attivo).
 */
export async function loadRecipeForCalculation(id: string): Promise<{
  recipe: Recipe;
  ingredients: Ingredient[];
  preset: CalibrationPreset | null;
} | null> {
  const row = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { include: { ingredient: true } },
      activePreset: true,
    },
  });
  if (!row) return null;
  const recipe = toDomainRecipe(row);
  const ingredientIds = recipe.ingredients.map((ri) => ri.ingredientId);
  const ingRows = await prisma.ingredient.findMany({
    where: { id: { in: ingredientIds } },
  });
  const preset = row.activePreset ? toDomainPreset(row.activePreset) : null;
  return { recipe, ingredients: toDomainIngredients(ingRows), preset };
}
