import { notFound } from "next/navigation";
import { prisma } from "@/infrastructure/database/client";
import { toDomainRecipe, toDomainIngredients, toDomainPreset, toDomainPresets } from "@/infrastructure/repositories/mappers";
import { CalibrationDashboard } from "@/features/calibration/calibration-dashboard";

export const dynamic = "force-dynamic";

export default async function CalibrationPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: { include: { ingredient: true } }, activePreset: true },
  });
  if (!recipe) notFound();

  const domainRecipe = toDomainRecipe(recipe);
  const ingredients = toDomainIngredients(recipe.ingredients.map((ri) => ri.ingredient));
  const presets = toDomainPresets(
    await prisma.calibrationPreset.findMany({
      orderBy: [{ isSystemPreset: "desc" }, { name: "asc" }],
    }),
  );
  const activePreset = recipe.activePreset ? toDomainPreset(recipe.activePreset) : null;

  return (
    <CalibrationDashboard
      recipe={domainRecipe}
      ingredients={ingredients}
      presets={presets}
      activePreset={activePreset}
    />
  );
}
