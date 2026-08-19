// @vitest-environment jsdom
//
// Ambiente DOM solo per questo file: la configurazione globale sta su `node`
// di proposito (vedi il commento in vitest.config.ts), e montare un hook e'
// l'unico caso del repository che richieda un documento.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

/**
 * I limiti di durata della sessione vocale.
 *
 * Azure fattura l'audio a tempo, quindi questi timer non sono ergonomia: sono
 * la difesa contro una voce di costo che scappa. Il test monta l'hook vero con
 * l'SDK simulato — una versione che replicasse la politica del timer nel test
 * passerebbe anche cancellando i timer dall'hook, cioe' non proteggerebbe
 * niente.
 */

const recognizerInstances: MockRecognizer[] = [];

class MockRecognizer {
  recognizing: ((s: unknown, e: { result: { text: string } }) => void) | null = null;
  recognized: ((s: unknown, e: { result: { text: string; reason: number } }) => void) | null =
    null;
  canceled: ((s: unknown, e: { reason: number; errorDetails: string }) => void) | null = null;
  closed = false;
  stopped = false;

  constructor() {
    recognizerInstances.push(this);
  }
  startContinuousRecognitionAsync(onOk: () => void) {
    onOk();
  }
  stopContinuousRecognitionAsync(onOk: () => void) {
    this.stopped = true;
    onOk();
  }
  close() {
    this.closed = true;
  }
  /** Simula un risultato parziale, cioe' rumore o parlato in corso. */
  emitPartial(text = "…") {
    this.recognizing?.(null, { result: { text } });
  }
}

vi.mock("microsoft-cognitiveservices-speech-sdk", () => ({
  SpeechConfig: { fromAuthorizationToken: () => ({ speechRecognitionLanguage: "" }) },
  AudioConfig: { fromDefaultMicrophoneInput: () => ({}) },
  SpeechRecognizer: MockRecognizer,
  ResultReason: { RecognizedSpeech: 3 },
  CancellationReason: { Error: 1 },
}));

const { useSpeechRecognition } = await import("./use-speech-recognition");

beforeEach(() => {
  recognizerInstances.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ token: "t", region: "westeurope" }),
    })),
  );
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function startListening(onFinal = vi.fn()) {
  const view = renderHook(() => useSpeechRecognition(onFinal));
  await act(async () => {
    view.result.current.start();
  });
  await waitFor(() => expect(recognizerInstances).toHaveLength(1));
  return view;
}

describe("limiti di durata della sessione vocale", () => {
  it("chiude dopo il silenzio", async () => {
    const view = await startListening();
    await act(async () => {
      vi.advanceTimersByTime(8_000);
    });
    expect(recognizerInstances[0].stopped).toBe(true);
    expect(view.result.current.listening).toBe(false);
  });

  it("non taglia chi comincia a parlare tardi", async () => {
    const view = await startListening();
    await act(async () => {
      vi.advanceTimersByTime(7_000);
      recognizerInstances[0].emitPartial("aggiungi");
      vi.advanceTimersByTime(7_000);
    });
    expect(recognizerInstances[0].stopped).toBe(false);
    expect(view.result.current.listening).toBe(true);
  });

  it("chiude comunque al tetto di sessione, anche con rumore continuo", async () => {
    // È il caso che il solo timer di silenzio non copre: in laboratorio il
    // rumore produce risultati parziali che lo riarmerebbero all'infinito.
    const view = await startListening();
    await act(async () => {
      for (let i = 0; i < 30; i += 1) {
        vi.advanceTimersByTime(5_000);
        recognizerInstances[0].emitPartial();
      }
    });
    expect(recognizerInstances[0].stopped).toBe(true);
    expect(view.result.current.listening).toBe(false);
  });

  it("un evento di coda dopo la chiusura non riapre un timer", async () => {
    const onFinal = vi.fn();
    const view = await startListening(onFinal);
    await act(async () => {
      recognizerInstances[0].recognized?.(null, {
        result: { text: "aggiungi panna", reason: 3 },
      });
    });
    expect(onFinal).toHaveBeenCalledWith("aggiungi panna");

    await act(async () => {
      recognizerInstances[0].emitPartial(); // arriva mentre la sessione si chiude
      vi.advanceTimersByTime(9_000);
    });
    // Senza la guardia, il timer riarmato spegnerebbe l'interfaccia con un
    // errore mentre il comando e' gia' in esecuzione.
    expect(view.result.current.error).toBeNull();
  });

  it("due start ravvicinati non aprono due sessioni", async () => {
    const view = renderHook(() => useSpeechRecognition(vi.fn()));
    await act(async () => {
      view.result.current.start();
      view.result.current.start();
    });
    await waitFor(() => expect(recognizerInstances.length).toBeGreaterThan(0));
    expect(recognizerInstances).toHaveLength(1);
  });

  it("stop durante l'avvio non lascia il microfono aperto", async () => {
    const view = renderHook(() => useSpeechRecognition(vi.fn()));
    await act(async () => {
      view.result.current.start();
      view.result.current.stop();
    });
    await waitFor(() => expect(recognizerInstances).toHaveLength(1));
    expect(recognizerInstances[0].closed).toBe(true);
    expect(view.result.current.listening).toBe(false);
  });
});
