import type { CalibrationPresetInput, RecipeFamily } from "@/types";

/** Slug identificativi dei preset di sistema (stabili nel tempo). */
export const SYSTEM_PRESET_SLUGS = {
  equilibrato: "sys-equilibrato-vetrina",
  menoDolce: "sys-meno-dolce",
  morbido: "sys-morbido-bassa-temp",
  cremoso: "sys-cremoso-corposo",
  leggero: "sys-leggero",
  spatolabile: "sys-alta-spatolabilita",
  stabile: "sys-alta-stabilita",
  intenso: "sys-intenso",
  sorbetto: "sys-sorbetto-frutta-fresca",
  gastronomico: "sys-gastronomico-poco-dolce",
  vegano: "sys-vegano-cremoso",
  personalizzato: "sys-personalizzato",
} as const;

const ALL_FAMILIES: RecipeFamily[] = [
  "base_latte", "creme", "cioccolato", "frutta_con_latte", "sorbetto",
  "vegano", "gastronomico", "alcolico", "granita", "semifreddo",
];

/**
 * 12 preset di sistema (spec §6). Target in unità coerenti:
 * composizione in %, POD/PAC come indice (saccarosio=100).
 */
export const SYSTEM_PRESETS: Array<
  CalibrationPresetInput & { slug: string }
