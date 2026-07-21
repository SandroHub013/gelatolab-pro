import { prisma } from "@/infrastructure/database/client";
import type {
  CalibrationPreset,
  Ingredient,
  Recipe,
} from "@/types";
import {
  toDomainIngredients,
  toDomainPresets,
  toDomainRecipe,
} from "./mappers";

/** Recupera tutti gli ingredienti (tipo dominio). */
export async function findAllIngredients(): Promise<Ingredient[]> {
  const rows = await prisma.ingredient.findMany({ orderBy: { name: "asc" } });
  return toDomainIngredients(rows);
}

/** Recupera tutti i preset (sistema + personalizzati). */
export async function findAllPresets(): Promise<CalibrationPreset[]> {
  const rows = await prisma.calibrationPreset.findMany({
    orderBy: [{ isSystemPreset: "desc" }, { name: "asc" }],
  });
  return toDomainPresets(rows);
}

/** Recupera una ricetta completa (con ingredienti) per id. */
export async function findRecipeById(id: string): Promise<Recipe | null> {
  const row = await prisma.recipe.findUnique({
    where: { id },
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
