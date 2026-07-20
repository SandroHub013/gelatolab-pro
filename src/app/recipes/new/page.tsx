"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRecipe } from "@/app/actions/recipes";
import { RECIPE_FAMILIES, RECIPE_FAMILY_LABELS, type RecipeFamily } from "@/types";
import { DEFAULT_BATCH_WEIGHT } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export default function NewRecipePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [family, setFamily] = useState<RecipeFamily>("base_latte");
  const [batch, setBatch] = useState(DEFAULT_BATCH_WEIGHT);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Inserisci un nome per la ricetta.");
      return;
    }
    if (batch <= 0) {
      setError("Il peso batch deve essere positivo.");
      return;
    }
    startTransition(async () => {
      try {
        const { id } = await createRecipe({
          name: name.trim(),
          family,
          targetBatchWeight: batch,
          description: description.trim() || undefined,
        });
        router.push(`/recipes/${id}/editor`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore nella creazione.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Nuova ricetta</h1>
        <p className="text-sm text-muted-foreground">
          Definisci nome, famiglia e peso batch. Aggiornerai gli ingredienti nell&apos;editor.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dati base</CardTitle>
          <CardDescription>La famiglia suggerisce i preset e i target di calibrazione applicabili.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome ricetta</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Fior di latte"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="family">Famiglia</Label>
                <Select
                  id="family"
                  value={family}
                  onChange={(e) => setFamily(e.target.value as RecipeFamily)}
                >
                  {RECIPE_FAMILIES.map((f) => (
                    <option key={f} value={f}>
                      {RECIPE_FAMILY_LABELS[f]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="batch">Peso batch (g)</Label>
                <Input
                  id="batch"
                  type="number"
                  min={1}
                  step={1}
                  value={batch}
                  onChange={(e) => setBatch(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">Descrizione (opzionale)</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Note sulla ricetta"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" disabled={pending}>
                Crea e apri editor <ChevronRight className="size-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
