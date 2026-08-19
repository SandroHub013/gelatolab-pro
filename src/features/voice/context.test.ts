import { describe, expect, it } from "vitest";
import { renderCatalog, renderState, type VoiceContext } from "./context";

const context: VoiceContext = {
  page: "/recipes/abc/editor",
  ingredients: [
    { id: "ing-latte", name: "Latte intero", category: "latte" },
    { id: "ing-panna", name: "Panna 35%", category: "panna" },
  ],
  presets: [{ id: "pre-1", name: "Cremoso e corposo" }],
  recipes: [{ id: "abc", name: "Fior di latte" }],
  openRecipe: {
    id: "abc",
    name: "Fior di latte",
    family: "base_latte",
    batchWeightGrams: 1000,
    rows: [
      { rowId: "row-1", ingredientName: "Latte intero", grams: 520, locked: false },
      { rowId: "row-2", ingredientName: "Panna 35%", grams: 220, locked: true },
    ],
    metrics: {
      pesoTotale: "980 g",
      solidi: "40,2 %",
      zuccheri: "23,9 %",
      grassi: "9,8 %",
      pod: "18,4",
      pac: "26,9",
      equilibrio: "81",
      costoPerKg: "2,35 €",
    },
    warnings: ["La somma degli ingredienti differisce dal peso batch."],
  },
};

/**
 * La divisione fra i due blocchi non e' estetica: il catalogo apre il prompt ed
 * e' l'unico pezzo marcato come cacheabile. Se lo stato della ricetta finisse
 * li' dentro, ogni comando cambierebbe il prefisso e la cache smetterebbe di
 * valere — un guasto silenzioso, che si vede solo in bolletta.
 */
describe("separazione fra catalogo e stato", () => {
  it("tiene fuori dal catalogo tutto cio' che cambia a ogni comando", () => {
    const catalog = renderCatalog(context);
    expect(catalog).not.toContain("row-1");
    expect(catalog).not.toContain("980 g");
    expect(catalog).not.toContain("/recipes/abc/editor");
    expect(catalog).not.toContain("peso batch");
  });

  it("mette nel catalogo gli id che il modello deve poter citare", () => {
    const catalog = renderCatalog(context);
    expect(catalog).toContain("ing-latte");
    expect(catalog).toContain("ing-panna");
    expect(catalog).toContain("pre-1");
  });

  it("espone righe, metriche e avvisi nello stato", () => {
    const state = renderState(context);
    expect(state).toContain("row-1");
    expect(state).toContain("row-2");
    expect(state).toContain("bloccata");
    expect(state).toContain("POD: 18,4");
    expect(state).toContain("differisce dal peso batch");
  });

  it("dice esplicitamente quando non c'e' una ricetta aperta", () => {
    const state = renderState({ ...context, openRecipe: undefined });
    expect(state).toContain("Nessuna");
    expect(state).not.toContain("row-1");
  });

  it("regge una ricetta senza metriche ne' avvisi", () => {
    const bare: VoiceContext = {
      ...context,
      openRecipe: {
        id: "abc",
        name: "Vuota",
        family: "base_latte",
        batchWeightGrams: 1000,
        rows: [],
      },
    };
    expect(() => renderState(bare)).not.toThrow();
    expect(renderState(bare)).toContain("Vuota");
  });
});
