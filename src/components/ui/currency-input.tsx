import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: number;
  onValueChange: (value: number) => void;
  /** Awalan, mis. "Rp". Default "Rp". Beri "" untuk tanpa awalan. */
  prefix?: string;
}

/**
 * Input mata uang rupiah dengan pemisah ribuan otomatis (locale id-ID).
 * Menyimpan nilai numerik penuh (Int rupiah); tampilan diformat "1.250.000".
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onValueChange, prefix = "Rp", ...props }, ref) => {
    const display = value > 0 ? value.toLocaleString("id-ID") : "";
    return (
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          inputMode="numeric"
          value={display}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            onValueChange(digits ? Number(digits) : 0);
          }}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background py-2 pr-3 text-right text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            prefix ? "pl-10" : "pl-3",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";
