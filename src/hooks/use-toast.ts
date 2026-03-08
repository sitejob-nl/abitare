import { toast as sonnerToast } from "sonner";

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
    return;
  }

  sonnerToast.success(title ?? "", { description });
}

function useToast() {
  return {
    toast,
    toasts: [] as never[],
    dismiss: () => {},
  };
}

export { useToast, toast };
