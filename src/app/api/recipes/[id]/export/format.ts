/**
 * Helper puri per l'export: nessuna dipendenza da Prisma o da Next, così
 * restano testabili senza generare il client né avviare un server.
 */

/**
 * Campo CSV sempre quotato (nomi ingrediente/ricetta possono contenere il
 * separatore, virgolette o a capo) con neutralizzazione delle formule per i
 * fogli di calcolo (=, +, -, @).
 */
export function csvField(value: string | number): string {
  const raw = String(value);
  // I numeri negativi restano numeri: solo il testo che inizia con un
  // carattere di formula viene prefissato.
  const isNumeric = /^-?\d+([.,]\d+)?$/.test(raw);
  const safe = !isNumeric && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Nome file sicuro per l'header `Content-Disposition`.
 *
 * Lo slug arriva dal database e finisce dentro un header quotato: una
 * virgoletta lo chiuderebbe in anticipo e un CR/LF permetterebbe di
 * iniettare header aggiuntivi. Teniamo solo caratteri innocui e
 * garantiamo un fallback non vuoto.
 */
export function safeFilename(value: string, fallback: string): string {
  // Split invece di replace più trim ancorato: `/-+$/` ha costo super-lineare
  // per backtracking, e questo valore arriva dall'esterno.
  let cleaned = value
    .normalize("NFKD")
    .split(/[^\w.-]+/)
    .filter(Boolean)
    .join("-")
    .replace(/^-+/, "")
    .slice(0, 100);
  while (cleaned.endsWith("-")) cleaned = cleaned.slice(0, -1);
  return cleaned || fallback;
}

/** Formati di export supportati. */
export const EXPORT_FORMATS = ["json", "csv"] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export function isExportFormat(value: string): value is ExportFormat {
  return (EXPORT_FORMATS as readonly string[]).includes(value);
}
