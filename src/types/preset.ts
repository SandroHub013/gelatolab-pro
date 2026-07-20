import type { Range } from "./recipe";
import type { RecipeFamily } from "./enums";

/** Famiglie di target calibrabili nella dashboard. */
export const TARGET_KEYS = [
  "totalSolids",
  "sugars",
  "fat",
  "msnf",
  "protein",
  "fiber",
  "stabilizers",
  "emulsifiers",
  "pod",
  "pac",
  "podPerKg",
  "pacPerKg",
  "servingTemperature",
  "equilibriumIndex",
] as const;

export type TargetKey = (typeof TARGET_KEYS)[number];

export const TARGET_LABELS: Record<TargetKey, string> = {
  totalSolids: "Solidi totali",
  sugars: "Zuccheri totali",
  fat: "Grassi totali",
  msnf: "MSNF",
  protein: "Proteine",
  fiber: "Fibre",
  stabilizers: "Stabilizzanti",
  emulsifiers: "Emulsionanti",
  pod: "POD (grezzo)",
  pac: "PAC (grezzo)",
  podPerKg: "POD per kg",
  pacPerKg: "PAC per kg",
  servingTemperature: "Temperatura servizio",
  equilibriumIndex: "Indice di equilibrio",
};

/** Mappa target → Range. Ogni target è opzionale (preset parziali ammessi). */
export type TargetRanges = Partial<Record<TargetKey, Range>>;

/** Pesi degli obiettivi per le 3 varianti del solver. */
export interface ObjectiveWeights {
  /** Dolcezza relativa al target preset. */
  sweetness?: number;
  /** Morbidezza (anticongelamento, PAC). */
  softness?: number;
  /** Corpo (solidi). */
  body?: number;
  /** Cremosità (grassi). */
  creaminess?: number;
  /** Stabilità (stabilizzanti/fibre). */
  stability?: number;
  /** Somiglianza alla ricetta originale (tie-break e variante minima modifica). */
  originalRecipeSimilarity?: number;
}

/** Tipo di una regola di calibrazione addizionale. */
export type CalibrationRuleType = "ratio" | "sumRange";

/** Regola di calibrazione addizionale (P1: rapporti tra ingredienti). */
export interface CalibrationRule {
  type: CalibrationRuleType;
  /** Id delle righe di ricetta coinvolte. */
  ingredientIds: string[];
  /** Per "ratio": rapporto tra il primo e la somma degli altri. Per "sumRange": range della somma. */
  ratio?: number;
  range?: Range;
  label?: string;
}

/**
 * Preset di calibrazione. I campi JSON sono validati con Zod.
 * I preset di sistema sono generati dal seed e non modificabili.
 */
export interface CalibrationPreset {
  id: string;
  name: string;
  description: string;
  recipeFamilies: RecipeFamily[];
  targetRanges: TargetRanges;
  objectiveWeights: ObjectiveWeights;
  rules: CalibrationRule[];
  preferredServingTemperature?: Range;
  isSystemPreset: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CalibrationPresetInput = Omit<
  CalibrationPreset,
  "id" | "createdAt" | "updatedAt" | "isSystemPreset"
> & {
  isSystemPreset?: boolean;
};
