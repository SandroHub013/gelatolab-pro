import { notFound, redirect } from "next/navigation";
import { prisma } from "@/infrastructure/database/client";
import { toDomainPreset } from "@/infrastructure/repositories/mappers";
import { EditPresetForm } from "./edit-preset-form";

export const dynamic = "force-dynamic";

export default async function EditPresetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.calibrationPreset.findUnique({ where: { id } });
  if (!row) notFound();
  if (row.isSystemPreset) redirect(`/presets/${id}`);

  const preset = toDomainPreset(row);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Modifica preset</h1>
        <p className="text-sm text-muted-foreground">
          Aggiorna i target di calibrazione e le famiglie di ricette applicabili.
        </p>
      </div>
      <EditPresetForm preset={preset} />
    </div>
  );
}
