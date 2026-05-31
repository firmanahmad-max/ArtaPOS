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
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
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
