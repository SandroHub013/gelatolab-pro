"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePreset } from "@/app/actions/presets";
import { RECIPE_FAMILIES, RECIPE_FAMILY_LABELS, TARGET_KEYS, TARGET_LABELS, type RecipeFamily } from "@/types";
import type { CalibrationPreset, TargetKey } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { ChevronRight, Plus, Trash2 } from "lucide-react";

interface TargetRow {
  key: TargetKey;
  min: number;
  ideal: string;
  max: number;
}

export function EditPresetForm({ preset }: { preset: CalibrationPreset }) {
  const router = useRouter();
  const [name, setName] = useState(preset.name);
  const [description, setDescription] = useState(preset.description);
  const [families, setFamilies] = useState<RecipeFamily[]>(preset.recipeFamilies);
  const [targets, setTargets] = useState<TargetRow[]>(
    Object.entries(preset.targetRanges).map(([key, range]) => ({
      key: key as TargetKey,
      min: range.min,
      ideal: range.ideal !== undefined ? String(range.ideal) : "",
      max: range.max,
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const availableKeys = TARGET_KEYS.filter(
    (k) => !targets.some((t) => t.key === k),
  );

  function addTarget() {
    if (availableKeys.length === 0) return;
    setTargets([...targets, { key: availableKeys[0], min: 0, ideal: "", max: 100 }]);
  }

  function removeTarget(key: TargetKey) {
    setTargets(targets.filter((t) => t.key !== key));
  }

  function updateTarget(key: TargetKey, field: keyof TargetRow, value: string | number) {
    setTargets(targets.map((t) => (t.key === key ? { ...t, [field]: value } : t)));
  }

  function toggleFamily(f: RecipeFamily) {
    setFamilies((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Inserisci un nome per il preset.");
      return;
    }

    const targetRanges: Record<string, { min: number; ideal?: number; max: number }> = {};
    for (const t of targets) {
      const ideal = t.ideal !== "" ? Number(t.ideal) : undefined;
      if (t.min > t.max) {
        setError(`Il target ${TARGET_LABELS[t.key]}: min non può superare max.`);
        return;
      }
      targetRanges[t.key] = { min: t.min, ideal, max: t.max };
    }

    startTransition(async () => {
      try {
        await updatePreset(preset.id, {
          name: name.trim(),
          description: description.trim() || "Preset personalizzato",
          recipeFamilies: families,
          targetRanges: targetRanges as never,
        });
        router.push(`/presets/${preset.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore nel salvataggio.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dati base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome preset</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Mio preset personalizzato"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Descrizione</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Obiettivi e note sul preset"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Famiglie di ricette</CardTitle>
          <CardDescription>Seleziona le famiglie a cui si applica questo preset.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {RECIPE_FAMILIES.map((f) => (
              <label
                key={f}
                className={`cursor-pointer rounded-md border px-2.5 py-1 text-sm transition-colors ${
                  families.includes(f)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={families.includes(f)}
                  onChange={() => toggleFamily(f)}
                />
                {RECIPE_FAMILY_LABELS[f]}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Target range</span>
            <Button type="button" variant="outline" size="sm" onClick={addTarget} disabled={availableKeys.length === 0}>
              <Plus className="size-3" /> Aggiungi
            </Button>
          </CardTitle>
          <CardDescription>Min, ideale (opzionale), max per ogni parametro.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {targets.map((t) => (
            <div key={t.key} className="flex flex-wrap items-end gap-2 rounded-md border border-border p-2">
              <div className="min-w-[120px] flex-1">
                <div className="text-xs font-medium text-muted-foreground">
                  {TARGET_LABELS[t.key]}
                </div>
              </div>
              <div className="w-20">
                <Label className="text-[10px]">Min</Label>
                <Input
                  type="number"
                  step={0.1}
                  value={t.min}
                  onChange={(e) => updateTarget(t.key, "min", Number(e.target.value))}
                  className="h-7 text-right"
                />
              </div>
              <div className="w-20">
                <Label className="text-[10px]">Ideale</Label>
                <Input
                  type="number"
                  step={0.1}
                  value={t.ideal}
                  onChange={(e) => updateTarget(t.key, "ideal", e.target.value)}
                  placeholder="—"
                  className="h-7 text-right"
                />
              </div>
              <div className="w-20">
                <Label className="text-[10px]">Max</Label>
                <Input
                  type="number"
                  step={0.1}
                  value={t.max}
                  onChange={(e) => updateTarget(t.key, "max", Number(e.target.value))}
                  className="h-7 text-right"
                />
              </div>
              <button
                type="button"
                onClick={() => removeTarget(t.key)}
                className="mb-0.5 rounded-md p-1 text-muted-foreground hover:text-destructive"
                aria-label={`Rimuovi ${TARGET_LABELS[t.key]}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          Salva modifiche <ChevronRight className="size-4" />
        </Button>
      </div>
    </form>
  );
}
