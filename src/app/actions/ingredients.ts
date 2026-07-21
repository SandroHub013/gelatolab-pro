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
  const name = input.name.trim();
  const existing = await prisma.ingredient.findUnique({ where: { name } });
  if (existing) {
    throw new Error(`Esiste già un ingrediente chiamato "${name}".`);
  }
  const isCustom = input.isCustom ?? true;
  const derived = resolveSeedCoefficients(input as never, isCustom);
  const data: Prisma.IngredientCreateInput = {
    name,
    slug: await uniqueSlug(input.slug || name),
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
    podCoefficient: input.podCoefficient ?? derived.pod,
    pacCoefficient: input.pacCoefficient ?? derived.pac,
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
    isCustom,
  };
  const created = await prisma.ingredient.create({ data });
  revalidatePath("/ingredients");
  return { id: created.id };
}

/**
 * Aggiorna un ingrediente. I coefficienti POD/PAC sono ri-derivati dalla
 * composizione risultante, a meno che il patch non li imposti esplicitamente:
 * altrimenti una modifica della composizione lascerebbe coefficienti obsoleti.
 */
export async function updateIngredient(
  id: string,
  input: Partial<IngredientInput>,
): Promise<void> {
  const current = await prisma.ingredient.findUnique({ where: { id } });
  if (!current) throw new Error("Ingrediente non trovato");

  const patch = stripUndefined(input);
  const merged = { ...toSeedShape(current), ...patch };
  const isCustom = input.isCustom ?? current.isCustom;
  const derived = resolveSeedCoefficients(merged as never, isCustom);

  const renamed = input.name !== undefined ? input.name.trim() : undefined;
  const slugSource = input.slug ?? renamed;

  await prisma.ingredient.update({
    where: { id },
    data: {
      ...patch,
      ...(renamed !== undefined ? { name: renamed } : {}),
      ...(slugSource !== undefined
        ? { slug: await uniqueSlug(slugSource, id) }
        : {}),
      podCoefficient: input.podCoefficient ?? derived.pod,
      pacCoefficient: input.pacCoefficient ?? derived.pac,
    },
  });
  revalidatePath("/ingredients");
  revalidatePath(`/ingredients/${id}`);
}

/** Rimuove le chiavi `undefined` per non azzerare campi non toccati dal patch. */
function stripUndefined<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

/**
 * Riduce una riga Prisma alla forma attesa da resolveSeedCoefficients. I
 * coefficienti correnti sono esclusi di proposito: vanno ri-derivati.
 */
function toSeedShape(row: {
  sugarsPercent: number;
  sucrosePercent: number | null;
  dextrosePercent: number | null;
  fructosePercent: number | null;
  glucosePercent: number | null;
  lactosePercent: number | null;
  maltosePercent: number | null;
  maltodextrinPercent: number | null;
  polyolsPercent: number | null;
  alcoholPercent: number;
}): Record<string, number | undefined> {
  return {
    sugarsPercent: row.sugarsPercent,
    sucrosePercent: row.sucrosePercent ?? undefined,
    dextrosePercent: row.dextrosePercent ?? undefined,
    fructosePercent: row.fructosePercent ?? undefined,
    glucosePercent: row.glucosePercent ?? undefined,
    lactosePercent: row.lactosePercent ?? undefined,
    maltosePercent: row.maltosePercent ?? undefined,
    maltodextrinPercent: row.maltodextrinPercent ?? undefined,
    polyolsPercent: row.polyolsPercent ?? undefined,
    alcoholPercent: row.alcoholPercent,
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Slug normalizzato e univoco: `slug` e `name` sono @unique in schema, e la
 * collisione altrimenti emergerebbe come errore Prisma grezzo (P2002).
 */
async function uniqueSlug(source: string, exceptId?: string): Promise<string> {
  const base = slugify(source) || "ingrediente";
  let slug = base;
  let n = 2;
  for (;;) {
    const existing = await prisma.ingredient.findUnique({ where: { slug } });
    if (!existing || existing.id === exceptId) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}
