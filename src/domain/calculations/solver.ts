import type {
  CalibrationPreset,
  CalibrationResult,
  CalibrationSolution,
  Ingredient,
  ObjectiveWeights,
  Range,
  Recipe,
  RecipeIngredient,
  RecipeMetrics,
  SolverOptions,
  SolverVariant,
  TargetKey,
} from "@/types";
import { calculateRecipe } from "./calculate";
import { evaluateTargets } from "@/domain/constraints";
import { round, roundGrams } from "./round";
import { getHighs } from "@/infrastructure/solver/highs-singleton";
import { SOLVER_ROUNDING_DECIMALS } from "@/lib/constants";

/** Grammi minimi per un ingrediente mandatory (>0). */
const MANDATORY_MIN_GRAMS = 0.1;

/** Pesi obiettivo di default per variante (dimensionali). */
const VARIANT_WEIGHTS: Record<
  SolverVariant,
  { sim: number; target: number; cost: number }
> = {
  minimal: { sim: 1000, target: 1, cost: 0 },
  balanced: { sim: 5, target: 100, cost: 0 },
  cost: { sim: 1, target: 40, cost: 100 },
};

interface ModelRow {
  ingredient: Ingredient;
  ri: RecipeIngredient;
  orig: number;
  lb: number;
  ub: number;
  /** Il bound deriva dal range raccomandato dell'ingrediente (non da min/maxGrams). */
  lbFromRecommended: boolean;
  ubFromRecommended: boolean;
}

interface SolverModel {
  rows: ModelRow[];
  batch: number;
  /** Target lineari: key → {coeffs per ingrediente-row index, desired (raw)}. */
  targets: Array<{
    key: TargetKey;
    desired: number;
    coeffs: number[];
    weight: number;
    scale: number;
  }>;
  weights: { sim: number; target: number; cost: number };
}

/** Coefficiente lineare (per grammo) del target t per l'ingrediente ing. */
function targetCoeff(ing: Ingredient, key: TargetKey): number {
  switch (key) {
    case "totalSolids":
      return ing.totalSolidsPercent;
    case "sugars":
      return ing.sugarsPercent;
    case "fat":
      return ing.fatPercent;
    case "msnf":
      return ing.msnfPercent ?? deriveMsnf(ing);
    case "protein":
      return ing.proteinPercent;
    case "fiber":
      return ing.fiberPercent;
    case "stabilizers":
      return ing.stabilizerPercent ?? 0;
    case "emulsifiers":
      return ing.emulsifierPercent ?? 0;
    case "pod":
      return ing.podCoefficient;
    case "pac":
      return ing.pacCoefficient;
    case "podPerKg":
      return ing.podCoefficient / 10;
    case "pacPerKg":
      return ing.pacCoefficient / 10;
    // servingTemperature / equilibriumIndex: non lineari → non targettabili nel solver.
    default:
      return 0;
  }
}

function deriveMsnf(ing: Ingredient): number {
  if (ing.msnfPercent !== undefined) return ing.msnfPercent;
  return ing.proteinPercent + (ing.lactosePercent ?? 0) + (ing.mineralsPercent ?? 0);
}

/** Pesi obiettivo derivati dal preset + variante. */
function resolveWeights(
  preset: CalibrationPreset,
  variant: SolverVariant,
): { sim: number; target: number; cost: number } {
  const base = VARIANT_WEIGHTS[variant];
  const ow: ObjectiveWeights = preset.objectiveWeights ?? {};
  // La modulazione per-target dai pesi del preset (sweetness -> pod,
  // softness -> pac, ...) è applicata in buildSolverModel, non qui.
  if (variant === "minimal") {
    return { sim: base.sim, target: base.target, cost: base.cost };
  }
  if (variant === "balanced") {
    return {
      sim: (ow.originalRecipeSimilarity ?? 0.5) * 10,
      target: base.target,
      cost: 0,
    };
  }
  // cost
  return { sim: (ow.originalRecipeSimilarity ?? 0.1) * 10, target: base.target, cost: base.cost };
}

