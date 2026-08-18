import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/client";
import { toDomainRecipe, toDomainIngredients } from "@/infrastructure/repositories/mappers";
import { calculateRecipe } from "@/domain/calculations";
import { evaluateTargets } from "@/domain/constraints";
import type {
  CalibrationPreset,
  IngredientCategory,
  RecipeFamily,
  RecipeMetrics,
  TargetEvaluation,
} from "@/types";
import { INGREDIENT_CATEGORY_LABELS, RECIPE_FAMILY_LABELS } from "@/types";
import { csvField, isExportFormat, safeFilename } from "./format";

function loadRecipe(id: string) {
  return prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { include: { ingredient: true } },
      activePreset: true,
    },
  });
}

type ExportRecipe = NonNullable<Awaited<ReturnType<typeof loadRecipe>>>;
type NumberFormatter = (value: number, decimals?: number) => string;
type CsvRow = Array<string | number>;

/** Formattatore numerico dipendente dal locale richiesto. */
function numberFormatter(locale: string): NumberFormatter {
  const decimalComma = locale === "it";
  return (value, decimals = 2) => {
    const s = value.toFixed(decimals);
    return decimalComma ? s.replace(".", ",") : s;
  };
}

function csvIngredientRows(
  recipe: ExportRecipe,
  metrics: RecipeMetrics,
  fmtNum: NumberFormatter,
): CsvRow[] {
  return recipe.ingredients.map((ri) => {
    const ing = ri.ingredient;
    const contr = metrics.contributions.find((c) => c.recipeIngredientId === ri.id);
    return [
      ing.name,
      INGREDIENT_CATEGORY_LABELS[ing.category as IngredientCategory] ?? ing.category,
      fmtNum(ri.quantityGrams, 1),
      fmtNum(metrics.ingredientPercents[ri.id] ?? 0, 1),
      fmtNum(contr?.water ?? 0, 0),
      fmtNum(contr?.totalSolids ?? 0, 0),
      fmtNum(contr?.sugars ?? 0, 0),
      fmtNum(contr?.fat ?? 0, 0),
      fmtNum(contr?.protein ?? 0, 0),
      fmtNum(contr?.podShare ?? 0, 1),
      fmtNum(contr?.pacShare ?? 0, 1),
      fmtNum(contr?.cost ?? 0, 4),
    ];
  });
}

function csvMetricRows(metrics: RecipeMetrics, fmtNum: NumberFormatter): CsvRow[] {
  const total = metrics.totalWeightGrams || 1;
  const pct = (v: number) => fmtNum((v / total) * 100, 1);
  return [
    ["Solidi %", pct(metrics.totalSolids)],
    ["Zuccheri %", pct(metrics.sugars.total)],
    ["Grassi %", pct(metrics.fat.total)],
    ["Proteine %", pct(metrics.protein)],
    ["MSNF %", pct(metrics.msnf)],
    ["Fibre %", pct(metrics.fiber)],
    ["POD", fmtNum(metrics.pod, 1)],
    ["PAC", fmtNum(metrics.pac, 1)],
    ["POD/kg", fmtNum(metrics.podPerKg, 1)],
    ["PAC/kg", fmtNum(metrics.pacPerKg, 1)],
    ["Indice equilibrio", fmtNum(metrics.equilibriumIndex, 0)],
    ["Temp. servizio °C", fmtNum(metrics.estimatedServingTemperature, 1)],
    ["Costo/kg €", fmtNum(metrics.costPerKg, 4)],
    ["Costo totale €", fmtNum(metrics.cost, 4)],
    ["kcal/100g", fmtNum(metrics.kcalPer100g, 0)],
  ];
}

function csvTargetRows(evaluations: TargetEvaluation[], fmtNum: NumberFormatter): CsvRow[] {
  return evaluations.map((e) => [
    e.label,
    fmtNum(e.value, 1),
    fmtNum(e.range.min, 1),
    e.range.ideal !== undefined ? fmtNum(e.range.ideal, 1) : "",
    fmtNum(e.range.max, 1),
    fmtNum(e.deltaFromIdeal, 2),
  ]);
}

