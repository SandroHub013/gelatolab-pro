"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/database/client";
import { calculateRecipe } from "@/domain/calculations";
import {
  toDomainIngredients,
  toDomainPreset,
  toDomainRecipe,
} from "@/infrastructure/repositories/mappers";
import type {
  CalibrationPreset,
  Ingredient,
  Recipe,
  RecipeIngredientInput,
} from "@/types";
import { recipeIngredientSchema } from "@/domain/validation";
import type { Prisma } from "@prisma/client";

/** Crea una nuova ricetta vuota con famiglia e peso batch. */
export async function createRecipe(input: {
  name: string;
  family: Recipe["family"];
  targetBatchWeight: number;
  description?: string;
}): Promise<{ id: string; slug: string }> {
  const base = {
    name: input.name.trim(),
    slug: await uniqueSlug(input.name.trim()),
    family: input.family,
    targetBatchWeight: input.targetBatchWeight,
    description: input.description?.trim() || null,
  };
  const created = await prisma.recipe.create({
    data: {
      ...base,
      version: 1,
      tags: [],
    },
  });
  revalidatePath("/recipes");
  return { id: created.id, slug: created.slug };
}

/** Aggiorna i metadati di una ricetta (non le righe). */
export async function updateRecipeMeta(
  id: string,
  input: Partial<Pick<Recipe, "name" | "description" | "family" | "targetBatchWeight" | "tags" | "preparation" | "notes" | "activePresetId" | "servingTemperature">>,
): Promise<void> {
  await prisma.recipe.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.family !== undefined ? { family: input.family } : {}),
      ...(input.targetBatchWeight !== undefined ? { targetBatchWeight: input.targetBatchWeight } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.preparation !== undefined ? { preparation: input.preparation } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.activePresetId !== undefined ? { activePresetId: input.activePresetId } : {}),
      ...(input.servingTemperature !== undefined ? { servingTemperature: input.servingTemperature } : {}),
    },
  });
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
}

/** Sostituisce tutte le righe ingredienti di una ricetta (auto-save). */
export async function replaceRecipeIngredients(
  recipeId: string,
  lines: RecipeIngredientInput[],
): Promise<void> {
  for (const line of lines) {
    recipeIngredientSchema.parse({ ...line, id: "tmp" });
  }
  await prisma.$transaction(async (tx) => {
    await tx.recipeIngredient.deleteMany({ where: { recipeId } });
    await tx.recipeIngredient.createMany({
      data: lines.map((l) => ({
        recipeId,
        ingredientId: l.ingredientId,
        quantityGrams: l.quantityGrams,
        isLocked: l.isLocked,
        isMandatory: l.isMandatory,
        minGrams: l.minGrams,
        maxGrams: l.maxGrams,
        minPercent: l.minPercent,
        maxPercent: l.maxPercent,
        optimizationWeight: l.optimizationWeight,
        notes: l.notes,
      })),
    });
    await tx.recipe.update({ where: { id: recipeId }, data: { updatedAt: new Date() } });
  });
  revalidatePath(`/recipes/${recipeId}`);
}

/** Aggiorna una singola riga ingrediente (per editing inline mirato). */
export async function updateRecipeIngredient(
  recipeIngredientId: string,
  patch: Partial<RecipeIngredientInput>,
): Promise<void> {
  await prisma.recipeIngredient.update({
    where: { id: recipeIngredientId },
    data: patch,
  });
}

/** Elimina una ricetta (cascade sulle righe e snapshot). */
export async function deleteRecipe(id: string): Promise<void> {
  await prisma.recipe.delete({ where: { id } });
  revalidatePath("/recipes");
}

/** Duplica una ricetta in una nuova (versione 1, nuovo slug). */
export async function duplicateRecipe(id: string, newName?: string): Promise<{ id: string }> {
  const original = await prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: true },
  });
  if (!original) throw new Error("Ricetta non trovata");
  const name = (newName ?? `${original.name} (copia)`).trim();
  const created = await prisma.recipe.create({
    data: {
      name,
      slug: await uniqueSlug(name),
      description: original.description,
      family: original.family,
      targetBatchWeight: original.targetBatchWeight,
      servingTemperature: original.servingTemperature,
      activePresetId: original.activePresetId,
      tags: original.tags,
      preparation: original.preparation,
      maturationTime: original.maturationTime,
      maturationTemperature: original.maturationTemperature,
      notes: original.notes,
      version: 1,
      parentRecipeId: original.id,
      ingredients: {
        create: original.ingredients.map((ri) => ({
          ingredientId: ri.ingredientId,
          quantityGrams: ri.quantityGrams,
          isLocked: ri.isLocked,
          isMandatory: ri.isMandatory,
          minGrams: ri.minGrams,
          maxGrams: ri.maxGrams,
          minPercent: ri.minPercent,
          maxPercent: ri.maxPercent,
          optimizationWeight: ri.optimizationWeight,
          notes: ri.notes,
        })),
      },
    },
  });
  revalidatePath("/recipes");
  return { id: created.id };
}

/** Applica una soluzione del solver: salva le nuove quantità e crea uno snapshot. */
export async function applySolutionAndSnapshot(
  recipeId: string,
  quantities: Record<string, number>,
  solutionName?: string,
): Promise<{ snapshotId: string }> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { ingredients: { include: { ingredient: true } } },
  });
  if (!recipe) throw new Error("Ricetta non trovata");

  await prisma.$transaction(async (tx) => {
    for (const ri of recipe.ingredients) {
      const q = quantities[ri.id];
      if (q !== undefined) {
        await tx.recipeIngredient.update({
          where: { id: ri.id },
          data: { quantityGrams: q },
        });
      }
    }
  });

  return saveSnapshot(recipeId, solutionName ?? "Calibrazione applicata");
}

