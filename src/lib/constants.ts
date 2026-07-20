import type { IngredientCategory, RecipeFamily } from "@/types";

/** Gruppi di categorie per raggruppamento logico nella UI. */
export const DAIRY_CATEGORIES: IngredientCategory[] = [
  "latte",
  "panna",
  "latte_condensato",
  "latte_in_polvere",
  "yogurt",
  "mascarpone",
  "formaggi",
];

/** Tolleranza (punti %) sulla vicinanza ai limiti di range → "near-limit". */
export const NEAR_LIMIT_TOLERANCE = 0.1;

/** Peso di batch predefinito (grammi). */
export const DEFAULT_BATCH_WEIGHT = 1000;

/** Arrotondamento del solver alla riconciliazione (grammi). */
export const SOLVER_ROUNDING_DECIMALS = 1;

/** Famiglie di ricetta per cui il sorbetto/frutta è dominante. */
export const FRUIT_FAMILIES: RecipeFamily[] = [
  "frutta_con_latte",
  "sorbetto",
  "granita",
];

/** Coefficienti energetici (Atwater) kcal per grammo di componente. */
export const KCAL_COEFFICIENTS = {
  sugars: 4,
  polyols: 2.4,
  maltodextrin: 4,
  fiber: 2,
  fat: 9,
  protein: 4,
  alcohol: 7,
  minerals: 0,
  stabilizers: 0,
  emulsifiers: 9,
} as const;

/** Valori equi euristici per l'indice di equilibrio. */
export const EQUILIBRIUM_IDEAL = {
  totalSolids: 36,
  sugars: 17,
  fat: 8,
  pac: 22,
  pod: 18,
  protein: 4,
} as const;

/** Euristiche per la stima della temperatura di servizio. */
export const SERVING_TEMP = {
  base: -12,
  pacPerUnit: 0.4,
  solidsPerUnit: 0.15,
  idealPac: 24,
  idealSolids: 38,
  min: -20,
  max: -6,
} as const;
