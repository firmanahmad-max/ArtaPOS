import "server-only";
import { headers } from "next/headers";

/** IP klien dari header proxy (Vercel mengeset x-forwarded-for). "unknown" bila tak ada. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip")?.trim() || "unknown";
}
