import { Loader2, ArrowRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConvertToOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  quoteNumber: number;
  customerName: string;
  totalAmount: number;
  isPending: boolean;
}

export function ConvertToOrderDialog({
  open,
  onOpenChange,
  onConfirm,
  quoteNumber,
  customerName,
  totalAmount,
  isPending,
}: ConvertToOrderDialogProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            Offerte omzetten naar order
            <ArrowRight className="h-4 w-4" />
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Weet je zeker dat je offerte #{quoteNumber} wilt omzetten naar een order?
              </p>
              <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Klant:</span>
                  <span className="font-medium text-foreground">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bedrag:</span>
                  <span className="font-medium text-foreground">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Na conversie wordt de offerte gemarkeerd als "geaccepteerd" en wordt een nieuwe order aangemaakt met alle offerteregels.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuleren</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-primary"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Omzetten naar order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
