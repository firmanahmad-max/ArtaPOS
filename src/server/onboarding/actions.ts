"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { slugify } from "@/lib/utils";
import { onboardingSchema, type FormState } from "@/lib/validations/auth";

/** Apakah aplikasi sudah pernah di-setup (ada tenant)? */
export async function isAppInitialized(): Promise<boolean> {
  const count = await db.tenant.count();
  return count > 0;
}

/**
 * Setup awal (first-run): buat toko + akun pemilik + lisansi UNLIMITED,
 * lalu login otomatis. Hanya boleh jalan saat belum ada tenant.
 */
export async function onboardingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (await isAppInitialized()) {
    return { message: "Aplikasi sudah pernah di-setup." };
  }

  const parsed = onboardingSchema.safeParse({
    storeName: formData.get("storeName"),
    ownerName: formData.get("ownerName"),
    ownerEmail: formData.get("ownerEmail"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      (errors[key] ??= []).push(issue.message);
    }
    return { errors };
  }

  const { storeName, ownerName, ownerEmail, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  // Slug unik (toko pertama hampir pasti unik; tambah sufiks bila bentrok).
  let slug = slugify(storeName) || "toko";
  if (await db.tenant.findUnique({ where: { slug } })) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { user } = await db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: storeName,
        slug,
        license: {
          create: { plan: "UNLIMITED", status: "ACTIVE" },
        },
      },
    });

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: ownerName,
        email: ownerEmail,
        passwordHash,
        role: "OWNER",
      },
    });

    return { tenant, user };
  });

  await createSession({
    userId: user.id,
    tenantId: user.tenantId,
    role: "OWNER",
  });

  redirect("/dashboard");
}
