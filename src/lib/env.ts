import { z } from "zod";

/**
 * Validasi environment variables saat startup.
 * Jika ada yang kurang/salah, app gagal cepat dengan pesan jelas (fail-fast).
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),
  DIRECT_URL: z.string().min(1).optional(),
  // Batas koneksi pool per-instance (node-postgres). Kecil untuk serverless.
  DB_POOL_MAX: z.coerce.number().int().positive().max(50).optional(),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET wajib diisi (min 32 char). Generate: openssl rand -base64 32"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Environment variable tidak valid:",
    z.treeifyError(parsed.error),
  );
  throw new Error("Konfigurasi environment tidak valid. Cek file .env Anda.");
}

export const env = parsed.data;
