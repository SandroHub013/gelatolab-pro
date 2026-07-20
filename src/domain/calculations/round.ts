/** Arrotonda a `decimals` cifre con correzione dell'epsilon. */
export function round(value: number, decimals = 4): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** Arrotonda a 0.1g (riconciliazione solver / UI tecnica). */
export function roundGrams(value: number): number {
  return round(value, 1);
}

/** Formatta un numero per la UI italiana (separatore decimale virgola). */
export function formatNumberIt(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/** Formatta un valore monetario in euro. */
export function formatEuro(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
