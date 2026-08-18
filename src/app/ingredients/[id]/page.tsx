import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/infrastructure/database/client";
import { toDomainIngredient } from "@/infrastructure/repositories/mappers";
import { INGREDIENT_CATEGORY_LABELS } from "@/types";
import { formatEuro } from "@/domain/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function IngredientDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const row = await prisma.ingredient.findUnique({ where: { id } });
  if (!row) notFound();

  const ing = toDomainIngredient(row);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4">
        <Link
          href="/ingredients"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Ingredienti
        </Link>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {ing.name}
            {ing.isCustom && <Badge variant="secondary">Personalizzato</Badge>}
          </CardTitle>
          <CardDescription>
            {INGREDIENT_CATEGORY_LABELS[ing.category]}
            {ing.brand && <> · {ing.brand}</>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ing.description && (
            <p className="text-sm text-muted-foreground">{ing.description}</p>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <MetricCard label="Acqua" value={`${ing.waterPercent} %`} />
            <MetricCard label="Solidi totali" value={`${ing.totalSolidsPercent} %`} />
            <MetricCard label="Zuccheri" value={`${ing.sugarsPercent} %`} />
            <MetricCard label="Grassi" value={`${ing.fatPercent} %`} />
            <MetricCard label="Proteine" value={`${ing.proteinPercent} %`} />
            <MetricCard label="Fibre" value={`${ing.fiberPercent} %`} />
            <MetricCard label="POD" value={String(ing.podCoefficient)} />
            <MetricCard label="PAC" value={String(ing.pacCoefficient)} />
            <MetricCard label="Costo/kg" value={ing.costPerKg ? formatEuro(ing.costPerKg) : "—"} />
            <MetricCard label="Alcol" value={`${ing.alcoholPercent} %`} />
            <MetricCard label="Densità" value={ing.density ? `${ing.density} g/ml` : "—"} />
            {ing.msnfPercent !== undefined && (
              <MetricCard label="MSNF" value={`${ing.msnfPercent} %`} />
            )}
          </div>

          <Separator />

          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Dettaglio zuccheri</h3>
            <div className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-4">
              {[
                { label: "Saccarosio", value: ing.sucrosePercent },
                { label: "Destrosio", value: ing.dextrosePercent },
                { label: "Fruttosio", value: ing.fructosePercent },
                { label: "Glucosio", value: ing.glucosePercent },
                { label: "Lattosio", value: ing.lactosePercent },
                { label: "Maltosio", value: ing.maltosePercent },
                { label: "Maltodestrina", value: ing.maltodextrinPercent },
                { label: "Polioli", value: ing.polyolsPercent },
              ]
                .filter((s) => s.value !== undefined)
                .map((s) => (
                  <div key={s.label} className="flex justify-between border-b border-border/40 py-0.5">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="tabular-nums">{s.value}%</span>
                  </div>
                ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Dettaglio grassi</h3>
            <div className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
              {ing.milkFatPercent !== undefined && (
                <div className="flex justify-between border-b border-border/40 py-0.5">
                  <span className="text-muted-foreground">Di latte</span>
                  <span className="tabular-nums">{ing.milkFatPercent}%</span>
                </div>
              )}
              {ing.vegetableFatPercent !== undefined && (
                <div className="flex justify-between border-b border-border/40 py-0.5">
                  <span className="text-muted-foreground">Vegetali</span>
                  <span className="tabular-nums">{ing.vegetableFatPercent}%</span>
                </div>
              )}
              {ing.stabilizerPercent !== undefined && (
                <div className="flex justify-between border-b border-border/40 py-0.5">
                  <span className="text-muted-foreground">Stabilizzanti</span>
                  <span className="tabular-nums">{ing.stabilizerPercent}%</span>
                </div>
              )}
              {ing.emulsifierPercent !== undefined && (
                <div className="flex justify-between border-b border-border/40 py-0.5">
                  <span className="text-muted-foreground">Emulsionanti</span>
                  <span className="tabular-nums">{ing.emulsifierPercent}%</span>
                </div>
              )}
            </div>
          </div>

          {ing.allergens.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Allergeni</h3>
                <div className="flex flex-wrap gap-1">
                  {ing.allergens.map((a) => (
                    <Badge key={a} variant="outline">{a}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {ing.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Tag</h3>
                <div className="flex flex-wrap gap-1">
                  {ing.tags.map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
