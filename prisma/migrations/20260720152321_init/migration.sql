-- CreateEnum
CREATE TYPE "IngredientCategory" AS ENUM ('acqua', 'latte', 'panna', 'latte_condensato', 'latte_in_polvere', 'yogurt', 'mascarpone', 'formaggi', 'saccarosio', 'destrosio', 'fruttosio', 'glucosio', 'sciroppo_di_glucosio', 'zucchero_invertito', 'miele', 'maltodestrina', 'inulina', 'fibre', 'polioli', 'cioccolato', 'cacao', 'frutta_fresca', 'purea_di_frutta', 'frutta_secca', 'paste_pure', 'paste_aromatizzanti', 'bevande_vegetali', 'grassi_vegetali', 'tuorlo', 'albume', 'alcolici', 'neutri', 'stabilizzanti', 'emulsionanti', 'proteine', 'sale', 'aromi', 'personalizzato');

-- CreateEnum
CREATE TYPE "RecipeFamily" AS ENUM ('base_latte', 'creme', 'cioccolato', 'frutta_con_latte', 'sorbetto', 'vegano', 'gastronomico', 'alcolico', 'granita', 'semifreddo', 'personalizzata');

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "IngredientCategory" NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "waterPercent" DOUBLE PRECISION NOT NULL,
    "totalSolidsPercent" DOUBLE PRECISION NOT NULL,
    "sugarsPercent" DOUBLE PRECISION NOT NULL,
    "sucrosePercent" DOUBLE PRECISION,
    "dextrosePercent" DOUBLE PRECISION,
    "fructosePercent" DOUBLE PRECISION,
    "glucosePercent" DOUBLE PRECISION,
    "lactosePercent" DOUBLE PRECISION,
    "maltosePercent" DOUBLE PRECISION,
    "maltodextrinPercent" DOUBLE PRECISION,
    "polyolsPercent" DOUBLE PRECISION,
    "fatPercent" DOUBLE PRECISION NOT NULL,
    "milkFatPercent" DOUBLE PRECISION,
    "vegetableFatPercent" DOUBLE PRECISION,
    "proteinPercent" DOUBLE PRECISION NOT NULL,
    "msnfPercent" DOUBLE PRECISION,
    "fiberPercent" DOUBLE PRECISION NOT NULL,
    "mineralsPercent" DOUBLE PRECISION,
    "alcoholPercent" DOUBLE PRECISION NOT NULL,
    "podCoefficient" DOUBLE PRECISION NOT NULL,
    "pacCoefficient" DOUBLE PRECISION NOT NULL,
    "stabilizerPercent" DOUBLE PRECISION,
    "emulsifierPercent" DOUBLE PRECISION,
    "density" DOUBLE PRECISION,
    "costPerKg" DOUBLE PRECISION,
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minRecommendedPercent" DOUBLE PRECISION,
    "maxRecommendedPercent" DOUBLE PRECISION,
    "source" TEXT,
    "notes" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "family" "RecipeFamily" NOT NULL,
    "targetBatchWeight" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "servingTemperature" DOUBLE PRECISION,
    "activePresetId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preparation" TEXT,
    "maturationTime" INTEGER,
    "maturationTemperature" DOUBLE PRECISION,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentRecipeId" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantityGrams" DOUBLE PRECISION NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "minGrams" DOUBLE PRECISION,
    "maxGrams" DOUBLE PRECISION,
    "minPercent" DOUBLE PRECISION,
    "maxPercent" DOUBLE PRECISION,
    "optimizationWeight" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_snapshots" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metrics" JSONB,

    CONSTRAINT "recipe_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot_ingredients" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantityGrams" DOUBLE PRECISION NOT NULL,
    "isLocked" BOOLEAN NOT NULL,
    "isMandatory" BOOLEAN NOT NULL,
    "minGrams" DOUBLE PRECISION,
    "maxGrams" DOUBLE PRECISION,
    "minPercent" DOUBLE PRECISION,
    "maxPercent" DOUBLE PRECISION,
    "waterPercent" DOUBLE PRECISION NOT NULL,
    "totalSolidsPercent" DOUBLE PRECISION NOT NULL,
    "sugarsPercent" DOUBLE PRECISION NOT NULL,
    "sucrosePercent" DOUBLE PRECISION,
    "dextrosePercent" DOUBLE PRECISION,
    "fructosePercent" DOUBLE PRECISION,
    "glucosePercent" DOUBLE PRECISION,
    "lactosePercent" DOUBLE PRECISION,
    "maltosePercent" DOUBLE PRECISION,
    "maltodextrinPercent" DOUBLE PRECISION,
    "polyolsPercent" DOUBLE PRECISION,
    "fatPercent" DOUBLE PRECISION NOT NULL,
    "milkFatPercent" DOUBLE PRECISION,
    "vegetableFatPercent" DOUBLE PRECISION,
    "proteinPercent" DOUBLE PRECISION NOT NULL,
    "msnfPercent" DOUBLE PRECISION,
    "fiberPercent" DOUBLE PRECISION NOT NULL,
    "mineralsPercent" DOUBLE PRECISION,
    "alcoholPercent" DOUBLE PRECISION NOT NULL,
    "podCoefficient" DOUBLE PRECISION NOT NULL,
    "pacCoefficient" DOUBLE PRECISION NOT NULL,
    "stabilizerPercent" DOUBLE PRECISION,
    "emulsifierPercent" DOUBLE PRECISION,
    "density" DOUBLE PRECISION,
    "costPerKg" DOUBLE PRECISION,

    CONSTRAINT "snapshot_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_presets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recipeFamilies" "RecipeFamily"[],
    "targetRanges" JSONB NOT NULL,
    "objectiveWeights" JSONB NOT NULL,
    "rules" JSONB NOT NULL,
    "preferredServingTemperature" JSONB,
    "isSystemPreset" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calibration_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "recipes" TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_name_key" ON "ingredients"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_slug_key" ON "ingredients"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_slug_key" ON "recipes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipeId_ingredientId_key" ON "recipe_ingredients"("recipeId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_snapshots_recipeId_version_key" ON "recipe_snapshots"("recipeId", "version");

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_activePresetId_fkey" FOREIGN KEY ("activePresetId") REFERENCES "calibration_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_parentRecipeId_fkey" FOREIGN KEY ("parentRecipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_snapshots" ADD CONSTRAINT "recipe_snapshots_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_ingredients" ADD CONSTRAINT "snapshot_ingredients_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "recipe_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_ingredients" ADD CONSTRAINT "snapshot_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
