import { describe, it, expect } from "vitest";
import { resolveSeedCoefficients, type SeedIngredient } from "@/infrastructure/database/seed-ingredients";

function makeSeed(over: Partial<SeedIngredient>): SeedIngredient {
  return {
    name: "x",
    slug: "x",
    category: "personalizzato",
    waterPercent: 0,
    totalSolidsPercent: 100,
    sugarsPercent: 0,
    fatPercent: 0,
    proteinPercent: 0,
    fiberPercent: 0,
    alcoholPercent: 0,
    allergens: [],
    tags: [],
    ...over,
  };
}

describe("resolveSeedCoefficients", () => {
  it("uses explicit podCoefficient/pacCoefficient when both are present", () => {
    const r = resolveSeedCoefficients(
      makeSeed({ sugarsPercent: 80, podCoefficient: 42, pacCoefficient: 55 }),
    );
    expect(r).toEqual({ pod: 42, pac: 55 });
  });

  it("derives from sugar breakdown when provided (dextrose > sucrose PAC)", () => {
    // 50% dextrose: POD index 74, PAC index 190
    const r = resolveSeedCoefficients(
      makeSeed({ sugarsPercent: 50, dextrosePercent: 50 }),
    );
    expect(r.pod).toBeCloseTo(37, 1); // 50 * 74 / 100
    expect(r.pac).toBeCloseTo(95, 1); // 50 * 190 / 100
  });

  it("falls back to total sugarsPercent as sucrose when no breakdown is given", () => {
    // Form-created ingredient: only total sugarsPercent, no breakdown.
    const r = resolveSeedCoefficients(makeSeed({ sugarsPercent: 80 }));
    expect(r.pod).toBeCloseTo(80, 1); // 80 * 100 / 100 (sucrose)
    expect(r.pac).toBeCloseTo(80, 1);
  });

  it("returns zero pod/pac when there are no sugars and no alcohol", () => {
    const r = resolveSeedCoefficients(makeSeed({ sugarsPercent: 0 }));
    expect(r).toEqual({ pod: 0, pac: 0 });
  });

  it("adds alcohol contribution to PAC only", () => {
    const r = resolveSeedCoefficients(makeSeed({ sugarsPercent: 0, alcoholPercent: 5 }));
    expect(r.pod).toBe(0);
    expect(r.pac).toBeCloseTo(35, 1); // 5 * 7
  });
});
