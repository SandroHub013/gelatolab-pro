import type { RecipeFamily } from "./enums";

/** Riga di ricetta: associazione ingrediente → quantità e vincoli. */
export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  quantityGrams: number;
  isLocked: boolean;
  isMandatory: boolean;
  minGrams?: number;
  maxGrams?: number;
  minPercent?: number;
  maxPercent?: number;
  /** Peso di ottimizzazione nel solver (ingredienti più flessibili). */
  optimizationWeight?: number;
  notes?: string;
}

/** Tipo input per una riga di ricetta (senza id generato). */
export type RecipeIngredientInput = Omit<RecipeIngredient, "id">;

/**
 * Entità dominio: Ricetta.
 * Le quantità sono in grammi; `targetBatchWeight` è il peso obiettivo del lotto.
 */
export interface Recipe {
  id: string;
  name: string;
  slug: string;
  description?: string;
  family: RecipeFamily;
  targetBatchWeight: number;
  servingTemperature?: number;
  ingredients: RecipeIngredient[];
  activePresetId?: string;
  tags: string[];
  preparation?: string;
  /** Tempo di maturazione in ore. */
  maturationTime?: number;
  maturationTemperature?: number;
  notes?: string;
  version: number;
  parentRecipeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Tipo input per creare una ricetta. */
export type RecipeInput = Omit<
  Recipe,
  "id" | "createdAt" | "updatedAt" | "version"
> & {
  version?: number;
};

/** Range con min, max e ideale opzionale. */
export interface Range {
  min: number;
  ideal?: number;
  max: number;
}
