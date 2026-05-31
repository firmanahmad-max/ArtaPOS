"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Tombol toggle tema terang/gelap.
 * Ikon dipilih lewat CSS (`dark:` variant) berdasarkan class `.dark` pada <html>,
 * sehingga markup server & client identik (tanpa hydration mismatch, tanpa effect).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Ganti tema"
      title="Ganti tema terang/gelap"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  );
}
