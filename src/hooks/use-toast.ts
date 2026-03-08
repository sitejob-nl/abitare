import { toast as sonnerToast } from "sonner";

/**
 * Compatibility layer: bridges the old shadcn toast API to sonner.
 * All existing code using `toast({ title, description, variant })` or
 * `const { toast } = useToast()` continues to work without changes.
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
  return { toast, toasts: [], dismiss: () => {} };
}

export { useToast, toast };
