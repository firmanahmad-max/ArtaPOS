import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { decryptSession, getSessionToken, type SessionPayload } from "@/lib/auth/session";

/**
 * Data Access Layer (DAL) — pusat verifikasi auth (pola resmi Next.js).
 * Gunakan ini di Server Component / Server Action / Route Handler untuk
 * memastikan user login. `cache` mencegah verifikasi berulang dalam 1 render.
 */

/** Verifikasi session; redirect ke /login jika tidak valid. */
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const token = await getSessionToken();
  const session = await decryptSession(token);
  if (!session?.userId) {
    redirect("/login");
  }
  return session;
});

/** Ambil session tanpa redirect (untuk pengecekan opsional). */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = await getSessionToken();
  return decryptSession(token);
});

/**
 * Ambil user saat ini (DTO aman — tanpa passwordHash), ter-scope tenant.
 * Sekaligus memastikan user & tenant masih aktif (secure check ke DB).
 */
export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  const user = await db.user.findFirst({
    where: { id: session.userId, tenantId: session.tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tenantId: true,
      tenant: { select: { id: true, name: true, slug: true, isActive: true } },
    },
  });

  if (!user || !user.tenant.isActive) {
    // Sesi valid (JWT) tapi user/tenant sudah tak aktif/terhapus: hapus cookie
    // via route handler agar tak terjadi loop redirect dengan proxy optimistic.
    redirect("/api/auth/logout");
  }
  return user;
});
