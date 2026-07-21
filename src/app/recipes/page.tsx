import Link from "next/link";
import { calculateRecipe } from "@/domain/calculations";
import { findAllRecipes, findAllIngredients } from "@/infrastructure/repositories/recipe-repository";
import { RECIPE_FAMILY_LABELS, RECIPE_FAMILIES } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { RecipesListClient } from "@/features/recipes/recipes-list-client";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const [recipes, ingredients] = await Promise.all([
    findAllRecipes(),
    findAllIngredients(),
  ]);

  const rows = recipes.map((r) => {
    const metrics = calculateRecipe(r, ingredients);
    return {
      id: r.id,
      name: r.name,
      family: r.family,
      familyLabel: RECIPE_FAMILY_LABELS[r.family],
      weight: metrics.totalWeightGrams,
      pod: metrics.pod,
      pac: metrics.pac,
      costPerKg: metrics.costPerKg,
      equilibrium: metrics.equilibriumIndex,
      ingredientCount: r.ingredients.length,
      updatedAt: r.updatedAt.toISOString(),
    };
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ricettario</h1>
          <p className="text-sm text-muted-foreground">
            {recipes.length} ricette · ricerca, ordina e duplica
          </p>
        </div>
        <Link href="/recipes/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-4" /> Nuova ricetta
        </Link>
      </div>

      <RecipesListClient recipes={rows} families={RECIPE_FAMILIES} familyLabels={RECIPE_FAMILY_LABELS} />

      {rows.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Nessuna ricetta.{" "}
              <Link href="/recipes/new" className="font-medium text-primary underline">
                Crea la prima
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
