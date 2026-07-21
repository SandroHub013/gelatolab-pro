import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/client";
import { toDomainRecipe, toDomainIngredients } from "@/infrastructure/repositories/mappers";
import { calculateRecipe } from "@/domain/calculations";
import { evaluateTargets } from "@/domain/constraints";
import type { CalibrationPreset } from "@/types";

/**
 * Campo CSV sempre quotato (nomi ingrediente/ricetta possono contenere il
 * separatore, virgolette o a capo) con neutralizzazione delle formule per i
 * fogli di calcolo (=, +, -, @).
 */
function csvField(value: string | number): string {
  const raw = String(value);
  // I numeri negativi restano numeri: solo il testo che inizia con un
  // carattere di formula viene prefissato.
  const isNumeric = /^-?\d+([.,]\d+)?$/.test(raw);
  const safe = !isNumeric && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Esporta una ricetta in JSON o CSV.
 * GET /api/recipes/:id/export?format=json (default) | csv&locale=it|en
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { include: { ingredient: true } },
      activePreset: true,
    },
  });
  if (!recipe) {
    return NextResponse.json({ error: "Ricetta non trovata" }, { status: 404 });
  }

  const domainRecipe = toDomainRecipe(recipe);
  const ingredients = toDomainIngredients(recipe.ingredients.map((ri) => ri.ingredient));
  const metrics = calculateRecipe(domainRecipe, ingredients);
  const total = metrics.totalWeightGrams || 1;

  const preset = recipe.activePreset
    ? (recipe.activePreset as unknown as CalibrationPreset | null) : null;
  const evaluations = preset ? evaluateTargets(metrics, preset) : [];

  if (format === "csv") {
    // CSV con separatore ; e decimale , per locale it
    const sep = locale === "it" ? ";" : ",";
    const dec = locale === "it" ? "," : ".";
    const fmtNum = (v: number, d = 2): string => {
      const s = v.toFixed(d);
      return dec === "," ? s.replace(".", ",") : s;
    };

    const row = (fields: Array<string | number>): string =>
      fields.map((f) => csvField(f)).join(sep);

    const lines: string[] = [];

    // Header ricetta
    lines.push(row(["# Ricetta", recipe.name]));
    lines.push(row(["# Famiglia", recipe.family]));
    lines.push(row(["# Peso batch (g)", fmtNum(recipe.targetBatchWeight, 0)]));
    lines.push(row(["# Versione", recipe.version]));
    lines.push("");

    // Header ingredienti
    lines.push(row([
      "Ingrediente", "Categoria", "Grammi", "%",
      "Acqua", "Solidi", "Zuccheri", "Grassi", "Proteine",
      "POD", "PAC", "Costo",
    ]));

    for (const ri of recipe.ingredients) {
      const ing = ri.ingredient;
      const pct = metrics.ingredientPercents[ri.id] ?? 0;
      const contr = metrics.contributions.find((c) => c.recipeIngredientId === ri.id);
      lines.push(row([
        ing.name,
        ing.category,
        fmtNum(ri.quantityGrams, 1),
        fmtNum(pct, 1),
        contr ? fmtNum(contr.water, 0) : "0",
        contr ? fmtNum(contr.totalSolids, 0) : "0",
        contr ? fmtNum(contr.sugars, 0) : "0",
        contr ? fmtNum(contr.fat, 0) : "0",
        contr ? fmtNum(contr.protein, 0) : "0",
        contr ? fmtNum(contr.pod, 1) : "0",
        contr ? fmtNum(contr.pac, 1) : "0",
        contr ? fmtNum(contr.cost, 4) : "0",
      ]));
    }

    lines.push("");
    lines.push(csvField("# Metriche aggregate"));
    lines.push(row(["Solidi %", fmtNum((metrics.totalSolids / total) * 100, 1)]));
    lines.push(row(["Zuccheri %", fmtNum((metrics.sugars.total / total) * 100, 1)]));
    lines.push(row(["Grassi %", fmtNum((metrics.fat.total / total) * 100, 1)]));
    lines.push(row(["Proteine %", fmtNum((metrics.protein / total) * 100, 1)]));
    lines.push(row(["MSNF %", fmtNum((metrics.msnf / total) * 100, 1)]));
    lines.push(row(["Fibre %", fmtNum((metrics.fiber / total) * 100, 1)]));
    lines.push(row(["POD", fmtNum(metrics.pod, 1)]));
    lines.push(row(["PAC", fmtNum(metrics.pac, 1)]));
    lines.push(row(["POD/kg", fmtNum(metrics.podPerKg, 1)]));
    lines.push(row(["PAC/kg", fmtNum(metrics.pacPerKg, 1)]));
    lines.push(row(["Indice equilibrio", fmtNum(metrics.equilibriumIndex, 0)]));
    lines.push(row(["Temp. servizio °C", fmtNum(metrics.estimatedServingTemperature, 1)]));
    lines.push(row(["Costo/kg €", fmtNum(metrics.costPerKg, 4)]));
    lines.push(row(["Costo totale €", fmtNum(metrics.cost, 4)]));
    lines.push(row(["kcal/100g", fmtNum(metrics.kcalPer100g, 0)]));

    if (evaluations.length > 0) {
      lines.push("");
      lines.push(csvField("# Target preset"));
      lines.push(row(["Parametro", "Valore", "Min", "Ideale", "Max", "Delta"]));
      for (const e of evaluations) {
        lines.push(row([
          e.label,
          fmtNum(e.value, 1),
          fmtNum(e.range.min, 1),
          e.range.ideal !== undefined ? fmtNum(e.range.ideal, 1) : "",
          fmtNum(e.range.max, 1),
          fmtNum(e.deltaFromIdeal, 2),
        ]));
      }
    }

    const csv = lines.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${recipe.slug}.csv"`,
      },
    });
  }

  // JSON export
  const exportData = {
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
      const pct = metrics.ingredientPercents[ri.id] ?? 0;
      const contr = metrics.contributions.find((c) => c.recipeIngredientId === ri.id);
      return {
        name: ing.name,
        category: ing.category,
        grams: ri.quantityGrams,
        percent: pct,
        water: contr?.water ?? 0,
        totalSolids: contr?.totalSolids ?? 0,
        sugars: contr?.sugars ?? 0,
        fat: contr?.fat ?? 0,
        protein: contr?.protein ?? 0,
        pod: contr?.pod ?? 0,
        pac: contr?.pac ?? 0,
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

  return NextResponse.json(exportData, {
    headers: {
      "Content-Disposition": `attachment; filename="${recipe.slug}.json"`,
    },
  });
}