/** Peso per-target (mappa i pesi del preset). */
function perTargetWeight(preset: CalibrationPreset, key: TargetKey): number {
  const ow = preset.objectiveWeights ?? {};
  switch (key) {
    case "pod":
      return ow.sweetness ?? 1;
    case "pac":
      return ow.softness ?? 1;
    case "totalSolids":
      return ow.body ?? 1;
    case "fat":
      return ow.creaminess ?? 1;
    case "stabilizers":
    case "fiber":
      return ow.stability ?? 1;
    default:
      return 1;
  }
}

/**
 * Costruisce il modello LP per una variante. Funzione pura (testabile).
 */
export function buildSolverModel(
  recipe: Recipe,
  ingredients: Ingredient[],
  preset: CalibrationPreset,
  variant: SolverVariant,
  options: SolverOptions,
): SolverModel {
  const batch = options.targetBatchWeight ?? recipe.targetBatchWeight;
  const index = new Map(ingredients.map((i) => [i.id, i]));

  const rows: ModelRow[] = recipe.ingredients
    .map((ri) => {
      const ing = index.get(ri.ingredientId);
      if (!ing) return null;
      let lb = 0;
      let ub = Number.POSITIVE_INFINITY;
      let lbFromRecommended = false;
      let ubFromRecommended = false;
      // mandatory
      if (ri.isMandatory) lb = Math.max(lb, MANDATORY_MIN_GRAMS);
      // min/max grams
      if (ri.minGrams !== undefined) lb = Math.max(lb, ri.minGrams);
      if (ri.maxGrams !== undefined) ub = Math.min(ub, ri.maxGrams);
      // min/max percent → grams
      if (ri.minPercent !== undefined)
        lb = Math.max(lb, (ri.minPercent / 100) * batch);
      if (ri.maxPercent !== undefined)
        ub = Math.min(ub, (ri.maxPercent / 100) * batch);
      // recommended ranges dell'ingrediente
      if (ing.minRecommendedPercent !== undefined) {
        const recLb = (ing.minRecommendedPercent / 100) * batch;
        if (recLb > lb) {
          lb = recLb;
          lbFromRecommended = true;
        }
      }
      if (ing.maxRecommendedPercent !== undefined) {
        const recUb = (ing.maxRecommendedPercent / 100) * batch;
        if (recUb < ub) {
          ub = recUb;
          ubFromRecommended = true;
        }
      }
      // lock → fisso
      if (ri.isLocked) {
        lb = ri.quantityGrams;
        ub = ri.quantityGrams;
        lbFromRecommended = false;
        ubFromRecommended = false;
      }
      // sanity: lb <= ub
      if (lb > ub) lb = ub;
      return {
        ing,
        ri,
        orig: ri.quantityGrams,
        lb,
        ub,
        lbFromRecommended,
        ubFromRecommended,
      } as ModelRow & { ing: Ingredient };
    })
    .filter((r): r is ModelRow & { ing: Ingredient } => r !== null)
    .map((r) => ({
      ingredient: r.ing,
      ri: r.ri,
      orig: r.orig,
      lb: r.lb,
      ub: r.ub,
      lbFromRecommended: r.lbFromRecommended,
      ubFromRecommended: r.ubFromRecommended,
    }));

  const weights = resolveWeights(preset, variant);

  // Target lineari (composizione % + pod/pac/podPerKg/pacPerKg).
  const targetKeys = Object.keys(preset.targetRanges) as TargetKey[];
  const targets = targetKeys
    .map((key) => {
      const range = preset.targetRanges[key];
      if (!range) return null;
      const coeffs = rows.map((r) => targetCoeff(r.ingredient, key));
      // desired in unità "raw" (= targetValue × batch per composizione/pod/pac).
      const targetValue = range.ideal ?? midpoint(range);
      const desired = desiredRaw(key, targetValue, batch);
      const scale = desired > 0 ? desired : 1;
      const weight = perTargetWeight(preset, key);
      return { key, desired, coeffs, weight, scale };
    })
    .filter(
      (t): t is NonNullable<typeof t> => t?.coeffs.some((c) => c !== 0) ?? false,
    );

  return { rows, batch, targets, weights };
}

function midpoint(range: Range): number {
  return (range.min + range.max) / 2;
}

