"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useEditorStore } from "@/stores/editor-store";
import { useStore } from "zustand";
import { calculateRecipe, formatNumberIt, formatEuro, scaleRecipe } from "@/domain/calculations";
import { replaceRecipeIngredients, updateRecipeMeta } from "@/app/actions/recipes";
import type { CalibrationPreset, Ingredient, Recipe, RecipeFamily } from "@/types";
import { INGREDIENT_CATEGORY_LABELS, RECIPE_FAMILIES, RECIPE_FAMILY_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form-controls";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AddIngredientDialog } from "./add-ingredient-dialog";
import {
  Undo2, Redo2, Save, Plus, Trash2, Sparkles,
  FlaskConical, GitCompareArrows, Printer, Scale,
} from "lucide-react";

export function RecipeEditor({
  initialRecipe,
  usedIngredients,
  allIngredients,
  preset,
}: {
  initialRecipe: Recipe;
  usedIngredients: Ingredient[];
  allIngredients: Ingredient[];
  preset: CalibrationPreset | null;
}) {
  const hydrated = useEditorStore((s) => s.hydrated);
  const hydrate = useEditorStore((s) => s.hydrate);
  const recipe = useEditorStore((s) => s.recipe);
  const dirty = useEditorStore((s) => s.dirty);
  const markSaved = useEditorStore((s) => s.markSaved);

  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Idrata lo store al mount (e quando cambia la ricetta iniziale).
  useEffect(() => {
    hydrate(initialRecipe, usedIngredients);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRecipe.id]);

  // Auto-save con debounce 1.5s.
  useEffect(() => {
    if (!dirty || !recipe || !hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      startTransition(async () => {
        try {
          // Salva meta + righe.
          await Promise.all([
            updateRecipeMeta(recipe.id, {
              name: recipe.name,
              family: recipe.family,
              targetBatchWeight: recipe.targetBatchWeight,
              description: recipe.description,
              preparation: recipe.preparation,
              notes: recipe.notes,
            }),
            replaceRecipeIngredients(
              recipe.id,
              recipe.ingredients.map((ri) => ({
                ingredientId: ri.ingredientId,
                quantityGrams: ri.quantityGrams,
                isLocked: ri.isLocked,
                isMandatory: ri.isMandatory,
                minGrams: ri.minGrams,
                maxGrams: ri.maxGrams,
                minPercent: ri.minPercent,
                maxPercent: ri.maxPercent,
                optimizationWeight: ri.optimizationWeight,
                notes: ri.notes,
              })),
            ),
          ]);
          markSaved();
        } catch (err) {
          console.error("Auto-save fallito:", err);
        }
      });
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [dirty, recipe, hydrated, markSaved]);

  if (!hydrated || !recipe) {
    return <div className="p-6 text-sm text-muted-foreground">Caricamento editor…</div>;
  }

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <EditorToolbar recipeId={recipe.id} pending={pending} />

        <RecipeMetaForm preset={preset} />

        <MetricsSummary preset={preset} />

        <RecipeTable allIngredients={allIngredients} />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger>
                <Button render={<span />}>
                  <Plus className="size-4" /> Aggiungi ingrediente
                </Button>
              </DialogTrigger>
              <DialogContent title="Aggiungi ingrediente" description="Cerca e aggiungi alla ricetta.">
                <AddIngredientDialog
                  allIngredients={allIngredients}
                  usedIds={new Set(recipe.ingredients.map((ri) => ri.ingredientId))}
                  onAdd={(id, grams) => {
                    useEditorStore.getState().addIngredient(id, grams);
                  }}
                  onClose={() => setShowAdd(false)}
                />
              </DialogContent>
            </Dialog>
            <ScaleToBatchButton />
          </div>
          <div className="flex gap-2">
            <Button render={<Link href={`/recipes/${recipe.id}/calibration`} />} variant="outline" size="sm">
              <Sparkles className="size-4" /> Calibrazione
            </Button>
            <Button render={<Link href={`/recipes/${recipe.id}/comparison`} />} variant="outline" size="sm">
              <GitCompareArrows className="size-4" /> Confronto
            </Button>
            <Button render={<Link href={`/recipes/${recipe.id}/print`} />} variant="outline" size="sm">
              <Printer className="size-4" /> Scheda
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function EditorToolbar({ recipeId, pending }: { recipeId: string; pending: boolean }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <UndoRedoButtons />
        <SaveStatus pending={pending} />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/recipes" className="hover:text-foreground">← Ricettario</Link>
        <span>·</span>
        <span>ID: {recipeId.slice(-6)}</span>
      </div>
    </div>
  );
}

function UndoRedoButtons() {
  const pastLength = useStore(useEditorStore.temporal, (s) => s.pastStates.length);
  const futureLength = useStore(useEditorStore.temporal, (s) => s.futureStates.length);
  const { undo, redo } = useEditorStore.temporal.getState();
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={pastLength === 0}
        onClick={() => undo()}
        title="Annulla"
      >
        <Undo2 className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={futureLength === 0}
        onClick={() => redo()}
        title="Ripeti"
      >
        <Redo2 className="size-4" />
      </Button>
    </div>
  );
}

function SaveStatus({ pending }: { pending: boolean }) {
  const dirty = useEditorStore((s) => s.dirty);
  if (pending) return <Badge variant="secondary"><Save className="size-3 animate-pulse" /> Salvataggio…</Badge>;
  if (dirty) return <Badge variant="warning">Modifiche non salvate</Badge>;
  return <Badge variant="success">Salvato</Badge>;
}

function RecipeMetaForm({ preset }: { preset: CalibrationPreset | null }) {
  const recipe = useEditorStore((s) => s.recipe)!;
  const setName = useEditorStore((s) => s.setName);
  const setDescription = useEditorStore((s) => s.setDescription);
  const setFamily = (f: RecipeFamily) => useEditorStore.getState().setRecipe({ ...recipe, family: f });
  const setBatch = useEditorStore((s) => s.setBatchWeight);
  const setPreparation = useEditorStore((s) => s.setPreparation);
  const setNotes = useEditorStore((s) => s.setNotes);

  return (
    <Card className="mb-4">
      <CardContent className="grid gap-3 p-4 md:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="r-name">Nome</Label>
          <Input id="r-name" value={recipe.name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-family">Famiglia</Label>
          <Select id="r-family" value={recipe.family} onChange={(e) => setFamily(e.target.value as RecipeFamily)}>
            {RECIPE_FAMILIES.map((f) => (
              <option key={f} value={f}>{RECIPE_FAMILY_LABELS[f]}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-batch">Peso batch (g)</Label>
          <Input id="r-batch" type="number" min={1} value={recipe.targetBatchWeight} onChange={(e) => setBatch(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5 md:col-span-3">
          <Label htmlFor="r-desc">Descrizione</Label>
          <Input id="r-desc" value={recipe.description ?? ""} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1.5 md:col-span-3">
          <Label htmlFor="r-prep">Procedimento</Label>
          <Textarea id="r-prep" value={recipe.preparation ?? ""} onChange={(e) => setPreparation(e.target.value)} />
        </div>
        <div className="space-y-1.5 md:col-span-3">
          <Label htmlFor="r-notes">Note</Label>
          <Textarea id="r-notes" value={recipe.notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {preset && (
          <div className="flex items-center gap-2 md:col-span-3">
            <Badge variant="default"><Sparkles className="size-3" /> Preset attivo: {preset.name}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricsSummary({ preset }: { preset: CalibrationPreset | null }) {
  const recipe = useEditorStore((s) => s.recipe)!;
  const ingredients = useEditorStore((s) => s.ingredients);
  const metrics = useMemo(
    () => calculateRecipe(recipe, ingredients),
    [recipe, ingredients],
  );
  const batchDelta = metrics.totalWeightGrams - recipe.targetBatchWeight;
  const items: Array<{ label: string; value: string; hint?: string; tone?: "default" | "warning" }> = [
    { label: "Peso totale", value: `${formatNumberIt(metrics.totalWeightGrams, 0)} g` },
    { label: "Solidi", value: `${formatNumberIt((metrics.totalSolids / metrics.totalWeightGrams) * 100, 1)} %` },
    { label: "Zuccheri", value: `${formatNumberIt((metrics.sugars.total / metrics.totalWeightGrams) * 100, 1)} %` },
    { label: "Grassi", value: `${formatNumberIt((metrics.fat.total / metrics.totalWeightGrams) * 100, 1)} %` },
    { label: "POD", value: formatNumberIt(metrics.pod, 1) },
    { label: "PAC", value: formatNumberIt(metrics.pac, 1) },
    { label: "Equilibrio", value: formatNumberIt(metrics.equilibriumIndex, 0) },
    { label: "Costo/kg", value: formatEuro(metrics.costPerKg) },
  ];
  void preset;
  return (
    <Card className="mb-4">
      <CardContent className="p-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
          {items.map((it) => (
            <div key={it.label} className="rounded-md bg-muted/40 px-2.5 py-1.5">
              <div className="text-[11px] uppercase text-muted-foreground">{it.label}</div>
              <div className="text-sm font-semibold tabular-nums">{it.value}</div>
            </div>
          ))}
        </div>
        {Math.abs(batchDelta) > 0.5 && (
          <div className="mt-2 text-xs text-amber-600">
            ⚠ La somma degli ingredienti ({formatNumberIt(metrics.totalWeightGrams, 0)} g) differisce dal peso batch ({formatNumberIt(recipe.targetBatchWeight, 0)} g) di {batchDelta > 0 ? "+" : ""}{formatNumberIt(batchDelta, 0)} g.
          </div>
        )}
        {metrics.warnings.length > 0 && (
          <div className="mt-2 text-xs text-amber-600">⚠ {metrics.warnings.join(" · ")}</div>
        )}
      </CardContent>
    </Card>
  );
}

function ScaleToBatchButton() {
  const recipe = useEditorStore((s) => s.recipe)!;
  const setRecipe = useEditorStore((s) => s.setRecipe);
  const scaled = scaleRecipe(recipe, recipe.targetBatchWeight);
  const totalNow = recipe.ingredients.reduce((s, ri) => s + ri.quantityGrams, 0);
  const needsScale = Math.abs(totalNow - recipe.targetBatchWeight) > 1;
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={!needsScale}
      onClick={() => setRecipe(scaled)}
      title="Scala proporzionalmente al peso batch"
    >
      <Scale className="size-4" /> Scala a batch
    </Button>
  );
}

interface RowData {
  rowId: string;
  ingredient: Ingredient;
  ri: Recipe["ingredients"][number];
}

function RecipeTable({
  allIngredients,
}: {
  allIngredients: Ingredient[];
}) {
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([]);
  const recipe = useEditorStore((s) => s.recipe)!;
  const ingredients = useEditorStore((s) => s.ingredients);
  const metrics = useMemo(() => calculateRecipe(recipe, ingredients), [recipe, ingredients]);

  const data: RowData[] = recipe.ingredients.map((ri) => {
    const ing = ingredients.find((i) => i.id === ri.ingredientId) ?? allIngredients.find((i) => i.id === ri.ingredientId)!;
    const contribution = metrics.contributions.find((c) => c.recipeIngredientId === ri.id);
    return { rowId: ri.id, ingredient: ing, ri: { ...ri, ...contribution } as RowData["ri"] };
  });

  const columns = useMemo<ColumnDef<RowData>[]>(
    () => [
      {
        accessorKey: "ingredient.name",
        header: "Ingrediente",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div>
              <div className="font-medium">{row.original.ingredient.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {INGREDIENT_CATEGORY_LABELS[row.original.ingredient.category]}
                {row.original.ri.isMandatory && <span className="ml-1 text-amber-600">· obbligatorio</span>}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "grams",
        header: "Grammi",
        cell: ({ row }) => (
          <EditableNumber
            value={row.original.ri.quantityGrams}
            onCommit={(v) => useEditorStore.getState().setQuantity(row.original.rowId, v)}
            aria-label="Grammi"
          />
        ),
      },
      {
        id: "percent",
        header: "%",
        cell: ({ row }) => {
          const pct = metrics.ingredientPercents[row.original.rowId] ?? 0;
          return <span className="tabular-nums">{formatNumberIt(pct, 1)}</span>;
        },
      },
      { id: "water", header: "Acqua", cell: ({ row }) => <CellMetric ri={row.original.ri} field="water" /> },
      { id: "solids", header: "Solidi", cell: ({ row }) => <CellMetric ri={row.original.ri} field="totalSolids" /> },
      { id: "sugars", header: "Zuccheri", cell: ({ row }) => <CellMetric ri={row.original.ri} field="sugars" /> },
      { id: "fat", header: "Grassi", cell: ({ row }) => <CellMetric ri={row.original.ri} field="fat" /> },
      { id: "protein", header: "Prot.", cell: ({ row }) => <CellMetric ri={row.original.ri} field="protein" /> },
      { id: "pod", header: "POD", cell: ({ row }) => <CellMetric ri={row.original.ri} field="pod" /> },
      { id: "pac", header: "PAC", cell: ({ row }) => <CellMetric ri={row.original.ri} field="pac" /> },
      {
        id: "lock",
        header: "Lock",
        cell: ({ row }) => (
          <Checkbox
            checked={row.original.ri.isLocked}
            onCheckedChange={() => useEditorStore.getState().toggleLock(row.original.rowId)}
            aria-label="Blocca quantità"
          />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => useEditorStore.getState().removeIngredient(row.original.rowId)}
            title="Rimuovi"
            aria-label="Rimuovi ingrediente"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        ),
      },
    ],
    [metrics],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-2">
        <CardTitle className="flex items-center gap-2 text-sm"><FlaskConical className="size-4" /> Composizione ricetta</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="whitespace-nowrap px-2 py-1.5 text-left font-medium first:pl-3">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap px-2 py-1 first:pl-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border bg-muted/30 text-xs font-semibold">
            <tr>
              <td className="px-3 py-1.5">Totale ({data.length})</td>
              <td className="tabular-nums">{formatNumberIt(metrics.totalWeightGrams, 0)}</td>
              <td className="tabular-nums">100</td>
              <td className="tabular-nums">{formatNumberIt(metrics.water, 0)}</td>
              <td className="tabular-nums">{formatNumberIt(metrics.totalSolids, 0)}</td>
              <td className="tabular-nums">{formatNumberIt(metrics.sugars.total, 0)}</td>
              <td className="tabular-nums">{formatNumberIt(metrics.fat.total, 0)}</td>
              <td className="tabular-nums">{formatNumberIt(metrics.protein, 0)}</td>
              <td className="tabular-nums">{formatNumberIt(metrics.pod, 1)}</td>
              <td className="tabular-nums">{formatNumberIt(metrics.pac, 1)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function CellMetric({
  ri,
  field,
}: {
  ri: Recipe["ingredients"][number];
  field: "water" | "totalSolids" | "sugars" | "fat" | "protein" | "pod" | "pac";
}) {
  // I contributi sono mergiati dentro ri dal RowData (campi aggiuntivi).
  const value = (ri as unknown as Record<string, number | undefined>)[field];
  return <span className="tabular-nums">{value !== undefined ? formatNumberIt(value, field === "pod" || field === "pac" ? 1 : 0) : "—"}</span>;
}

function EditableNumber({
  value,
  onCommit,
  "aria-label": ariaLabel,
}: {
  value: number;
  onCommit: (v: number) => void;
  "aria-label"?: string;
}) {
  const [local, setLocal] = useState(String(value));
  const [editing, setEditing] = useState(false);
  // Aggiornamento durante il render (pattern React) quando il valore esterno cambia e non stiamo editando.
  if (!editing && local !== String(value)) {
    setLocal(String(value));
  }
  return (
    <Input
      type="number"
      min={0}
      step={0.1}
      aria-label={ariaLabel}
      value={local}
      onFocus={() => setEditing(true)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        setEditing(false);
        onCommit(Number(local) || 0);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="h-7 w-20 text-right"
    />
  );
}
