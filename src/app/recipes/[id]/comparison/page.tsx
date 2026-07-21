import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/infrastructure/database/client";
import { toDomainRecipe, toDomainIngredients, snapshotToDomainRecipe, snapshotToDomainIngredients } from "@/infrastructure/repositories/mappers";
import { calculateRecipe, compareRecipes, formatEuro, formatNumberIt } from "@/domain/calculations";
import { detectCompositionDrift } from "@/app/actions/recipes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SaveSnapshotButton } from "@/features/recipes/save-snapshot-button";
import { ArrowLeft, GitCompareArrows, AlertTriangle, Camera } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ComparisonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { include: { ingredient: true } },
      snapshots: { orderBy: { version: "desc" }, include: { ingredients: true } },
    },
  });
  if (!recipe) notFound();

  const domainRecipe = toDomainRecipe(recipe);
  const currentIngredients = toDomainIngredients(recipe.ingredients.map((ri) => ri.ingredient));
  const lastSnapshot = recipe.snapshots[0] ?? null;
  const drift = await detectCompositionDrift(id);

  let diff = null;
  let snapshotMetrics = null;
  let snapshotRecipe = null;
  if (lastSnapshot) {
    const frozenIngredients = snapshotToDomainIngredients(lastSnapshot);
    // Arricchisci i nomi dagli ingredienti correnti (nomi non congelati nello snapshot).
    const nameMap = new Map(currentIngredients.map((i) => [i.id, i.name]));
    for (const fi of frozenIngredients) fi.name = nameMap.get(fi.id) ?? fi.name;
    snapshotRecipe = snapshotToDomainRecipe(lastSnapshot, {
      id: recipe.id, name: `${recipe.name} (v${lastSnapshot.version})`, slug: recipe.slug,
      family: recipe.family, targetBatchWeight: recipe.targetBatchWeight,
    });
    snapshotMetrics = calculateRecipe(snapshotRecipe, frozenIngredients);
    diff = compareRecipes(snapshotRecipe, domainRecipe, frozenIngredients, currentIngredients);
  }

  const snapVersions = recipe.snapshots;

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href={`/recipes/${recipe.id}/editor`} className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="inline size-4" /> Editor
          </Link>
          <span className="text-muted-foreground">·</span>
          <h1 className="text-xl font-bold">Confronto — {recipe.name}</h1>
        </div>
        <SaveSnapshotButton recipeId={id} />
      </div>

      {drift.length > 0 && (
        <Card className="mb-4 border-amber-400/50 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-4" /> Composizione ingredienti cambiata
            </CardTitle>
            <CardDescription>
              Rispetto all&apos;ultimo snapshot ({lastSnapshot?.name ?? "—"}) la scheda di alcuni ingredienti è stata modificata.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1 text-left">Ingrediente</th>
                    <th className="px-2 py-1 text-left">Campo</th>
                    <th className="px-2 py-1 text-right">Snapshot</th>
                    <th className="px-2 py-1 text-right">Attuale</th>
                  </tr>
                </thead>
                <tbody>
                  {drift.slice(0, 20).map((d, i) => (
                    <tr key={i} className="border-t border-amber-200/50 dark:border-amber-900/50">
                      <td className="px-2 py-1">{d.ingredientName}</td>
                      <td className="px-2 py-1 font-mono text-xs">{d.field}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{formatNumberIt(d.snapshot, 2)}</td>
                      <td className="px-2 py-1 text-right tabular-nums font-semibold text-amber-700 dark:text-amber-400">{formatNumberIt(d.current, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!lastSnapshot && (
        <Card className="mb-4">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <Camera className="mx-auto mb-2 size-8 opacity-40" />
            Nessuna versione salvata. Salva uno snapshot per confrontare le versioni future.
          </CardContent>
        </Card>
      )}

      {diff && snapshotMetrics && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm"><GitCompareArrows className="size-4" /> Quantità: {snapshotRecipe?.name} → attuale</CardTitle>
              <CardDescription>Modifiche ordinate per impatto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1 text-left">Ingrediente</th>
                      <th className="px-2 py-1 text-right">Prima</th>
                      <th className="px-2 py-1 text-right">Dopo</th>
                      <th className="px-2 py-1 text-right">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.ingredients.map((d) => (
                      <tr key={d.ingredientName} className="border-t border-border/60">
                        <td className="px-2 py-1">
                          {d.ingredientName}
                          {!d.presentInA && <Badge variant="secondary" className="ml-1">nuovo</Badge>}
                          {!d.presentInB && <Badge variant="destructive" className="ml-1">rimosso</Badge>}
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums">{formatNumberIt(d.quantityA, 1)}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{formatNumberIt(d.quantityB, 1)}</td>
                        <td className={`px-2 py-1 text-right tabular-nums ${d.delta > 0.05 ? "text-amber-600" : d.delta < -0.05 ? "text-sky-600" : "text-muted-foreground"}`}>
                          {d.delta > 0 ? "+" : ""}{formatNumberIt(d.delta, 1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Metriche aggregate</CardTitle>
              <CardDescription>Snapshot vs attuale</CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1 text-left">Metrica</th>
                    <th className="px-2 py-1 text-right">Prima</th>
                    <th className="px-2 py-1 text-right">Dopo</th>
                    <th className="px-2 py-1 text-right">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {diff.metrics.map((m) => (
                    <tr key={m.label} className="border-t border-border/60">
                      <td className="px-2 py-1">{m.label}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{formatNumberIt(m.valueA, 2)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{formatNumberIt(m.valueB, 2)}</td>
                      <td className={`px-2 py-1 text-right tabular-nums ${Math.abs(m.delta) < 0.01 ? "text-muted-foreground" : m.delta > 0 ? "text-amber-600" : "text-sky-600"}`}>
                        {m.delta > 0 ? "+" : ""}{formatNumberIt(m.delta, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm">
                <span>Δ costo totale</span>
                <span className={`tabular-nums font-semibold ${diff.costDelta >= 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {diff.costDelta >= 0 ? "+" : ""}{formatEuro(diff.costDelta)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {snapVersions.length > 0 && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-sm">Cronologia versioni ({snapVersions.length})</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {snapVersions.map((s) => (
                <li key={s.id} className="flex items-center justify-between border-b border-border/40 py-1 last:border-0">
                  <span>
                    <Badge variant="secondary" className="mr-2">v{s.version}</Badge>
                    {s.name ?? "Senza titolo"}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString("it-IT")}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
