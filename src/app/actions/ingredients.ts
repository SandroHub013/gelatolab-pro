"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/database/client";
import { toDomainIngredient } from "@/infrastructure/repositories/mappers";
import { resolveSeedCoefficients } from "@/infrastructure/database/seed-ingredients";
import type { Ingredient, IngredientInput } from "@/types";
import type { Prisma } from "@prisma/client";

export async function listIngredients(): Promise<Ingredient[]> {
  const rows = await prisma.ingredient.findMany({ orderBy: { name: "asc" } });
  return rows.map(toDomainIngredient);
}

export async function createIngredient(input: IngredientInput): Promise<{ id: string }> {
  const data: Prisma.IngredientCreateInput = {
    name: input.name,
    slug: input.slug || slugify(input.name),
    category: input.category,
    brand: input.brand ?? null,
    description: input.description ?? null,
    waterPercent: input.waterPercent,
    totalSolidsPercent: input.totalSolidsPercent,
    sugarsPercent: input.sugarsPercent,
    sucrosePercent: input.sucrosePercent ?? null,
    dextrosePercent: input.dextrosePercent ?? null,
    fructosePercent: input.fructosePercent ?? null,
    glucosePercent: input.glucosePercent ?? null,
    lactosePercent: input.lactosePercent ?? null,
    maltosePercent: input.maltosePercent ?? null,
    maltodextrinPercent: input.maltodextrinPercent ?? null,
    polyolsPercent: input.polyolsPercent ?? null,
    fatPercent: input.fatPercent,
    milkFatPercent: input.milkFatPercent ?? null,
    vegetableFatPercent: input.vegetableFatPercent ?? null,
    proteinPercent: input.proteinPercent,
    msnfPercent: input.msnfPercent ?? null,
    fiberPercent: input.fiberPercent,
    mineralsPercent: input.mineralsPercent ?? null,
    alcoholPercent: input.alcoholPercent,
    podCoefficient: input.podCoefficient ?? resolveSeedCoefficients(input as never).pod,
    pacCoefficient: input.pacCoefficient ?? resolveSeedCoefficients(input as never).pac,
    stabilizerPercent: input.stabilizerPercent ?? null,
    emulsifierPercent: input.emulsifierPercent ?? null,
    density: input.density ?? null,
    costPerKg: input.costPerKg ?? null,
    allergens: input.allergens,
    tags: input.tags,
    minRecommendedPercent: input.minRecommendedPercent ?? null,
    maxRecommendedPercent: input.maxRecommendedPercent ?? null,
    source: input.source ?? null,
    notes: input.notes ?? null,
    isCustom: input.isCustom ?? true,
  };
  const created = await prisma.ingredient.create({ data });
  revalidatePath("/ingredients");
  return { id: created.id };
}

export async function updateIngredient(
  id: string,
  input: Partial<IngredientInput>,
): Promise<void> {
  await prisma.ingredient.update({ where: { id }, data: input });
  revalidatePath("/ingredients");
}

export async function deleteIngredient(id: string): Promise<void> {
  await prisma.ingredient.delete({ where: { id } });
  revalidatePath("/ingredients");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
