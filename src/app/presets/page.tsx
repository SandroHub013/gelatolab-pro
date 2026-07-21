import Link from "next/link";
import { prisma } from "@/infrastructure/database/client";
import { toDomainPresets } from "@/infrastructure/repositories/mappers";
import { RECIPE_FAMILY_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, Plus, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PresetsPage() {
  const rows = await prisma.calibrationPreset.findMany({
    orderBy: [{ isSystemPreset: "desc" }, { name: "asc" }],
  });
  const presets = toDomainPresets(rows);

  const systemPresets = presets.filter((p) => p.isSystemPreset);
  const customPresets = presets.filter((p) => !p.isSystemPreset);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Preset di calibrazione</h1>
          <p className="text-sm text-muted-foreground">
            {presets.length} preset · {systemPresets.length} di sistema, {customPresets.length} personalizzati
          </p>
        </div>
        <Link href="/presets/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-4" /> Nuovo preset
        </Link>
      </div>

      {systemPresets.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            <Sparkles className="mr-1 inline size-3.5" /> Preset di sistema
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {systemPresets.map((p) => (
              <Link key={p.id} href={`/presets/${p.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      {p.name}
                      <Badge variant="secondary" className="text-[10px]">sistema</Badge>
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs">
                      {p.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {p.recipeFamilies.map((f) => (
                        <Badge key={f} variant="outline" className="text-[10px]">
                          {RECIPE_FAMILY_LABELS[f]}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      {Object.entries(p.targetRanges).slice(0, 6).map(([key, range]) => (
                        <div key={key} className="flex justify-between">
                          <span>{key}</span>
                          <span className="tabular-nums">
                            {range.min}–{range.max}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {customPresets.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Personalizzati</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customPresets.map((p) => (
              <Link key={p.id} href={`/presets/${p.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{p.name}</CardTitle>
                    <CardDescription className="line-clamp-2 text-xs">
                      {p.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {p.recipeFamilies.map((f) => (
                        <Badge key={f} variant="outline" className="text-[10px]">
                          {RECIPE_FAMILY_LABELS[f]}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {presets.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <SlidersHorizontal className="mx-auto mb-2 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Nessun preset. <Link href="/presets/new" className="font-medium text-primary underline">Creane uno</Link>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
