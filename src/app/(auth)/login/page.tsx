import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAppInitialized } from "@/server/onboarding/actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage() {
  // Belum ada toko → arahkan ke setup awal.
  if (!(await isAppInitialized())) {
    redirect("/setup");
  }
  return <LoginForm />;
}
