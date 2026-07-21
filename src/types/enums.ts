/**
 * Categorie di ingredienti.
 * Allineate con l'enum Prisma `IngredientCategory`.
 */
export const INGREDIENT_CATEGORIES = [
  "acqua",
  "latte",
  "panna",
  "latte_condensato",
  "latte_in_polvere",
  "yogurt",
  "mascarpone",
  "formaggi",
  "saccarosio",
  "destrosio",
  "fruttosio",
  "glucosio",
  "sciroppo_di_glucosio",
  "zucchero_invertito",
  "miele",
  "maltodestrina",
  "inulina",
  "fibre",
  "polioli",
  "cioccolato",
  "cacao",
  "frutta_fresca",
  "purea_di_frutta",
  "frutta_secca",
  "paste_pure",
  "paste_aromatizzanti",
  "bevande_vegetali",
  "grassi_vegetali",
  "tuorlo",
  "albume",
  "alcolici",
  "neutri",
  "stabilizzanti",
  "emulsionanti",
  "proteine",
  "sale",
  "aromi",
  "personalizzato",
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

/** Etichette leggibili (italiano) per le categorie. */
export const INGREDIENT_CATEGORY_LABELS: Record<IngredientCategory, string> = {
  acqua: "Acqua",
  latte: "Latte",
  panna: "Panna",
  latte_condensato: "Latte condensato",
  latte_in_polvere: "Latte in polvere",
  yogurt: "Yogurt",
  mascarpone: "Mascarpone",
  formaggi: "Formaggi",
  saccarosio: "Saccarosio",
  destrosio: "Destrosio",
  fruttosio: "Fruttosio",
  glucosio: "Glucosio",
  sciroppo_di_glucosio: "Sciroppo di glucosio",
  zucchero_invertito: "Zucchero invertito",
  miele: "Miele",
  maltodestrina: "Maltodestrina",
  inulina: "Inulina",
  fibre: "Fibre",
  polioli: "Polioli",
  cioccolato: "Cioccolato",
  cacao: "Cacao",
  frutta_fresca: "Frutta fresca",
  purea_di_frutta: "Purea di frutta",
  frutta_secca: "Frutta secca",
  paste_pure: "Paste pure",
  paste_aromatizzanti: "Paste aromatizzanti",
  bevande_vegetali: "Bevande vegetali",
  grassi_vegetali: "Grassi vegetali",
  tuorlo: "Tuorlo",
  albume: "Albume",
  alcolici: "Alcolici",
  neutri: "Neutri",
  stabilizzanti: "Stabilizzanti",
  emulsionanti: "Emulsionanti",
  proteine: "Proteine",
  sale: "Sale",
  aromi: "Aromi",
  personalizzato: "Personalizzato",
};

/**
 * Famiglie di ricette.
 * Allineate con l'enum Prisma `RecipeFamily`.
 */
export const RECIPE_FAMILIES = [
  "base_latte",
  "creme",
  "cioccolato",
  "frutta_con_latte",
  "sorbetto",
  "vegano",
  "gastronomico",
  "alcolico",
  "granita",
  "semifreddo",
  "personalizzata",
] as const;

export type RecipeFamily = (typeof RECIPE_FAMILIES)[number];

export const RECIPE_FAMILY_LABELS: Record<RecipeFamily, string> = {
  base_latte: "Base latte",
  creme: "Creme",
  cioccolato: "Cioccolato",
  frutta_con_latte: "Frutta con latte",
  sorbetto: "Sorbetto",
  vegano: "Vegano",
  gastronomico: "Gastronomico",
  alcolico: "Alcolico",
  granita: "Granita",
  semifreddo: "Semifreddo",
  personalizzata: "Personalizzata",
};