/** CSV con separatore `;` e decimale `,` per il locale it. */
function buildCsv(
  recipe: ExportRecipe,
  metrics: RecipeMetrics,
  evaluations: TargetEvaluation[],
  locale: string,
): string {
  const sep = locale === "it" ? ";" : ",";
  const fmtNum = numberFormatter(locale);
  const row = (fields: CsvRow): string => fields.map((f) => csvField(f)).join(sep);

  const lines: string[] = [
    row(["# Ricetta", recipe.name]),
    // Etichette leggibili, non gli enum grezzi: il CSV lo apre un gelatiere.
    row(["# Famiglia", RECIPE_FAMILY_LABELS[recipe.family as RecipeFamily] ?? recipe.family]),
    row(["# Peso batch (g)", fmtNum(recipe.targetBatchWeight, 0)]),
    row(["# Versione", recipe.version]),
    "",
    row([
      "Ingrediente", "Categoria", "Grammi", "%",
      "Acqua", "Solidi", "Zuccheri", "Grassi", "Proteine",
      "POD", "PAC", "Costo",
    ]),
    ...csvIngredientRows(recipe, metrics, fmtNum).map(row),
    "",
    csvField("# Metriche aggregate"),
    ...csvMetricRows(metrics, fmtNum).map(row),
  ];

  if (evaluations.length > 0) {
    lines.push(
      "",
      csvField("# Target preset"),
      row(["Parametro", "Valore", "Min", "Ideale", "Max", "Delta"]),
      ...csvTargetRows(evaluations, fmtNum).map(row),
    );
  }

  return lines.join("\n");
}

function buildJson(
  recipe: ExportRecipe,
  metrics: RecipeMetrics,
  evaluations: TargetEvaluation[],
) {
  return {
    recipe: {
      id: recipe.id,
      name: recipe.name,
      slug: recipe.slug,
      family: recipe.family,
      targetBatchWeight: recipe.targetBatchWeight,
      version: recipe.version,
      description: recipe.description,
      preparation: recipe.preparation,
      notes: recipe.notes,
    },
    ingredients: recipe.ingredients.map((ri) => {
      const ing = ri.ingredient;
      const contr = metrics.contributions.find((c) => c.recipeIngredientId === ri.id);
      return {
        name: ing.name,
        category: ing.category,
        grams: ri.quantityGrams,
        percent: metrics.ingredientPercents[ri.id] ?? 0,
        water: contr?.water ?? 0,
        totalSolids: contr?.totalSolids ?? 0,
        sugars: contr?.sugars ?? 0,
        fat: contr?.fat ?? 0,
        protein: contr?.protein ?? 0,
        pod: contr?.podShare ?? 0,
        pac: contr?.pacShare ?? 0,
        cost: contr?.cost ?? 0,
      };
    }),
    metrics: {
      totalWeightGrams: metrics.totalWeightGrams,
      water: metrics.water,
      totalSolids: metrics.totalSolids,
      sugars: {
        total: metrics.sugars.total,
        sucrose: metrics.sugars.sucrose,
        dextrose: metrics.sugars.dextrose,
        fructose: metrics.sugars.fructose,
        glucose: metrics.sugars.glucose,
        lactose: metrics.sugars.lactose,
        maltose: metrics.sugars.maltose,
        maltodextrin: metrics.sugars.maltodextrin,
        polyols: metrics.sugars.polyols,
      },
      fat: {
        total: metrics.fat.total,
        milk: metrics.fat.milk,
        vegetable: metrics.fat.vegetable,
      },
      protein: metrics.protein,
      msnf: metrics.msnf,
      fiber: metrics.fiber,
      minerals: metrics.minerals,
      pod: metrics.pod,
      pac: metrics.pac,
      podPerKg: metrics.podPerKg,
      pacPerKg: metrics.pacPerKg,
      equilibriumIndex: metrics.equilibriumIndex,
      estimatedServingTemperature: metrics.estimatedServingTemperature,
      cost: metrics.cost,
      costPerKg: metrics.costPerKg,
      kcalPer100g: metrics.kcalPer100g,
    },
    targets: evaluations.map((e) => ({
      key: e.key,
      label: e.label,
      value: e.value,
      min: e.range.min,
      ideal: e.range.ideal,
      max: e.range.max,
      delta: e.deltaFromIdeal,
      status: e.status,
    })),
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Esporta una ricetta in JSON o CSV.
 * GET /api/recipes/:id/export?format=json (default) | csv&locale=it|en
 */
export async function GET(
  request: NextRequest,
  { params }: Readonly<{ params: Promise<{ id: string }> }>,
) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";

  if (!isExportFormat(format)) {
    return NextResponse.json(
      { error: "Formato non supportato: usa json o csv" },
      { status: 400 },
    );
  }

  const recipe = await loadRecipe(id);
  if (!recipe) {
    return NextResponse.json({ error: "Ricetta non trovata" }, { status: 404 });
  }

  const domainRecipe = toDomainRecipe(recipe);
  const ingredients = toDomainIngredients(recipe.ingredients.map((ri) => ri.ingredient));
  const metrics = calculateRecipe(domainRecipe, ingredients);

  const preset = recipe.activePreset
    ? (recipe.activePreset as unknown as CalibrationPreset | null) : null;
  const evaluations = preset ? evaluateTargets(metrics, preset) : [];

  const filename = safeFilename(recipe.slug, "ricetta");

  if (format === "csv") {
    return new NextResponse(buildCsv(recipe, metrics, evaluations, locale), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  return NextResponse.json(buildJson(recipe, metrics, evaluations), {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}.json"`,
    },
  });
}
