import { describe, it, expect } from "vitest";
import { calculateRecipe, scaleRecipe, compareRecipes, computeEquilibriumIndex, estimateServingTemperature } from "@/domain/calculations";
import type { Ingredient, Recipe, RecipeFamily } from "@/types";

function makeIngredient(over: Partial<Ingredient> & Pick<Ingredient, "id" | "name" | "slug" | "category">): Ingredient {
  return {
    waterPercent: 0,
    totalSolidsPercent: 100,
    sugarsPercent: 0,
    sucrosePercent: 0,
    fatPercent: 0,
    proteinPercent: 0,
    fiberPercent: 0,
    alcoholPercent: 0,
    podCoefficient: 0,
    pacCoefficient: 0,
    allergens: [],
    tags: [],
    isCustom: false,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...over,
  } as Ingredient;
}

// Sucrose: 100% solids, 100% sugar, POD=100, PAC=100
const sucrose = makeIngredient({
  id: "sucrose",
  name: "Saccarosio",
  slug: "saccarosio",
  category: "saccarosio",
  totalSolidsPercent: 100,
  sugarsPercent: 100,
  sucrosePercent: 100,
  podCoefficient: 100,
  pacCoefficient: 100,
  costPerKg: 1.2,
});

// Dextrose: 100% solids, 92% sugar, POD=74, PAC=190
const dextrose = makeIngredient({
  id: "dextrose",
  name: "Destrosio",
  slug: "destrosio",
  category: "destrosio",
  totalSolidsPercent: 100,
  sugarsPercent: 92,
  dextrosePercent: 92,
  podCoefficient: 74,
  pacCoefficient: 190,
  costPerKg: 3.0,
});

// Water: 100% water, 0 solids
const water = makeIngredient({
  id: "acqua",
  name: "Acqua",
  slug: "acqua",
  category: "acqua",
  waterPercent: 100,
  totalSolidsPercent: 0,
  podCoefficient: 0,
  pacCoefficient: 0,
  costPerKg: 0.002,
});

