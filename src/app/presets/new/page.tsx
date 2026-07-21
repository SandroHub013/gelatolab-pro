"use client";
import { useRouter } from "next/navigation";
import { createPreset } from "@/app/actions/presets";
import { PresetForm } from "@/features/presets/preset-form";

export default function NewPresetPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Nuovo preset</h1>
        <p className="text-sm text-muted-foreground">
          Definisci i target di calibrazione e le famiglie di ricette applicabili.
        </p>
      </div>

      <PresetForm
        submitLabel="Crea preset"
        onSubmit={async (values) => {
          const { id } = await createPreset({
            ...values,
            objectiveWeights: {},
            rules: [],
          });
          router.push(`/presets/${id}`);
        }}
      />
    </div>
  );
}
