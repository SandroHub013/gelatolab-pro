import type {
  CalibrationPreset,
  Range,
  RecipeMetrics,
  TargetEvaluation,
  TargetKey,
  TargetStatus,
} from "@/types";
import { TARGET_LABELS } from "@/types";
import { NEAR_LIMIT_TOLERANCE } from "@/lib/constants";

/** Converte grammi in percentuale sul peso totale. */
function asPercent(grams: number, total: number): number {
  return total > 0 ? (grams / total) * 100 : 0;
}

/**
 * Valore "targettabile" di una metrica, nelle unità usate dai preset:
 * - composizione (solidi, zuccheri, grassi, ...) → percentuale sul peso totale
 * - POD/PAC → indice headline (saccarosio=100)
 * - podPerKg/pacPerKg → valore per kg
 * - temperatura/equilibrio → valore diretto
 *
 * Le unità sono coerenti tra dashboard, solver e seed dei preset, e
 * indipendenti dal peso del lotto (preset riusabili).
 */
export function getTargetableValue(
  metrics: RecipeMetrics,
  key: TargetKey,
): number {
  const total = metrics.totalWeightGrams;
  switch (key) {
    case "totalSolids":
      return asPercent(metrics.totalSolids, total);
    case "sugars":
      return asPercent(metrics.sugars.total, total);
    case "fat":
      return asPercent(metrics.fat.total, total);
    case "msnf":
      return asPercent(metrics.msnf, total);
    case "protein":
      return asPercent(metrics.protein, total);
    case "fiber":
      return asPercent(metrics.fiber, total);
    case "stabilizers":
      return asPercent(metrics.stabilizers, total);
    case "emulsifiers":
      return asPercent(metrics.emulsifiers, total);
    case "pod":
      return metrics.pod;
    case "pac":
      return metrics.pac;
    case "podPerKg":
      return metrics.podPerKg;
    case "pacPerKg":
      return metrics.pacPerKg;
    case "servingTemperature":
      return metrics.estimatedServingTemperature;
    case "equilibriumIndex":
      return metrics.equilibriumIndex;
  }
}

/** Estrae il valore "grezzo" (grammi) di un target dalle metriche. */
export function getMetricValue(metrics: RecipeMetrics, key: TargetKey): number {
  switch (key) {
    case "totalSolids":
      return metrics.totalSolids;
    case "sugars":
      return metrics.sugars.total;
    case "fat":
      return metrics.fat.total;
    case "msnf":
      return metrics.msnf;
    case "protein":
      return metrics.protein;
    case "fiber":
      return metrics.fiber;
    case "stabilizers":
      return metrics.stabilizers;
    case "emulsifiers":
      return metrics.emulsifiers;
    case "pod":
      return metrics.pod;
    case "pac":
      return metrics.pac;
    case "podPerKg":
      return metrics.podPerKg;
    case "pacPerKg":
      return metrics.pacPerKg;
    case "servingTemperature":
      return metrics.estimatedServingTemperature;
    case "equilibriumIndex":
      return metrics.equilibriumIndex;
  }
}

/** Unità di misura per la UI di un target. */
export function getTargetUnit(key: TargetKey): string {
  switch (key) {
    case "servingTemperature":
      return "°C";
    case "pod":
    case "pac":
    case "equilibriumIndex":
      return "";
    case "podPerKg":
    case "pacPerKg":
      return "/kg";
    case "totalSolids":
    case "sugars":
    case "fat":
    case "msnf":
    case "protein":
    case "fiber":
    case "stabilizers":
    case "emulsifiers":
      return "%";
    default:
      return "g";
  }
}

/** Classifica lo stato di un valore rispetto a un range. */
export function classifyStatus(value: number, range: Range): TargetStatus {
  const span = range.max - range.min;
  // near-limit: entro il 10% della span dal bordo (o tolleranza fissata).
  const margin = Math.max(span * 0.1, NEAR_LIMIT_TOLERANCE);
  if (value < range.min || value > range.max) return "out-of-range";
  if (value < range.min + margin || value > range.max - margin)
    return "near-limit";
  return "in-range";
}

/**
 * Valuta tutte le metriche di una ricetta contro i target del preset,
 * usando i valori targettabili (percent/index) coerenti con i seed.
 */
export function evaluateTargets(
  metrics: RecipeMetrics,
  preset: CalibrationPreset,
): TargetEvaluation[] {
  const evaluations: TargetEvaluation[] = [];
  for (const [key, range] of Object.entries(preset.targetRanges) as Array<
    [TargetKey, Range]
  >) {
    const value = getTargetableValue(metrics, key);
    const status = classifyStatus(value, range);
    const ideal = range.ideal ?? range.min;
    evaluations.push({
      key,
      label: TARGET_LABELS[key],
      value,
      range,
      status,
      deltaFromIdeal: Math.round((value - ideal) * 1000) / 1000,
      unit: getTargetUnit(key),
    });
  }
  return evaluations;
}

/** Numero di target fuori range (utile per i badge di riepilogo). */
export function countOutOfRange(evaluations: TargetEvaluation[]): number {
  return evaluations.filter((e) => e.status === "out-of-range").length;
}
