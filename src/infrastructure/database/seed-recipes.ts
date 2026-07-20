import type { RecipeFamily } from "@/types";

/** Riga di ricetta seed, referenziata per slug ingrediente. */
export interface SeedRecipeLine {
  ingredientSlug: string;
  quantityGrams: number;
  isLocked?: boolean;
  isMandatory?: boolean;
  minGrams?: number;
  maxGrams?: number;
}

export interface SeedRecipe {
  name: string;
  slug: string;
  family: RecipeFamily;
  description?: string;
  targetBatchWeight: number;
  /** Slug del preset di sistema associato (per le varianti fior di latte). */
  presetSlug?: string;
  tags: string[];
  preparation?: string;
  notes?: string;
  parentSlug?: string;
  lines: SeedRecipeLine[];
}

/**
 * Ricette demo (spec §8). Fior di latte in 4 versioni con preset diversi
 * (equilibrata, meno dolce, più morbida, più cremosa).
 */
export const SEED_RECIPES: SeedRecipe[] = [
  {
    name: "Fior di latte — Equilibrata",
    slug: "fior-di-latte-equilibrata",
    family: "base_latte",
    description: "Base fior di latte classica, bilanciata per vetrina.",
    targetBatchWeight: 1000,
    presetSlug: "sys-equilibrato-vetrina",
    tags: ["base", "fior-di-latte"],
    preparation:
      "1. Miscelare a freddo polveri e zuccheri. 2. Aggiungere latte e panna. " +
      "3. Pasteurizzare a 65°C per 30 min. 4. Mantecare in sorbettiera. " +
      "5. Maturazione 4-6h in frigo.",
    lines: [
      { ingredientSlug: "latte-intero", quantityGrams: 560, isMandatory: true },
      { ingredientSlug: "panna-35", quantityGrams: 150 },
      { ingredientSlug: "latte-scremato-in-polvere", quantityGrams: 50, isMandatory: true },
      { ingredientSlug: "saccarosio", quantityGrams: 150 },
      { ingredientSlug: "destrosio", quantityGrams: 40 },
      { ingredientSlug: "neutro-creme", quantityGrams: 4 },
      { ingredientSlug: "sale-fino", quantityGrams: 1 },
    ],
  },
  {
    name: "Fior di latte — Meno dolce",
    slug: "fior-di-latte-meno-dolce",
    family: "base_latte",
    description: "Variante meno dolce della fior di latte.",
    targetBatchWeight: 1000,
    presetSlug: "sys-meno-dolce",
    parentSlug: "fior-di-latte-equilibrata",
    tags: ["base", "fior-di-latte"],
    lines: [
      { ingredientSlug: "latte-intero", quantityGrams: 560, isMandatory: true },
      { ingredientSlug: "panna-35", quantityGrams: 160 },
      { ingredientSlug: "latte-scremato-in-polvere", quantityGrams: 55, isMandatory: true },
      { ingredientSlug: "saccarosio", quantityGrams: 110 },
      { ingredientSlug: "destrosio", quantityGrams: 50 },
      { ingredientSlug: "neutro-creme", quantityGrams: 4 },
      { ingredientSlug: "sale-fino", quantityGrams: 1 },
    ],
  },
  {
    name: "Fior di latte — Più morbida",
    slug: "fior-di-latte-piu-morbida",
    family: "base_latte",
    description: "Variante più morbida a bassa temperatura (più PAC).",
    targetBatchWeight: 1000,
    presetSlug: "sys-morbido-bassa-temp",
    parentSlug: "fior-di-latte-equilibrata",
    tags: ["base", "fior-di-latte"],
    lines: [
      { ingredientSlug: "latte-intero", quantityGrams: 540, isMandatory: true },
      { ingredientSlug: "panna-35", quantityGrams: 150 },
      { ingredientSlug: "latte-scremato-in-polvere", quantityGrams: 55, isMandatory: true },
      { ingredientSlug: "saccarosio", quantityGrams: 120 },
      { ingredientSlug: "destrosio", quantityGrams: 70 },
      { ingredientSlug: "sciroppo-di-glucosio", quantityGrams: 60 },
      { ingredientSlug: "neutro-creme", quantityGrams: 4 },
      { ingredientSlug: "sale-fino", quantityGrams: 1 },
    ],
  },
  {
    name: "Fior di latte — Più cremosa",
    slug: "fior-di-latte-piu-cremosa",
    family: "base_latte",
    description: "Variante più cremosa e corposa (più grassi e solidi).",
    targetBatchWeight: 1000,
    presetSlug: "sys-cremoso-corposo",
    parentSlug: "fior-di-latte-equilibrata",
    tags: ["base", "fior-di-latte"],
    lines: [
      { ingredientSlug: "latte-intero", quantityGrams: 520, isMandatory: true },
      { ingredientSlug: "panna-35", quantityGrams: 220 },
      { ingredientSlug: "latte-scremato-in-polvere", quantityGrams: 60, isMandatory: true },
      { ingredientSlug: "saccarosio", quantityGrams: 140 },
      { ingredientSlug: "destrosio", quantityGrams: 35 },
      { ingredientSlug: "neutro-creme", quantityGrams: 4 },
      { ingredientSlug: "sale-fino", quantityGrams: 1 },
    ],
  },
  {
    name: "Crema pasticcera",
    slug: "crema-pasticcera",
    family: "creme",
    description: "Gelato alla crema con tuorli e vaniglia.",
    targetBatchWeight: 1000,
    presetSlug: "sys-equilibrato-vetrina",
    tags: ["creme"],
    lines: [
      { ingredientSlug: "latte-intero", quantityGrams: 540, isMandatory: true },
      { ingredientSlug: "panna-35", quantityGrams: 160 },
      { ingredientSlug: "latte-scremato-in-polvere", quantityGrams: 50, isMandatory: true },
      { ingredientSlug: "saccarosio", quantityGrams: 150 },
      { ingredientSlug: "destrosio", quantityGrams: 35 },
      { ingredientSlug: "tuorlo-uovo", quantityGrams: 50 },
      { ingredientSlug: "neutro-creme", quantityGrams: 4 },
      { ingredientSlug: "sale-fino", quantityGrams: 1 },
    ],
  },
  {
    name: "Cioccolato fondente",
    slug: "cioccolato-fondente",
    family: "cioccolato",
    description: "Gelato al cioccolato fondente 70%.",
    targetBatchWeight: 1000,
    presetSlug: "sys-intenso",
    tags: ["cioccolato"],
    lines: [
      { ingredientSlug: "latte-intero", quantityGrams: 520, isMandatory: true },
      { ingredientSlug: "panna-35", quantityGrams: 150 },
      { ingredientSlug: "latte-scremato-in-polvere", quantityGrams: 40, isMandatory: true },
      { ingredientSlug: "saccarosio", quantityGrams: 120 },
      { ingredientSlug: "destrosio", quantityGrams: 30 },
      { ingredientSlug: "cacao-amaro", quantityGrams: 40 },
      { ingredientSlug: "cioccolato-fondente-70", quantityGrams: 90 },
      { ingredientSlug: "neutro-creme", quantityGrams: 4 },
      { ingredientSlug: "sale-fino", quantityGrams: 1 },
    ],
  },
  {
    name: "Nocciola",
    slug: "nocciola",
    family: "creme",
    description: "Gelato alla nocciola con pasta pura.",
    targetBatchWeight: 1000,
    presetSlug: "sys-cremoso-corposo",
    tags: ["creme", "frutta-secca"],
    lines: [
      { ingredientSlug: "latte-intero", quantityGrams: 540, isMandatory: true },
      { ingredientSlug: "panna-35", quantityGrams: 150 },
      { ingredientSlug: "latte-scremato-in-polvere", quantityGrams: 50, isMandatory: true },
      { ingredientSlug: "saccarosio", quantityGrams: 140 },
      { ingredientSlug: "destrosio", quantityGrams: 35 },
      { ingredientSlug: "pasta-di-nocciola", quantityGrams: 70 },
      { ingredientSlug: "neutro-creme", quantityGrams: 4 },
      { ingredientSlug: "sale-fino", quantityGrams: 1 },
    ],
  },
  {
    name: "Pistacchio",
    slug: "pistacchio",
    family: "creme",
    description: "Gelato al pistacchio con pasta pura.",
    targetBatchWeight: 1000,
    presetSlug: "sys-cremoso-corposo",
    tags: ["creme", "frutta-secca"],
    lines: [
      { ingredientSlug: "latte-intero", quantityGrams: 540, isMandatory: true },
      { ingredientSlug: "panna-35", quantityGrams: 150 },
      { ingredientSlug: "latte-scremato-in-polvere", quantityGrams: 50, isMandatory: true },
      { ingredientSlug: "saccarosio", quantityGrams: 130 },
      { ingredientSlug: "destrosio", quantityGrams: 35 },
      { ingredientSlug: "pasta-di-pistacchio", quantityGrams: 80 },
      { ingredientSlug: "neutro-creme", quantityGrams: 4 },
      { ingredientSlug: "sale-fino", quantityGrams: 1 },
    ],
  },
  {
    name: "Yogurt",
    slug: "yogurt",
    family: "base_latte",
    description: "Gelato allo yogurt fresco.",
    targetBatchWeight: 1000,
    presetSlug: "sys-leggero",
    tags: ["base", "yogurt"],
    lines: [
      { ingredientSlug: "latte-intero", quantityGrams: 430, isMandatory: true },
      { ingredientSlug: "yogurt-intero", quantityGrams: 300 },
      { ingredientSlug: "panna-35", quantityGrams: 80 },
      { ingredientSlug: "latte-scremato-in-polvere", quantityGrams: 40, isMandatory: true },
      { ingredientSlug: "saccarosio", quantityGrams: 110 },
      { ingredientSlug: "destrosio", quantityGrams: 35 },
      { ingredientSlug: "neutro-creme", quantityGrams: 4 },
      { ingredientSlug: "sale-fino", quantityGrams: 1 },
    ],
  },
  {
    name: "Fragola",
    slug: "fragola",
    family: "frutta_con_latte",
    description: "Gelato alla fragola con purea.",
    targetBatchWeight: 1000,
    presetSlug: "sys-equilibrato-vetrina",
    tags: ["frutta"],
    lines: [
      { ingredientSlug: "latte-intero", quantityGrams: 420, isMandatory: true },
      { ingredientSlug: "panna-35", quantityGrams: 100 },
      { ingredientSlug: "latte-scremato-in-polvere", quantityGrams: 45, isMandatory: true },
      { ingredientSlug: "saccarosio", quantityGrams: 130 },
      { ingredientSlug: "destrosio", quantityGrams: 40 },
      { ingredientSlug: "purea-di-fragola", quantityGrams: 260 },
      { ingredientSlug: "neutro-creme", quantityGrams: 4 },
      { ingredientSlug: "sale-fino", quantityGrams: 1 },
    ],
  },
  {
    name: "Limone (sorbetto)",
    slug: "limone-sorbetto",
    family: "sorbetto",
    description: "Sorbetto al limone fresco.",
    targetBatchWeight: 1000,
    presetSlug: "sys-sorbetto-frutta-fresca",
    tags: ["frutta", "sorbetto"],
    lines: [
      { ingredientSlug: "acqua", quantityGrams: 560, isMandatory: true },
      { ingredientSlug: "saccarosio", quantityGrams: 220 },
      { ingredientSlug: "destrosio", quantityGrams: 70 },
      { ingredientSlug: "sciroppo-di-glucosio", quantityGrams: 60 },
      { ingredientSlug: "inulina", quantityGrams: 20 },
      { ingredientSlug: "succo-di-limone", quantityGrams: 60 },
      { ingredientSlug: "neutro-sorbetti", quantityGrams: 5 },
      { ingredientSlug: "sale-fino", quantityGrams: 1 },
    ],
  },
  {
    name: "Mango (sorbetto)",
    slug: "mango-sorbetto",
    family: "sorbetto",
    description: "Sorbetto al mango con purea.",
    targetBatchWeight: 1000,
    presetSlug: "sys-sorbetto-frutta-fresca",
    tags: ["frutta", "sorbetto"],
    lines: [
      { ingredientSlug: "acqua", quantityGrams: 380, isMandatory: true },
      { ingredientSlug: "purea-di-mango", quantityGrams: 380 },
      { ingredientSlug: "saccarosio", quantityGrams: 150 },
      { ingredientSlug: "destrosio", quantityGrams: 50 },
      { ingredientSlug: "sciroppo-di-glucosio", quantityGrams: 35 },
      { ingredientSlug: "inulina", quantityGrams: 15 },
      { ingredientSlug: "neutro-sorbetti", quantityGrams: 5 },
      { ingredientSlug: "sale-fino", quantityGrams: 1 },
    ],
  },
  {
    name: "Sorbetto al limone alcolico",
    slug: "sorbetto-alcolico-limone",
    family: "alcolico",
    description: "Sorbetto al limone con limoncello.",
    targetBatchWeight: 1000,
    presetSlug: "sys-sorbetto-frutta-fresca",
    tags: ["frutta", "alcol", "sorbetto"],
    lines: [
      { ingredientSlug: "acqua", quantityGrams: 520, isMandatory: true },
      { ingredientSlug: "saccarosio", quantityGrams: 200 },
      { ingredientSlug: "destrosio", quantityGrams: 70 },
      { ingredientSlug: "sciroppo-di-glucosio", quantityGrams: 60 },
      { ingredientSlug: "inulina", quantityGrams: 20 },
      { ingredientSlug: "succo-di-limone", quantityGrams: 60 },
      { ingredientSlug: "limoncello", quantityGrams: 60 },
      { ingredientSlug: "neutro-sorbetti", quantityGrams: 5 },
      { ingredientSlug: "sale-fino", quantityGrams: 1 },
    ],
  },
  {
    name: "Cocco e mandorla (vegano)",
    slug: "vegano-cocco-mandorla",
    family: "vegano",
    description: "Gelato vegano cremoso cocco e mandorla.",
    targetBatchWeight: 1000,
    presetSlug: "sys-vegano-cremoso",
    tags: ["vegano"],
    lines: [
      { ingredientSlug: "bevanda-mandorla", quantityGrams: 550, isMandatory: true },
      { ingredientSlug: "olio-di-cocco", quantityGrams: 60 },
      { ingredientSlug: "saccarosio", quantityGrams: 150 },
      { ingredientSlug: "destrosio", quantityGrams: 50 },
      { ingredientSlug: "sciroppo-di-glucosio", quantityGrams: 60 },
      { ingredientSlug: "inulina", quantityGrams: 25 },
      { ingredientSlug: "neutro-sorbetti", quantityGrams: 5 },
      { ingredientSlug: "acqua", quantityGrams: 95 },
      { ingredientSlug: "sale-fino", quantityGrams: 1 },
    ],
  },
  {
    name: "Ricotta e gorgonzola (gastronomico)",
    slug: "gastronomico-ricotta-gorgonzola",
    family: "gastronomico",
    description: "Gelato gastronomico poco dolce.",
    targetBatchWeight: 1000,
    presetSlug: "sys-gastronomico-poco-dolce",
    tags: ["gastronomico"],
    lines: [
      { ingredientSlug: "latte-intero", quantityGrams: 600, isMandatory: true },
      { ingredientSlug: "panna-35", quantityGrams: 200 },
      { ingredientSlug: "latte-scremato-in-polvere", quantityGrams: 60, isMandatory: true },
      { ingredientSlug: "saccarosio", quantityGrams: 60 },
      { ingredientSlug: "destrosio", quantityGrams: 30 },
      { ingredientSlug: "mascarpone", quantityGrams: 40 },
      { ingredientSlug: "neutro-creme", quantityGrams: 5 },
      { ingredientSlug: "sale-fino", quantityGrams: 5 },
    ],
  },
];
