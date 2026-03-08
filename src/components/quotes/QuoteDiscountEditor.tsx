import { useState } from "react";
import { Pencil, Check, X, Percent, Euro } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useUpdateQuote } from "@/hooks/useQuotes";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface QuoteDiscountEditorProps {
  quoteId: string;
  discountAmount: number;
  discountPercentage: number | null;
  discountDescription: string | null;
  paymentTermsDescription: string | null;
  paymentCondition: string | null;
  subtotalExclVat: number;
}


export function QuoteDiscountEditor({
  quoteId,
  discountAmount,
  discountPercentage,
  discountDescription,
  paymentTermsDescription,
  paymentCondition,
  subtotalExclVat,
}: QuoteDiscountEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDiscountAmount, setEditDiscountAmount] = useState(discountAmount.toString());
  const [editDiscountPercentage, setEditDiscountPercentage] = useState(discountPercentage?.toString() || "");
  const [editDiscountDescription, setEditDiscountDescription] = useState(discountDescription || "");
  const [editPaymentTerms, setEditPaymentTerms] = useState(paymentTermsDescription || "");
  const [editPaymentCondition, setEditPaymentCondition] = useState(paymentCondition || "");
  const [discountMode, setDiscountMode] = useState<"amount" | "percentage">(discountPercentage ? "percentage" : "amount");

  const updateQuote = useUpdateQuote();

  const handlePercentageChange = (value: string) => {
    setEditDiscountPercentage(value);
    const perc = parseFloat(value) || 0;
    const calculatedAmount = (subtotalExclVat * perc) / 100;
    setEditDiscountAmount(calculatedAmount.toFixed(2));
  };

  const handleAmountChange = (value: string) => {
    setEditDiscountAmount(value);
    const amt = parseFloat(value) || 0;
    if (subtotalExclVat > 0) {
      const calculatedPercentage = (amt / subtotalExclVat) * 100;
      setEditDiscountPercentage(calculatedPercentage.toFixed(2));
    }
  };

  const handleSave = async () => {
    try {
      await updateQuote.mutateAsync({
        id: quoteId,
        discount_amount: parseFloat(editDiscountAmount) || 0,
        discount_percentage: parseFloat(editDiscountPercentage) || null,
        discount_description: editDiscountDescription || null,
        payment_terms_description: editPaymentTerms || null,
        payment_condition: editPaymentCondition || null,
      });
      toast({
        title: "Opgeslagen",
        description: "Korting en betalingsvoorwaarden zijn bijgewerkt.",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Fout bij opslaan",
        description: "Er is iets misgegaan.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditDiscountAmount(discountAmount.toString());
    setEditDiscountPercentage(discountPercentage?.toString() || "");
    setEditDiscountDescription(discountDescription || "");
    setEditPaymentTerms(paymentTermsDescription || "");
    setEditPaymentCondition(paymentCondition || "");
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Korting & Betalingsvoorwaarden</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-7 gap-1">
              <Pencil className="h-3 w-3" />
              Bewerken
            </Button>
          </div>

          <div className="space-y-2 text-sm">
            {discountAmount > 0 ? (
              <div className="flex justify-between text-green-600">
                <span>
                  Korting
                  {discountDescription && <span className="text-muted-foreground ml-1">({discountDescription})</span>}
                </span>
                <span>- {formatCurrency(discountAmount)}</span>
              </div>
            ) : (
              <p className="text-muted-foreground">Geen korting toegepast</p>
            )}

            <Separator className="my-2" />

            <div>
              <p className="text-muted-foreground font-medium">Betalingsvoorwaarden:</p>
              <p className="text-foreground mt-0.5">
                {paymentTermsDescription || "25% aanbetaling bij akkoord, 75% voor levering"}
              </p>
              {paymentCondition && (
                <p className="text-xs text-muted-foreground mt-1">
                  Conditie: {paymentCondition}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 border-primary/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Korting & Betalingsvoorwaarden bewerken</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleSave} disabled={updateQuote.isPending} className="h-7 gap-1 text-green-600">
              <Check className="h-3 w-3" />
              Opslaan
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel} className="h-7 gap-1">
              <X className="h-3 w-3" />
              Annuleren
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Discount section */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Korting</Label>
            
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={discountMode === "percentage" ? "default" : "outline"}
                size="sm"
                onClick={() => setDiscountMode("percentage")}
                className="h-8 gap-1"
              >
                <Percent className="h-3 w-3" />
                Percentage
              </Button>
              <Button
                type="button"
                variant={discountMode === "amount" ? "default" : "outline"}
                size="sm"
                onClick={() => setDiscountMode("amount")}
                className="h-8 gap-1"
              >
                <Euro className="h-3 w-3" />
                Bedrag
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="discount-percentage" className="text-xs">Percentage (%)</Label>
                <Input
                  id="discount-percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editDiscountPercentage}
                  onChange={(e) => handlePercentageChange(e.target.value)}
                  disabled={discountMode !== "percentage"}
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor="discount-amount" className="text-xs">Bedrag (€)</Label>
                <Input
                  id="discount-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editDiscountAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  disabled={discountMode !== "amount"}
                  className="h-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="discount-description" className="text-xs">Omschrijving korting</Label>
              <Input
                id="discount-description"
                placeholder="bijv. Actiekorting, Trouwe klant, etc."
                value={editDiscountDescription}
                onChange={(e) => setEditDiscountDescription(e.target.value)}
                className="h-8"
              />
            </div>
          </div>

          <Separator />

          {/* Payment terms section */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Betalingsvoorwaarden</Label>
            
            <div>
              <Label htmlFor="payment-terms" className="text-xs">Beschrijving betalingsvoorwaarden</Label>
              <Textarea
                id="payment-terms"
                placeholder="bijv. 25% aanbetaling bij akkoord, 75% voor levering"
                value={editPaymentTerms}
                onChange={(e) => setEditPaymentTerms(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="payment-condition" className="text-xs">Betalingsconditie code</Label>
              <Input
                id="payment-condition"
                placeholder="bijv. 14 dagen, 30 dagen"
                value={editPaymentCondition}
                onChange={(e) => setEditPaymentCondition(e.target.value)}
                className="h-8"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
