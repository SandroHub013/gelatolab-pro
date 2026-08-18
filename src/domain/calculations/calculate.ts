import type {
  Ingredient,
  Recipe,
  RecipeMetrics,
  IngredientContribution,
  SugarBreakdown,
  FatBreakdown,
} from "@/types";
import {
  DAIRY_CATEGORIES,
  EQUILIBRIUM_IDEAL,
  KCAL_COEFFICIENTS,
  SERVING_TEMP,
} from "@/lib/constants";

/** Costruisce una mappa id → ingrediente per lookup O(1). */
export function indexIngredients(ingredients: Ingredient[]): Map<string, Ingredient> {
  const map = new Map<string, Ingredient>();
  for (const ing of ingredients) map.set(ing.id, ing);
  return map;
}

/** Arrotonda mantenendo stabilità numerica. */
function round(value: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** MSNF derivato se assente: proteine + lattosio + minerali (per categorie latte). */
function deriveMsnf(ing: Ingredient): { msnf: number; derived: boolean } {
  if (ing.msnfPercent !== undefined && ing.msnfPercent !== null) {
    return { msnf: ing.msnfPercent, derived: false };
  }
  const isDairy = DAIRY_CATEGORIES.includes(ing.category);
  if (!isDairy) return { msnf: 0, derived: false };
  const lactose = ing.lactosePercent ?? 0;
  const minerals = ing.mineralsPercent ?? 0;
  return { msnf: ing.proteinPercent + lactose + minerals, derived: true };
}

/** kcal stimati per grammo di ingrediente (Atwater sui componenti in %). */
function kcalPerGram(ing: Ingredient): number {
  const sugars = ing.sugarsPercent;
  const polyols = ing.polyolsPercent ?? 0;
  const maltodextrin = ing.maltodextrinPercent ?? 0;
  const fiber = ing.fiberPercent;
  const fat = ing.fatPercent;
  const protein = ing.proteinPercent;
  const alcohol = ing.alcoholPercent;
  const emulsifiers = ing.emulsifierPercent ?? 0;
  const k =
    KCAL_COEFFICIENTS;
  // kcal per 100g, poi /100 → kcal/g
  const per100g =
    (sugars - polyols - maltodextrin) * k.sugars +
    polyols * k.polyols +
    maltodextrin * k.maltodextrin +
    fiber * k.fiber +
    fat * k.fat +
    protein * k.protein +
    alcohol * k.alcohol +
    emulsifiers * k.emulsifiers;
  return Math.max(0, per100g) / 100;
}

/** Somme grezze accumulate riga per riga, prima di arrotondamenti e derivate. */
interface RecipeTotals {
  water: number;
  totalSolids: number;
  sugarsTotal: number;
  sucrose: number;
  dextrose: number;
  fructose: number;
  glucose: number;
  lactose: number;
  maltose: number;
  maltodextrin: number;
  polyols: number;
  fat: number;
  milkFat: number;
  vegetableFat: number;
  protein: number;
  msnf: number;
  fiber: number;
  minerals: number;
  alcohol: number;
  stabilizers: number;
  emulsifiers: number;
  podRaw: number;
  pacRaw: number;
  cost: number;
  kcal: number;
}

interface Accumulated {
  contributions: IngredientContribution[];
  ingredientPercents: Record<string, number>;
  totals: RecipeTotals;
  warnings: string[];
  msnfDerived: boolean;
  ingredientsWithoutCost: string[];
}

function emptyTotals(): RecipeTotals {
  return {
    water: 0,
    totalSolids: 0,
    sugarsTotal: 0,
    sucrose: 0,
    dextrose: 0,
    fructose: 0,
    glucose: 0,
    lactose: 0,
    maltose: 0,
    maltodextrin: 0,
    polyols: 0,
    fat: 0,
    milkFat: 0,
    vegetableFat: 0,
    protein: 0,
    msnf: 0,
    fiber: 0,
    minerals: 0,
    alcohol: 0,
    stabilizers: 0,
    emulsifiers: 0,
    podRaw: 0,
    pacRaw: 0,
    cost: 0,
    kcal: 0,
  };
}

/** Contributo assoluto di una riga di ricetta, già arrotondato. */
function buildContribution(
  ri: Recipe["ingredients"][number],
  ing: Ingredient,
  msnf: number,
  totalWeightGrams: number,
): IngredientContribution {
  const qty = ri.quantityGrams;
  const share = (value: number): number =>
    totalWeightGrams > 0 ? value / totalWeightGrams : 0;
  const pct = share(qty) * 100;
  return {
    recipeIngredientId: ri.id,
    ingredientId: ing.id,
    quantityGrams: qty,
    percent: round(pct, 4),
    water: round((qty * ing.waterPercent) / 100, 4),
    totalSolids: round((qty * ing.totalSolidsPercent) / 100, 4),
    sugars: round((qty * ing.sugarsPercent) / 100, 4),
    fat: round((qty * ing.fatPercent) / 100, 4),
    protein: round((qty * ing.proteinPercent) / 100, 4),
    msnf: round((qty * msnf) / 100, 4),
    fiber: round((qty * ing.fiberPercent) / 100, 4),
    minerals: round((qty * (ing.mineralsPercent ?? 0)) / 100, 4),
    alcohol: round((qty * ing.alcoholPercent) / 100, 4),
    stabilizers: round((qty * (ing.stabilizerPercent ?? 0)) / 100, 4),
    emulsifiers: round((qty * (ing.emulsifierPercent ?? 0)) / 100, 4),
    pod: round(qty * ing.podCoefficient, 4),
    pac: round(qty * ing.pacCoefficient, 4),
    podShare: round(share(qty * ing.podCoefficient), 4),
    pacShare: round(share(qty * ing.pacCoefficient), 4),
    cost: round((qty * (ing.costPerKg ?? 0)) / 1000, 4),
    kcal: round(qty * kcalPerGram(ing), 4),
  };
}

function addToTotals(
  totals: RecipeTotals,
  c: IngredientContribution,
  ing: Ingredient,
  msnf: number,
): void {
  const qty = c.quantityGrams;
  totals.water += c.water;
  totals.totalSolids += c.totalSolids;
  totals.sugarsTotal += (qty * ing.sugarsPercent) / 100;
  totals.sucrose += (qty * (ing.sucrosePercent ?? 0)) / 100;
  totals.dextrose += (qty * (ing.dextrosePercent ?? 0)) / 100;
  totals.fructose += (qty * (ing.fructosePercent ?? 0)) / 100;
  totals.glucose += (qty * (ing.glucosePercent ?? 0)) / 100;
  totals.lactose += (qty * (ing.lactosePercent ?? 0)) / 100;
  totals.maltose += (qty * (ing.maltosePercent ?? 0)) / 100;
  totals.maltodextrin += (qty * (ing.maltodextrinPercent ?? 0)) / 100;
  totals.polyols += (qty * (ing.polyolsPercent ?? 0)) / 100;
  totals.fat += c.fat;
  totals.milkFat += (qty * (ing.milkFatPercent ?? 0)) / 100;
  totals.vegetableFat += (qty * (ing.vegetableFatPercent ?? 0)) / 100;
  totals.protein += c.protein;
  totals.msnf += (qty * msnf) / 100;
  totals.fiber += c.fiber;
  totals.minerals += c.minerals;
  totals.alcohol += c.alcohol;
  totals.stabilizers += c.stabilizers;
  totals.emulsifiers += c.emulsifiers;
  totals.podRaw += qty * ing.podCoefficient;
  totals.pacRaw += qty * ing.pacCoefficient;
  totals.cost += c.cost;
  totals.kcal += c.kcal;
}

/**
 * Percorre le righe di ricetta una volta sola, producendo contributi,
 * percentuali e somme grezze. Le righe che referenziano un ingrediente
 * assente vengono saltate con un warning.
 */
function accumulate(
  recipe: Recipe,
  index: Map<string, Ingredient>,
  totalWeightGrams: number,
): Accumulated {
  const acc: Accumulated = {
    contributions: [],
    ingredientPercents: {},
    totals: emptyTotals(),
    warnings: [],
    msnfDerived: false,
    ingredientsWithoutCost: [],
  };

  for (const ri of recipe.ingredients) {
    const ing = index.get(ri.ingredientId);
    if (!ing) {
      acc.warnings.push(
        `Ingrediente ${ri.ingredientId} non trovato (riga ${ri.id}); ignorato.`,
      );
      continue;
    }

    const { msnf, derived } = deriveMsnf(ing);
    if (derived) acc.msnfDerived = true;
    // Un costo assente vale 0 nella somma: senza avviso il costo/kg
    // risulterebbe silenziosamente sottostimato.
    if (ing.costPerKg === undefined || ing.costPerKg === null) {
      acc.ingredientsWithoutCost.push(ing.name);
    }

    const c = buildContribution(ri, ing, msnf, totalWeightGrams);
    acc.ingredientPercents[ri.id] = c.percent;
    acc.contributions.push(c);
    addToTotals(acc.totals, c, ing, msnf);
  }

  return acc;
}

/** Warning sulla coerenza fra dettaglio zuccheri e totale dichiarato. */
function sugarWarnings(sugars: SugarBreakdown): string[] {
  const detailSum =
    sugars.sucrose +
    sugars.dextrose +
    sugars.fructose +
    sugars.glucose +
    sugars.lactose +
    sugars.maltose +
    sugars.maltodextrin +
    sugars.polyols;
  if (sugars.total > 0 && detailSum > sugars.total + 1) {
    return [
      "Il dettaglio zuccheri supera il totale dichiarato per alcuni ingredienti.",
    ];
  }
  return [];
}

/**
 * Calcola tutte le metriche di una ricetta. Funzione pura, senza dipendenze
 * React/DB. Stesso input → stesso output.
 *
 * Se un ingrediente referenziato non è presente nella lista, viene ignorato
 * e generato un warning.
 */
export function calculateRecipe(
  recipe: Recipe,
  ingredients: Ingredient[],
): RecipeMetrics {
  const index = indexIngredients(ingredients);

  const totalWeightGrams = recipe.ingredients.reduce(
    (sum, ri) => sum + ri.quantityGrams,
    0,
  );

  const acc = accumulate(recipe, index, totalWeightGrams);
  const { totals } = acc;
  const warnings = [...acc.warnings];

  // Divisione per il peso totale con protezione dal batch vuoto: usata da
  // POD/PAC, percentuali di composizione, costo e kcal.
  const share = (value: number): number =>
    totalWeightGrams > 0 ? value / totalWeightGrams : 0;

  // POD/PAC: headline normalizzato (% saccarosio-equivalente, convenzione Penco)
  // + valore "per kg" (grammi saccarosio-equivalenti per kg di miscela).
  const pod = share(totals.podRaw);
  const pac = share(totals.pacRaw);

  const sugars: SugarBreakdown = {
    sucrose: round(totals.sucrose, 4),
    dextrose: round(totals.dextrose, 4),
    fructose: round(totals.fructose, 4),
    glucose: round(totals.glucose, 4),
    lactose: round(totals.lactose, 4),
    maltose: round(totals.maltose, 4),
    maltodextrin: round(totals.maltodextrin, 4),
    polyols: round(totals.polyols, 4),
    total: round(totals.sugarsTotal, 4),
  };

  const fat: FatBreakdown = {
    total: round(totals.fat, 4),
    milk: round(totals.milkFat, 4),
    vegetable: round(totals.vegetableFat, 4),
  };

  warnings.push(...sugarWarnings(sugars));

  if (acc.ingredientsWithoutCost.length > 0) {
    warnings.push(
      `Costo non disponibile per ${acc.ingredientsWithoutCost.length} ingrediente/i (${acc.ingredientsWithoutCost.join(", ")}): il costo indicato è sottostimato.`,
    );
  }

  // Stima temperatura di servizio (euristica, vedi DECISIONS.md).
  const solidsPct = share(totals.totalSolids) * 100;

  const equilibriumIndex = computeEquilibriumIndex({
    solidsPct,
    sugarsPct: (totals.sugarsTotal / Math.max(totalWeightGrams, 1)) * 100,
    fatPct: (totals.fat / Math.max(totalWeightGrams, 1)) * 100,
    proteinPct: (totals.protein / Math.max(totalWeightGrams, 1)) * 100,
    pod,
    pac,
  });

  return {
    totalWeightGrams: round(totalWeightGrams, 4),
    ingredientPercents: acc.ingredientPercents,
    contributions: acc.contributions,
    water: round(totals.water, 4),
    totalSolids: round(totals.totalSolids, 4),
    sugars,
    fat,
    protein: round(totals.protein, 4),
    msnf: round(totals.msnf, 4),
    msnfDerived: acc.msnfDerived,
    fiber: round(totals.fiber, 4),
    minerals: round(totals.minerals, 4),
    alcohol: round(totals.alcohol, 4),
    stabilizers: round(totals.stabilizers, 4),
    emulsifiers: round(totals.emulsifiers, 4),
    pod: round(pod, 4),
    pac: round(pac, 4),
    podPerKg: round(pod * 10, 4),
    pacPerKg: round(pac * 10, 4),
    equilibriumIndex: round(equilibriumIndex, 2),
    estimatedServingTemperature: round(
      estimateServingTemperature(pac, solidsPct),
      2,
    ),
    cost: round(totals.cost, 4),
    costPerKg: round(share(totals.cost) * 1000, 4),
    kcal: round(totals.kcal, 4),
    kcalPer100g: round(share(totals.kcal) * 100, 4),
    warnings,
  };
}

/** Stima temperatura di servizio (°C) — euristica, valore indicativo. */
export function estimateServingTemperature(pac: number, solidsPct: number): number {
  // Coefficienti documentati in DECISIONS.md (@/lib/constants).
  const { base, pacPerUnit, solidsPerUnit, idealPac, idealSolids, min, max } = SERVING_TEMP;
  const t = base + (pac - idealPac) * pacPerUnit - (solidsPct - idealSolids) * solidsPerUnit;
  return Math.min(max, Math.max(min, t));
}

/**
 * Indice di equilibrio euristico (0-100). Penalizza le deviazioni dai
 * valori equi; più alto = bilanciamento più centrato. Trasparente (tooltip).
 */
export function computeEquilibriumIndex(parts: {
  solidsPct: number;
  sugarsPct: number;
  fatPct: number;
  proteinPct: number;
  pod: number;
  pac: number;
}): number {
  const I = EQUILIBRIUM_IDEAL;
  // tolleranza relativa: deviazione normalizzata per valore ideale
  const dev = (v: number, ideal: number): number =>
    ideal === 0 ? 0 : Math.abs(v - ideal) / ideal;
  const totalDev =
    dev(parts.solidsPct, I.totalSolids) +
    dev(parts.sugarsPct, I.sugars) +
    dev(parts.fatPct, I.fat) +
    dev(parts.proteinPct, I.protein) +
    dev(parts.pod, I.pod) +
    dev(parts.pac, I.pac);
  // 6 termini: deviazione media, mappata su 0-100 (0 dev → 100).
  const avgDev = totalDev / 6;
  return Math.max(0, Math.min(100, (1 - avgDev) * 100));
}
