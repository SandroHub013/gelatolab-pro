"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/database/client";
import { toDomainPreset } from "@/infrastructure/repositories/mappers";
import { presetSchema } from "@/domain/validation";
import type { CalibrationPreset, CalibrationPresetInput } from "@/types";
import type { Prisma } from "@prisma/client";

export async function listPresets(): Promise<CalibrationPreset[]> {
  const rows = await prisma.calibrationPreset.findMany({
    orderBy: [{ isSystemPreset: "desc" }, { name: "asc" }],
  });
  return rows.map(toDomainPreset);
}

export async function createPreset(input: CalibrationPresetInput): Promise<{ id: string }> {
  const now = new Date();
  // Valida e usa il RISULTATO PARSATO (Zod rimuove chiavi sconosciute).
  const parsed = presetSchema.parse({
    ...input,
    id: "tmp",
    isSystemPreset: false,
    createdAt: now,
    updatedAt: now,
  });
  const created = await prisma.calibrationPreset.create({
    data: {
      name: parsed.name,
      description: parsed.description,
      recipeFamilies: parsed.recipeFamilies,
      targetRanges: parsed.targetRanges as unknown as Prisma.InputJsonValue,
      objectiveWeights: parsed.objectiveWeights as unknown as Prisma.InputJsonValue,
      rules: parsed.rules as unknown as Prisma.InputJsonValue,
      preferredServingTemperature: parsed.preferredServingTemperature as unknown as Prisma.InputJsonValue | undefined,
      isSystemPreset: false,
    },
  });
  revalidatePath("/presets");
  return { id: created.id };
}

export async function updatePreset(
  id: string,
  input: Partial<CalibrationPresetInput>,
): Promise<void> {
  const row = await prisma.calibrationPreset.findUnique({ where: { id } });
  if (!row) throw new Error("Preset non trovato");
  if (row.isSystemPreset) {
    throw new Error("I preset di sistema non sono modificabili.");
  }
  // Valida e usa il RISULTATO PARSATO (Zod .object().partial() rimuove chiavi
  // sconosciute da targetRanges, altrimenti un tasto fuori da TARGET_KEYS
  // verrebbe persistito e causerebbe crash in getTargetableValue/formatVal).
  const parsed = presetSchema.parse({
    ...toDomainPreset(row),
    ...Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined),
    ),
    id,
    isSystemPreset: false,
  });
  const { targetRanges, objectiveWeights, rules, preferredServingTemperature } = parsed;
  await prisma.calibrationPreset.update({
    where: { id },
    data: {
      ...(targetRanges !== undefined ? { targetRanges: targetRanges as unknown as Prisma.InputJsonValue } : {}),
      ...(objectiveWeights !== undefined ? { objectiveWeights: objectiveWeights as unknown as Prisma.InputJsonValue } : {}),
      ...(rules !== undefined ? { rules: rules as unknown as Prisma.InputJsonValue } : {}),
      ...(preferredServingTemperature !== undefined ? { preferredServingTemperature: preferredServingTemperature as unknown as Prisma.InputJsonValue } : {}),
      ...(parsed.name !== undefined ? { name: parsed.name } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      ...(parsed.recipeFamilies !== undefined ? { recipeFamilies: parsed.recipeFamilies } : {}),
    },
  });
  revalidatePath("/presets");
  revalidatePath(`/presets/${id}`);
}
