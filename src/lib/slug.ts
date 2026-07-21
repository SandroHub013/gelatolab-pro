import { prisma } from "@/infrastructure/database/client";

interface SlugModel {
  findUnique(args: { where: { slug: string } }): Promise<{ id: string } | null>;
}

/**
 * Normalizza un nome in slug URL-safe.
 * - minuscolo, senza accenti
 * - spazi → trattini
 * - rimuove caratteri non alfanumerici
 */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Slug normalizzato e univoco: `slug` e `name` sono @unique in schema, e la
 * collisione altrimenti emergerebbe come errore Prisma grezzo (P2002).
 *
 * @param source Testo da cui derivare lo slug (es. nome ingrediente/ricetta).
 * @param table Nome della tabella Prisma per il controllo collisioni: "ingredient" o "recipe".
 * @param exceptId Se presente, esclude questo id dalla collisione (utile in rename).
 */
export async function uniqueSlug(
  source: string,
  table: "ingredient" | "recipe",
  exceptId?: string,
): Promise<string> {
  const fallback = table === "ingredient" ? "ingrediente" : "ricetta";
  const base = slugify(source) || fallback;
  let slug = base;
  let n = 2;
  for (;;) {
    const model: SlugModel = table === "ingredient" ? prisma.ingredient : prisma.recipe;
    const existing = await model.findUnique({ where: { slug } });
    if (!existing || (exceptId && existing.id === exceptId)) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}
