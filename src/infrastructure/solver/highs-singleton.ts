import createHighs, { type Highs } from "highs";

/**
 * Singleton HiGHS (WASM). Caricato una sola volta lato server, mai
 * re-inizializzato per richiesta (spec §0).
 *
 * In Node highs carica il .wasm dal proprio package automaticamente;
 * nessuna configurazione locateFile necessaria lato server.
 *
 * Nota: per il corretto funzionamento in produzione Next.js, il package
 * `highs` è escluso dal bundle tramite `serverExternalPackages` in
 * next.config.ts, così il WASM rimane accessibile via path relativo.
 */
let highsPromise: Promise<Highs> | null = null;

export async function getHighs(): Promise<Highs> {
  highsPromise ??= createHighs().catch((err) => {
    // Reset in modo che un eventuale retry riprovi da capo.
    highsPromise = null;
    throw err;
  });
  return highsPromise;
}

/** Forza il reload (solo per test). */
export function resetHighsSingleton(): void {
  highsPromise = null;
}
