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
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return cleaned || fallback;
}

/** Formati di export supportati. */
export const EXPORT_FORMATS = ["json", "csv"] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export function isExportFormat(value: string): value is ExportFormat {
  return (EXPORT_FORMATS as readonly string[]).includes(value);
}
