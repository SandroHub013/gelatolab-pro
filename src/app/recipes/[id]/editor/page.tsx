import { notFound } from "next/navigation";
import { prisma } from "@/infrastructure/database/client";
import { toDomainRecipe, toDomainIngredients, toDomainPreset } from "@/infrastructure/repositories/mappers";
import { RecipeEditor } from "@/features/recipes/recipe-editor";

export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { include: { ingredient: true } },
      activePreset: true,
    },
  });
  if (!recipe) notFound();

  const domainRecipe = toDomainRecipe(recipe);
  const usedIngredients = toDomainIngredients(recipe.ingredients.map((ri) => ri.ingredient));
  const allIngredients = toDomainIngredients(await prisma.ingredient.findMany({ orderBy: { name: "asc" } }));
  const preset = recipe.activePreset ? toDomainPreset(recipe.activePreset) : null;

  return (
    <RecipeEditor
      initialRecipe={domainRecipe}
      usedIngredients={usedIngredients}
      allIngredients={allIngredients}
      preset={preset}
    />
  );
}
