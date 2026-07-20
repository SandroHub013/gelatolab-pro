import type { IngredientCategory } from "./enums";

/**
 * Entità dominio: Ingrediente.
 * Tipo "plain" indipendente dal DB: le funzioni del motore di calcolo
 * (`domain/calculations`) lavorano esclusivamente con questo tipo, così
 * girano client-side senza dipendere da Prisma.
 *
 * I campi numerici sono percentuali in peso (0-100) salvo dove diversamente
 * indicato (costPerKg = €/kg, density = g/ml, coefficienti POD/PAC adimensionali).
 */
export interface Ingredient {
  id: string;
  name: string;
  slug: string;
  category: IngredientCategory;
  brand?: string;
  description?: string;

  /** Acqua in % (complemento dei solidi). */
  waterPercent: number;
  /** Solidi totali in %. */
  totalSolidsPercent: number;

  // --- Zuccheri ---
  sugarsPercent: number;
  sucrosePercent?: number;
  dextrosePercent?: number;
  fructosePercent?: number;
  glucosePercent?: number;
  lactosePercent?: number;
  maltosePercent?: number;
  maltodextrinPercent?: number;
  polyolsPercent?: number;

  // --- Grassi ---
  fatPercent: number;
  milkFatPercent?: number;
  vegetableFatPercent?: number;

  // --- Altri componenti ---
  proteinPercent: number;
  /** MSNF (Solidi Non Grassi del Latte). Se assente, derivato. */
  msnfPercent?: number;
  fiberPercent: number;
  mineralsPercent?: number;
  /** Alcol in % volume (es. 40 per un liquore 40°). */
  alcoholPercent: number;
  /** Coefficiente POD (Potere Dolificante) relativo al saccarosio=100. */
  podCoefficient: number;
  /** Coefficiente PAC (Potere Anticongelante) relativo al saccarosio=100. */
  pacCoefficient: number;
  stabilizerPercent?: number;
  emulsifierPercent?: number;
  /** Densità g/ml (per conversioni volumetriche, opzionale). */
  density?: number;
  /** Costo €/kg. */
  costPerKg?: number;

  allergens: string[];
  tags: string[];
  minRecommendedPercent?: number;
  maxRecommendedPercent?: number;
  source?: string;
  notes?: string;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Versione "input" per creare/modificare un ingrediente (senza id/timestamp). */
export type IngredientInput = Omit<
  Ingredient,
  "id" | "createdAt" | "updatedAt" | "isCustom"
> & {
  isCustom?: boolean;
};
