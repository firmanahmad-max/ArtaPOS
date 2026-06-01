import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAppInitialized } from "@/server/onboarding/actions";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Setup Awal" };
// Akses DB (cek inisialisasi) → render saat request, jangan prerender saat build.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // Sudah pernah di-setup → tidak boleh setup ulang.
  if (await isAppInitialized()) {
    redirect("/login");
  }
  return <OnboardingForm />;
}
