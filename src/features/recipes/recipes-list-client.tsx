"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { duplicateRecipe } from "@/app/actions/recipes";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-controls";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatNumberIt, formatEuro } from "@/domain/calculations";
import type { RecipeFamily } from "@/types";
import { Copy, Search, ArrowUpDown } from "lucide-react";

export interface RecipeListRow {
  id: string;
  name: string;
  family: RecipeFamily;
  familyLabel: string;
  weight: number;
  pod: number;
  pac: number;
  costPerKg: number;
  equilibrium: number;
  ingredientCount: number;
  updatedAt: string;
}

type SortKey = "updatedAt" | "name" | "weight" | "pod" | "pac" | "costPerKg" | "equilibrium";

export function RecipesListClient({
  recipes,
  families,
  familyLabels,
}: {
  recipes: RecipeListRow[];
  families: readonly RecipeFamily[];
  familyLabels: Record<RecipeFamily, string>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let list = recipes;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    if (family) list = list.filter((r) => r.family === family);
    const sorted = [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
    return sorted;
  }, [recipes, query, family, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      const { id: newId } = await duplicateRecipe(id);
      router.refresh();
      router.push(`/recipes/${newId}/editor`);
    });
  }

  if (recipes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per nome…"
            className="pl-8"
          />
        </div>
        <Select value={family} onChange={(e) => setFamily(e.target.value)} className="w-auto min-w-[160px]">
          <option value="">Tutte le famiglie</option>
          {families.map((f) => (
            <option key={f} value={f}>
              {familyLabels[f]}
            </option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">
                  <SortButton label="Nome" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
                </th>
                <th className="px-3 py-2 text-left">Famiglia</th>
                <th className="px-3 py-2 text-right">
                  <SortButton label="Peso" active={sortKey === "weight"} dir={sortDir} onClick={() => toggleSort("weight")} />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortButton label="POD" active={sortKey === "pod"} dir={sortDir} onClick={() => toggleSort("pod")} />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortButton label="PAC" active={sortKey === "pac"} dir={sortDir} onClick={() => toggleSort("pac")} />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortButton label="Eq" active={sortKey === "equilibrium"} dir={sortDir} onClick={() => toggleSort("equilibrium")} />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortButton label="€/kg" active={sortKey === "costPerKg"} dir={sortDir} onClick={() => toggleSort("costPerKg")} />
                </th>
                <th className="px-3 py-2 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Link href={`/recipes/${r.id}/editor`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{r.ingredientCount} ingredienti</div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary">{r.familyLabel}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumberIt(r.weight, 0)}g</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumberIt(r.pod, 1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumberIt(r.pac, 1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumberIt(r.equilibrium, 0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatEuro(r.costPerKg)}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDuplicate(r.id)}
                        disabled={pending}
                        title="Duplica"
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nessun risultato per i filtri correnti.
          </div>
        )}
      </Card>
    </div>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground">
      {label}
      <ArrowUpDown className={`size-3 ${active ? "opacity-100" : "opacity-30"} ${active && dir === "asc" ? "rotate-180" : ""}`} />
    </button>
  );
}
