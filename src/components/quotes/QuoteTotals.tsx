import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { QuoteSection } from "@/hooks/useQuoteSections";
import { QuoteLine } from "@/hooks/useQuoteLines";

interface QuoteTotalsProps {
  sections: (QuoteSection & { quote_lines: QuoteLine[] })[];
  discountAmount?: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function QuoteTotals({ sections, discountAmount = 0 }: QuoteTotalsProps) {
  const totals = useMemo(() => {
    let subtotalProducts = 0;
    let subtotalMontage = 0;

    sections.forEach((section) => {
      const sectionTotal = section.quote_lines?.reduce(
        (sum, line) => sum + (line.line_total || 0),
        0
      ) || 0;

      if (section.section_type === "montage") {
        subtotalMontage += sectionTotal;
      } else {
        subtotalProducts += sectionTotal;
      }
    });

    const subtotalExclVat = subtotalProducts + subtotalMontage - discountAmount;
    const totalVat = subtotalExclVat * 0.21;
    const totalInclVat = subtotalExclVat + totalVat;

    return {
      subtotalProducts,
      subtotalMontage,
      discountAmount,
      subtotalExclVat,
      totalVat,
      totalInclVat,
    };
  }, [sections, discountAmount]);

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <div className="space-y-3">
          {/* Subtotals */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotaal producten</span>
            <span>{formatCurrency(totals.subtotalProducts)}</span>
          </div>
          
          {totals.subtotalMontage > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotaal montage</span>
              <span>{formatCurrency(totals.subtotalMontage)}</span>
            </div>
          )}

          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Korting</span>
              <span>- {formatCurrency(totals.discountAmount)}</span>
            </div>
          )}

          <Separator />

          {/* Totals */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotaal excl. BTW</span>
            <span className="font-medium">{formatCurrency(totals.subtotalExclVat)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">BTW 21%</span>
            <span>{formatCurrency(totals.totalVat)}</span>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-semibold">
            <span>Totaal incl. BTW</span>
            <span>{formatCurrency(totals.totalInclVat)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
