import Link from "next/link";
import { calculateRecipe, formatEuro, formatNumberIt } from "@/domain/calculations";
import { evaluateTargets, countOutOfRange } from "@/domain/constraints";
import {
  findAllRecipes,
  findAllPresets,
  findAllIngredients,
} from "@/infrastructure/repositories/recipe-repository";
import { RECIPE_FAMILY_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Beaker, Plus, FlaskConical, SlidersHorizontal, TriangleAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [recipes, presets, ingredients] = await Promise.all([
    findAllRecipes(),
    findAllPresets(),
    findAllIngredients(),
  ]);

  const recent = recipes.slice(0, 6);

  // Ricette fuori calibrazione rispetto al preset attivo.
  const outOfRange: Array<{ id: string; name: string; count: number }> = [];
  for (const r of recipes) {
    if (!r.activePresetId) continue;
    const preset = presets.find((p) => p.id === r.activePresetId);
    if (!preset) continue;
    const metrics = calculateRecipe(r, ingredients);
    const evals = evaluateTargets(metrics, preset);
    const n = countOutOfRange(evals);
    if (n > 0) outOfRange.push({ id: r.id, name: r.name, count: n });
  }

  const stats = [
    { label: "Ricette", value: recipes.length, icon: Beaker, href: "/recipes" },
    { label: "Ingredienti", value: ingredients.length, icon: FlaskConical, href: "/ingredients" },
    { label: "Preset", value: presets.length, icon: SlidersHorizontal, href: "/presets" },
    { label: "Da ricalibrare", value: outOfRange.length, icon: TriangleAlert, href: "/recipes" },
  ];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Panoramica del laboratorio: ricette recenti e fuori calibrazione.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/recipes" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Beaker className="size-4" /> Ricettario
          </Link>
          <Link href="/recipes/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" /> Nuova ricetta
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="size-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold leading-none tabular-nums">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Ricette recenti</CardTitle>
              <CardDescription>Ultimi aggiornamenti</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {recent.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nessuna ricetta. <Link href="/recipes/new" className="font-medium text-primary underline">Creane una</Link>.
              </p>
            )}
            {recent.map((r) => {
              const metrics = calculateRecipe(r, ingredients);
              return (
                <Link
                  key={r.id}
                  href={`/recipes/${r.id}/editor`}
                  className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {RECIPE_FAMILY_LABELS[r.family]} · {formatNumberIt(metrics.totalWeightGrams, 0)}g
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums text-muted-foreground">
                    <span>POD {formatNumberIt(metrics.pod, 1)}</span>
                    <span>PAC {formatNumberIt(metrics.pac, 1)}</span>
                    <span>{formatEuro(metrics.costPerKg)}/kg</span>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-amber-500" />
              Fuori calibrazione
            </CardTitle>
            <CardDescription>Ricette con target non raggiunti rispetto al preset attivo</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {outOfRange.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Tutte le ricette con preset sono nel range. ✓
              </p>
            )}
            {outOfRange.map((r) => (
              <Link
                key={r.id}
                href={`/recipes/${r.id}/calibration`}
                className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted"
              >
                <span className="truncate font-medium">{r.name}</span>
                <Badge variant="warning">{r.count} target fuori</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
