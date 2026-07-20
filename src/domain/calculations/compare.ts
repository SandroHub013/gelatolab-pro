import type {
  Recipe,
  RecipeIngredient,
  RecipeDiff,
  IngredientDiff,
  MetricDiff,
  Ingredient,
} from "@/types";
import { round } from "./round";

/**
 * Scala proporzionalmente una ricetta a un peso obiettivo.
 * Mantiene i rapporti tra ingredienti; i lock sono preservati come flag
 * (le quantità vengono comunque scalate).
 */
export function scaleRecipe(recipe: Recipe, targetWeightGrams: number): Recipe {
  if (targetWeightGrams <= 0) {
    throw new Error("Il peso obiettivo deve essere positivo.");
  }
  const currentWeight = recipe.ingredients.reduce(
    (sum, ri) => sum + ri.quantityGrams,
    0,
  );
  if (currentWeight <= 0) {
    // Nessuna quantità: non c'è nulla da scalare proporzionalmente.
    return { ...recipe, targetBatchWeight: targetWeightGrams };
  }
  const factor = targetWeightGrams / currentWeight;
  const ingredients: RecipeIngredient[] = recipe.ingredients.map((ri) => ({
    ...ri,
    quantityGrams: round(ri.quantityGrams * factor, 2),
    minGrams: ri.minGrams !== undefined ? round(ri.minGrams * factor, 2) : undefined,
    maxGrams: ri.maxGrams !== undefined ? round(ri.maxGrams * factor, 2) : undefined,
  }));
  return {
    ...recipe,
    ingredients,
    targetBatchWeight: targetWeightGrams,
  };
}

/**
 * Confronta due ricette: diff di quantità per ingrediente e diff delle
 * metriche aggregate. I nomi ingredienti sono recuperati dalle liste
 * passate (ingredienti di entrambe le ricette).
 */
export function compareRecipes(
  recipeA: Recipe,
  recipeB: Recipe,
  ingredientsA: Ingredient[],
  ingredientsB: Ingredient[],
): RecipeDiff {
  const metricsA = calculateRecipe(recipeA, ingredientsA);
  const metricsB = calculateRecipe(recipeB, ingredientsB);

  const indexA = new Map(ingredientsA.map((i) => [i.id, i]));
  const indexB = new Map(ingredientsB.map((i) => [i.id, i]));

  const qtyA = new Map<string, number>();
  const qtyB = new Map<string, number>();
  for (const ri of recipeA.ingredients ?? []) {
    const name = indexA.get(ri.ingredientId)?.name ?? ri.ingredientId;
    qtyA.set(name, (qtyA.get(name) ?? 0) + ri.quantityGrams);
  }
  for (const ri of recipeB.ingredients ?? []) {
    const name = indexB.get(ri.ingredientId)?.name ?? ri.ingredientId;
    qtyB.set(name, (qtyB.get(name) ?? 0) + ri.quantityGrams);
  }

  const names = new Set<string>([...qtyA.keys(), ...qtyB.keys()]);
  const ingDiff: IngredientDiff[] = [...names]
    .map((name) => {
      const qa = qtyA.get(name);
      const qb = qtyB.get(name);
      const presentInA = qa !== undefined;
      const presentInB = qb !== undefined;
      const qAv = qa ?? 0;
      const qBv = qb ?? 0;
      return {
        ingredientId: name,
        ingredientName: name,
        quantityA: round(qAv, 2),
        quantityB: round(qBv, 2),
        delta: round(qBv - qAv, 2),
        presentInA,
        presentInB,
      };
    })
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  const metricPairs: Array<{
    label: string;
    va: number;
    vb: number;
    unit: string;
  }> = [
    { label: "Peso totale", va: metricsA.totalWeightGrams, vb: metricsB.totalWeightGrams, unit: "g" },
    { label: "Acqua", va: metricsA.water, vb: metricsB.water, unit: "g" },
    { label: "Solidi totali", va: metricsA.totalSolids, vb: metricsB.totalSolids, unit: "g" },
    { label: "Zuccheri", va: metricsA.sugars.total, vb: metricsB.sugars.total, unit: "g" },
    { label: "Grassi", va: metricsA.fat.total, vb: metricsB.fat.total, unit: "g" },
    { label: "Proteine", va: metricsA.protein, vb: metricsB.protein, unit: "g" },
    { label: "MSNF", va: metricsA.msnf, vb: metricsB.msnf, unit: "g" },
    { label: "Fibre", va: metricsA.fiber, vb: metricsB.fiber, unit: "g" },
    { label: "POD", va: metricsA.pod, vb: metricsB.pod, unit: "" },
    { label: "PAC", va: metricsA.pac, vb: metricsB.pac, unit: "" },
    { label: "Indice equilibrio", va: metricsA.equilibriumIndex, vb: metricsB.equilibriumIndex, unit: "" },
    { label: "Costo", va: metricsA.cost, vb: metricsB.cost, unit: "€" },
    { label: "Costo/kg", va: metricsA.costPerKg, vb: metricsB.costPerKg, unit: "€/kg" },
    { label: "kcal/100g", va: metricsA.kcalPer100g, vb: metricsB.kcalPer100g, unit: "kcal" },
  ];

  const metrics: MetricDiff[] = metricPairs.map((m) => ({
    label: m.label,
    valueA: round(m.va, 3),
    valueB: round(m.vb, 3),
    delta: round(m.vb - m.va, 3),
    unit: m.unit,
  }));

  return {
    ingredients: ingDiff,
    metrics,
    totalWeightA: round(metricsA.totalWeightGrams, 2),
    totalWeightB: round(metricsB.totalWeightGrams, 2),
    totalWeightDelta: round(
      metricsB.totalWeightGrams - metricsA.totalWeightGrams,
      2,
    ),
    costA: round(metricsA.cost, 2),
    costB: round(metricsB.cost, 2),
    costDelta: round(metricsB.cost - metricsA.cost, 2),
  };
}

import { calculateRecipe } from "./calculate";
