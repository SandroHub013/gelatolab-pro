import { describe, it, expect } from "vitest";
import { solveCalibration, reconcileRounding, buildSolverModel, modelToLp } from "@/domain/calculations/solver";
import type { CalibrationPreset, Ingredient, Recipe } from "@/types";

function makeIngredient(over: Partial<Ingredient> & Pick<Ingredient, "id" | "name" | "slug" | "category">): Ingredient {
  return {
    waterPercent: 0,
    totalSolidsPercent: 100,
    sugarsPercent: 0,
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

const sucrose = makeIngredient({
  id: "sucrose", name: "Saccarosio", slug: "s", category: "saccarosio",
  totalSolidsPercent: 100, sugarsPercent: 100, sucrosePercent: 100,
  podCoefficient: 100, pacCoefficient: 100, costPerKg: 1.0,
});
const dextrose = makeIngredient({
  id: "dextrose", name: "Destrosio", slug: "d", category: "destrosio",
  totalSolidsPercent: 100, sugarsPercent: 92, dextrosePercent: 92,
  podCoefficient: 74, pacCoefficient: 190, costPerKg: 3.0,
});
const water = makeIngredient({
  id: "acqua", name: "Acqua", slug: "a", category: "acqua",
  waterPercent: 100, totalSolidsPercent: 0, costPerKg: 0.001,
});
const milk = makeIngredient({
  id: "latte", name: "Latte intero", slug: "l", category: "latte",
  waterPercent: 87, totalSolidsPercent: 13,
  sugarsPercent: 4.7, lactosePercent: 4.7,
  fatPercent: 3.6, milkFatPercent: 3.6,
  proteinPercent: 3.2, mineralsPercent: 0.8,
  podCoefficient: 27, pacCoefficient: 100, costPerKg: 1.0,
});
const skimPowder = makeIngredient({
  id: "smp", name: "Latte scremato in polvere", slug: "smp", category: "latte_in_polvere",
  waterPercent: 3, totalSolidsPercent: 97,
  sugarsPercent: 52, lactosePercent: 52,
  fatPercent: 1, proteinPercent: 36, mineralsPercent: 8,
  podCoefficient: 78, pacCoefficient: 100, costPerKg: 7.0,
});

const balancedPreset: CalibrationPreset = {
  id: "p1",
  name: "Equilibrato",
  description: "test",
  recipeFamilies: ["base_latte"],
  targetRanges: {
    totalSolids: { min: 32, ideal: 36, max: 42 },
    sugars: { min: 14, ideal: 17, max: 20 },
    fat: { min: 4, ideal: 8, max: 12 },
    pod: { min: 14, ideal: 18, max: 22 },
    pac: { min: 18, ideal: 22, max: 28 },
  },
  objectiveWeights: {},
  rules: [],
  isSystemPreset: false,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

function recipeWith(lines: Array<{ id: string; ingredientId: string; quantityGrams: number; isLocked?: boolean; isMandatory?: boolean }>): Recipe {
  return {
    id: "r1", name: "Test", slug: "test", family: "base_latte",
    targetBatchWeight: 1000,
    ingredients: lines.map((l) => ({
      id: l.id, ingredientId: l.ingredientId, quantityGrams: l.quantityGrams,
      isLocked: l.isLocked ?? false, isMandatory: l.isMandatory ?? false,
    })),
    tags: [], version: 1, createdAt: new Date(0), updatedAt: new Date(0),
  };
}

describe("solveCalibration - feasibility", () => {
  it("trova soluzioni feasible che sommano al peso batch", async () => {
    const recipe = recipeWith([
      { id: "r1", ingredientId: "latte", quantityGrams: 600 },
      { id: "r2", ingredientId: "smp", quantityGrams: 60 },
      { id: "r3", ingredientId: "sucrose", quantityGrams: 170 },
      { id: "r4", ingredientId: "dextrose", quantityGrams: 40 },
      { id: "r5", ingredientId: "acqua", quantityGrams: 130 },
    ]);
    const ingredients = [sucrose, dextrose, water, milk, skimPowder];
    const result = await solveCalibration(recipe, ingredients, balancedPreset);
    expect(result.feasible).toBe(true);
    if (!result.feasible) return;
    expect(result.solutions.length).toBeGreaterThan(0);
    for (const sol of result.solutions) {
      const total = sol.recipe.ingredients.reduce((s, ri) => s + ri.quantityGrams, 0);
      // Riconciliazione a 0.1g: somma entro 0.1g del batch.
      expect(Math.abs(total - 1000)).toBeLessThanOrEqual(0.1);
    }
  }, 30000);

  it("rispetta i lock (quantità immutabili)", async () => {
    const recipe = recipeWith([
      { id: "r1", ingredientId: "latte", quantityGrams: 500, isLocked: true },
      { id: "r2", ingredientId: "sucrose", quantityGrams: 170 },
      { id: "r3", ingredientId: "acqua", quantityGrams: 330 },
    ]);
    const ingredients = [sucrose, water, milk];
    const result = await solveCalibration(recipe, ingredients, balancedPreset);
    expect(result.feasible).toBe(true);
    if (!result.feasible) return;
    for (const sol of result.solutions) {
      const milkRow = sol.recipe.ingredients.find((ri) => ri.id === "r1");
      expect(milkRow?.quantityGrams).toBeCloseTo(500, 1);
    }
  }, 30000);

  it("modalità 'stessi ingredienti' non aggiunge ingredienti", async () => {
    const recipe = recipeWith([
      { id: "r1", ingredientId: "latte", quantityGrams: 700 },
      { id: "r2", ingredientId: "sucrose", quantityGrams: 170 },
      { id: "r3", ingredientId: "acqua", quantityGrams: 130 },
    ]);
    const ingredients = [sucrose, water, milk];
    const result = await solveCalibration(recipe, ingredients, balancedPreset);
    expect(result.feasible).toBe(true);
    if (!result.feasible) return;
    for (const sol of result.solutions) {
      expect(sol.recipe.ingredients.length).toBe(3);
    }
  }, 30000);
});

describe("solveCalibration - determinismo", () => {
  it("stesso input produce stesso output", async () => {
    const recipe = recipeWith([
      { id: "r1", ingredientId: "latte", quantityGrams: 600 },
      { id: "r2", ingredientId: "smp", quantityGrams: 60 },
      { id: "r3", ingredientId: "sucrose", quantityGrams: 170 },
      { id: "r4", ingredientId: "acqua", quantityGrams: 170 },
    ]);
    const ingredients = [sucrose, water, milk, skimPowder];
    const r1 = await solveCalibration(recipe, ingredients, balancedPreset);
    const r2 = await solveCalibration(recipe, ingredients, balancedPreset);
    expect(r1.feasible).toBe(true);
    expect(r2.feasible).toBe(true);
    if (!r1.feasible || !r2.feasible) return;
    expect(r1.solutions.length).toBe(r2.solutions.length);
    r1.solutions.forEach((sa, i) => {
      const sb = r2.solutions[i];
      expect(sa.quantities).toEqual(sb.quantities);
    });
  }, 30000);
});

describe("solveCalibration - infeasibility", () => {
  it("diagnostica quando i lock superano il peso batch", async () => {
    const recipe = recipeWith([
      { id: "r1", ingredientId: "latte", quantityGrams: 700, isLocked: true },
      { id: "r2", ingredientId: "sucrose", quantityGrams: 400, isLocked: true },
      { id: "r3", ingredientId: "acqua", quantityGrams: 100 },
    ]);
    const ingredients = [sucrose, water, milk];
    const result = await solveCalibration(recipe, ingredients, balancedPreset);
    expect(result.feasible).toBe(false);
    if (result.feasible) return;
    expect(result.message.length).toBeGreaterThan(0);
    expect(result.conflictingConstraints.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  }, 30000);

  it("diagnostica quando i minimi superano il peso batch", async () => {
    const recipe = recipeWith([
      { id: "r1", ingredientId: "latte", quantityGrams: 600, isMandatory: true, isLocked: false },
      { id: "r2", ingredientId: "sucrose", quantityGrams: 500, isMandatory: true },
    ]).ingredients
      ? {
          ...recipeWith([
            { id: "r1", ingredientId: "latte", quantityGrams: 600 },
            { id: "r2", ingredientId: "sucrose", quantityGrams: 500 },
          ]),
          ingredients: [
            { id: "r1", ingredientId: "latte", quantityGrams: 600, isLocked: false, isMandatory: true, minGrams: 600 },
            { id: "r2", ingredientId: "sucrose", quantityGrams: 500, isLocked: false, isMandatory: true, minGrams: 500 },
          ],
        }
      : recipeWith([]);
    const ingredients = [sucrose, milk];
    const result = await solveCalibration(recipe, ingredients, balancedPreset);
    expect(result.feasible).toBe(false);
  }, 30000);

  it("diagnostica una ricetta senza ingredienti invece di generare un LP malformato", async () => {
    const result = await solveCalibration(recipeWith([]), [sucrose], balancedPreset);
    expect(result.feasible).toBe(false);
    if (result.feasible) return;
    expect(result.conflictingConstraints.length).toBeGreaterThan(0);
  }, 30000);

  it("segnala il range raccomandato quando vincola la soluzione", async () => {
    const boundedSucrose = makeIngredient({
      ...sucrose,
      minRecommendedPercent: 60,
      maxRecommendedPercent: 70,
    });
    const recipe = recipeWith([
      { id: "r1", ingredientId: "sucrose", quantityGrams: 170 },
      { id: "r2", ingredientId: "acqua", quantityGrams: 830 },
    ]);
    const result = await solveCalibration(recipe, [boundedSucrose, water], balancedPreset);
    if (!result.feasible) {
      expect(result.suggestions.join(" ")).toContain("range raccomandato");
      return;
    }
    const messages = result.solutions.flatMap((s) => s.activeConstraints).join(" ");
    expect(messages).toContain("range raccomandato");
  }, 30000);
});

describe("reconcileRounding", () => {
  it("somma esattamente al batch dopo arrotondamento", () => {
    const q = [100.04, 200.06, 699.9];
    const locked = [false, false, false];
    const out = reconcileRounding(q, locked, 1000);
    const sum = out.reduce((s, v) => s + v, 0);
    expect(Math.round(sum * 10) / 10).toBe(1000);
  });

  it("non modifica gli ingredienti bloccati", () => {
    const q = [100.04, 899.96];
    const locked = [true, false];
    const out = reconcileRounding(q, locked, 1000);
    expect(out[0]).toBe(100); // 100.04 → 100 (locked, non toccato)
    const sum = out.reduce((s, v) => s + v, 0);
    expect(Math.round(sum * 10) / 10).toBe(1000);
  });

  it("non spinge una quantità sotto il suo minimo per chiudere il residuo", () => {
    const q = [100, 200, 700];
    const locked = [false, false, false];
    const bounds = [
      { lb: 100, ub: Number.POSITIVE_INFINITY },
      { lb: 200, ub: 200 },
      { lb: 0, ub: Number.POSITIVE_INFINITY },
    ];
    const out = reconcileRounding(q, locked, 900, bounds);
    expect(out[0]).toBeGreaterThanOrEqual(100);
    expect(out[1]).toBe(200);
    expect(out.every((v) => v >= 0)).toBe(true);
  });

  it("non produce quantità negative senza bound espliciti", () => {
    const out = reconcileRounding([10, 5], [false, false], 0);
    expect(out.every((v) => v >= 0)).toBe(true);
  });
});

describe("buildSolverModel & modelToLp", () => {
  it("genera un LP ben formato", () => {
    const recipe = recipeWith([
      { id: "r1", ingredientId: "sucrose", quantityGrams: 170 },
      { id: "r2", ingredientId: "acqua", quantityGrams: 830 },
    ]);
    const model = buildSolverModel(recipe, [sucrose, water], balancedPreset, "minimal", {});
    const lp = modelToLp(model);
    expect(lp).toContain("Minimize");
    expect(lp).toContain("Subject To");
    expect(lp).toContain("batch:");
    expect(lp).toContain("Bounds");
    expect(lp).toContain("End");
  });
});
