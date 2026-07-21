"use client";
import { create } from "zustand";
import { temporal } from "zundo";
import type {
  Ingredient,
  Recipe,
  RecipeIngredient,
} from "@/types";
import { round } from "@/domain/calculations";

interface EditorState {
  recipe: Recipe | null;
  ingredients: Ingredient[];
  ingredientIndex: Map<string, Ingredient>;
  hydrated: boolean;
  dirty: boolean;

  hydrate: (recipe: Recipe, ingredients: Ingredient[]) => void;
  setRecipe: (recipe: Recipe) => void;

  setQuantity: (rowId: string, grams: number) => void;
  addIngredient: (ingredientId: string, grams?: number) => void;
  removeIngredient: (rowId: string) => void;
  toggleLock: (rowId: string) => void;
  toggleMandatory: (rowId: string) => void;
  setMinGrams: (rowId: string, value: number | undefined) => void;
  setMaxGrams: (rowId: string, value: number | undefined) => void;
  setRowNotes: (rowId: string, value: string | undefined) => void;

  setName: (name: string) => void;
  setDescription: (description: string | undefined) => void;
  setPreparation: (preparation: string | undefined) => void;
  setNotes: (notes: string | undefined) => void;
  setBatchWeight: (grams: number) => void;

  markSaved: () => void;
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set) => ({
      recipe: null,
      ingredients: [],
      ingredientIndex: new Map(),
      hydrated: false,
      dirty: false,

      hydrate: (recipe, ingredients) => {
        set({
          recipe,
          ingredients,
          ingredientIndex: new Map(ingredients.map((i) => [i.id, i])),
          hydrated: true,
          dirty: false,
        });
        // Lo store è un singleton: senza reset dopo l'idratazione la cronologia
        // undo di una ricetta resterebbe applicabile a quella caricata dopo.
        useEditorStore.temporal.getState().clear();
      },

      setRecipe: (recipe) => set({ recipe, dirty: true }),

      setQuantity: (rowId, grams) =>
        set((s) => {
          if (!s.recipe) return {};
          return {
            recipe: {
              ...s.recipe,
              ingredients: s.recipe.ingredients.map((ri) =>
                ri.id === rowId
                  ? { ...ri, quantityGrams: Math.max(0, round(grams, 1)) }
                  : ri,
              ),
            },
            dirty: true,
          };
        }),

      addIngredient: (ingredientId, grams = 0) =>
        set((s) => {
          if (!s.recipe) return {};
          if (s.recipe.ingredients.some((ri) => ri.ingredientId === ingredientId)) {
            return {};
          }
          const newRow: RecipeIngredient = {
            id: `new-${ingredientId}-${Date.now()}`,
            ingredientId,
            quantityGrams: round(grams, 1),
            isLocked: false,
            isMandatory: false,
          };
          return {
            recipe: {
              ...s.recipe,
              ingredients: [...s.recipe.ingredients, newRow],
            },
            dirty: true,
          };
        }),

      removeIngredient: (rowId) =>
        set((s) => {
          if (!s.recipe) return {};
          return {
            recipe: {
              ...s.recipe,
              ingredients: s.recipe.ingredients.filter((ri) => ri.id !== rowId),
            },
            dirty: true,
          };
        }),

      toggleLock: (rowId) =>
        set((s) => ({
          recipe: s.recipe
            ? {
                ...s.recipe,
                ingredients: s.recipe.ingredients.map((ri) =>
                  ri.id === rowId ? { ...ri, isLocked: !ri.isLocked } : ri,
                ),
              }
            : s.recipe,
          dirty: true,
        })),

      toggleMandatory: (rowId) =>
        set((s) => ({
          recipe: s.recipe
            ? {
                ...s.recipe,
                ingredients: s.recipe.ingredients.map((ri) =>
                  ri.id === rowId ? { ...ri, isMandatory: !ri.isMandatory } : ri,
                ),
              }
            : s.recipe,
          dirty: true,
        })),

      setMinGrams: (rowId, value) =>
        set((s) => ({
          recipe: s.recipe
            ? {
                ...s.recipe,
                ingredients: s.recipe.ingredients.map((ri) =>
                  ri.id === rowId ? { ...ri, minGrams: value } : ri,
                ),
              }
            : s.recipe,
          dirty: true,
        })),

      setMaxGrams: (rowId, value) =>
        set((s) => ({
          recipe: s.recipe
            ? {
                ...s.recipe,
                ingredients: s.recipe.ingredients.map((ri) =>
                  ri.id === rowId ? { ...ri, maxGrams: value } : ri,
                ),
              }
            : s.recipe,
          dirty: true,
        })),

      setRowNotes: (rowId, value) =>
        set((s) => ({
          recipe: s.recipe
            ? {
                ...s.recipe,
                ingredients: s.recipe.ingredients.map((ri) =>
                  ri.id === rowId ? { ...ri, notes: value } : ri,
                ),
              }
            : s.recipe,
          dirty: true,
        })),

      setName: (name) =>
        set((s) => ({ recipe: s.recipe ? { ...s.recipe, name } : s.recipe, dirty: true })),
      setDescription: (description) =>
        set((s) => ({
          recipe: s.recipe ? { ...s.recipe, description } : s.recipe,
          dirty: true,
        })),
      setPreparation: (preparation) =>
        set((s) => ({
          recipe: s.recipe ? { ...s.recipe, preparation } : s.recipe,
          dirty: true,
        })),
      setNotes: (notes) =>
        set((s) => ({ recipe: s.recipe ? { ...s.recipe, notes } : s.recipe, dirty: true })),
      setBatchWeight: (grams) =>
        set((s) => ({
          recipe: s.recipe
            ? { ...s.recipe, targetBatchWeight: Math.max(1, grams) }
            : s.recipe,
          dirty: true,
        })),

      markSaved: () => set({ dirty: false }),
    }),
    {
      // Traccia solo la ricetta (la composizione ingredienti è immutabile).
      partialize: (state) => ({ recipe: state.recipe }),
      limit: 100,
      // Ignora cambiamenti che non alterano il contenuto effettivo.
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    },
  ),
);
