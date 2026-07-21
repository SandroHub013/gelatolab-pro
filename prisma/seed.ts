import "dotenv/config";
import { prisma } from "@/infrastructure/database/client";
import { SEED_INGREDIENTS, resolveSeedCoefficients } from "@/infrastructure/database/seed-ingredients";
import { SEED_RECIPES } from "@/infrastructure/database/seed-recipes";
import { SYSTEM_PRESETS } from "@/infrastructure/database/seed-presets";
import type { Prisma } from "@prisma/client";

async function seedIngredients(): Promise<Map<string, string>> {
  const slugToId = new Map<string, string>();
  for (const ing of SEED_INGREDIENTS) {
    const { pod, pac } = resolveSeedCoefficients(ing);
    const data: Prisma.IngredientCreateInput = {
      name: ing.name,
      slug: ing.slug,
      category: ing.category,
      description: ing.description,
      waterPercent: ing.waterPercent,
      totalSolidsPercent: ing.totalSolidsPercent,
      sugarsPercent: ing.sugarsPercent,
      sucrosePercent: ing.sucrosePercent,
      dextrosePercent: ing.dextrosePercent,
      fructosePercent: ing.fructosePercent,
      glucosePercent: ing.glucosePercent,
      lactosePercent: ing.lactosePercent,
      maltosePercent: ing.maltosePercent,
      maltodextrinPercent: ing.maltodextrinPercent,
      polyolsPercent: ing.polyolsPercent,
      fatPercent: ing.fatPercent,
      milkFatPercent: ing.milkFatPercent,
      vegetableFatPercent: ing.vegetableFatPercent,
      proteinPercent: ing.proteinPercent,
      msnfPercent: ing.msnfPercent,
      fiberPercent: ing.fiberPercent,
      mineralsPercent: ing.mineralsPercent,
      alcoholPercent: ing.alcoholPercent,
      podCoefficient: pod,
      pacCoefficient: pac,
      stabilizerPercent: ing.stabilizerPercent,
      emulsifierPercent: ing.emulsifierPercent,
      density: ing.density,
      costPerKg: ing.costPerKg,
      allergens: ing.allergens,
      tags: ing.tags,
      minRecommendedPercent: ing.minRecommendedPercent,
      maxRecommendedPercent: ing.maxRecommendedPercent,
      source: ing.source ?? "seed indicativo",
      notes: ing.description,
      isCustom: false,
    };
    const created = await prisma.ingredient.upsert({
      where: { slug: ing.slug },
      update: { ...data, updatedAt: new Date() },
      create: data,
    });
    slugToId.set(ing.slug, created.id);
  }
  return slugToId;
}

async function seedPresets(): Promise<Map<string, string>> {
  const slugToId = new Map<string, string>();
  for (const preset of SYSTEM_PRESETS) {
    const id = preset.slug;
    const data: Prisma.CalibrationPresetCreateInput = {
      id,
      name: preset.name,
      description: preset.description,
      recipeFamilies: preset.recipeFamilies,
      targetRanges: preset.targetRanges as Prisma.InputJsonValue,
      objectiveWeights: preset.objectiveWeights as Prisma.InputJsonValue,
      rules: preset.rules as unknown as Prisma.InputJsonValue,
      preferredServingTemperature: preset.preferredServingTemperature as
        | Prisma.InputJsonValue
        | undefined,
      isSystemPreset: true,
    };
    await prisma.calibrationPreset.upsert({
      where: { id },
      update: {
        name: data.name,
        description: data.description,
        recipeFamilies: data.recipeFamilies,
        targetRanges: data.targetRanges,
        objectiveWeights: data.objectiveWeights,
        rules: data.rules,
        preferredServingTemperature: data.preferredServingTemperature,
      },
      create: data,
    });
    slugToId.set(preset.slug, id);
  }
  return slugToId;
}

async function seedRecipes(
  ingredientIds: Map<string, string>,
  presetIds: Map<string, string>,
): Promise<void> {
  // Prima passata: crea le ricette base (senza parent).
  const recipeIdBySlug = new Map<string, string>();
  for (const r of SEED_RECIPES) {
    const activePresetId = r.presetSlug
      ? presetIds.get(r.presetSlug)
      : undefined;
    const created = await prisma.recipe.upsert({
      where: { slug: r.slug },
      update: {
        name: r.name,
        description: r.description,
        family: r.family,
        targetBatchWeight: r.targetBatchWeight,
        activePresetId: activePresetId ?? null,
        tags: r.tags,
        preparation: r.preparation,
        notes: r.notes,
        updatedAt: new Date(),
      },
      create: {
        name: r.name,
        slug: r.slug,
        description: r.description,
        family: r.family,
        targetBatchWeight: r.targetBatchWeight,
        activePreset: activePresetId ? { connect: { id: activePresetId } } : undefined,
        tags: r.tags,
        preparation: r.preparation,
        notes: r.notes,
        version: 1,
      },
    });
    recipeIdBySlug.set(r.slug, created.id);
  }

  // Collega i genitori.
  for (const r of SEED_RECIPES) {
    if (r.parentSlug) {
      const childId = recipeIdBySlug.get(r.slug);
      const parentId = recipeIdBySlug.get(r.parentSlug);
      if (childId && parentId) {
        await prisma.recipe.update({
          where: { id: childId },
          data: { parentRecipeId: parentId },
        });
      }
    }
  }

  // Sostituisci gli ingredienti di ogni ricetta seed (idempotente).
  for (const r of SEED_RECIPES) {
    const recipeId = recipeIdBySlug.get(r.slug)!;
    await prisma.recipeIngredient.deleteMany({ where: { recipeId } });
    await prisma.recipeIngredient.createMany({
      data: r.lines.map((line) => ({
        recipeId,
        ingredientId: ingredientIds.get(line.ingredientSlug)!,
        quantityGrams: line.quantityGrams,
        isLocked: line.isLocked ?? false,
        isMandatory: line.isMandatory ?? false,
        minGrams: line.minGrams,
        maxGrams: line.maxGrams,
      })),
    });
  }
}

async function main(): Promise<void> {
  console.log("→ Seeding ingredienti...");
  const ingredientIds = await seedIngredients();
  console.log(`  ${ingredientIds.size} ingredienti.`);

  console.log("→ Seeding preset di sistema...");
  const presetIds = await seedPresets();
  console.log(`  ${presetIds.size} preset.`);

  console.log("→ Seeding ricette demo...");
  await seedRecipes(ingredientIds, presetIds);
  console.log(`  ${SEED_RECIPES.length} ricette.`);

  console.log("✓ Seed completato.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("Errore durante il seed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
