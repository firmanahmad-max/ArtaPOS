import "server-only";
import { hash, verify } from "@node-rs/argon2";

/**
 * Hashing password dengan Argon2id (rekomendasi OWASP).
 * @node-rs/argon2 memakai binary prebuilt (tanpa kompilasi) — andal di Windows.
 */

const ARGON2_OPTS = {
  // Parameter seimbang antara keamanan & performa untuk web app.
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTS);
}

export async function verifyPassword(
  passwordHash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, plain, ARGON2_OPTS);
  } catch {
    return false;
  }
}