function makeRecipe(
  family: RecipeFamily,
  lines: Array<{ ingredientId: string; quantityGrams: number }>,
): Recipe {
  return {
    id: "r1",
    name: "Test",
    slug: "test",
    family,
    targetBatchWeight: 1000,
    ingredients: lines.map((l, i) => ({
      id: `ri-${i}`,
      ingredientId: l.ingredientId,
      quantityGrams: l.quantityGrams,
      isLocked: false,
      isMandatory: false,
    })),
    tags: [],
    version: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

describe("calculateRecipe", () => {
  it("somma correttamente il peso totale", () => {
    const recipe = makeRecipe("base_latte", [
      { ingredientId: "sucrose", quantityGrams: 170 },
      { ingredientId: "acqua", quantityGrams: 830 },
    ]);
    const m = calculateRecipe(recipe, [sucrose, water]);
    expect(m.totalWeightGrams).toBe(1000);
  });

  it("calcola acqua e solidi coerenti", () => {
    const recipe = makeRecipe("base_latte", [
      { ingredientId: "sucrose", quantityGrams: 170 },
      { ingredientId: "acqua", quantityGrams: 830 },
    ]);
    const m = calculateRecipe(recipe, [sucrose, water]);
    // 170g sucrose → 170 solidi, 0 acqua. 830g acqua → 830 acqua, 0 solidi.
    expect(m.totalSolids).toBeCloseTo(170, 4);
    expect(m.water).toBeCloseTo(830, 4);
  });

  it("calcola zuccheri totali e dettaglio", () => {
    const recipe = makeRecipe("base_latte", [
      { ingredientId: "sucrose", quantityGrams: 170 },
      { ingredientId: "dextrose", quantityGrams: 50 },
    ]);
    const m = calculateRecipe(recipe, [sucrose, dextrose]);
    // sucrose 170×1.0=170, dextrose 50×0.92=46 → total 216
    expect(m.sugars.total).toBeCloseTo(216, 1);
    expect(m.sugars.sucrose).toBeCloseTo(170, 4);
    expect(m.sugars.dextrose).toBeCloseTo(46, 4);
  });

  it("calcola POD headline normalizzato (% saccarosio-equivalente)", () => {
    const recipe = makeRecipe("base_latte", [
      { ingredientId: "sucrose", quantityGrams: 170 },
      { ingredientId: "acqua", quantityGrams: 830 },
    ]);
    const m = calculateRecipe(recipe, [sucrose, water]);
    // pod headline (convenzione Penco) = podRaw/totalG = 170×100/1000 = 17
    expect(m.pod).toBeCloseTo(17, 1);
    expect(m.pac).toBeCloseTo(17, 1);
    // podPerKg = pod × 10 (g saccarosio-equivalenti per kg)
    expect(m.podPerKg).toBeCloseTo(170, 0);
  });

  it("calcola costi totali e per kg", () => {
    const recipe = makeRecipe("base_latte", [
      { ingredientId: "sucrose", quantityGrams: 1000 },
    ]);
    const m = calculateRecipe(recipe, [sucrose]);
    // 1000g × 1.2€/kg / 1000 = 1.2€
    expect(m.cost).toBeCloseTo(1.2, 4);
    expect(m.costPerKg).toBeCloseTo(1.2, 4);
  });

  it("calcola kcal con coefficienti Atwater", () => {
    const recipe = makeRecipe("base_latte", [
      { ingredientId: "sucrose", quantityGrams: 100 },
    ]);
    const m = calculateRecipe(recipe, [sucrose]);
    // sucrose 100% sugar → 400 kcal/100g → 100g = 400 kcal
    expect(m.kcal).toBeCloseTo(400, 0);
    expect(m.kcalPer100g).toBeCloseTo(400, 0);
  });

  it("preserva percentuali ingredienti che sommano a 100", () => {
    const recipe = makeRecipe("base_latte", [
      { ingredientId: "sucrose", quantityGrams: 200 },
      { ingredientId: "acqua", quantityGrams: 800 },
    ]);
    const m = calculateRecipe(recipe, [sucrose, water]);
    const pctSum = Object.values(m.ingredientPercents).reduce((a, b) => a + b, 0);
    expect(pctSum).toBeCloseTo(100, 2);
  });

  it("avvisa se un ingrediente referenziato manca", () => {
    const recipe = makeRecipe("base_latte", [
      { ingredientId: "inesistente", quantityGrams: 100 },
    ]);
    const m = calculateRecipe(recipe, [sucrose]);
    expect(m.warnings.length).toBeGreaterThan(0);
  });

  it("POD/PAC misto saccarosio+destrosio", () => {
    const recipe = makeRecipe("base_latte", [
      { ingredientId: "sucrose", quantityGrams: 150 },
      { ingredientId: "dextrose", quantityGrams: 40 },
      { ingredientId: "acqua", quantityGrams: 810 },
    ]);
    const m = calculateRecipe(recipe, [sucrose, dextrose, water]);
    // podRaw = 150×100 + 40×74 = 15000 + 2960 = 17960
    // pacRaw = 150×100 + 40×190 = 15000 + 7600 = 22600
    // pod headline = podRaw/totalG = 17960/1000 = 17.96
    expect(m.pod).toBeCloseTo(17.96, 1);
    expect(m.pac).toBeCloseTo(22.6, 1);
    expect(m.podPerKg).toBeCloseTo(m.pod * 10, 1);
  });
});

describe("scaleRecipe", () => {
  it("scala proporzionalmente al peso obiettivo", () => {
    const recipe = makeRecipe("base_latte", [
      { ingredientId: "sucrose", quantityGrams: 170 },
      { ingredientId: "acqua", quantityGrams: 830 },
    ]);
    const scaled = scaleRecipe(recipe, 2000);
    expect(scaled.targetBatchWeight).toBe(2000);
    expect(scaled.ingredients[0].quantityGrams).toBeCloseTo(340, 2);
    expect(scaled.ingredients[1].quantityGrams).toBeCloseTo(1660, 2);
    const total = scaled.ingredients.reduce((s, i) => s + i.quantityGrams, 0);
    expect(total).toBeCloseTo(2000, 1);
  });

  it("mantiene i rapporti relativi", () => {
    const recipe = makeRecipe("base_latte", [
      { ingredientId: "sucrose", quantityGrams: 100 },
      { ingredientId: "acqua", quantityGrams: 300 },
    ]);
    const scaled = scaleRecipe(recipe, 500);
    const ratio = scaled.ingredients[0].quantityGrams / scaled.ingredients[1].quantityGrams;
    expect(ratio).toBeCloseTo(100 / 300, 3);
  });

  it("rifiuta peso obiettivo non positivo", () => {
    const recipe = makeRecipe("base_latte", [
      { ingredientId: "sucrose", quantityGrams: 100 },
    ]);
    expect(() => scaleRecipe(recipe, 0)).toThrow();
  });
});

describe("compareRecipes", () => {
  it("calcola il delta di quantità per ingrediente", () => {
    const a = makeRecipe("base_latte", [
      { ingredientId: "sucrose", quantityGrams: 170 },
      { ingredientId: "acqua", quantityGrams: 830 },
    ]);
    const b = makeRecipe("base_latte", [
      { ingredientId: "sucrose", quantityGrams: 150 },
      { ingredientId: "acqua", quantityGrams: 850 },
    ]);
    const diff = compareRecipes(a, b, [sucrose, water], [sucrose, water]);
    const s = diff.ingredients.find((i) => i.ingredientName === "Saccarosio");
    expect(s?.delta).toBeCloseTo(-20, 2);
    const w = diff.ingredients.find((i) => i.ingredientName === "Acqua");
    expect(w?.delta).toBeCloseTo(20, 2);
  });

  it("calcola delta metriche", () => {
    const a = makeRecipe("base_latte", [
      { ingredientId: "sucrose", quantityGrams: 170 },
    ]);
    const b = makeRecipe("base_latte", [
      { ingredientId: "sucrose", quantityGrams: 200 },
    ]);
    const diff = compareRecipes(a, b, [sucrose], [sucrose]);
    expect(diff.totalWeightDelta).toBeCloseTo(30, 1);
    const sugars = diff.metrics.find((m) => m.label === "Zuccheri");
    expect(sugars?.delta).toBeCloseTo(30, 1);
  });
});

describe("euristiche", () => {
  it("temperatura di servizio clampata", () => {
    expect(estimateServingTemperature(24, 38)).toBe(-12);
    expect(estimateServingTemperature(100, 20)).toBeGreaterThanOrEqual(-20);
    expect(estimateServingTemperature(100, 20)).toBeLessThanOrEqual(-6);
  });

  it("indice di equilibrio tra 0 e 100", () => {
    const idx = computeEquilibriumIndex({
      solidsPct: 36,
      sugarsPct: 17,
      fatPct: 8,
      proteinPct: 4,
      pod: 18,
      pac: 22,
    });
    expect(idx).toBe(100);
    const idx2 = computeEquilibriumIndex({
      solidsPct: 10,
      sugarsPct: 5,
      fatPct: 1,
      proteinPct: 1,
      pod: 5,
      pac: 5,
    });
    expect(idx2).toBeGreaterThanOrEqual(0);
    expect(idx2).toBeLessThan(100);
  });
});