/** Converte un valore targettabile (unità preset) nel valore raw del vincolo. */
function desiredRaw(key: TargetKey, targetValue: number, batch: number): number {
  switch (key) {
    case "podPerKg":
    case "pacPerKg":
      // podPerKg targettable = Σ(coeff x)/batch×10 → raw Σ(coeff x) = targetValue×batch/10
      return (targetValue * batch) / 10;
    case "totalSolids":
    case "sugars":
    case "fat":
    case "msnf":
    case "protein":
    case "fiber":
    case "stabilizers":
    case "emulsifiers":
    case "pod":
    case "pac":
      // Σ(coeff x) = targetValue × batch
      return targetValue * batch;
    default:
      return targetValue * batch;
  }
}

/** Serializza il modello in formato CPLEX LP. */
export function modelToLp(model: SolverModel): string {
  const { rows, batch, targets, weights } = model;
  const lines: string[] = ["Minimize", " obj: "];

  const objTerms: string[] = [];

  // Costo (lineare sui x_i)
  rows.forEach((r, i) => {
    const c = (r.ingredient.costPerKg ?? 0) / 1000; // €/g
    if (weights.cost > 0 && c !== 0) {
      objTerms.push(`${formatCoeff(weights.cost * c)} x${i}`);
    }
  });

  // Similarità: deviazione da orig (su ingredienti non bloccati)
  rows.forEach((r, i) => {
    if (r.ri.isLocked) return;
    const simScale = batch > 0 ? batch : 1;
    const w = weights.sim / simScale;
    objTerms.push(`${formatCoeff(w)} sp${i}`);
    objTerms.push(`${formatCoeff(w)} sm${i}`);
  });

  // Target: deviazione da desired (normalizzata)
  targets.forEach((t, ti) => {
    const w = (weights.target * t.weight) / t.scale;
    objTerms.push(`${formatCoeff(w)} tp${ti}`);
    objTerms.push(`${formatCoeff(w)} tm${ti}`);
  });

  lines[1] += objTerms.join(" + ");

  lines.push("Subject To");
  // Batch weight
  const batchTerms = rows.map((_, i) => `x${i}`).join(" + ");
  lines.push(` batch: ${batchTerms} = ${batch}`);

  // Similarity constraints (solo non bloccati)
  rows.forEach((r, i) => {
    if (r.ri.isLocked) return;
    lines.push(
      ` sim${i}: x${i} - sp${i} + sm${i} = ${r.orig}`,
    );
  });

  // Target constraints
  targets.forEach((t, ti) => {
    const lhs = t.coeffs
      .map((c, i) => `${formatCoeff(c)} x${i}`)
      .filter((term, i) => t.coeffs[i] !== 0)
      .join(" + ");
    lines.push(
      ` tgt${ti}: ${lhs} - tp${ti} + tm${ti} = ${formatCoeff(t.desired)}`,
    );
  });

  lines.push("Bounds");
  rows.forEach((r, i) => {
    lines.push(` ${r.lb} <= x${i} <= ${ubToken(r.ub)}`);
    if (!r.ri.isLocked) {
      lines.push(` sp${i} >= 0`);
      lines.push(` sm${i} >= 0`);
    }
  });
  targets.forEach((_, ti) => {
    lines.push(` tp${ti} >= 0`);
    lines.push(` tm${ti} >= 0`);
  });

  lines.push("End");
  return lines.join("\n");
}

function ubToken(ub: number): string {
  return Number.isFinite(ub) ? String(ub) : "+infinity";
}

function formatCoeff(c: number): string {
  if (c === 0) return "0";
  const r = round(c, 8);
  return String(r);
}

