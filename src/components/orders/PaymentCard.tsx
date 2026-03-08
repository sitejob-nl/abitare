import { useState } from "react";
import { CreditCard, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn, formatCurrency } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];

const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-red-100 text-red-800" },
  deels_betaald: { label: "Deels betaald", color: "bg-yellow-100 text-yellow-800" },
  betaald: { label: "Betaald", color: "bg-green-100 text-green-800" },
};

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

interface PaymentCardProps {
  totalInclVat: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  onRegisterPayment: (amount: number) => void;
  isUpdating?: boolean;
}

export function PaymentCard({
  totalInclVat,
  amountPaid,
  paymentStatus,
  onRegisterPayment,
  isUpdating,
}: PaymentCardProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");

  const remainingAmount = totalInclVat - amountPaid;
  const paymentPercentage = totalInclVat > 0 ? (amountPaid / totalInclVat) * 100 : 0;
  const statusConfig = paymentStatusConfig[paymentStatus] || paymentStatusConfig.open;

  const handleSubmit = () => {
    const amount = parseFloat(paymentAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) return;
    
    onRegisterPayment(amount);
    setPaymentAmount("");
    setShowDialog(false);
  };

  const handlePayFull = () => {
    setPaymentAmount(remainingAmount.toFixed(2).replace(".", ","));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Betaling</h3>
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusConfig.color)}>
          {statusConfig.label}
        </span>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Betaald</span>
            <span className="font-medium text-foreground">{formatCurrency(amountPaid)}</span>
          </div>
          <Progress value={paymentPercentage} className="h-2" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Openstaand</span>
            <span className={cn("font-medium", remainingAmount > 0 ? "text-destructive" : "text-success")}>
              {formatCurrency(remainingAmount)}
            </span>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Totaal incl. BTW</span>
            <span className="font-semibold text-foreground">{formatCurrency(totalInclVat)}</span>
          </div>
        </div>

        {remainingAmount > 0 && (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Betaling registreren
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Betaling registreren</DialogTitle>
                <DialogDescription>
                  Openstaand bedrag: {formatCurrency(remainingAmount)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Bedrag</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                      <Input
                        id="amount"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0,00"
                        className="pl-7"
                      />
                    </div>
                    <Button variant="outline" onClick={handlePayFull}>
                      Volledig
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleSubmit} disabled={isUpdating || !paymentAmount}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Bezig...
                    </>
                  ) : (
                    "Registreren"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
