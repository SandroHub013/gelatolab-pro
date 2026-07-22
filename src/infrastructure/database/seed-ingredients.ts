import type { IngredientCategory } from "@/types";

/** Definizione compatta di un ingrediente per il seed. */
export interface SeedIngredient {
  name: string;
  slug: string;
  category: IngredientCategory;
  description?: string;
  waterPercent: number;
  totalSolidsPercent: number;
  sugarsPercent: number;
  sucrosePercent?: number;
  dextrosePercent?: number;
  fructosePercent?: number;
  glucosePercent?: number;
  lactosePercent?: number;
  maltosePercent?: number;
  maltodextrinPercent?: number;
  polyolsPercent?: number;
  fatPercent: number;
  milkFatPercent?: number;
  vegetableFatPercent?: number;
  proteinPercent: number;
  msnfPercent?: number;
  fiberPercent: number;
  mineralsPercent?: number;
  alcoholPercent: number;
  /** Coefficiente POD effettivo (per grammo di intero ingrediente). Se assente, derivato dalla composizione zuccheri. */
  podCoefficient?: number;
  pacCoefficient?: number;
  stabilizerPercent?: number;
  emulsifierPercent?: number;
  density?: number;
  costPerKg?: number;
  allergens: string[];
  tags: string[];
  minRecommendedPercent?: number;
  maxRecommendedPercent?: number;
  source?: string;
}

/**
 * Dati ingredienti seed (spec §8). Valori dichiarativi "indicativi"
 * (vedi spec §2.3): ogni ingrediente è modificabile in app.
 * Coefficienti POD/PAC su scala saccarosio=100 (convezione Penco).
 */
