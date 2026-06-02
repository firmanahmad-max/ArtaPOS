import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

/**
 * Singleton Prisma Client.
 *
 * Prisma 7 mewajibkan driver adapter untuk koneksi langsung; kita pakai
 * @prisma/adapter-pg (node-postgres) dengan DATABASE_URL (pooled saat di Supabase).
 *
 * Pola globalThis mencegah pembuatan banyak instance saat hot-reload di dev.
 */
const createPrismaClient = () => {
  // DB lokal tidak pakai SSL; DB remote (mis. Supabase) WAJIB SSL.
  const isLocal = /(?:localhost|127\.0\.0\.1)/.test(env.DATABASE_URL);
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
  });
  return new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
