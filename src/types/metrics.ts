import type { Range } from "./recipe";

/** Dettaglio zuccheri per tipo (grammi contribuiti e % del totale). */
export interface SugarBreakdown {
  sucrose: number;
  dextrose: number;
  fructose: number;
  glucose: number;
  lactose: number;
  maltose: number;
  maltodextrin: number;
  polyols: number;
  /** Zuccheri totali (somma dei tipi espliciti + eventuale residuo). */
  total: number;
}

/** Dettaglio grassi. */
export interface FatBreakdown {
  total: number;
  milk: number;
  vegetable: number;
}

/**
 * Metrica per una singola riga di ricetta (contributo componenti).
 * Quantità in grammi su tutto il lotto.
 */
export interface IngredientContribution {
  /** Id della riga di ricetta (RecipeIngredient.id). */
  recipeIngredientId: string;
  ingredientId: string;
  quantityGrams: number;
  /** Percentuale in peso della riga rispetto al totale. */
  percent: number;
  water: number;
  totalSolids: number;
  sugars: number;
  fat: number;
  protein: number;
  msnf: number;
  fiber: number;
  minerals: number;
  alcohol: number;
  stabilizers: number;
  emulsifiers: number;
  pod: number;
  pac: number;
  cost: number;
  kcal: number;
}

/**
 * Risultato aggregato del motore di calcolo per una ricetta.
 * Tutte le quantità sono in grammi sul lotto totale, salvo dove indicato
 * (cost per kg, POD/PAC per kg, percentuali).
 */
export interface RecipeMetrics {
  /** Peso totale effettivo (somma grammi). */
  totalWeightGrams: number;
  /** Percentuale di ogni ingrediente. */
  ingredientPercents: Record<string, number>;
  /** Contributi per riga. */
  contributions: IngredientContribution[];

  // --- Composizione in grammi ---
  water: number;
  totalSolids: number;
  sugars: SugarBreakdown;
  fat: FatBreakdown;
  protein: number;
  msnf: number;
  /** True se MSNF è derivato (non esplicito). */
  msnfDerived: boolean;
  fiber: number;
  minerals: number;
  alcohol: number;
  stabilizers: number;
  emulsifiers: number;

  // --- Indici di bilanciamento ---
  /** POD grezzo (somma contributi, scala 0-100 saccarosio). */
  pod: number;
  /** PAC grezzo. */
  pac: number;
  /** POD normalizzato per kg di miscela. */
  podPerKg: number;
  /** PAC normalizzato per kg di miscela. */
  pacPerKg: number;
  /** Indice di equilibrio euristico (0-100, più alto = più equilibrato). */
  equilibriumIndex: number;
  /** Temperatura di servizio stimata (°C) - stima, vedere tooltip. */
  estimatedServingTemperature: number;

  // --- Costi/energia ---
  cost: number;
  costPerKg: number;
  /** Energia indicativa kcal sul lotto. */
  kcal: number;
  kcalPer100g: number;

  // --- Avvisi di coerenza (warning non bloccanti) ---
  warnings: string[];
}

/** Stato di un singolo target rispetto a un range. */
export type TargetStatus = "in-range" | "near-limit" | "out-of-range";

/** Risultato della valutazione di un target. */
export interface TargetEvaluation {
  key: string;
  label: string;
  value: number;
  range: Range;
  status: TargetStatus;
  /** Differenza dal valore ideale (o min se ideale assente). */
  deltaFromIdeal: number;
  /** Unità di misura per la UI. */
  unit: string;
}

/**
 * Confronto tra due ricette (es. originale vs calibrata).
 * Le differenze sono in grammi per riga e nei parametri aggregati.
 */
export interface RecipeDiff {
  /** Modifiche per ogni ingrediente presente in almeno una delle due ricette. */
  ingredients: IngredientDiff[];
  /** Differenza delle metriche aggregate (valore A, valore B, delta). */
  metrics: MetricDiff[];
  totalWeightA: number;
  totalWeightB: number;
  totalWeightDelta: number;
  costA: number;
  costB: number;
  costDelta: number;
}

export interface IngredientDiff {
  ingredientId: string;
  ingredientName: string;
  quantityA: number;
  quantityB: number;
  delta: number;
  presentInA: boolean;
  presentInB: boolean;
}

export interface MetricDiff {
  label: string;
  valueA: number;
  valueB: number;
  delta: number;
  unit: string;
}