export const SEED_INGREDIENTS: SeedIngredient[] = [
  {
    name: "Acqua", slug: "acqua", category: "acqua",
    description: "Acqua neutra", waterPercent: 100, totalSolidsPercent: 0,
    sugarsPercent: 0, fatPercent: 0, proteinPercent: 0, fiberPercent: 0,
    alcoholPercent: 0, costPerKg: 0.002,
    allergens: [], tags: ["base"], minRecommendedPercent: 0, maxRecommendedPercent: 70,
  },
  {
    name: "Latte intero", slug: "latte-intero", category: "latte",
    description: "Latte vaccino intero (3.6% grassi)", waterPercent: 87.4, totalSolidsPercent: 12.6,
    sugarsPercent: 4.7, lactosePercent: 4.7, fatPercent: 3.6, milkFatPercent: 3.6,
    proteinPercent: 3.2, mineralsPercent: 0.7, fiberPercent: 0, alcoholPercent: 0, costPerKg: 1.1,
    allergens: ["latte"], tags: ["base"], minRecommendedPercent: 0, maxRecommendedPercent: 70,
  },
  {
    name: "Latte scremato", slug: "latte-scremato", category: "latte",
    description: "Latte vaccino scremato", waterPercent: 90.8, totalSolidsPercent: 9.2,
    sugarsPercent: 4.8, lactosePercent: 4.8, fatPercent: 0.1, milkFatPercent: 0.1,
    proteinPercent: 3.4, mineralsPercent: 0.8, fiberPercent: 0, alcoholPercent: 0, costPerKg: 1.0,
    allergens: ["latte"], tags: ["base"], minRecommendedPercent: 0, maxRecommendedPercent: 70,
  },
  {
    name: "Panna 35%", slug: "panna-35", category: "panna",
    description: "Panna fresca 35% grassi", waterPercent: 57.6, totalSolidsPercent: 42.4,
    sugarsPercent: 3.0, lactosePercent: 3.0, fatPercent: 35, milkFatPercent: 35,
    proteinPercent: 2.5, mineralsPercent: 0.5, fiberPercent: 0, alcoholPercent: 0, costPerKg: 4.2,
    allergens: ["latte"], tags: ["base"], minRecommendedPercent: 0, maxRecommendedPercent: 25,
  },
  {
    name: "Latte scremato in polvere", slug: "latte-scremato-in-polvere", category: "latte_in_polvere",
    description: "SMP - Solidi Non Grassi del latte", waterPercent: 3, totalSolidsPercent: 97,
    sugarsPercent: 52, lactosePercent: 52, fatPercent: 1, milkFatPercent: 1,
    proteinPercent: 36, mineralsPercent: 8, fiberPercent: 0, alcoholPercent: 0, costPerKg: 6.5,
    allergens: ["latte"], tags: ["solidi"], minRecommendedPercent: 0, maxRecommendedPercent: 12,
  },
  {
    name: "Saccarosio", slug: "saccarosio", category: "saccarosio",
    description: "Zucchero comune (riferimento POD/PAC=100)", waterPercent: 0, totalSolidsPercent: 100,
    sugarsPercent: 100, sucrosePercent: 100, fatPercent: 0, proteinPercent: 0, fiberPercent: 0,
    alcoholPercent: 0, costPerKg: 1.2,
    allergens: [], tags: ["zucchero"], minRecommendedPercent: 8, maxRecommendedPercent: 22,
  },
  {
    name: "Destrosio", slug: "destrosio", category: "destrosio",
    description: "Glucosio monoidrato, anticongelante", waterPercent: 8, totalSolidsPercent: 92,
    sugarsPercent: 92, dextrosePercent: 92, fatPercent: 0, proteinPercent: 0, fiberPercent: 0,
    alcoholPercent: 0, costPerKg: 3.0,
    allergens: [], tags: ["zucchero"], minRecommendedPercent: 0, maxRecommendedPercent: 12,
  },
  {
    name: "Fruttosio", slug: "fruttosio", category: "fruttosio",
    description: "Zucchero della frutta, molto dolce", waterPercent: 0, totalSolidsPercent: 100,
    sugarsPercent: 100, fructosePercent: 100, fatPercent: 0, proteinPercent: 0, fiberPercent: 0,
    alcoholPercent: 0, costPerKg: 4.0,
    allergens: [], tags: ["zucchero"], minRecommendedPercent: 0, maxRecommendedPercent: 10,
  },
  {
    name: "Glucosio cristallino", slug: "glucosio-cristallino", category: "glucosio",
    description: "Glucosio DE 38", waterPercent: 10, totalSolidsPercent: 90,
    sugarsPercent: 80, glucosePercent: 80, fatPercent: 0, proteinPercent: 0, fiberPercent: 0,
    alcoholPercent: 0, costPerKg: 3.5,
    allergens: [], tags: ["zucchero"], minRecommendedPercent: 0, maxRecommendedPercent: 15,
  },
  {
    name: "Sciroppo di glucosio 38DE", slug: "sciroppo-di-glucosio", category: "sciroppo_di_glucosio",
    description: "Sciroppo di glucosio DE 38", waterPercent: 20, totalSolidsPercent: 80,
    sugarsPercent: 72, glucosePercent: 40, maltosePercent: 32, fatPercent: 0, proteinPercent: 0,
    fiberPercent: 0, alcoholPercent: 0, density: 1.4, costPerKg: 3.0,
    allergens: [], tags: ["zucchero"], minRecommendedPercent: 0, maxRecommendedPercent: 15,
  },
  {
    name: "Zucchero invertito", slug: "zucchero-invertito", category: "zucchero_invertito",
    description: "Miscele glucosio+fruttosio", waterPercent: 25, totalSolidsPercent: 75,
    sugarsPercent: 75, glucosePercent: 37.5, fructosePercent: 37.5, fatPercent: 0, proteinPercent: 0,
    fiberPercent: 0, alcoholPercent: 0, density: 1.35, costPerKg: 4.5,
    allergens: [], tags: ["zucchero"], minRecommendedPercent: 0, maxRecommendedPercent: 12,
  },
  {
    name: "Maltodestrina DE 12", slug: "maltodestrina", category: "maltodestrina",
    description: "Carico corporeo senza dolcezza", waterPercent: 5, totalSolidsPercent: 95,
    sugarsPercent: 15, maltodextrinPercent: 95, fatPercent: 0, proteinPercent: 0, fiberPercent: 0,
    alcoholPercent: 0, costPerKg: 5.0,
    allergens: [], tags: ["corpo"], minRecommendedPercent: 0, maxRecommendedPercent: 8,
  },
  {
    name: "Inulina", slug: "inulina", category: "inulina",
    description: "Fibra prebiotica, corpo e cremosità", waterPercent: 5, totalSolidsPercent: 95,
    sugarsPercent: 10, fatPercent: 0, proteinPercent: 0, fiberPercent: 90, alcoholPercent: 0, costPerKg: 12.0,
    allergens: [], tags: ["fibra"], minRecommendedPercent: 0, maxRecommendedPercent: 5,
  },
  {
    name: "Fibra vegetale", slug: "fibre-mille", category: "fibre",
    description: "Fibra stabilizzante generica", waterPercent: 5, totalSolidsPercent: 95,
    sugarsPercent: 0, fatPercent: 0, proteinPercent: 0, fiberPercent: 90, alcoholPercent: 0, costPerKg: 9.0,
    allergens: [], tags: ["fibra", "stabilizzante"], minRecommendedPercent: 0, maxRecommendedPercent: 2,
  },
  {
    name: "Miele di acacia", slug: "miele-acacia", category: "miele",
    description: "Miele dolce, aromatico", waterPercent: 17, totalSolidsPercent: 83,
    sugarsPercent: 82, fructosePercent: 40, glucosePercent: 35, fatPercent: 0, proteinPercent: 0.4,
    fiberPercent: 0, alcoholPercent: 0, density: 1.42, costPerKg: 9.0,
    allergens: [], tags: ["zucchero"], minRecommendedPercent: 0, maxRecommendedPercent: 10,
  },
  {
    name: "Cacao amaro in polvere", slug: "cacao-amaro", category: "cacao",
    description: "Cacao 100% non zuccherato", waterPercent: 3, totalSolidsPercent: 97,
    sugarsPercent: 1, fatPercent: 22, vegetableFatPercent: 22, proteinPercent: 20,
    fiberPercent: 33, mineralsPercent: 8, alcoholPercent: 0, costPerKg: 12.0,
    allergens: [], tags: ["aroma"], minRecommendedPercent: 0, maxRecommendedPercent: 12,
  },
  {
    name: "Cioccolato fondente 70%", slug: "cioccolato-fondente-70", category: "cioccolato",
    description: "Couverture fondente 70%", waterPercent: 1, totalSolidsPercent: 99,
    sugarsPercent: 30, sucrosePercent: 29, fatPercent: 42, vegetableFatPercent: 42,
    proteinPercent: 9, fiberPercent: 11, mineralsPercent: 3, alcoholPercent: 0, costPerKg: 11.0,
    allergens: [], tags: ["aroma"], minRecommendedPercent: 0, maxRecommendedPercent: 20,
  },
  {
    name: "Pasta di nocciola 100%", slug: "pasta-di-nocciola", category: "paste_pure",
    description: "Pasta di nocciola tostata pura", waterPercent: 1, totalSolidsPercent: 99,
    sugarsPercent: 6, sucrosePercent: 6, fatPercent: 62, vegetableFatPercent: 62,
    proteinPercent: 15, fiberPercent: 10, mineralsPercent: 3, alcoholPercent: 0, costPerKg: 28.0,
    allergens: ["frutta-a-guscio"], tags: ["aroma"], minRecommendedPercent: 0, maxRecommendedPercent: 15,
  },
  {
    name: "Pasta di pistacchio 100%", slug: "pasta-di-pistacchio", category: "paste_pure",
    description: "Pasta di pistacchio pura", waterPercent: 2, totalSolidsPercent: 98,
    sugarsPercent: 8, sucrosePercent: 8, fatPercent: 54, vegetableFatPercent: 54,
    proteinPercent: 21, fiberPercent: 10, mineralsPercent: 3, alcoholPercent: 0, costPerKg: 60.0,
    allergens: ["frutta-a-guscio"], tags: ["aroma"], minRecommendedPercent: 0, maxRecommendedPercent: 12,
  },
  {
    name: "Yogurt intero", slug: "yogurt-intero", category: "yogurt",
    description: "Yogurt bianco intero", waterPercent: 81, totalSolidsPercent: 19,
    sugarsPercent: 4.7, lactosePercent: 4.7, fatPercent: 3.3, milkFatPercent: 3.3,
    proteinPercent: 3.5, mineralsPercent: 0.8, fiberPercent: 0, alcoholPercent: 0, costPerKg: 2.5,
    allergens: ["latte"], tags: ["base"], minRecommendedPercent: 0, maxRecommendedPercent: 40,
  },
  {
    name: "Mascarpone", slug: "mascarpone", category: "mascarpone",
    description: "Formaggio fresco cremoso", waterPercent: 48, totalSolidsPercent: 52,
    sugarsPercent: 4, lactosePercent: 4, fatPercent: 42, milkFatPercent: 42,
    proteinPercent: 4, mineralsPercent: 0.5, fiberPercent: 0, alcoholPercent: 0, costPerKg: 6.5,
    allergens: ["latte"], tags: ["base"], minRecommendedPercent: 0, maxRecommendedPercent: 25,
  },
  {
    name: "Tuorlo d'uovo", slug: "tuorlo-uovo", category: "tuorlo",
    description: "Emulsionante naturale", waterPercent: 50, totalSolidsPercent: 50,
    sugarsPercent: 1, fatPercent: 31, proteinPercent: 16, fiberPercent: 0,
    mineralsPercent: 1.5, alcoholPercent: 0, costPerKg: 9.0, emulsifierPercent: 10,
    allergens: ["uova"], tags: ["emulsionante"], minRecommendedPercent: 0, maxRecommendedPercent: 8,
  },
  {
    name: "Bevanda di soia", slug: "bevanda-soia", category: "bevande_vegetali",
    description: "Latte di soia", waterPercent: 90, totalSolidsPercent: 10,
    sugarsPercent: 2, sucrosePercent: 1, fatPercent: 2, vegetableFatPercent: 2,
    proteinPercent: 3.5, fiberPercent: 1, mineralsPercent: 0.3, alcoholPercent: 0, costPerKg: 1.8,
    allergens: ["soia"], tags: ["vegano"], minRecommendedPercent: 0, maxRecommendedPercent: 70,
  },
  {
    name: "Bevanda di mandorla", slug: "bevanda-mandorla", category: "bevande_vegetali",
    description: "Latte di mandorla", waterPercent: 92, totalSolidsPercent: 8,
    sugarsPercent: 2, sucrosePercent: 2, fatPercent: 2.5, vegetableFatPercent: 2.5,
    proteinPercent: 1, fiberPercent: 1.5, mineralsPercent: 0.3, alcoholPercent: 0, costPerKg: 2.2,
    allergens: ["frutta-a-guscio"], tags: ["vegano"], minRecommendedPercent: 0, maxRecommendedPercent: 70,
  },
  {
    name: "Olio di cocco", slug: "olio-di-cocco", category: "grassi_vegetali",
    description: "Grasso vegetale saturo", waterPercent: 0, totalSolidsPercent: 100,
    sugarsPercent: 0, fatPercent: 100, vegetableFatPercent: 100, proteinPercent: 0,
    fiberPercent: 0, alcoholPercent: 0, density: 0.92, costPerKg: 6.0,
    allergens: [], tags: ["vegano", "grasso"], minRecommendedPercent: 0, maxRecommendedPercent: 8,
  },
  {
    name: "Purea di fragola", slug: "purea-di-fragola", category: "purea_di_frutta",
    description: "Purea di fragola pastorizzata", waterPercent: 90, totalSolidsPercent: 10,
    sugarsPercent: 7, fructosePercent: 5, glucosePercent: 2, fatPercent: 0.3,
    proteinPercent: 0.6, fiberPercent: 1.8, mineralsPercent: 0.3, alcoholPercent: 0, costPerKg: 5.0,
    allergens: [], tags: ["frutta"], minRecommendedPercent: 0, maxRecommendedPercent: 50,
  },
  {
    name: "Purea di lampone", slug: "purea-di-lampone", category: "purea_di_frutta",
    description: "Purea di lampone pastorizzata", waterPercent: 86, totalSolidsPercent: 14,
    sugarsPercent: 9, fructosePercent: 6, glucosePercent: 3, fatPercent: 0.5,
    proteinPercent: 1, fiberPercent: 3, mineralsPercent: 0.4, alcoholPercent: 0, costPerKg: 7.5,
    allergens: [], tags: ["frutta"], minRecommendedPercent: 0, maxRecommendedPercent: 50,
  },
  {
    name: "Purea di mango", slug: "purea-di-mango", category: "purea_di_frutta",
    description: "Purea di mango pastorizzata", waterPercent: 84, totalSolidsPercent: 16,
    sugarsPercent: 13, sucrosePercent: 6, fructosePercent: 4, glucosePercent: 3,
    fatPercent: 0.5, proteinPercent: 0.8, fiberPercent: 1.5, mineralsPercent: 0.3, alcoholPercent: 0, costPerKg: 5.5,
    allergens: [], tags: ["frutta"], minRecommendedPercent: 0, maxRecommendedPercent: 50,
  },
  {
    name: "Succo di limone", slug: "succo-di-limone", category: "frutta_fresca",
    description: "Succo di limone fresco", waterPercent: 91, totalSolidsPercent: 9,
    sugarsPercent: 2.5, sucrosePercent: 1, fructosePercent: 1, glucosePercent: 0.5,
    fatPercent: 0.2, proteinPercent: 0.5, fiberPercent: 0.4, mineralsPercent: 0.3, alcoholPercent: 0, costPerKg: 3.0,
    allergens: [], tags: ["frutta"], minRecommendedPercent: 0, maxRecommendedPercent: 30,
  },
  {
    name: "Neutro per creme", slug: "neutro-creme", category: "neutri",
    description: "Stabilizzante per basi latte/creme", waterPercent: 8, totalSolidsPercent: 92,
    sugarsPercent: 0, fatPercent: 0, proteinPercent: 0, fiberPercent: 0, alcoholPercent: 0,
    costPerKg: 35.0, allergens: [], tags: ["stabilizzante"],
    minRecommendedPercent: 0.1, maxRecommendedPercent: 0.6,
  },
  {
    name: "Neutro per sorbetti", slug: "neutro-sorbetti", category: "neutri",
    description: "Stabilizzante per sorbetti", waterPercent: 8, totalSolidsPercent: 92,
    sugarsPercent: 0, fatPercent: 0, proteinPercent: 0, fiberPercent: 0, alcoholPercent: 0,
    costPerKg: 38.0, allergens: [], tags: ["stabilizzante"],
    minRecommendedPercent: 0.2, maxRecommendedPercent: 0.8,
  },
  {
    name: "Sale fino", slug: "sale-fino", category: "sale",
    description: "Cloruro di sodio", waterPercent: 0, totalSolidsPercent: 100,
    sugarsPercent: 0, fatPercent: 0, proteinPercent: 0, fiberPercent: 0,
    mineralsPercent: 100, alcoholPercent: 0, costPerKg: 1.0,
    allergens: [], tags: ["aroma"], minRecommendedPercent: 0, maxRecommendedPercent: 0.3,
  },
  {
    name: "Liquore al limone (limoncello)", slug: "limoncello", category: "alcolici",
    description: "Limoncello 30% vol", waterPercent: 55, totalSolidsPercent: 45,
    sugarsPercent: 40, sucrosePercent: 40, fatPercent: 0, proteinPercent: 0, fiberPercent: 0,
    alcoholPercent: 30, density: 1.1, costPerKg: 20.0,
    allergens: [], tags: ["alcol"], minRecommendedPercent: 0, maxRecommendedPercent: 15,
  },
];

