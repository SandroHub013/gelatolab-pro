import createHighs, { type Highs } from "highs";

/**
 * Singleton HiGHS (WASM). Caricato una sola volta lato server, mai
 * re-inizializzato per richiesta (spec §0).
 *
 * In Node highs carica il .wasm dal proprio package automaticamente;
 * nessuna configurazione locateFile necessaria lato server.
 */
let highsPromise: Promise<Highs> | null = null;

export async function getHighs(): Promise<Highs> {
  if (!highsPromise) {
    highsPromise = createHighs().catch((err) => {
      // Reset in modo che un eventuale retry riprovi da capo.
      highsPromise = null;
      throw err;
    });
  }
  return highsPromise;
}

/** Forza il reload (solo per test). */
export function resetHighsSingleton(): void {
  highsPromise = null;
}
