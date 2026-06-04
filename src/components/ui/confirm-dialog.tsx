"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

/** Dialog konfirmasi sederhana (tanpa Radix) — overlay + kartu terpusat. */
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Lanjutkan",
  cancelText = "Batal",
  destructive,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-2xl border bg-card p-6 elevate-lg"
      >
        <div className="flex gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              destructive ? "bg-destructive/15 text-destructive" : "bg-accent text-primary",
            )}
          >
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            size="sm"
            autoFocus
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmButtonProps extends Omit<ButtonProps, "onClick"> {
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

/** Tombol yang memunculkan dialog konfirmasi sebelum menjalankan aksi. */
export function ConfirmButton({
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  destructive,
  children,
  ...buttonProps
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" {...buttonProps} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={onConfirm}
        title={title}
        description={description}
        confirmText={confirmText}
        cancelText={cancelText}
        destructive={destructive}
      />
    </>
  );
}