> = [
  {
    slug: SYSTEM_PRESET_SLUGS.equilibrato,
    name: "Equilibrato da vetrina",
    description:
      "Bilanciamento classico per gelato da vetrina: dolcezza media, buona spatolabilità e stabilità.",
    recipeFamilies: ["base_latte", "creme", "cioccolato", "frutta_con_latte"],
    targetRanges: {
      totalSolids: { min: 34, ideal: 38, max: 42 },
      sugars: { min: 15, ideal: 17, max: 20 },
      fat: { min: 6, ideal: 8, max: 12 },
      msnf: { min: 6, ideal: 9, max: 12 },
      pod: { min: 15, ideal: 18, max: 22 },
      pac: { min: 20, ideal: 24, max: 28 },
    },
    objectiveWeights: {
      sweetness: 1, softness: 1, body: 1, creaminess: 1, stability: 1,
      originalRecipeSimilarity: 1,
    },
    rules: [],
    preferredServingTemperature: { min: -14, ideal: -12, max: -10 },
  },
  {
    slug: SYSTEM_PRESET_SLUGS.menoDolce,
    name: "Meno dolce",
    description: "Riduce la dolcezza percepita mantenendo corpo e struttura.",
    recipeFamilies: ALL_FAMILIES,
    targetRanges: {
      totalSolids: { min: 34, ideal: 38, max: 44 },
      sugars: { min: 11, ideal: 13, max: 16 },
      fat: { min: 6, ideal: 9, max: 13 },
      pod: { min: 11, ideal: 14, max: 17 },
      pac: { min: 18, ideal: 22, max: 28 },
    },
    objectiveWeights: {
      sweetness: 2, softness: 1.2, body: 1, creaminess: 1, stability: 0.8,
      originalRecipeSimilarity: 1,
    },
    rules: [],
    preferredServingTemperature: { min: -14, ideal: -12, max: -9 },
  },
  {
    slug: SYSTEM_PRESET_SLUGS.morbido,
    name: "Morbido a bassa temperatura",
    description: "Più anticongelante (PAC) per morbidezza anche a temperature basse.",
    recipeFamilies: ALL_FAMILIES,
    targetRanges: {
      totalSolids: { min: 36, ideal: 40, max: 44 },
      sugars: { min: 15, ideal: 18, max: 21 },
      fat: { min: 5, ideal: 8, max: 12 },
      pod: { min: 15, ideal: 18, max: 22 },
      pac: { min: 26, ideal: 30, max: 36 },
    },
    objectiveWeights: {
      sweetness: 0.9, softness: 2, body: 1, creaminess: 1, stability: 1,
      originalRecipeSimilarity: 0.8,
    },
    rules: [],
    preferredServingTemperature: { min: -18, ideal: -15, max: -12 },
  },
  {
    slug: SYSTEM_PRESET_SLUGS.cremoso,
    name: "Cremoso e corposo",
    description: "Più grassi e solidi per struttura ricca e pastosità cremosa.",
    recipeFamilies: ["base_latte", "creme", "cioccolato", "frutta_con_latte"],
    targetRanges: {
      totalSolids: { min: 40, ideal: 45, max: 50 },
      sugars: { min: 14, ideal: 17, max: 20 },
      fat: { min: 10, ideal: 13, max: 16 },
      msnf: { min: 7, ideal: 10, max: 13 },
      pod: { min: 15, ideal: 18, max: 22 },
      pac: { min: 20, ideal: 24, max: 28 },
    },
    objectiveWeights: {
      sweetness: 0.9, softness: 1, body: 1.5, creaminess: 2, stability: 1,
      originalRecipeSimilarity: 1,
    },
    rules: [],
    preferredServingTemperature: { min: -13, ideal: -11, max: -9 },
  },
  {
    slug: SYSTEM_PRESET_SLUGS.leggero,
    name: "Leggero",
    description: "Meno grassi e solidi per un gelato più fresco e leggero.",
    recipeFamilies: ALL_FAMILIES,
    targetRanges: {
      totalSolids: { min: 28, ideal: 32, max: 36 },
      sugars: { min: 14, ideal: 17, max: 20 },
      fat: { min: 2, ideal: 5, max: 8 },
      pod: { min: 15, ideal: 18, max: 22 },
      pac: { min: 20, ideal: 24, max: 28 },
    },
    objectiveWeights: {
      sweetness: 1, softness: 1, body: 0.7, creaminess: 0.6, stability: 1,
      originalRecipeSimilarity: 1,
    },
    rules: [],
    preferredServingTemperature: { min: -13, ideal: -11, max: -9 },
  },
  {
    slug: SYSTEM_PRESET_SLUGS.spatolabile,
    name: "Alta spatolabilità",
    description: "Ottimizzato per essere lavorato con la spatola in vetrina.",
    recipeFamilies: ALL_FAMILIES,
    targetRanges: {
      totalSolids: { min: 38, ideal: 42, max: 46 },
      sugars: { min: 16, ideal: 19, max: 22 },
      fat: { min: 6, ideal: 9, max: 12 },
      stabilizers: { min: 0.2, ideal: 0.35, max: 0.5 },
      pod: { min: 16, ideal: 19, max: 23 },
      pac: { min: 22, ideal: 26, max: 30 },
    },
    objectiveWeights: {
      sweetness: 1, softness: 1.3, body: 1.2, creaminess: 1, stability: 1.5,
      originalRecipeSimilarity: 1,
    },
    rules: [],
    preferredServingTemperature: { min: -13, ideal: -11, max: -9 },
  },
  {
    slug: SYSTEM_PRESET_SLUGS.stabile,
    name: "Alta stabilità",
    description: "Maggiore contenuto di stabilizzanti e fibre per resistere agli sbalzi.",
    recipeFamilies: ALL_FAMILIES,
    targetRanges: {
      totalSolids: { min: 36, ideal: 40, max: 44 },
      sugars: { min: 14, ideal: 17, max: 20 },
      fat: { min: 6, ideal: 9, max: 12 },
      stabilizers: { min: 0.3, ideal: 0.45, max: 0.6 },
      fiber: { min: 0.5, ideal: 1.5, max: 3 },
      pod: { min: 15, ideal: 18, max: 22 },
      pac: { min: 20, ideal: 24, max: 28 },
    },
    objectiveWeights: {
      sweetness: 1, softness: 1, body: 1, creaminess: 1, stability: 2.5,
      originalRecipeSimilarity: 1,
    },
    rules: [],
    preferredServingTemperature: { min: -14, ideal: -12, max: -10 },
  },
  {
    slug: SYSTEM_PRESET_SLUGS.intenso,
    name: "Intenso",
    description: "Esalta l'intensità del sapore: meno acqua, più solidi e grassi.",
    recipeFamilies: ["cioccolato", "creme", "frutta_con_latte"],
    targetRanges: {
      totalSolids: { min: 40, ideal: 44, max: 50 },
      sugars: { min: 13, ideal: 16, max: 19 },
      fat: { min: 9, ideal: 13, max: 17 },
      pod: { min: 13, ideal: 16, max: 20 },
      pac: { min: 19, ideal: 23, max: 28 },
    },
    objectiveWeights: {
      sweetness: 0.8, softness: 1, body: 1.5, creaminess: 1.5, stability: 1,
      originalRecipeSimilarity: 1,
    },
    rules: [],
    preferredServingTemperature: { min: -13, ideal: -11, max: -9 },
  },
  {
    slug: SYSTEM_PRESET_SLUGS.sorbetto,
    name: "Sorbetto frutta fresca",
    description: "Bilanciamento per sorbetti: più zuccheri e PAC, senza grassi latte.",
    recipeFamilies: ["sorbetto", "granita", "alcolico"],
    targetRanges: {
      totalSolids: { min: 28, ideal: 32, max: 38 },
      sugars: { min: 22, ideal: 26, max: 32 },
      fat: { min: 0, ideal: 2, max: 5 },
      fiber: { min: 0.5, ideal: 1.5, max: 3 },
      stabilizers: { min: 0.2, ideal: 0.4, max: 0.7 },
      pod: { min: 18, ideal: 24, max: 30 },
      pac: { min: 28, ideal: 34, max: 42 },
    },
    objectiveWeights: {
      sweetness: 1.2, softness: 1.8, body: 1, creaminess: 0.5, stability: 1.5,
      originalRecipeSimilarity: 1,
    },
    rules: [],
    preferredServingTemperature: { min: -14, ideal: -12, max: -10 },
  },
  {
    slug: SYSTEM_PRESET_SLUGS.gastronomico,
    name: "Gastronomico poco dolce",
    description: "Per gelati salati/gastronomici: minimo zucchero, più sale e grassi.",
    recipeFamilies: ["gastronomico"],
    targetRanges: {
      totalSolids: { min: 32, ideal: 38, max: 44 },
      sugars: { min: 6, ideal: 9, max: 13 },
      fat: { min: 8, ideal: 12, max: 16 },
      pod: { min: 6, ideal: 10, max: 14 },
      pac: { min: 12, ideal: 18, max: 24 },
    },
    objectiveWeights: {
      sweetness: 1, softness: 1, body: 1.2, creaminess: 1.2, stability: 1,
      originalRecipeSimilarity: 1,
    },
    rules: [],
    preferredServingTemperature: { min: -12, ideal: -10, max: -8 },
  },
  {
    slug: SYSTEM_PRESET_SLUGS.vegano,
    name: "Vegano cremoso",
    description: "Basi vegetali con grassi vegetali e stabilizzanti per cremosità.",
    recipeFamilies: ["vegano", "sorbetto"],
    targetRanges: {
      totalSolids: { min: 30, ideal: 36, max: 42 },
      sugars: { min: 15, ideal: 18, max: 22 },
      fat: { min: 5, ideal: 9, max: 13 },
      stabilizers: { min: 0.3, ideal: 0.5, max: 0.8 },
      fiber: { min: 0.5, ideal: 1.5, max: 3 },
      pod: { min: 16, ideal: 20, max: 24 },
      pac: { min: 22, ideal: 26, max: 32 },
    },
    objectiveWeights: {
      sweetness: 1, softness: 1.3, body: 1.2, creaminess: 1.5, stability: 1.5,
      originalRecipeSimilarity: 1,
    },
    rules: [],
    preferredServingTemperature: { min: -14, ideal: -12, max: -10 },
  },
  {
    slug: SYSTEM_PRESET_SLUGS.personalizzato,
    name: "Personalizzato",
    description: "Preset vuoto: definisci tu target e pesi. Punto di partenza libero.",
    recipeFamilies: ALL_FAMILIES,
    targetRanges: {
      totalSolids: { min: 30, ideal: 38, max: 44 },
      sugars: { min: 14, ideal: 17, max: 20 },
      pod: { min: 15, ideal: 18, max: 22 },
      pac: { min: 20, ideal: 24, max: 28 },
    },
    objectiveWeights: {
      sweetness: 1, softness: 1, body: 1, creaminess: 1, stability: 1,
      originalRecipeSimilarity: 1,
    },
    rules: [],
  },
];
