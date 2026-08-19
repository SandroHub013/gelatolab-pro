import { describe, expect, it } from "vitest";
import {
  SOLVER_VARIANTS,
  VOICE_TOOLS,
  isReadOnly,
  needsConfirmation,
  toCommand,
} from "./commands";

/**
 * `toCommand` e' il confine di fiducia fra la rete e l'applicazione. `strict:
 * true` fa gia' validare lo schema lato API, ma questi test esistono perche'
 * quella garanzia sta su un servizio esterno: se un giorno cade, o se qualcuno
 * chiama la route direttamente, il dispatcher non deve ricevere un comando
 * malformato.
 */
describe("toCommand", () => {
  it("rifiuta uno strumento sconosciuto invece di propagarlo", () => {
    expect(toCommand("dropDatabase", {})).toEqual({
      kind: "unsupported",
      reason: "Comando sconosciuto: dropDatabase",
    });
  });

  it("accetta un comando valido", () => {
    expect(toCommand("addIngredient", { ingredientId: "ing-1", grams: 250 })).toEqual({
      kind: "addIngredient",
      ingredientId: "ing-1",
      grams: 250,
    });
  });

  it("rifiuta i grammi come stringa", () => {
    const command = toCommand("addIngredient", { ingredientId: "ing-1", grams: "250" });
    expect(command.kind).toBe("unsupported");
  });

  it("rifiuta i grammi negativi", () => {
    expect(toCommand("setQuantity", { rowId: "r1", grams: -5 }).kind).toBe("unsupported");
  });

  it("rifiuta un peso batch nullo", () => {
    expect(toCommand("setBatchWeight", { grams: 0 }).kind).toBe("unsupported");
  });

  it("rifiuta NaN e Infinity", () => {
    expect(toCommand("setBatchWeight", { grams: Number.NaN }).kind).toBe("unsupported");
    expect(toCommand("setBatchWeight", { grams: Number.POSITIVE_INFINITY }).kind).toBe(
      "unsupported",
    );
  });

  it("rifiuta una famiglia di ricetta fuori elenco", () => {
    expect(toCommand("createRecipe", { name: "Test", family: "tiramisu" }).kind).toBe(
      "unsupported",
    );
  });

  it("rifiuta una variante di solver inesistente", () => {
    expect(toCommand("applySolution", { variant: "aggressive" }).kind).toBe("unsupported");
  });

  it("accetta ogni variante realmente esposta dal solver", () => {
    for (const variant of SOLVER_VARIANTS) {
      expect(toCommand("applySolution", { variant })).toEqual({
        kind: "applySolution",
        variant,
      });
    }
  });

  it("tratta una destinazione di navigazione sconosciuta come non supportata", () => {
    expect(toCommand("navigate", { target: "impostazioni" }).kind).toBe("unsupported");
  });

  it("tollera i parametri opzionali assenti", () => {
    expect(toCommand("saveSnapshot", {})).toEqual({ kind: "saveSnapshot", label: undefined });
    expect(toCommand("scaleToBatch", undefined)).toEqual({ kind: "scaleToBatch" });
  });

  it("tratta la stringa vuota come parametro mancante", () => {
    expect(toCommand("setRecipeName", { name: "" }).kind).toBe("unsupported");
  });
});

describe("classificazione dei comandi", () => {
  it("chiede conferma solo per cio' che l'undo non annulla", () => {
    // Le modifiche all'editor passano da zundo: confermarle renderebbe la voce
    // piu' lenta del mouse.
    expect(needsConfirmation({ kind: "removeIngredient", rowId: "r1" })).toBe(false);
    expect(needsConfirmation({ kind: "setQuantity", rowId: "r1", grams: 10 })).toBe(false);
    // Queste scrivono sul server.
    expect(needsConfirmation({ kind: "saveSnapshot" })).toBe(true);
    expect(needsConfirmation({ kind: "applySolution", variant: SOLVER_VARIANTS[0] })).toBe(
      true,
    );
  });

  it("considera di sola lettura solo i comandi conversazionali", () => {
    expect(isReadOnly({ kind: "answer", text: "POD 18,4" })).toBe(true);
    expect(isReadOnly({ kind: "clarify", question: "Quale panna?" })).toBe(true);
    expect(isReadOnly({ kind: "scaleToBatch" })).toBe(false);
  });
});

describe("definizioni degli strumenti", () => {
  it("dichiara ogni schema come chiuso, requisito di strict", () => {
    for (const tool of VOICE_TOOLS) {
      expect(tool.input_schema.additionalProperties).toBe(false);
      expect(tool.input_schema.type).toBe("object");
    }
  });

  it("elenca fra i required solo campi che esistono nello schema", () => {
    for (const tool of VOICE_TOOLS) {
      for (const field of tool.input_schema.required) {
        expect(Object.keys(tool.input_schema.properties)).toContain(field);
      }
    }
  });

  it("non ha nomi duplicati", () => {
    const names = VOICE_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("copre ogni strumento con un ramo di toCommand", () => {
    // Se qualcuno aggiunge uno strumento e dimentica il ramo corrispondente,
    // toCommand cadrebbe nel default: qui si vede subito.
    for (const tool of VOICE_TOOLS) {
      const command = toCommand(tool.name, {});
      const recognised =
        command.kind === tool.name ||
        (command.kind === "unsupported" &&
          command.reason.startsWith(`Parametro mancante o non valido per ${tool.name}`));
      expect(recognised, `strumento senza ramo: ${tool.name}`).toBe(true);
    }
  });
});
