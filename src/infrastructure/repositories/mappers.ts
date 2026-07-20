import type {
  CalibrationPreset as PrismaPreset,
  Ingredient as PrismaIngredient,
  Recipe as PrismaRecipe,
  RecipeIngredient as PrismaRecipeIngredient,
  RecipeSnapshot,
  SnapshotIngredient,
} from "@prisma/client";
import type {
  CalibrationPreset,
  CalibrationRule,
  Ingredient,
  ObjectiveWeights,
  Range,
  Recipe,
  RecipeIngredient,
  TargetRanges,
} from "@/types";

type RecipeWithRelations = PrismaRecipe & {
  ingredients: PrismaRecipeIngredient[];
};
type IngredientRow = PrismaIngredient;

/** Converte un ingrediente Prisma nel tipo dominio. */
export function toDomainIngredient(p: IngredientRow): Ingredient {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    brand: p.brand ?? undefined,
    description: p.description ?? undefined,
    waterPercent: p.waterPercent,
    totalSolidsPercent: p.totalSolidsPercent,
    sugarsPercent: p.sugarsPercent,
    sucrosePercent: p.sucrosePercent ?? undefined,
    dextrosePercent: p.dextrosePercent ?? undefined,
    fructosePercent: p.fructosePercent ?? undefined,
    glucosePercent: p.glucosePercent ?? undefined,
    lactosePercent: p.lactosePercent ?? undefined,
    maltosePercent: p.maltosePercent ?? undefined,
    maltodextrinPercent: p.maltodextrinPercent ?? undefined,
    polyolsPercent: p.polyolsPercent ?? undefined,
    fatPercent: p.fatPercent,
    milkFatPercent: p.milkFatPercent ?? undefined,
    vegetableFatPercent: p.vegetableFatPercent ?? undefined,
    proteinPercent: p.proteinPercent,
    msnfPercent: p.msnfPercent ?? undefined,
    fiberPercent: p.fiberPercent,
    mineralsPercent: p.mineralsPercent ?? undefined,
    alcoholPercent: p.alcoholPercent,
    podCoefficient: p.podCoefficient,
    pacCoefficient: p.pacCoefficient,
    stabilizerPercent: p.stabilizerPercent ?? undefined,
    emulsifierPercent: p.emulsifierPercent ?? undefined,
    density: p.density ?? undefined,
    costPerKg: p.costPerKg ?? undefined,
    allergens: p.allergens,
    tags: p.tags,
    minRecommendedPercent: p.minRecommendedPercent ?? undefined,
    maxRecommendedPercent: p.maxRecommendedPercent ?? undefined,
    source: p.source ?? undefined,
    notes: p.notes ?? undefined,
    isCustom: p.isCustom,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function toDomainIngredients(rows: IngredientRow[]): Ingredient[] {
  return rows.map(toDomainIngredient);
}

/** Converte una riga di ricetta Prisma nel tipo dominio. */
export function toDomainRecipeIngredient(
  p: PrismaRecipeIngredient,
): RecipeIngredient {
  return {
    id: p.id,
    ingredientId: p.ingredientId,
    quantityGrams: p.quantityGrams,
    isLocked: p.isLocked,
    isMandatory: p.isMandatory,
    minGrams: p.minGrams ?? undefined,
    maxGrams: p.maxGrams ?? undefined,
    minPercent: p.minPercent ?? undefined,
    maxPercent: p.maxPercent ?? undefined,
    optimizationWeight: p.optimizationWeight ?? undefined,
    notes: p.notes ?? undefined,
  };
}

/** Converte una ricetta Prisma nel tipo dominio. */
export function toDomainRecipe(p: RecipeWithRelations): Recipe {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description ?? undefined,
    family: p.family,
    targetBatchWeight: p.targetBatchWeight,
    servingTemperature: p.servingTemperature ?? undefined,
    ingredients: p.ingredients.map(toDomainRecipeIngredient),
    activePresetId: p.activePresetId ?? undefined,
    tags: p.tags,
    preparation: p.preparation ?? undefined,
    maturationTime: p.maturationTime ?? undefined,
    maturationTemperature: p.maturationTemperature ?? undefined,
    notes: p.notes ?? undefined,
    version: p.version,
    parentRecipeId: p.parentRecipeId ?? undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/** Converte un preset Prisma nel tipo dominio (validando i JSON con cast sicuro). */
export function toDomainPreset(p: PrismaPreset): CalibrationPreset {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    recipeFamilies: p.recipeFamilies,
    targetRanges: p.targetRanges as unknown as TargetRanges,
    objectiveWeights: p.objectiveWeights as unknown as ObjectiveWeights,
    rules: p.rules as unknown as CalibrationRule[],
    preferredServingTemperature:
      (p.preferredServingTemperature as unknown as Range | null) ?? undefined,
    isSystemPreset: p.isSystemPreset,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function toDomainPresets(rows: PrismaPreset[]): CalibrationPreset[] {
  return rows.map(toDomainPreset);
}

type SnapshotWithIngredients = RecipeSnapshot & {
  ingredients: SnapshotIngredient[];
};

/** Converte uno snapshot (versione congelata) in una ricetta dominio. */
export function snapshotToDomainRecipe(
  snap: SnapshotWithIngredients,
  base: { id: string; name: string; slug: string; family: Recipe["family"]; targetBatchWeight: number },
): Recipe {
  return {
    id: base.id,
    name: base.name,
    slug: base.slug,
    family: base.family,
    targetBatchWeight: base.targetBatchWeight,
    ingredients: snap.ingredients.map((si) => ({
      id: si.id,
      ingredientId: si.ingredientId,
      quantityGrams: si.quantityGrams,
      isLocked: si.isLocked,
      isMandatory: si.isMandatory,
      minGrams: si.minGrams ?? undefined,
      maxGrams: si.maxGrams ?? undefined,
      minPercent: si.minPercent ?? undefined,
      maxPercent: si.maxPercent ?? undefined,
    })),
    tags: [],
    version: snap.version,
    createdAt: snap.createdAt,
    updatedAt: snap.createdAt,
  };
}

/**
 * Estrae ingredienti dominio "congelati" da uno snapshot (composizione
 * al momento del salvataggio, immutabile).
 */
export function snapshotToDomainIngredients(
  snap: SnapshotWithIngredients,
): Ingredient[] {
  return snap.ingredients.map((si) => ({
    id: si.ingredientId,
    name: ``, // nome non congelato nello snapshot; arricchito a chiamata
    slug: si.ingredientId,
    category: "personalizzato",
    waterPercent: si.waterPercent,
    totalSolidsPercent: si.totalSolidsPercent,
    sugarsPercent: si.sugarsPercent,
    sucrosePercent: si.sucrosePercent ?? undefined,
    dextrosePercent: si.dextrosePercent ?? undefined,
    fructosePercent: si.fructosePercent ?? undefined,
    glucosePercent: si.glucosePercent ?? undefined,
    lactosePercent: si.lactosePercent ?? undefined,
    maltosePercent: si.maltosePercent ?? undefined,
    maltodextrinPercent: si.maltodextrinPercent ?? undefined,
    polyolsPercent: si.polyolsPercent ?? undefined,
    fatPercent: si.fatPercent,
    milkFatPercent: si.milkFatPercent ?? undefined,
    vegetableFatPercent: si.vegetableFatPercent ?? undefined,
    proteinPercent: si.proteinPercent,
    msnfPercent: si.msnfPercent ?? undefined,
    fiberPercent: si.fiberPercent,
    mineralsPercent: si.mineralsPercent ?? undefined,
    alcoholPercent: si.alcoholPercent,
    podCoefficient: si.podCoefficient,
    pacCoefficient: si.pacCoefficient,
    stabilizerPercent: si.stabilizerPercent ?? undefined,
    emulsifierPercent: si.emulsifierPercent ?? undefined,
    density: si.density ?? undefined,
    costPerKg: si.costPerKg ?? undefined,
    allergens: [],
    tags: [],
    isCustom: false,
    createdAt: snap.createdAt,
    updatedAt: snap.createdAt,
  }));
}