/** Pre-check di fattibilità sui bound (senza risolvere). */
function checkBoundsFeasibility(
  model: SolverModel,
): { feasible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (model.rows.length === 0) {
    return {
      feasible: false,
      reasons: ["La ricetta non contiene ingredienti da calibrare."],
    };
  }
  const lockedSum = model.rows
    .filter((r) => r.ri.isLocked)
    .reduce((s, r) => s + r.orig, 0);
  if (lockedSum > model.batch + 1) {
    reasons.push(
      `Gli ingredienti bloccati sommano a ${roundGrams(lockedSum)}g, più del peso batch ${model.batch}g.`,
    );
  }
  const lbSum = model.rows.reduce((s, r) => s + r.lb, 0);
  if (lbSum > model.batch + 1) {
    reasons.push(
      `La somma dei minimi (${roundGrams(lbSum)}g) supera il peso batch (${model.batch}g).`,
    );
  }
  const ubFiniteSum = model.rows.reduce(
    (s, r) => s + (Number.isFinite(r.ub) ? r.ub : 0),
    0,
  );
  const allFinite = model.rows.every((r) => Number.isFinite(r.ub));
  if (allFinite && ubFiniteSum > 0 && ubFiniteSum < model.batch - 1) {
    reasons.push(
      `La somma dei massimi (${roundGrams(ubFiniteSum)}g) è inferiore al peso batch (${model.batch}g).`,
    );
  }
  return { feasible: reasons.length === 0, reasons };
}

/**
 * Riconcilia l'arrotondamento a 0.1g affinché Σ = batch esattamente.
 * I bound (opzionali) impediscono che la distribuzione del residuo spinga una
 * quantità sotto il suo minimo (o sotto zero) o sopra il suo massimo.
 */
export function reconcileRounding(
  quantities: number[],
  locked: boolean[],
  batch: number,
  bounds?: Array<{ lb: number; ub: number }>,
): number[] {
  const lbs = quantities.map((_, i) => roundGrams(Math.max(0, bounds?.[i]?.lb ?? 0)));
  const ubs = quantities.map((_, i) => {
    const ub = bounds?.[i]?.ub;
    return ub === undefined || !Number.isFinite(ub)
      ? Number.POSITIVE_INFINITY
      : roundGrams(ub);
  });
  const result = quantities.map((q, i) =>
    Math.min(Math.max(roundGrams(q), lbs[i]), ubs[i]),
  );
  let sum = round(result.reduce((s, q) => s + q, 0), 1);
  // Indici regolabili (non bloccati), ordinati per quantità decrescente.
  const adjustable = result
    .map((q, i) => ({ q, i }))
    .filter((e) => !locked[e.i])
    .sort((a, b) => b.q - a.q)
    .map((e) => e.i);
  let guard = 0;
  while (Math.abs(sum - batch) >= 0.1 && adjustable.length > 0 && guard < 100000) {
    const step = sum > batch ? -0.1 : 0.1;
    // Solo le righe che possono assorbire il passo senza violare i bound.
    const candidates = adjustable.filter((i) =>
      step < 0 ? result[i] - 0.1 >= lbs[i] : result[i] + 0.1 <= ubs[i],
    );
    if (candidates.length === 0) break;
    // Distribuisci un passo al primo candidato; ruota per evitare bias.
    const target = candidates[guard % candidates.length];
    result[target] = roundGrams(result[target] + step);
    sum = round(sum + step, 1);
    guard++;
  }
  return result;
}

interface HighsColumn {
  Primal: number;
}
interface HighsSolution {
  Status: string;
  ObjectiveValue: number;
  Columns: Record<string, HighsColumn>;
}

/** Risolve una singola variante restituendo le quantità o null se infeasible. */
async function solveVariant(
  model: SolverModel,
  timeoutMs: number,
): Promise<{ quantities: number[]; objective: number; status: string } | null> {
  const lp = modelToLp(model);
  const highs = await getHighs();
  const sol = highs.solve(lp, {
    time_limit: Math.max(1, Math.floor(timeoutMs / 1000)),
    presolve: "on",
    output_flag: false,
    log_to_console: false,
    random_seed: 0,
  }) as unknown as HighsSolution;

  if (!isFeasibleStatus(sol.Status)) return null;

  const quantities = model.rows.map((r, i) => {
    const col = sol.Columns[`x${i}`];
    const val = col?.Primal ?? (r.ri.isLocked ? r.orig : 0);
    return Math.max(r.lb, Math.min(Number.isFinite(r.ub) ? r.ub : val, val));
  });

  return { quantities, objective: sol.ObjectiveValue ?? 0, status: sol.Status };
}

/**
 * Stati HiGHS che portano una soluzione primale utilizzabile. Il confronto è
 * esatto: "Infeasible" contiene "feasible" e verrebbe accettato da un match
 * per sottostringa.
 */
