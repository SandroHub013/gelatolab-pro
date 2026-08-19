"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic, MicOff, Loader2, X, Check, AlertTriangle } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { calculateRecipe, formatNumberIt, formatEuro } from "@/domain/calculations";
import { listIngredients } from "@/app/actions/ingredients";
import { listPresets } from "@/app/actions/presets";
import { listRecipeSummaries } from "@/app/actions/recipes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalibrationPreset, Ingredient } from "@/types";
import { needsConfirmation, type VoiceCommand } from "./commands";
import { executeCommand, type ExecuteDeps } from "./execute-command";
import type { VoiceContext } from "./context";
import { useSpeechRecognition } from "./use-speech-recognition";

interface Catalog {
  ingredients: Ingredient[];
  presets: CalibrationPreset[];
  recipes: Array<{ id: string; name: string }>;
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "it-IT";
  window.speechSynthesis.speak(utterance);
}

export function VoiceConsole() {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  // `busy` e' l'unico stato di fase che serve davvero: "in ascolto" lo sa gia'
  // il riconoscimento vocale e "in conferma" lo dice `pending`. Derivare invece
  // di duplicare evita che le tre fonti si contraddicano.
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState<VoiceCommand | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  const recipe = useEditorStore((s) => s.recipe);
  const storeIngredients = useEditorStore((s) => s.ingredients);

  // Il catalogo si carica una volta sola, alla prima apertura: e' inutile
  // pagarlo su ogni pagina per un pannello che potrebbe non essere mai aperto.
  const loadingRef = useRef(false);
  useEffect(() => {
    if (!open || catalog || loadingRef.current) return;
    loadingRef.current = true;
    Promise.all([listIngredients(), listPresets(), listRecipeSummaries()])
      .then(([ingredients, presets, recipes]) =>
        setCatalog({ ingredients, presets, recipes }),
      )
      .catch(() => setMessage("Non riesco a caricare il catalogo."))
      .finally(() => {
        loadingRef.current = false;
      });
  }, [open, catalog]);

  const buildContext = useCallback((): VoiceContext => {
    const base: VoiceContext = {
      page: pathname,
      ingredients:
        catalog?.ingredients.map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category,
        })) ?? [],
      presets: catalog?.presets.map((p) => ({ id: p.id, name: p.name })) ?? [],
      recipes: catalog?.recipes.map((r) => ({ id: r.id, name: r.name })) ?? [],
    };
    if (!recipe) return base;

    // Le metriche arrivano dal motore puro, non dal modello: nel contesto
    // entrano gia' formattate proprio perche' vadano solo lette.
    const metrics = calculateRecipe(recipe, storeIngredients);
    const total = metrics.totalWeightGrams || 1;
    const nameOf = (ingredientId: string) =>
      storeIngredients.find((i) => i.id === ingredientId)?.name ??
      catalog?.ingredients.find((i) => i.id === ingredientId)?.name ??
      "sconosciuto";

    return {
      ...base,
      openRecipe: {
        id: recipe.id,
        name: recipe.name,
        family: recipe.family,
        batchWeightGrams: recipe.targetBatchWeight,
        rows: recipe.ingredients.map((ri) => ({
          rowId: ri.id,
          ingredientName: nameOf(ri.ingredientId),
          grams: ri.quantityGrams,
          locked: Boolean(ri.isLocked),
        })),
        metrics: {
          pesoTotale: `${formatNumberIt(metrics.totalWeightGrams, 0)} g`,
          solidi: `${formatNumberIt((metrics.totalSolids / total) * 100, 1)} %`,
          zuccheri: `${formatNumberIt((metrics.sugars.total / total) * 100, 1)} %`,
          grassi: `${formatNumberIt((metrics.fat.total / total) * 100, 1)} %`,
          pod: formatNumberIt(metrics.pod, 1),
          pac: formatNumberIt(metrics.pac, 1),
          equilibrio: formatNumberIt(metrics.equilibriumIndex, 0),
          costoPerKg: formatEuro(metrics.costPerKg),
        },
        warnings: metrics.warnings,
      },
    };
  }, [pathname, catalog, recipe, storeIngredients]);

  const run = useCallback(
    async (command: VoiceCommand) => {
      const deps: ExecuteDeps = {
        push: (href) => router.push(href),
        refresh: () => router.refresh(),
        recipeId: recipe?.id,
        activePresetId: recipe?.activePresetId,
        ingredients: catalog?.ingredients ?? [],
        recipes: catalog?.recipes ?? [],
      };
      try {
        const result = await executeCommand(command, deps);
        setMessage(result.message);
        setFailed(!result.ok);
        speak(result.message);
      } catch (error) {
        const text =
          error instanceof Error ? error.message : "Il comando non è andato a buon fine.";
        setMessage(text);
        setFailed(true);
      } finally {
        setPending(null);
        setBusy(false);
      }
    },
    [router, recipe, catalog],
  );

  const interpret = useCallback(
    async (text: string) => {
      setTranscript(text);
      setMessage(null);
      setFailed(false);
      setBusy(true);
      try {
        const response = await fetch("/api/voice/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: text, context: buildContext() }),
        });
        const payload = await response.json();
        if (!response.ok) {
          setMessage(payload?.error ?? "Interpretazione non riuscita.");
          setFailed(true);
          setBusy(false);
          return;
        }
        const command = payload.command as VoiceCommand;
        if (needsConfirmation(command)) {
          setPending(command);
          setBusy(false);
          return;
        }
        await run(command);
      } catch {
        setMessage("Non riesco a raggiungere il servizio vocale.");
        setFailed(true);
        setBusy(false);
      }
    },
    [buildContext, run],
  );

  const speech = useSpeechRecognition(interpret);

  const toggleListening = () => {
    if (speech.listening) speech.stop();
    else {
      setTranscript("");
      setMessage(null);
      setFailed(false);
      setPending(null);
      speech.start();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Apri assistente vocale"
        className="no-print fixed bottom-4 right-4 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Mic className="size-5" />
      </button>
    );
  }

  return (
    <section
      aria-label="Assistente vocale"
      className="no-print fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-3 shadow-xl"
    >
      <header className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold">Assistente vocale</span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          onClick={() => setOpen(false)}
          aria-label="Chiudi assistente vocale"
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex items-center gap-2">
        <Button
          onClick={toggleListening}
          disabled={busy}
          variant={speech.listening ? "destructive" : "default"}
          size="sm"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : speech.listening ? (
            <MicOff className="size-4" />
          ) : (
            <Mic className="size-4" />
          )}
          {speech.listening ? "Ferma" : "Parla"}
        </Button>
        <output className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {speech.listening
            ? speech.interim || "In ascolto…"
            : busy
              ? "Interpreto…"
              : transcript || "Premi Parla e detta un comando."}
        </output>
      </div>

      {speech.error && (
        <p className="mt-2 text-xs text-destructive">{speech.error}</p>
      )}

      {pending && (
        <div className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50 p-2.5 dark:border-amber-900/60 dark:bg-amber-950/40">
          <p className="flex items-start gap-1.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              <strong>{describe(pending)}</strong>
              <br />
              Scrive sul server e l&apos;undo non la annulla.
            </span>
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="xs" onClick={() => run(pending)}>
              <Check className="size-3" /> Conferma
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setPending(null);
              }}
            >
              Annulla
            </Button>
          </div>
        </div>
      )}

      {message && (
        <output
          className={cn(
            "mt-3 block rounded-lg px-2.5 py-2 text-xs",
            failed
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-foreground",
          )}
        >
          {message}
        </output>
      )}
    </section>
  );
}

/** Frase leggibile per il pannello di conferma. */
function describe(command: VoiceCommand): string {
  switch (command.kind) {
    case "saveSnapshot":
      return "Salvare una nuova versione della ricetta";
    case "createRecipe":
      return `Creare la ricetta "${command.name}"`;
    case "duplicateRecipe":
      return "Duplicare la ricetta aperta";
    case "runCalibration":
      return "Eseguire la calibrazione";
    case "applySolution":
      return `Applicare la soluzione "${command.variant}" e salvare una versione`;
    default:
      return "Eseguire il comando";
  }
}
