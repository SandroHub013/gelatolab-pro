import Link from "next/link";
import { prisma } from "@/infrastructure/database/client";
import { toDomainIngredients } from "@/infrastructure/repositories/mappers";
import { formatFixedIt } from "@/domain/calculations";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FlaskConical } from "lucide-react";
import { INGREDIENT_CATEGORY_LABELS } from "@/types";

export const dynamic = "force-dynamic";

export default async function IngredientsPage() {
  const rows = await prisma.ingredient.findMany({ orderBy: { name: "asc" } });
  const ingredients = toDomainIngredients(rows);

  const systemIngredients = ingredients.filter((i) => !i.isCustom);
  const customIngredients = ingredients.filter((i) => i.isCustom);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ingredienti</h1>
          <p className="text-sm text-muted-foreground">
            {ingredients.length} ingredienti · {systemIngredients.length} di sistema, {customIngredients.length} personalizzati
          </p>
        </div>
        <Link href="/ingredients/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-4" /> Nuovo ingrediente
        </Link>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-right">Acqua %</th>
                <th className="px-3 py-2 text-right">Solidi %</th>
                <th className="px-3 py-2 text-right">Zuccheri %</th>
                <th className="px-3 py-2 text-right">Grassi %</th>
                <th className="px-3 py-2 text-right">Proteine %</th>
                <th className="px-3 py-2 text-right">POD</th>
                <th className="px-3 py-2 text-right">PAC</th>
                <th className="px-3 py-2 text-right">€/kg</th>
                <th className="px-3 py-2 text-center">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => (
                <tr key={ing.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Link href={`/ingredients/${ing.id}`} className="font-medium hover:underline">
                      {ing.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {INGREDIENT_CATEGORY_LABELS[ing.category]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatFixedIt(ing.waterPercent, 0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatFixedIt(ing.totalSolidsPercent, 0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatFixedIt(ing.sugarsPercent, 1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatFixedIt(ing.fatPercent, 1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatFixedIt(ing.proteinPercent, 1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatFixedIt(ing.podCoefficient, 0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatFixedIt(ing.pacCoefficient, 0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {ing.costPerKg ? formatFixedIt(ing.costPerKg, 2) : "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[10px] ${ing.isCustom ? "text-amber-600" : "text-muted-foreground"}`}>
                      {ing.isCustom ? "utente" : "sistema"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ingredients.length === 0 && (
          <CardContent className="py-12 text-center">
            <FlaskConical className="mx-auto mb-2 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Nessun ingrediente. <Link href="/ingredients/new" className="font-medium text-primary underline">Creane uno</Link>.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