/**
 * Salva una versione snapshot: congela composizione ingredienti + metriche.
 * Storico immutabile (spec §3).
 */
export async function saveSnapshot(
  recipeId: string,
  name?: string,
): Promise<{ snapshotId: string }> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { ingredients: { include: { ingredient: true } } },
  });
  if (!recipe) throw new Error("Ricetta non trovata");

  const domainRecipe = toDomainRecipe(recipe);
  const ingredients = toDomainIngredients(recipe.ingredients.map((ri) => ri.ingredient));
  const metrics = calculateRecipe(domainRecipe, ingredients);

  const version = recipe.version;
  const snapshot = await prisma.recipeSnapshot.create({
    data: {
      recipeId,
      version,
      name: name ?? `Versione ${version}`,
      metrics: metrics as unknown as Prisma.InputJsonValue,
      ingredients: {
        create: recipe.ingredients.map((ri) => {
          const ing = ri.ingredient;
          return {
            ingredientId: ing.id,
            quantityGrams: ri.quantityGrams,
            isLocked: ri.isLocked,
            isMandatory: ri.isMandatory,
            minGrams: ri.minGrams,
            maxGrams: ri.maxGrams,
            minPercent: ri.minPercent,
            maxPercent: ri.maxPercent,
            waterPercent: ing.waterPercent,
            totalSolidsPercent: ing.totalSolidsPercent,
            sugarsPercent: ing.sugarsPercent,
            sucrosePercent: ing.sucrosePercent,
            dextrosePercent: ing.dextrosePercent,
            fructosePercent: ing.fructosePercent,
            glucosePercent: ing.glucosePercent,
            lactosePercent: ing.lactosePercent,
            maltosePercent: ing.maltosePercent,
            maltodextrinPercent: ing.maltodextrinPercent,
            polyolsPercent: ing.polyolsPercent,
            fatPercent: ing.fatPercent,
            milkFatPercent: ing.milkFatPercent,
            vegetableFatPercent: ing.vegetableFatPercent,
            proteinPercent: ing.proteinPercent,
            msnfPercent: ing.msnfPercent,
            fiberPercent: ing.fiberPercent,
            mineralsPercent: ing.mineralsPercent,
            alcoholPercent: ing.alcoholPercent,
            podCoefficient: ing.podCoefficient,
            pacCoefficient: ing.pacCoefficient,
            stabilizerPercent: ing.stabilizerPercent,
            emulsifierPercent: ing.emulsifierPercent,
            density: ing.density,
            costPerKg: ing.costPerKg,
          };
        }),
      },
    },
  });

  await prisma.recipe.update({
    where: { id: recipeId },
    data: { version: { increment: 1 } },
  });

  revalidatePath(`/recipes/${recipeId}`);
  return { snapshotId: snapshot.id };
}

export async function getRecipeWithIngredients(recipeId: string): Promise<{
  recipe: Recipe;
  ingredients: Ingredient[];
  preset: CalibrationPreset | null;
} | null> {
  const row = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: { include: { ingredient: true } },
      activePreset: true,
    },
  });
  if (!row) return null;
  return {
    recipe: toDomainRecipe(row),
    ingredients: toDomainIngredients(row.ingredients.map((ri) => ri.ingredient)),
    preset: row.activePreset ? toDomainPreset(row.activePreset) : null,
  };
}

export async function listIngredients(): Promise<Ingredient[]> {
  const rows = await prisma.ingredient.findMany({ orderBy: { name: "asc" } });
  return toDomainIngredients(rows);
}

/** Rileva se la composizione degli ingredienti è cambiata dall'ultimo snapshot. */
export async function detectCompositionDrift(recipeId: string): Promise<
  Array<{ ingredientId: string; ingredientName: string; field: string; snapshot: number; current: number }>
> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: { include: { ingredient: true } },
      snapshots: {
        orderBy: { version: "desc" },
        take: 1,
        include: { ingredients: true },
      },
    },
  });
  if (!recipe || recipe.snapshots.length === 0) return [];
  const lastSnap = recipe.snapshots[0];
  const drift: Array<{ ingredientId: string; ingredientName: string; field: string; snapshot: number; current: number }> = [];
  const fields: Array<keyof typeof lastSnap.ingredients[number]> = [
    "waterPercent", "totalSolidsPercent", "sugarsPercent", "fatPercent",
    "proteinPercent", "podCoefficient", "pacCoefficient", "costPerKg",
  ];
  for (const ri of recipe.ingredients) {
    const snapIng = lastSnap.ingredients.find((si) => si.ingredientId === ri.ingredientId);
    if (!snapIng) continue;
    for (const f of fields) {
      const snapVal = snapIng[f] as number | null;
      const curVal = ri.ingredient[f as keyof typeof ri.ingredient] as number | null;
      if (snapVal !== null && curVal !== null && Math.abs(snapVal - curVal) > 0.01) {
        drift.push({
          ingredientId: ri.ingredientId,
          ingredientName: ri.ingredient.name,
          field: String(f),
          snapshot: snapVal,
          current: curVal,
        });
      }
    }
  }
  return drift;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Genera uno slug univoco, aggiungendo un suffisso numerico in caso di collisione. */
async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "ricetta";
  let slug = base;
  let n = 2;
  while (await prisma.recipe.findUnique({ where: { slug } })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