const FEASIBLE_STATUSES = new Set(["optimal"]);

function isFeasibleStatus(status: string): boolean {
  return FEASIBLE_STATUSES.has(status.trim().toLowerCase());
}

/**
 * Solver di calibrazione. Risolve fino a 3 varianti in modalità "stessi
 * ingredienti". Per target impossibili restituisce una diagnosi esplicita.
 *
 * Server-side (usa HiGHS WASM). Determinismo: random_seed=0, tie-break
 * verso la ricetta originale via termine di similarità.
 */
export async function solveCalibration(
  recipe: Recipe,
  ingredients: Ingredient[],
  preset: CalibrationPreset,
  options: SolverOptions = {},
): Promise<CalibrationResult> {
  const start = Date.now();
  const variants = options.variants ?? ["minimal", "balanced", "cost"];
  const batch = options.targetBatchWeight ?? recipe.targetBatchWeight;
  const timeoutMs = options.timeoutMs ?? 5000;

  // Pre-check sui bound: se infeasible, diagnosi immediata (uguale per tutte le varianti).
  const probeModel = buildSolverModel(
    recipe,
    ingredients,
    preset,
    "minimal",
    { ...options, targetBatchWeight: batch },
  );
  const feasibility = checkBoundsFeasibility(probeModel);
  if (!feasibility.feasible) {
    return {
      feasible: false,
      message: "Calibrazione impossibile con i vincoli attuali.",
      conflictingConstraints: feasibility.reasons.map((r) => ({
        kind: "batch-weight" as const,
        label: "Peso batch / vincoli rigidi",
        detail: r,
      })),
      suggestions: buildSuggestions(probeModel, feasibility.reasons),
    };
  }

  const solutions: CalibrationSolution[] = [];
  for (const variant of variants) {
    const model = buildSolverModel(recipe, ingredients, preset, variant, {
      ...options,
      targetBatchWeight: batch,
    });
    const res = await solveVariant(model, timeoutMs);
    if (!res) continue;
    const locked = model.rows.map((r) => r.ri.isLocked);
    const reconciled = reconcileRounding(
      res.quantities,
      locked,
      batch,
      model.rows.map((r) => ({ lb: r.lb, ub: r.ub })),
    );
    const solvedRecipe = applyQuantities(recipe, model.rows, reconciled, batch);
    const metrics = calculateRecipe(solvedRecipe, ingredients);
    // Sepolcro dell'arrotondamento: se reconcileRounding ha dovuto breakare
    // (nessun candidato può assorbire il passo), la somma differisce dal batch.
    const reconciledSum = round(reconciled.reduce((s, q) => s + q, 0), 1);
    if (Math.abs(reconciledSum - batch) > 0.1) {
      metrics.warnings.push(
        `Arrotondamento non perfetto: somma ${reconciledSum}g vs peso batch ${batch}g.`,
      );
    }
    const evals = evaluateTargets(metrics, preset);
    const targetDeltas: Record<string, number> = {};
    for (const e of evals) targetDeltas[e.key] = e.deltaFromIdeal;
    const activeConstraints: string[] = [];
    model.rows.forEach((r, i) => {
      if (Math.abs(reconciled[i] - r.lb) < 0.05 && r.lb > 0)
        activeConstraints.push(
          r.lbFromRecommended
            ? recommendedRangeMessage(r, "min")
            : `${r.ingredient.name} al minimo`,
        );
      if (Number.isFinite(r.ub) && Math.abs(reconciled[i] - r.ub) < 0.05)
        activeConstraints.push(
          r.ubFromRecommended
            ? recommendedRangeMessage(r, "max")
            : `${r.ingredient.name} al massimo`,
        );
    });
    solutions.push({
      variant,
      recipe: solvedRecipe,
      metrics,
      objectiveValue: round(res.objective, 4),
      targetDeltas,
      activeConstraints,
      quantities: Object.fromEntries(
        model.rows.map((r, i) => [r.ri.id, reconciled[i]]),
      ),
    });
  }

  if (solutions.length === 0) {
    return {
      feasible: false,
      message:
        "Nessuna soluzione ammissibile trovata nemmeno rilassando i target. " +
        "Riduci i vincoli rigidi (lock, minimi) o amplia i range del preset.",
      conflictingConstraints: feasibility.reasons.map((r) => ({
        kind: "batch-weight" as const,
        label: "Vincoli rigidi",
        detail: r,
      })),
      suggestions: [
        ...recommendedRangeSuggestions(probeModel),
        "Rimuovi alcuni lock o abbassa i minimi obbligatori.",
        "Allarga i range min/max degli ingredienti principali.",
        "Verifica che la somma dei minimi sia inferiore al peso batch.",
      ],
    };
  }

  return {
    feasible: true,
    solutions: [...solutions].sort((a, b) => a.variant.localeCompare(b.variant)),
    elapsedMs: Date.now() - start,
  };
}

