import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/infrastructure/database/client";
import { toDomainRecipe, toDomainIngredients } from "@/infrastructure/repositories/mappers";
import { calculateRecipe, formatNumberIt, formatEuro } from "@/domain/calculations";
import { evaluateTargets } from "@/domain/constraints";
import { RECIPE_FAMILY_LABELS, INGREDIENT_CATEGORY_LABELS, type CalibrationPreset } from "@/types";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function PrintPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
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
  const ingredients = toDomainIngredients(recipe.ingredients.map((ri) => ri.ingredient));
  const metrics = calculateRecipe(domainRecipe, ingredients);
  const total = metrics.totalWeightGrams || 1;

  const preset = recipe.activePreset
    ? (recipe.activePreset as unknown as CalibrationPreset | null) : null;
  const evaluations = preset ? evaluateTargets(metrics, preset) : [];

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/recipes/${id}/editor`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Torna all&apos;editor
        </Link>
        <PrintButton />
      </div>

      <div className="print-area rounded-xl border border-border bg-white p-8 shadow-sm">
        {/* Intestazione */}
        <header className="mb-6 border-b border-border pb-4">
          <h1 className="text-2xl font-bold tracking-tight">{recipe.name}</h1>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>{RECIPE_FAMILY_LABELS[recipe.family]}</span>
            <span>·</span>
            <span>Peso batch: {formatNumberIt(recipe.targetBatchWeight, 0)} g</span>
            <span>·</span>
            <span>Peso effettivo: {formatNumberIt(metrics.totalWeightGrams, 0)} g</span>
            {recipe.version > 1 && (
              <>
                <span>·</span>
                <span>Versione {recipe.version}</span>
              </>
            )}
          </div>
          {recipe.description && (
            <p className="mt-2 text-sm text-muted-foreground">{recipe.description}</p>
          )}
        </header>

        {/* Tabella ingredienti */}
        <section className="mb-6">
          <h2 className="mb-2 text-base font-semibold">Ingredienti</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-2 py-1 text-left">Ingrediente</th>
                <th className="px-2 py-1 text-left">Categoria</th>
                <th className="px-2 py-1 text-right">Grammi</th>
                <th className="px-2 py-1 text-right">%</th>
                <th className="px-2 py-1 text-right">Acqua</th>
                <th className="px-2 py-1 text-right">Solidi</th>
                <th className="px-2 py-1 text-right">Zuccheri</th>
                <th className="px-2 py-1 text-right">Grassi</th>
                <th className="px-2 py-1 text-right">POD</th>
                <th className="px-2 py-1 text-right">PAC</th>
                <th className="px-2 py-1 text-right">Costo</th>
              </tr>
            </thead>
            <tbody>
              {recipe.ingredients.map((ri) => {
                const ing = ri.ingredient;
                const pct = metrics.ingredientPercents[ri.id] ?? 0;
                const contr = metrics.contributions.find((c) => c.recipeIngredientId === ri.id);
                return (
                  <tr key={ri.id} className="border-b border-border/60">
                    <td className="px-2 py-1 font-medium">{ing.name}</td>
                    <td className="px-2 py-1 text-xs text-muted-foreground">
                      {INGREDIENT_CATEGORY_LABELS[ing.category]}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {formatNumberIt(ri.quantityGrams, 1)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {formatNumberIt(pct, 1)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {contr ? formatNumberIt(contr.water, 0) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {contr ? formatNumberIt(contr.totalSolids, 0) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {contr ? formatNumberIt(contr.sugars, 0) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {contr ? formatNumberIt(contr.fat, 0) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {contr ? formatNumberIt(contr.podShare, 1) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {contr ? formatNumberIt(contr.pacShare, 1) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {contr ? formatEuro(contr.cost) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-border font-semibold">
              <tr>
                <td className="px-2 py-1">Totale</td>
                <td className="px-2 py-1"></td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {formatNumberIt(metrics.totalWeightGrams, 0)}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">100</td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {formatNumberIt(metrics.water, 0)}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {formatNumberIt(metrics.totalSolids, 0)}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {formatNumberIt(metrics.sugars.total, 0)}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {formatNumberIt(metrics.fat.total, 0)}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {formatNumberIt(metrics.pod, 1)}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {formatNumberIt(metrics.pac, 1)}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {formatEuro(metrics.cost)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Metriche aggregate */}
        <section className="mb-6">
          <h2 className="mb-2 text-base font-semibold">Metriche</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm md:grid-cols-3">
            <div className="flex justify-between border-b border-border/40 py-1">
              <span className="text-muted-foreground">Solidi totali</span>
              <span className="tabular-nums font-medium">
                {formatNumberIt((metrics.totalSolids / total) * 100, 1)} %
              </span>
            </div>
            <div className="flex justify-between border-b border-border/40 py-1">
              <span className="text-muted-foreground">Zuccheri</span>
              <span className="tabular-nums font-medium">
                {formatNumberIt((metrics.sugars.total / total) * 100, 1)} %
              </span>
            </div>
            <div className="flex justify-between border-b border-border/40 py-1">
              <span className="text-muted-foreground">Grassi totali</span>
              <span className="tabular-nums font-medium">
                {formatNumberIt((metrics.fat.total / total) * 100, 1)} %
              </span>
            </div>
            <div className="flex justify-between border-b border-border/40 py-1">
              <span className="text-muted-foreground">Proteine</span>
              <span className="tabular-nums font-medium">
                {formatNumberIt((metrics.protein / total) * 100, 1)} %
              </span>
            </div>
            <div className="flex justify-between border-b border-border/40 py-1">
              <span className="text-muted-foreground">MSNF</span>
              <span className="tabular-nums font-medium">
                {formatNumberIt((metrics.msnf / total) * 100, 1)} %
                {metrics.msnfDerived ? " (derivato)" : ""}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/40 py-1">
              <span className="text-muted-foreground">Fibre</span>
              <span className="tabular-nums font-medium">
                {formatNumberIt((metrics.fiber / total) * 100, 1)} %
              </span>
            </div>
            <div className="flex justify-between border-b border-border/40 py-1">
              <span className="text-muted-foreground">POD</span>
              <span className="tabular-nums font-medium">{formatNumberIt(metrics.pod, 1)}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 py-1">
              <span className="text-muted-foreground">PAC</span>
              <span className="tabular-nums font-medium">{formatNumberIt(metrics.pac, 1)}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 py-1">
              <span className="text-muted-foreground">POD/kg</span>
              <span className="tabular-nums font-medium">{formatNumberIt(metrics.podPerKg, 1)}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 py-1">
              <span className="text-muted-foreground">PAC/kg</span>
              <span className="tabular-nums font-medium">{formatNumberIt(metrics.pacPerKg, 1)}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 py-1">
              <span className="text-muted-foreground">Indice equilibrio</span>
              <span className="tabular-nums font-medium">{formatNumberIt(metrics.equilibriumIndex, 0)}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 py-1">
              <span className="text-muted-foreground">Temp. servizio stimata</span>
              <span className="tabular-nums font-medium">
                {formatNumberIt(metrics.estimatedServingTemperature, 1)} °C
              </span>
            </div>
            <div className="flex justify-between border-b border-border/40 py-1">
              <span className="text-muted-foreground">Costo/kg</span>
              <span className="tabular-nums font-medium">{formatEuro(metrics.costPerKg)}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 py-1">
              <span className="text-muted-foreground">Costo totale</span>
              <span className="tabular-nums font-medium">{formatEuro(metrics.cost)}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 py-1">
              <span className="text-muted-foreground">kcal/100g</span>
              <span className="tabular-nums font-medium">{formatNumberIt(metrics.kcalPer100g, 0)}</span>
            </div>
          </div>
        </section>

        {/* Dettaglio zuccheri */}
        <section className="mb-6">
          <h2 className="mb-2 text-base font-semibold">Dettaglio zuccheri</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-2 py-1 text-left">Tipo</th>
                <th className="px-2 py-1 text-right">Grammi</th>
                <th className="px-2 py-1 text-right">% su lotto</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Saccarosio", value: metrics.sugars.sucrose },
                { label: "Destrosio", value: metrics.sugars.dextrose },
                { label: "Fruttosio", value: metrics.sugars.fructose },
                { label: "Glucosio", value: metrics.sugars.glucose },
                { label: "Lattosio", value: metrics.sugars.lactose },
                { label: "Maltosio", value: metrics.sugars.maltose },
                { label: "Maltodestrina", value: metrics.sugars.maltodextrin },
                { label: "Polioli", value: metrics.sugars.polyols },
              ]
                .filter((s) => s.value > 0.01)
                .map((s) => (
                  <tr key={s.label} className="border-b border-border/60">
                    <td className="px-2 py-1">{s.label}</td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {formatNumberIt(s.value, 1)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {formatNumberIt((s.value / total) * 100, 2)} %
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot className="border-t-2 border-border font-semibold">
              <tr>
                <td className="px-2 py-1">Totale</td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {formatNumberIt(metrics.sugars.total, 1)}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {formatNumberIt((metrics.sugars.total / total) * 100, 2)} %
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Dettaglio grassi */}
        <section className="mb-6">
          <h2 className="mb-2 text-base font-semibold">Dettaglio grassi</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-2 py-1 text-left">Tipo</th>
                <th className="px-2 py-1 text-right">Grammi</th>
                <th className="px-2 py-1 text-right">% su lotto</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Totali", value: metrics.fat.total },
                { label: "Di origine latte", value: metrics.fat.milk },
                { label: "Vegetali", value: metrics.fat.vegetable },
              ]
                .filter((s) => s.value > 0.01)
                .map((s) => (
                  <tr key={s.label} className="border-b border-border/60">
                    <td className="px-2 py-1">{s.label}</td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {formatNumberIt(s.value, 1)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {formatNumberIt((s.value / total) * 100, 2)} %
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>

        {/* Target range */}
        {evaluations.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-base font-semibold">Target di calibrazione</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="px-2 py-1 text-left">Parametro</th>
                  <th className="px-2 py-1 text-right">Valore</th>
                  <th className="px-2 py-1 text-right">Min</th>
                  <th className="px-2 py-1 text-right">Ideale</th>
                  <th className="px-2 py-1 text-right">Max</th>
                  <th className="px-2 py-1 text-right">Δ</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((e) => (
                  <tr key={e.key} className="border-b border-border/60">
                    <td className="px-2 py-1">{e.label}</td>
                    <td className="px-2 py-1 text-right tabular-nums font-medium">
                      {formatNumberIt(e.value, 1)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                      {formatNumberIt(e.range.min, 1)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {e.range.ideal !== undefined
                        ? formatNumberIt(e.range.ideal, 1)
                        : "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                      {formatNumberIt(e.range.max, 1)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {e.deltaFromIdeal > 0 ? "+" : ""}
                      {formatNumberIt(e.deltaFromIdeal, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Note e procedimento */}
        {(recipe.preparation || recipe.notes) && (
          <section className="mb-6">
            <h2 className="mb-2 text-base font-semibold">Note e procedimento</h2>
            {recipe.preparation && (
              <div className="mb-2 whitespace-pre-wrap text-sm">{recipe.preparation}</div>
            )}
            {recipe.notes && (
              <div className="text-sm text-muted-foreground">{recipe.notes}</div>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-border pt-3 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap justify-between gap-2">
            <span>Generato da GelatoLab Pro · {new Date().toLocaleDateString("it-IT")}</span>
            <span>I dati sono indicativi. Verifica con analisi di laboratorio.</span>
          </div>
        </footer>
      </div>

      {/* Export buttons */}
      <div className="no-print mt-4 flex flex-wrap gap-2">
        <a
          href={`/api/recipes/${id}/export?format=json`}
          download={`${recipe.slug}.json`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Scarica JSON
        </a>
        <a
          href={`/api/recipes/${id}/export?format=csv`}
          download={`${recipe.slug}.csv`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Scarica CSV
        </a>
        <a
          href={`/api/recipes/${id}/export?format=csv&locale=it`}
          download={`${recipe.slug}.csv`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Scarica CSV (IT)
        </a>
      </div>
    </div>
  );
}
