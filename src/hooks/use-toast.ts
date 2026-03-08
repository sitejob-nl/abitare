import { useState, useCallback } from "react";
import { toast as sonnerToast } from "sonner";

/**
 * Compatibility layer: bridges the old shadcn toast API to sonner.
 * Keeps placeholder React hooks so the hook count stays stable
 * for components that were compiled with the old implementation.
 */

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  [key: string]: unknown;
}

function toast(opts: ToastOptions) {
  const { title, description, variant } = opts;
  if (variant === "destructive") {
    sonnerToast.error(title ?? "Fout", { description });
  } else {
    sonnerToast.success(title ?? "", { description });
  }
}

function useToast() {
  // Placeholder hooks to keep React hook count stable
  useState(undefined);
  const boundToast = useCallback((opts: ToastOptions) => toast(opts), []);
  return { toast: boundToast, toasts: [] as never[], dismiss: () => {} };
}

export { useToast, toast };
