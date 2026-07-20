import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // Reused across hot reloads in dev to avoid exhausting PG connections.
  var __prismaClient: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL non definita. Configura .env con la stringa di connessione PostgreSQL.",
    );
  }
  // Parse the connection string into pg-compatible options.
  const parsed = new URL(url);
  const adapter = new PrismaPg({
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    ssl: false,
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
