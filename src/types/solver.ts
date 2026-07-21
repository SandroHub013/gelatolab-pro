import type { Recipe } from "./recipe";
import type { RecipeMetrics } from "./metrics";

/** Varianti di soluzione del solver. */
export type SolverVariant = "minimal" | "balanced" | "cost";

export const SOLVER_VARIANT_LABELS: Record<SolverVariant, string> = {
  minimal: "Minima modifica",
  balanced: "Miglior equilibrio",
  cost: "Costo ottimizzato",
};

/** Tipo di vincolo (per la diagnosi). */
export type ConstraintKind =
  | "batch-weight"
  | "lock"
  | "mandatory"
  | "min-max-grams"
  | "min-max-percent"
  | "preset-range"
  | "ratio"
  | "sum-range";

/** Stato di fattibilità del problema. */
export type SolverFeasibility = "feasible" | "infeasible" | "degenerate";

/** Una singola soluzione proposta dal solver. */
export interface CalibrationSolution {
  variant: SolverVariant;
  recipe: Recipe;
  metrics: RecipeMetrics;
  /** Somma pesata delle deviazioni dai target (obiettivo minimizzato). */
  objectiveValue: number;
  /** Deviazioni per target (positivo = sopra target ideale, negativo = sotto). */
  targetDeltas: Record<string, number>;
  /** Vincoli che risultano attivi/toccati al bound. */
  activeConstraints: string[];
  /** Quantità per ingrediente dopo riconciliazione dell'arrotondamento. */
  quantities: Record<string, number>;
}

/** Diagnosi per target impossibili. */
export interface InfeasibilityDiagnosis {
  feasible: false;
  /** Messaggio leggibile (italiano). */
  message: string;
  /** Vincoli coinvolti, con valore richiesto vs disponibile. */
  conflictingConstraints: {
    kind: ConstraintKind;
    label: string;
    detail: string;
  }[];
  /** Suggerimento: quanto rilassare per diventare feasible. */
  suggestions: string[];
}

/** Risultato del solver: o un set di soluzioni, o una diagnosi di infeasibility. */
export type CalibrationResult =
  | {
      feasible: true;
      /** Massimo 3 soluzioni (minimal, balanced, cost). */
      solutions: CalibrationSolution[];
      /** Tempo impiegato in ms. */
      elapsedMs: number;
    }
  | InfeasibilityDiagnosis;

/** Opzioni del solver. */
export interface SolverOptions {
  /** Varianti da calcolare (default: tutte e tre). */
  variants?: SolverVariant[];
  /** Peso batch obiettivo (grammi). Default: recipe.targetBatchWeight. */
  targetBatchWeight?: number;
  /** Tolleranza percentuale sui target (slack iniziale). Default 0. */
  tolerancePercent?: number;
  /** Timeout in ms. Default 5000. */
  timeoutMs?: number;
}
