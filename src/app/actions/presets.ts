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
  presetSchema.parse({
    ...input,
    id: "tmp",
    isSystemPreset: false,
    createdAt: now,
    updatedAt: now,
  });
  const created = await prisma.calibrationPreset.create({
    data: {
      name: input.name,
      description: input.description,
      recipeFamilies: input.recipeFamilies,
      targetRanges: input.targetRanges as unknown as Prisma.InputJsonValue,
      objectiveWeights: input.objectiveWeights as unknown as Prisma.InputJsonValue,
      rules: input.rules as unknown as Prisma.InputJsonValue,
      preferredServingTemperature: input.preferredServingTemperature as unknown as Prisma.InputJsonValue | undefined,
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
  await prisma.calibrationPreset.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.recipeFamilies !== undefined ? { recipeFamilies: input.recipeFamilies } : {}),
      ...(input.targetRanges !== undefined ? { targetRanges: input.targetRanges as unknown as Prisma.InputJsonValue } : {}),
      ...(input.objectiveWeights !== undefined ? { objectiveWeights: input.objectiveWeights as unknown as Prisma.InputJsonValue } : {}),
      ...(input.rules !== undefined ? { rules: input.rules as unknown as Prisma.InputJsonValue } : {}),
      ...(input.preferredServingTemperature !== undefined ? { preferredServingTemperature: input.preferredServingTemperature as unknown as Prisma.InputJsonValue } : {}),
    },
  });
  revalidatePath("/presets");
}

export async function deletePreset(id: string): Promise<void> {
  const row = await prisma.calibrationPreset.findUnique({ where: { id } });
  if (!row) return;
  if (row.isSystemPreset) {
    throw new Error("I preset di sistema non sono eliminabili.");
  }
  await prisma.calibrationPreset.delete({ where: { id } });
  revalidatePath("/presets");
}
