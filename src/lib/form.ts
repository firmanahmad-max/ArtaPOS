import type { ZodError } from "zod";

/** State standar untuk form yang memakai useActionState. */
export type FormState =
  | {
      ok?: boolean;
      message?: string;
      errors?: Record<string, string[]>;
    }
  | undefined;

/** Ubah ZodError menjadi map field -> daftar pesan. */
export function toFieldErrors(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
