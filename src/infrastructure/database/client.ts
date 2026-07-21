import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // Reused across hot reloads in dev to avoid exhausting PG connections.
  var __prismaClient: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // `next build` raccoglie i dati pagina importando questo modulo senza un DB
    // disponibile (le route sono force-dynamic, nessuna query a build-time).
    // Carichiamo con un placeholder così il build non fallisce; a runtime un
    // DATABASE_URL mancante emerge come errore di connessione al primo accesso.
    console.warn("DATABASE_URL non definita: l'app non funzionerà a runtime.");
  }
  // La connection string è passata integralmente: sslmode, schema,
  // connection_limit e gli altri parametri devono essere preservati.
  const adapter = new PrismaPg({
    connectionString: url ?? "postgresql://build@localhost:5432/build",
  });
  return new PrismaClient({ adapter });
}

/**
 * Singleton Prisma client. Reused across hot reloads in dev to avoid
 * exhausting PostgreSQL connections. The driver adapter is configured once.
 */
export const prisma: PrismaClient =
  globalThis.__prismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaClient = prisma;
}
