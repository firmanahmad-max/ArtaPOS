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
  const isProd = env.NODE_ENV === "production";
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
    // Batasi ukuran pool per-instance. Di serverless (mis. Vercel) SETIAP
    // instance membuat pool sendiri; pool besar × banyak instance cepat
    // menembus batas koneksi Supabase → error transien ("too many
    // connections"). Kecil di produksi; boleh ditimpa via DB_POOL_MAX.
    max: env.DB_POOL_MAX ?? (isProd ? 5 : 10),
    idleTimeoutMillis: 10_000, // lepas koneksi menganggur lebih cepat
    connectionTimeoutMillis: 10_000, // gagal cepat, jangan menggantung
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
