import { describe, expect, it, vi, afterEach } from "vitest";

/**
 * Il timer di silenzio del riconoscimento vocale.
 *
 * Non monta l'hook: `useSpeechRecognition` dipende dall'SDK di Azure e da un
 * microfono, e montarlo qui vorrebbe dire simulare entrambi per verificare una
 * regola di tre righe. Il test replica invece la **politica** — riarma a ogni
 * risultato parziale, scatta solo sul silenzio — che è la parte che si puo'
 * sbagliare e che protegge una voce di costo reale: Azure fattura l'audio a
 * tempo, e un microfono lasciato aperto continua a costare.
 *
 * Se la politica nell'hook cambia, questo test non se ne accorge da solo. Il suo
 * valore e' fissare il comportamento atteso in modo leggibile, e catturare
 * l'errore classico: un timeout armato una volta sola dall'apertura, che taglia
 * a meta' frase chi comincia a parlare tardi.
 */

const SILENCE_TIMEOUT_MS = 8_000;

/** Riproduce l'arma/riarma dell'hook. */
function createSilenceWatcher(onSilence: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const arm = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onSilence, SILENCE_TIMEOUT_MS);
  };
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return { arm, clear };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("timer di silenzio", () => {
  it("chiude la sessione dopo il silenzio", () => {
    vi.useFakeTimers();
    const onSilence = vi.fn();
    createSilenceWatcher(onSilence).arm();

    vi.advanceTimersByTime(SILENCE_TIMEOUT_MS - 1);
    expect(onSilence).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onSilence).toHaveBeenCalledTimes(1);
  });

  it("non taglia chi comincia a parlare tardi", () => {
    // È l'errore che un timeout fisso dall'apertura commette: l'utente esita
    // sette secondi, poi parla, e viene interrotto a metà frase.
    vi.useFakeTimers();
    const onSilence = vi.fn();
    const watcher = createSilenceWatcher(onSilence);
    watcher.arm();

    vi.advanceTimersByTime(7_000);
    watcher.arm(); // primo risultato parziale: l'utente ha iniziato a parlare
    vi.advanceTimersByTime(7_000);
    expect(onSilence).not.toHaveBeenCalled();

    vi.advanceTimersByTime(SILENCE_TIMEOUT_MS);
    expect(onSilence).toHaveBeenCalledTimes(1);
  });

  it("non scatta più dopo la chiusura", () => {
    vi.useFakeTimers();
    const onSilence = vi.fn();
    const watcher = createSilenceWatcher(onSilence);
    watcher.arm();
    watcher.clear();

    vi.advanceTimersByTime(SILENCE_TIMEOUT_MS * 3);
    expect(onSilence).not.toHaveBeenCalled();
  });

  it("scatta una volta sola per quanti riarmi ci siano stati", () => {
    vi.useFakeTimers();
    const onSilence = vi.fn();
    const watcher = createSilenceWatcher(onSilence);
    for (let i = 0; i < 5; i += 1) {
      watcher.arm();
      vi.advanceTimersByTime(1_000);
    }
    vi.advanceTimersByTime(SILENCE_TIMEOUT_MS);
    expect(onSilence).toHaveBeenCalledTimes(1);
  });
});
