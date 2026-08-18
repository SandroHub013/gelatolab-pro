"use client";
import { cn } from "@/lib/utils";
import { formatFixedIt } from "@/domain/calculations";
import { Badge } from "@/components/ui/badge";
import type { TargetEvaluation } from "@/types";
import { Check, AlertTriangle, X } from "lucide-react";

export function RangeBar({ evaluation }: Readonly<{ evaluation: TargetEvaluation }>) {
  const { value, range, status, deltaFromIdeal } = evaluation;
  const span = range.max - range.min;
  // Posizione percentuale del valore sul range esteso (con margine).
  const extended = span * 0.25;
  const lo = range.min - extended;
  const hi = range.max + extended;
  const clampPos = (v: number) => {
    const p = ((v - lo) / (hi - lo)) * 100;
    return Math.max(0, Math.min(100, p));
  };
  const minPos = clampPos(range.min);
  const maxPos = clampPos(range.max);
  const idealValue = range.ideal ?? (range.min + range.max) / 2;
  const idealPos = clampPos(idealValue);
  const valuePos = clampPos(value);

  const statusConfig = {
    "in-range": { icon: Check, variant: "success" as const, label: "Nel range", color: "text-emerald-600", dot: "bg-emerald-600" },
    "near-limit": { icon: AlertTriangle, variant: "warning" as const, label: "Vicino limite", color: "text-amber-600", dot: "bg-amber-500" },
    "out-of-range": { icon: X, variant: "destructive" as const, label: "Fuori range", color: "text-destructive", dot: "bg-destructive" },
  }[status];
  const Icon = statusConfig.icon;
  const valueText = `${formatVal(value, evaluation.unit)} — ${statusConfig.label}`;

  let deltaTone = "";
  if (deltaFromIdeal > 0) deltaTone = "text-amber-600";
  else if (deltaFromIdeal < 0) deltaTone = "text-sky-600";

  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{evaluation.label}</span>
          <Icon className={cn("size-3.5", statusConfig.color)} />
        </div>
        <div className="flex items-center gap-2 text-xs tabular-nums">
          <span className="font-semibold">{formatVal(value, evaluation.unit)}</span>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
      </div>
      {/* La barra è una composizione di div posizionati e non può essere un
          <meter>; l'elemento nativo viene reso fuori schermo per gli screen
          reader e il disegno resta nascosto alla tecnologia assistiva. */}
      <meter
        className="sr-only"
        min={lo}
        max={hi}
        value={value}
        aria-label={`${evaluation.label}: ${valueText}`}
      >
        {valueText}
      </meter>
      <div className="relative h-5" aria-hidden="true">
        {/* Track */}
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-muted" />
        {/* Range valido */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-emerald-200 dark:bg-emerald-900"
          style={{ left: `${minPos}%`, width: `${maxPos - minPos}%` }}
        />
        {/* Ideal */}
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-emerald-600"
          style={{ left: `${idealPos}%` }}
          title={`Ideale: ${formatVal(idealValue, evaluation.unit)}`}
        />
        {/* Current value */}
        <div
          className={cn(
            "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow",
            statusConfig.dot,
          )}
          style={{ left: `${valuePos}%` }}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span title="Minimo del preset">min {formatVal(range.min, evaluation.unit)}</span>
        <span
          className={deltaTone}
          title={`Scostamento dall'ideale (${formatVal(idealValue, evaluation.unit)})`}
        >
          Δ {deltaFromIdeal > 0 ? "+" : ""}{formatVal(deltaFromIdeal, evaluation.unit)}
        </span>
        <span title="Massimo del preset">max {formatVal(range.max, evaluation.unit)}</span>
      </div>
    </div>
  );
}

function formatVal(v: number, unit: string): string {
  const decimals = unit === "°C" || Math.abs(v) >= 100 ? 0 : 1;
  return `${formatFixedIt(v, decimals)}${unit ? " " + unit : ""}`;
}
