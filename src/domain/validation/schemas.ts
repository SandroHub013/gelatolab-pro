import { z } from "zod";
import {
  INGREDIENT_CATEGORIES,
  RECIPE_FAMILIES,
  TARGET_KEYS,
} from "@/types";

export const ingredientCategorySchema = z.enum(INGREDIENT_CATEGORIES);
export const recipeFamilySchema = z.enum(RECIPE_FAMILIES);

/** Range min/ideal?/max con validazione. */
export const rangeSchema = z
  .object({
    min: z.number(),
    ideal: z.number().optional(),
    max: z.number(),
  })
  .refine((r) => r.min <= r.max, {
    message: "min deve essere ≤ max",
    path: ["min"],
  })
  .refine(
    (r) => r.ideal === undefined || (r.ideal >= r.min && r.ideal <= r.max),
    { message: "ideal deve essere compreso tra min e max", path: ["ideal"] },
  );

export const targetKeySchema = z.enum(TARGET_KEYS);

/**
 * Target ranges: record parziale su TARGET_KEYS. In Zod v4 un `z.record(enumKey, ...)`
 * richiede TUTTE le chiavi dell'enum; i preset specificano solo un sottoinsieme,
 * quindi usiamo un oggetto partial (chiavi valide + subset ammesso).
 */
export const targetRangesSchema = z
  .object(
    Object.fromEntries(
      TARGET_KEYS.map((k) => [k, rangeSchema]),
    ) as Record<(typeof TARGET_KEYS)[number], typeof rangeSchema>,
  )
  .partial();

export const objectiveWeightsSchema = z.object({
  sweetness: z.number().min(0).max(10).optional(),
  softness: z.number().min(0).max(10).optional(),
  body: z.number().min(0).max(10).optional(),
  creaminess: z.number().min(0).max(10).optional(),
  stability: z.number().min(0).max(10).optional(),
  originalRecipeSimilarity: z.number().min(0).max(10).optional(),
});

export const calibrationRuleSchema = z.object({
  type: z.enum(["ratio", "sumRange"]),
  ingredientIds: z.array(z.string()).min(1),
  ratio: z.number().positive().optional(),
  range: rangeSchema.optional(),
  label: z.string().optional(),
});

/** Tolleranza predefinita sulla somma componenti (%). */
export const COMPONENT_SUM_TOLERANCE = 0.5;

/**
 * Schema dell'ingrediente con regole di coerenza (spec §3).
 * I warning di coerenza non sono errori bloccanti: vengono calcolati dal
 * motore e mostrati in UI. Qui validiamo solo la coerenza dura.
 */
export const ingredientSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1),
    slug: z.string().min(1),
    category: ingredientCategorySchema,
    brand: z.string().optional(),
    description: z.string().optional(),

    waterPercent: z.number().min(0).max(100),
    totalSolidsPercent: z.number().min(0).max(100),

    sugarsPercent: z.number().min(0).max(100),
    sucrosePercent: z.number().min(0).max(100).optional(),
    dextrosePercent: z.number().min(0).max(100).optional(),
    fructosePercent: z.number().min(0).max(100).optional(),
    glucosePercent: z.number().min(0).max(100).optional(),
    lactosePercent: z.number().min(0).max(100).optional(),
    maltosePercent: z.number().min(0).max(100).optional(),
    maltodextrinPercent: z.number().min(0).max(100).optional(),
    polyolsPercent: z.number().min(0).max(100).optional(),

    fatPercent: z.number().min(0).max(100),
    milkFatPercent: z.number().min(0).max(100).optional(),
    vegetableFatPercent: z.number().min(0).max(100).optional(),

    proteinPercent: z.number().min(0).max(100),
    msnfPercent: z.number().min(0).max(100).optional(),
    fiberPercent: z.number().min(0).max(100),
    mineralsPercent: z.number().min(0).max(100).optional(),
    alcoholPercent: z.number().min(0).max(100),
    podCoefficient: z.number(),
    pacCoefficient: z.number(),
    stabilizerPercent: z.number().min(0).max(100).optional(),
    emulsifierPercent: z.number().min(0).max(100).optional(),
    density: z.number().positive().optional(),
    costPerKg: z.number().nonnegative().optional(),

    allergens: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    minRecommendedPercent: z.number().min(0).max(100).optional(),
    maxRecommendedPercent: z.number().min(0).max(100).optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
    isCustom: z.boolean().default(false),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })
  .refine(
    (i) => Math.abs(i.waterPercent + i.totalSolidsPercent - 100) <= COMPONENT_SUM_TOLERANCE,
    {
      message:
        "acqua + solidi deve essere ≈ 100 (tolleranza ±0.5)",
      path: ["totalSolidsPercent"],
    },
  );

export const recipeIngredientSchema = z.object({
  id: z.string(),
  ingredientId: z.string(),
  quantityGrams: z.number().nonnegative(),
  isLocked: z.boolean().default(false),
  isMandatory: z.boolean().default(false),
  minGrams: z.number().nonnegative().optional(),
  maxGrams: z.number().nonnegative().optional(),
  minPercent: z.number().min(0).max(100).optional(),
  maxPercent: z.number().min(0).max(100).optional(),
  optimizationWeight: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export const recipeSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  family: recipeFamilySchema,
  targetBatchWeight: z.number().positive(),
  servingTemperature: z.number().optional(),
  ingredients: z.array(recipeIngredientSchema),
  activePresetId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  preparation: z.string().optional(),
  maturationTime: z.number().nonnegative().optional(),
  maturationTemperature: z.number().optional(),
  notes: z.string().optional(),
  version: z.number().int().positive().default(1),
  parentRecipeId: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const presetSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  recipeFamilies: z.array(recipeFamilySchema),
  targetRanges: targetRangesSchema,
  objectiveWeights: objectiveWeightsSchema,
  rules: z.array(calibrationRuleSchema),
  preferredServingTemperature: rangeSchema.optional(),
  isSystemPreset: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type RangeSchema = z.infer<typeof rangeSchema>;
export type IngredientSchema = z.infer<typeof ingredientSchema>;
export type RecipeIngredientSchema = z.infer<typeof recipeIngredientSchema>;
export type RecipeSchema = z.infer<typeof recipeSchema>;
export type PresetSchema = z.infer<typeof presetSchema>;
