import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface DepositChoice {
  depositRequired: boolean;
  depositInvoiceSent: boolean;
  depositReminderDate: string | null;
}

interface ConvertToOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (depositChoice: DepositChoice) => void;
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
  const [depositNow, setDepositNow] = useState<string>("yes");
  const [reminderDate, setReminderDate] = useState<string>("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const canConfirm = depositNow === "yes" || (depositNow === "no" && reminderDate !== "");

  const handleConfirm = () => {
    onConfirm({
      depositRequired: true,
      depositInvoiceSent: depositNow === "yes",
      depositReminderDate: depositNow === "no" ? reminderDate : null,
    });
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setDepositNow("yes");
      setReminderDate("");
    }
    onOpenChange(value);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            Offerte omzetten naar order
            <ArrowRight className="h-4 w-4" />
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
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

              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium text-foreground">Aanbetaling nu versturen?</p>
                <RadioGroup value={depositNow} onValueChange={setDepositNow}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="deposit-yes" />
                    <Label htmlFor="deposit-yes" className="text-sm">
                      Ja, aanbetalingsfactuur direct versturen
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="deposit-no" />
                    <Label htmlFor="deposit-no" className="text-sm">
                      Nee, later versturen
                    </Label>
                  </div>
                </RadioGroup>

                {depositNow === "no" && (
                  <div className="space-y-1.5 pl-6">
                    <Label htmlFor="reminder-date" className="text-xs text-muted-foreground">
                      Wanneer opnieuw vragen? (verplicht)
                    </Label>
                    <Input
                      id="reminder-date"
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full"
                    />
                  </div>
                )}
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
              handleConfirm();
            }}
            disabled={isPending || !canConfirm}
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
