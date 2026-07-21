"use client";
import { useMemo, useState } from "react";
import type { Ingredient } from "@/types";
import { INGREDIENT_CATEGORY_LABELS } from "@/types";
import { Input } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";


import { Search, Plus } from "lucide-react";

export function AddIngredientDialog({
  allIngredients,
  usedIds,
  onAdd,
  onClose,
}: {
  allIngredients: Ingredient[];
  usedIds: Set<string>;
  onAdd: (ingredientId: string, grams: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");

  const filtered = useMemo(() => {
    let list = allIngredients;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (category) list = list.filter((i) => i.category === category);
    return list.slice(0, 80);
  }, [allIngredients, query, category]);

  const categories = useMemo(
    () => Array.from(new Set(allIngredients.map((i) => i.category))).sort(),
    [allIngredients],
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca ingrediente…"
            className="pl-8"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Tutte</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {INGREDIENT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <tbody>
            {filtered.map((ing) => {
              const used = usedIds.has(ing.id);
              return (
                <tr key={ing.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-1.5">
                    <div className="font-medium">{ing.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {INGREDIENT_CATEGORY_LABELS[ing.category]} · POD {ing.podCoefficient.toFixed(0)} / PAC {ing.pacCoefficient.toFixed(0)}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {used ? (
                      <Badge variant="secondary">aggiunto</Badge>
                    ) : (
                      <Button
                        size="xs"
                        onClick={() => {
                          onAdd(ing.id, 0);
                          onClose();
                        }}
                      >
                        <Plus className="size-3" /> Aggiungi
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={2} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nessun ingrediente trovato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