// --- Risolutori coefficienti POD/PAC (effettivi per grammo di intero ingrediente) ---

/** Indici relativi al saccarosio=100 per componente. */
const POD_INDEX = {
  sucrose: 100, dextrose: 74, fructose: 173, glucose: 60,
  lactose: 27, maltose: 33, maltodextrin: 20, polyols: 60,
} as const;
const PAC_INDEX = {
  sucrose: 100, dextrose: 190, fructose: 190, glucose: 230,
  lactose: 100, maltose: 100, maltodextrin: 60, polyols: 200,
} as const;

/**
 * Coefficiente effettivo (per grammo di intero ingrediente, scala saccarosio=100)
 * derivato dalla composizione. Coerente con la formula del motore
 * `contributo = quantità × coeff` (spec §4).
 */
export function resolveSeedCoefficients(
  ing: SeedIngredient,
  isCustom = false,
): {
  pod: number;
  pac: number;
} {
  if (ing.podCoefficient !== undefined && ing.pacCoefficient !== undefined) {
    return { pod: ing.podCoefficient, pac: ing.pacCoefficient };
  }
  const components: Array<[number, keyof typeof POD_INDEX]> = [
    [ing.sucrosePercent ?? 0, "sucrose"],
    [ing.dextrosePercent ?? 0, "dextrose"],
    [ing.fructosePercent ?? 0, "fructose"],
    [ing.glucosePercent ?? 0, "glucose"],
    [ing.lactosePercent ?? 0, "lactose"],
    [ing.maltosePercent ?? 0, "maltose"],
    [ing.maltodextrinPercent ?? 0, "maltodextrin"],
    [ing.polyolsPercent ?? 0, "polyols"],
  ];
  let pod = 0;
  let pac = 0;
  for (const [pct, key] of components) {
    pod += (pct * POD_INDEX[key]) / 100;
    pac += (pct * PAC_INDEX[key]) / 100;
  }
  // Senza dettaglio zuccheri (es. ingredienti creati via form con solo il totale),
  // approssima gli zuccheri totali come saccarosio (POD/PAC = 100). Il fallback
  // vale solo per gli ingredienti custom: quelli seed dichiarano il dettaglio in
  // modo esplicito e mantengono i loro coefficienti (anche quando sono zero).
  const breakdownSum = components.reduce((s, [pct]) => s + pct, 0);
  if (isCustom && breakdownSum === 0 && ing.sugarsPercent > 0) {
    pod = (ing.sugarsPercent * POD_INDEX.sucrose) / 100;
    pac = (ing.sugarsPercent * PAC_INDEX.sucrose) / 100;
  }
  // Alcol: forte abbassamento crioscopico (PAC elevato). ~7× la % in volume.
  pac += ing.alcoholPercent * 7;
  return { pod: round(pod, 2), pac: round(pac, 2) };
}

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round((v + Number.EPSILON) * f) / f;
}