/**
 * Messaggio esplicito quando un bound proviene dal range raccomandato
 * dell'ingrediente e non da un limite impostato dall'utente sulla riga.
 */
function recommendedRangeMessage(row: ModelRow, side: "min" | "max"): string {
  const min = row.ingredient.minRecommendedPercent;
  const max = row.ingredient.maxRecommendedPercent;
  const range = `${min ?? 0}–${max ?? 100}%`;
  const bound = side === "min" ? "minimo" : "massimo";
  return (
    `${row.ingredient.name} è vincolato al ${bound} del range raccomandato (${range}). ` +
    "Modifica i limiti nella scheda ingrediente per allargare lo spazio di calibrazione."
  );
}

/** Suggerimenti sui bound derivati dai range raccomandati che stringono il modello. */
function recommendedRangeSuggestions(model: SolverModel): string[] {
  const out: string[] = [];
  // Solo i 3 bound più restrittivi per non sommergere l'utente (con 33 ingredienti
  // seed tutti con maxRecommendedPercent, una ricetta a 5 ingredienti produrrebbe
  // 5+ messaggi quasi identici). I bound attivi sono già elencati in
  // `activeConstraints` nelle soluzioni feasible.
  const candidates: Array<{ row: ModelRow; side: "min" | "max"; tightness: number }> = [];
  for (const r of model.rows) {
    if (r.lbFromRecommended && r.lb > 0)
      candidates.push({ row: r, side: "min", tightness: r.lb });
    if (r.ubFromRecommended && Number.isFinite(r.ub))
      candidates.push({ row: r, side: "max", tightness: -r.ub });
  }
  candidates.sort((a, b) => b.tightness - a.tightness);
  for (const c of candidates.slice(0, 3))
    out.push(recommendedRangeMessage(c.row, c.side));
  return out;
}

function buildSuggestions(
  model: SolverModel,
  reasons: string[],
): string[] {
  const suggestions: string[] = [...recommendedRangeSuggestions(model)];
  const lbSum = model.rows.reduce((s, r) => s + r.lb, 0);
  if (lbSum > model.batch) {
    suggestions.push(
      `Riduci i minimi (somma attuale ${roundGrams(lbSum)}g) sotto il peso batch ${model.batch}g.`,
    );
  }
  const lockedSum = model.rows
    .filter((r) => r.ri.isLocked)
    .reduce((s, r) => s + r.orig, 0);
  if (lockedSum > model.batch) {
    suggestions.push(
      `Sblocca alcuni ingredienti (bloccati sommano a ${roundGrams(lockedSum)}g).`,
    );
  }
  if (suggestions.length === 0 && reasons.length > 0) {
    suggestions.push("Allarga i range del preset o i min/max degli ingredienti.");
  }
  return suggestions;
}

function applyQuantities(
  recipe: Recipe,
  rows: ModelRow[],
  quantities: number[],
  batch: number,
): Recipe {
  return {
    ...recipe,
    targetBatchWeight: batch,
    ingredients: recipe.ingredients.map((ri) => {
      const idx = rows.findIndex((r) => r.ri.id === ri.id);
      const q = idx >= 0 ? quantities[idx] : ri.quantityGrams;
      return { ...ri, quantityGrams: round(q, SOLVER_ROUNDING_DECIMALS) };
    }),
  };
}

/** Variante pubblica del calcolo metriche (convenience). */
export function computeMetrics(
  recipe: Recipe,
  ingredients: Ingredient[],
): RecipeMetrics {
  return calculateRecipe(recipe, ingredients);
}
