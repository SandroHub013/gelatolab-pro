"use client";
import { useRouter } from "next/navigation";
import { updatePreset } from "@/app/actions/presets";
import type { CalibrationPreset } from "@/types";
import { PresetForm, targetRowsFrom } from "@/features/presets/preset-form";

export function EditPresetForm({ preset }: Readonly<{ preset: CalibrationPreset }>) {
  const router = useRouter();

  return (
    <PresetForm
      initialName={preset.name}
      initialDescription={preset.description}
      initialFamilies={preset.recipeFamilies}
      initialTargets={targetRowsFrom(preset.targetRanges)}
      submitLabel="Salva modifiche"
      onSubmit={async (values) => {
        await updatePreset(preset.id, values);
        router.push(`/presets/${preset.id}`);
      }}
    />
  );
}
