import { useState, useEffect, useMemo } from "react";
import { Percent, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { QuoteSection, useUpdateQuoteSection } from "@/hooks/useQuoteSections";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SectionDiscountEditorProps {
  section: QuoteSection;
  subtotal: number;
}

export function SectionDiscountEditor({ section, subtotal }: SectionDiscountEditorProps) {
  const updateSection = useUpdateQuoteSection();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"percentage" | "amount">(
    section.discount_percentage ? "percentage" : "amount"
  );
  const [percentage, setPercentage] = useState(section.discount_percentage?.toString() || "");
  const [amount, setAmount] = useState(section.discount_amount?.toString() || "");
  const [description, setDescription] = useState(section.discount_description || "");

  useEffect(() => {
    setMode(section.discount_percentage ? "percentage" : "amount");
    setPercentage(section.discount_percentage?.toString() || "");
    setAmount(section.discount_amount?.toString() || "");
    setDescription(section.discount_description || "");
  }, [section.discount_percentage, section.discount_amount, section.discount_description]);

  const calculatedAmount = useMemo(() => {
    if (mode === "percentage" && percentage) {
      return (subtotal * parseFloat(percentage)) / 100;
    }
    return parseFloat(amount) || 0;
  }, [mode, percentage, amount, subtotal]);

  const handleSave = async () => {
    try {
      const discountPercentage = mode === "percentage" ? parseFloat(percentage) || null : null;
      const discountAmount = mode === "percentage" 
        ? (subtotal * (parseFloat(percentage) || 0)) / 100
        : parseFloat(amount) || 0;

      await updateSection.mutateAsync({
        id: section.id,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        discount_description: description || null,
      });

      toast({
        title: "Korting opgeslagen",
        description: `Korting van €${discountAmount.toFixed(2)} toegepast.`,
      });

      setOpen(false);
    } catch (error) {
      toast({
        title: "Fout bij opslaan",
        description: "De korting kon niet worden opgeslagen.",
        variant: "destructive",
      });
    }
  };

  const handleRemove = async () => {
    try {
      await updateSection.mutateAsync({
        id: section.id,
        discount_percentage: null,
        discount_amount: 0,
        discount_description: null,
      });

      toast({
        title: "Korting verwijderd",
        description: "De sectiekorting is verwijderd.",
      });

      setOpen(false);
    } catch (error) {
      toast({
        title: "Fout bij verwijderen",
        description: "De korting kon niet worden verwijderd.",
        variant: "destructive",
      });
    }
  };

  const hasDiscount = (section.discount_amount && section.discount_amount > 0) || 
    (section.discount_percentage && section.discount_percentage > 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasDiscount ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            "h-7 gap-1 text-xs",
            hasDiscount && "text-green-600 bg-green-50 hover:bg-green-100"
          )}
        >
          <Percent className="h-3 w-3" />
          {hasDiscount ? (
            section.discount_percentage 
              ? `${section.discount_percentage}%` 
              : formatCurrency(section.discount_amount || 0)
          ) : (
            "Korting"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-1">Sectiekorting</h4>
            <p className="text-xs text-muted-foreground">
              Subtotaal: {formatCurrency(subtotal)}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={mode === "percentage" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("percentage")}
            >
              <Percent className="h-3 w-3 mr-1" />
              Percentage
            </Button>
            <Button
              variant={mode === "amount" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("amount")}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Bedrag
            </Button>
          </div>

          {mode === "percentage" ? (
            <div className="space-y-2">
              <Label htmlFor="discount-percentage">Percentage</Label>
              <div className="relative">
                <Input
                  id="discount-percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="10"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  %
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="discount-amount">Bedrag</Label>
              <div className="relative">
                <Input
                  id="discount-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="100.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-6"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  €
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="discount-description">Omschrijving (optioneel)</Label>
            <Input
              id="discount-description"
              placeholder="Bijv. Showroommodel, Actie..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {calculatedAmount > 0 && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Korting:</span>
                <span className="font-medium text-green-700">
                  - {formatCurrency(calculatedAmount)}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-green-700">Netto:</span>
                <span className="font-semibold text-green-700">
                  {formatCurrency(subtotal - calculatedAmount)}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {hasDiscount && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={updateSection.isPending}
                className="text-destructive hover:text-destructive"
              >
                Verwijderen
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1"
              onClick={handleSave}
              disabled={updateSection.isPending || calculatedAmount <= 0}
            >
              Opslaan
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
