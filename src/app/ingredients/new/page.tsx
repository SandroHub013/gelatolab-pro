"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createIngredient } from "@/app/actions/ingredients";
import { INGREDIENT_CATEGORIES, INGREDIENT_CATEGORY_LABELS, type IngredientCategory } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export default function NewIngredientPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<IngredientCategory>("personalizzato");
  const [waterPercent, setWaterPercent] = useState(0);
  const [totalSolidsPercent, setTotalSolidsPercent] = useState(100);
  const [sugarsPercent, setSugarsPercent] = useState(0);
  const [fatPercent, setFatPercent] = useState(0);
  const [proteinPercent, setProteinPercent] = useState(0);
  const [fiberPercent, setFiberPercent] = useState(0);
  const [alcoholPercent, setAlcoholPercent] = useState(0);
  const [costPerKg, setCostPerKg] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Inserisci un nome per l'ingrediente.");
      return;
    }
    if (Math.abs(waterPercent + totalSolidsPercent - 100) > 0.5) {
      setError("Acqua + solidi deve essere circa 100% (tolleranza ±0.5).");
      return;
    }

    startTransition(async () => {
      try {
        const { id } = await createIngredient({
          name: name.trim(),
          slug: name.trim().toLowerCase().replace(/\s+/g, "-"),
          category,
          waterPercent,
          totalSolidsPercent,
          sugarsPercent,
          fatPercent,
          proteinPercent,
          fiberPercent,
          alcoholPercent,
          podCoefficient: 0,
          pacCoefficient: 0,
          costPerKg,
          allergens: [],
          tags: [],
          isCustom: true,
        });
        router.push(`/ingredients/${id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore nella creazione.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Nuovo ingrediente</h1>
        <p className="text-sm text-muted-foreground">
          Crea un ingrediente personalizzato con la sua composizione percentuale.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Composizione</CardTitle>
          <CardDescription>
            I coefficienti POD/PAC sono calcolati automaticamente dalla composizione zuccheri.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Purea di ananas"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Categoria</Label>
              <Select id="category" value={category} onChange={(e) => setCategory(e.target.value as IngredientCategory)}>
                {INGREDIENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{INGREDIENT_CATEGORY_LABELS[c]}</option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="water">Acqua %</Label>
                <Input id="water" type="number" step={0.1} value={waterPercent} onChange={(e) => {
                  const v = Number(e.target.value);
                  setWaterPercent(v);
                  setTotalSolidsPercent(Math.round((100 - v) * 10) / 10);
                }} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="solids">Solidi totali %</Label>
                <Input id="solids" type="number" step={0.1} value={totalSolidsPercent} onChange={(e) => setTotalSolidsPercent(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="sugars">Zuccheri %</Label>
                <Input id="sugars" type="number" step={0.1} value={sugarsPercent} onChange={(e) => setSugarsPercent(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fat">Grassi %</Label>
                <Input id="fat" type="number" step={0.1} value={fatPercent} onChange={(e) => setFatPercent(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="protein">Proteine %</Label>
                <Input id="protein" type="number" step={0.1} value={proteinPercent} onChange={(e) => setProteinPercent(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fiber">Fibre %</Label>
                <Input id="fiber" type="number" step={0.1} value={fiberPercent} onChange={(e) => setFiberPercent(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="alcohol">Alcol %</Label>
                <Input id="alcohol" type="number" step={0.1} value={alcoholPercent} onChange={(e) => setAlcoholPercent(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost">Costo €/kg</Label>
                <Input id="cost" type="number" step={0.01} min={0} value={costPerKg ?? ""} onChange={(e) => setCostPerKg(e.target.value ? Number(e.target.value) : undefined)} placeholder="0" />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" disabled={pending}>
                Crea ingrediente <ChevronRight className="size-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
