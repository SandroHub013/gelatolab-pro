import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/infrastructure/database/client";
import { toDomainPreset } from "@/infrastructure/repositories/mappers";
import { RECIPE_FAMILY_LABELS, TARGET_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PresetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.calibrationPreset.findUnique({ where: { id } });
  if (!row) notFound();

  const preset = toDomainPreset(row);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/presets"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Preset
        </Link>
        {!preset.isSystemPreset && (
          <Link
            href={`/presets/${preset.id}/edit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Edit className="size-4" /> Modifica
          </Link>
        )}
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {preset.name}
            {preset.isSystemPreset && <Badge variant="secondary">Sistema</Badge>}
          </CardTitle>
          <CardDescription>{preset.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {preset.recipeFamilies.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Famiglie di ricette</h3>
              <div className="flex flex-wrap gap-1">
                {preset.recipeFamilies.map((f) => (
                  <Badge key={f} variant="outline">{RECIPE_FAMILY_LABELS[f]}</Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Target range</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(preset.targetRanges).map(([key, range]) => (
                <Card key={key}>
                  <CardContent className="p-3">
                    <div className="text-xs font-medium text-muted-foreground">
                      {TARGET_LABELS[key as keyof typeof TARGET_LABELS] ?? key}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="tabular-nums">{range.min}</span>
                      {range.ideal !== undefined && (
                        <Badge variant="secondary" className="text-[10px]">
                          ideale {range.ideal}
                        </Badge>
                      )}
                      <span className="tabular-nums">{range.max}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary/60"
                        style={{
                          marginLeft: `${range.min}%`,
                          width: `${range.max - range.min}%`,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Pesi obiettivo</h3>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {Object.entries(preset.objectiveWeights).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1">
                  <span className="text-muted-foreground">{labelWeightKey(key)}</span>
                  <span className="tabular-nums font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {preset.preferredServingTemperature && (
            <>
              <Separator />
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Temp. servizio preferita</h3>
                <p className="text-sm">
                  {preset.preferredServingTemperature.min}°C
                  {preset.preferredServingTemperature.ideal !== undefined && (
                    <> · ideale {preset.preferredServingTemperature.ideal}°C</>
                  )}
                  {" "}– {preset.preferredServingTemperature.max}°C
                </p>
              </div>
            </>
          )}

          {preset.rules.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Regole ({preset.rules.length})</h3>
                {preset.rules.map((rule, i) => (
                  <div key={i} className="text-sm text-muted-foreground">
                    {rule.type === "ratio"
                      ? `Rapporto tra ${rule.ingredientIds.join(", ")}`
                      : `Somma range: ${rule.range?.min ?? "?"} – ${rule.range?.max ?? "?"}`}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function labelWeightKey(key: string): string {
  const labels: Record<string, string> = {
    sweetness: "Dolcezza",
    softness: "Morbidezza",
    body: "Corpo",
    creaminess: "Cremosità",
    stability: "Stabilità",
    originalRecipeSimilarity: "Somiglianza originale",
  };
  return labels[key] ?? key;
}
