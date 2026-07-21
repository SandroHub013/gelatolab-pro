"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import type {
  CalibrationPreset, CalibrationResult, CalibrationSolution,
  Ingredient, Recipe, RecipeMetrics,
} from "@/types";
import { SOLVER_VARIANT_LABELS } from "@/types";
import { calculateRecipe, compareRecipes, formatEuro, formatFixedIt, formatNumberIt } from "@/domain/calculations";
import { evaluateTargets, countOutOfRange } from "@/domain/constraints";
import { runCalibration } from "@/app/actions/solver";
import { applySolutionAndSnapshot } from "@/app/actions/recipes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/form-controls";
import { Badge } from "@/components/ui/badge";
import { RangeBar } from "./range-bar";
import { Sparkles, Play, AlertTriangle, Check, GitCompareArrows, ArrowLeft } from "lucide-react";

const CHART_COLORS = ["#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981", "#64748b", "#ec4899"];

export function CalibrationDashboard({
  recipe, ingredients, presets, activePreset,
}: {
  recipe: Recipe;
  ingredients: Ingredient[];
  presets: CalibrationPreset[];
  activePreset: CalibrationPreset | null;
}) {
  const router = useRouter();
  // Il select mostra solo i preset applicabili alla famiglia: il default deve
  // appartenere a quella lista, altrimenti si calibrerebbe con un preset diverso
  // da quello visualizzato.
  const familyPresets = useMemo(
    () => presets.filter((p) => p.recipeFamilies.length === 0 || p.recipeFamilies.includes(recipe.family)),
    [presets, recipe.family],
  );
  const [presetId, setPresetId] = useState(() => {
    const applicable = presets.filter(
      (p) => p.recipeFamilies.length === 0 || p.recipeFamilies.includes(recipe.family),
    );
    const active = applicable.find((p) => p.id === activePreset?.id);
    return active?.id ?? applicable[0]?.id ?? "";
  });
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, startRunning] = useTransition();
  const [applying, startApplying] = useTransition();

  const preset = useMemo(
    () => familyPresets.find((p) => p.id === presetId) ?? null,
    [familyPresets, presetId],
  );

  const metrics = useMemo(() => calculateRecipe(recipe, ingredients), [recipe, ingredients]);
  const evaluations = useMemo(
    () => (preset ? evaluateTargets(metrics, preset) : []),
    [metrics, preset],
  );
  const outOfRange = countOutOfRange(evaluations);

  function handleCalibrate() {
    if (!preset) return;
    setError(null);
    startRunning(async () => {
      try {
        const r = await runCalibration(recipe.id, preset.id, { variants: ["minimal", "balanced", "cost"] });
        setResult(r);
      } catch (err) {
        setResult(null);
        setError(err instanceof Error ? err.message : "Errore durante la calibrazione.");
      }
    });
  }

  function handleApply(sol: CalibrationSolution) {
    setError(null);
    startApplying(async () => {
      try {
        await applySolutionAndSnapshot(recipe.id, sol.quantities, `Calibrazione ${SOLVER_VARIANT_LABELS[sol.variant]}`);
        router.push(`/recipes/${recipe.id}/comparison`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore nel salvataggio della soluzione.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href={`/recipes/${recipe.id}/editor`} className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="inline size-4" /> Editor
          </Link>
          <span className="text-muted-foreground">·</span>
          <h1 className="text-xl font-bold">Calibrazione — {recipe.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/recipes/${recipe.id}/comparison`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <GitCompareArrows className="size-4" /> Confronto
          </Link>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Preset</label>
            <Select value={presetId} onChange={(e) => { setPresetId(e.target.value); setResult(null); setError(null); }}>
              {familyPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.isSystemPreset ? " (sistema)" : ""}
                </option>
              ))}
            </Select>
          </div>
          {preset ? (
            <div className="flex-1 text-sm text-muted-foreground">{preset.description}</div>
          ) : (
            <div className="flex-1 text-sm text-muted-foreground">
              Nessun preset disponibile per questa famiglia di ricette.
            </div>
          )}
          <Button onClick={handleCalibrate} disabled={!preset || running} size="sm">
            <Play className="size-4" /> {running ? "Calibrazione…" : "Calibra (stessi ingredienti)"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
            <AlertTriangle className="size-4" /> {error}
          </CardContent>
        </Card>
      )}

      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Stato attuale vs target</h2>
        {outOfRange > 0 ? (
          <Badge variant="destructive">{outOfRange} fuori range</Badge>
        ) : (
          <Badge variant="success"><Check className="size-3" /> Nel range</Badge>
        )}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Range di calibrazione</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border">
            {evaluations.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">Seleziona un preset per vedere i target.</p>
            )}
            {evaluations.map((e) => (
              <RangeBar key={e.key} evaluation={e} />
            ))}
          </CardContent>
        </Card>

        <CompositionCharts metrics={metrics} />
      </div>

      {result && !result.feasible && (
        <Card className="mb-4 border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4" /> Calibrazione impossibile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{result.message}</p>
            {result.conflictingConstraints.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {result.conflictingConstraints.map((c, i) => (
                  <li key={i}><strong>{c.label}:</strong> {c.detail}</li>
                ))}
              </ul>
            )}
            {result.suggestions.length > 0 && (
              <div className="rounded-md bg-muted p-2">
                <div className="mb-1 text-xs font-semibold uppercase">Suggerimenti</div>
                <ul className="list-disc space-y-0.5 pl-5">
                  {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {result && result.feasible && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-sm font-semibold">Soluzioni proposte ({result.solutions.length})</h2>
            <span className="text-xs text-muted-foreground">· {result.elapsedMs} ms · clicca «Applica» per salvare come nuova versione</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {result.solutions.map((sol) => (
              <SolutionCard
                key={sol.variant}
                solution={sol}
                originalMetrics={metrics}
                originalRecipe={recipe}
                ingredients={ingredients}
                onApply={() => handleApply(sol)}
                disabled={applying}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SolutionCard({
  solution, originalMetrics, originalRecipe, ingredients, onApply, disabled,
}: {
  solution: CalibrationSolution;
  originalMetrics: RecipeMetrics;
  originalRecipe: Recipe;
  ingredients: Ingredient[];
  onApply: () => void;
  disabled: boolean;
}) {
  const diff = useMemo(
    () => compareRecipes(originalRecipe, solution.recipe, ingredients, ingredients),
    [originalRecipe, solution.recipe, ingredients],
  );
  const totalDelta = diff.totalWeightDelta;
  const topChanges = diff.ingredients
    .filter((d) => Math.abs(d.delta) >= 0.5)
    .slice(0, 4);
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          {SOLVER_VARIANT_LABELS[solution.variant]}
        </CardTitle>
        <CardDescription className="text-xs">Δ costo {diff.costDelta >= 0 ? "+" : ""}{formatEuro(diff.costDelta)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 text-sm">
        <div className="grid grid-cols-2 gap-1 text-xs">
          <Metric label="POD" a={originalMetrics.pod} b={solution.metrics.pod} />
          <Metric label="PAC" a={originalMetrics.pac} b={solution.metrics.pac} />
          <Metric label="Solidi %" a={pct(originalMetrics.totalSolids, originalMetrics)} b={pct(solution.metrics.totalSolids, solution.metrics)} />
          <Metric label="Equil." a={originalMetrics.equilibriumIndex} b={solution.metrics.equilibriumIndex} />
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <div className="mb-1 text-[11px] uppercase text-muted-foreground">Modifiche principali</div>
          {topChanges.length === 0 ? (
            <div className="text-xs text-muted-foreground">Nessuna modifica significativa (minima modifica ✓).</div>
          ) : (
            <ul className="space-y-0.5 text-xs">
              {topChanges.map((c) => (
                <li key={c.ingredientName} className="flex justify-between">
                  <span className="truncate">{c.ingredientName}</span>
                  <span className="tabular-nums">
                    {formatNumberIt(c.quantityA, 0)}→{formatNumberIt(c.quantityB, 0)}
                    <span className={c.delta > 0 ? "text-amber-600" : "text-sky-600"}>
                      {" "}({c.delta > 0 ? "+" : ""}{formatNumberIt(c.delta, 0)})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {solution.activeConstraints.length > 0 && (
          <details className="text-[11px] text-muted-foreground">
            <summary className="cursor-pointer select-none hover:text-foreground">
              Vincoli attivi ({solution.activeConstraints.length})
            </summary>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {solution.activeConstraints.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </details>
        )}
        <div className="text-[11px] text-muted-foreground">
          Δ peso totale: {totalDelta > 0 ? "+" : ""}{formatFixedIt(totalDelta, 1)} g
        </div>
        <Button onClick={onApply} disabled={disabled} size="sm" className="mt-auto">
          <Check className="size-4" /> Applica e salva versione
        </Button>
      </CardContent>
    </Card>
  );
}

function Metric({ label, a, b }: { label: string; a: number; b: number }) {
  // Il delta si calcola sui valori arrotondati come vengono mostrati, altrimenti
  // la riga si contraddice da sola (es. "18,4 → 18,1 (-0,4)").
  const shownA = round(a, 1);
  const shownB = round(b, 1);
  const delta = round(shownB - shownA, 1);
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="tabular-nums">
        {formatFixedIt(shownA, 1)} → {formatFixedIt(shownB, 1)}
        <span className={delta > 0 ? "text-amber-600" : delta < 0 ? "text-sky-600" : "text-emerald-600"}>
          {" "}({delta > 0 ? "+" : ""}{formatFixedIt(delta, 1)})
        </span>
      </span>
    </div>
  );
}

function pct(grams: number, m: RecipeMetrics): number {
  return m.totalWeightGrams > 0 ? (grams / m.totalWeightGrams) * 100 : 0;
}

function CompositionCharts({ metrics }: { metrics: RecipeMetrics }) {
  const total = metrics.totalWeightGrams || 1;
  const otherSolids = Math.max(0, metrics.totalSolids - metrics.sugars.total - metrics.fat.total - metrics.protein - metrics.fiber - metrics.minerals);
  const composition = [
    { name: "Acqua", value: round(metrics.water / total * 100), color: CHART_COLORS[0] },
    { name: "Zuccheri", value: round(metrics.sugars.total / total * 100), color: CHART_COLORS[1] },
    { name: "Grassi", value: round(metrics.fat.total / total * 100), color: CHART_COLORS[2] },
    { name: "Proteine", value: round(metrics.protein / total * 100), color: CHART_COLORS[3] },
    { name: "Fibre", value: round(metrics.fiber / total * 100), color: CHART_COLORS[4] },
    { name: "Minerali", value: round(metrics.minerals / total * 100), color: CHART_COLORS[5] },
    { name: "Altri solidi", value: round(otherSolids / total * 100), color: CHART_COLORS[6] },
  ].filter((d) => d.value > 0.1);

  const sugarData = [
    { name: "Saccarosio", value: round(metrics.sugars.sucrose) },
    { name: "Destrosio", value: round(metrics.sugars.dextrose) },
    { name: "Fruttosio", value: round(metrics.sugars.fructose) },
    { name: "Glucosio", value: round(metrics.sugars.glucose) },
    { name: "Lattosio", value: round(metrics.sugars.lactose) },
    { name: "Maltosio", value: round(metrics.sugars.maltose) },
    { name: "Maltodestr.", value: round(metrics.sugars.maltodextrin) },
    { name: "Polioli", value: round(metrics.sugars.polyols) },
  ].filter((d) => d.value > 0.5);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Composizione</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={composition} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={1}>
                {composition.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <RTooltip formatter={(v) => `${formatNumberIt(Number(v), 1)} %`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {sugarData.length > 0 && (
          <div className="h-40">
            <div className="mb-1 text-[11px] uppercase text-muted-foreground">Zuccheri (g)</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sugarData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                <RTooltip formatter={(v) => `${formatNumberIt(Number(v), 0)} g`} />
                <Bar dataKey="value" fill={CHART_COLORS[1]} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Arrotonda con default a 1 decimale (etichette grafici e confronti). */
function round(v: number, d = 1): number {
  const f = 10 ** d;
  return Math.round((v + Number.EPSILON) * f) / f;
}
