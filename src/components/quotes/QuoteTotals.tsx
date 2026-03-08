import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { QuoteSection } from "@/hooks/useQuoteSections";
import { QuoteLine } from "@/hooks/useQuoteLines";
import { formatCurrency } from "@/lib/utils";

interface QuoteTotalsProps {
  sections: (QuoteSection & { quote_lines: QuoteLine[] })[];
  discountAmount?: number;
  paymentTerms?: string;
}

export function QuoteTotals({ sections, discountAmount = 0, paymentTerms }: QuoteTotalsProps) {
  const totals = useMemo(() => {
    let subtotalProducts = 0;
    let subtotalMontage = 0;
    let totalSectionDiscounts = 0;

    // Group VAT amounts by rate
    const vatByRate = new Map<number, number>();

    sections.forEach((section) => {
      const sectionBruto = section.quote_lines?.reduce(
        (sum, line) => sum + (line.line_total || 0),
        0
      ) || 0;

      // Calculate section discount
      const sectionDiscountAmount = section.discount_percentage 
        ? (sectionBruto * (section.discount_percentage || 0)) / 100
        : (section.discount_amount || 0);
      
      totalSectionDiscounts += sectionDiscountAmount;
      const sectionNetto = sectionBruto - sectionDiscountAmount;
      const discountFraction = sectionBruto > 0 ? sectionNetto / sectionBruto : 1;

      // Accumulate VAT per rate from individual lines
      section.quote_lines?.forEach((line) => {
        const rate = line.vat_rate ?? 21;
        const lineNetContribution = (line.line_total || 0) * discountFraction;
        vatByRate.set(rate, (vatByRate.get(rate) || 0) + lineNetContribution);
      });

      if (section.section_type === "montage") {
        subtotalMontage += sectionNetto;
      } else {
        subtotalProducts += sectionNetto;
      }
    });

    // After section discounts, apply quote-level discount
    const subtotalAfterSections = subtotalProducts + subtotalMontage;
    const subtotalExclVat = subtotalAfterSections - discountAmount;
    
    // Calculate VAT per rate, applying quote-level discount proportionally
    const quoteLevelFraction = subtotalAfterSections > 0 ? subtotalExclVat / subtotalAfterSections : 1;
    let totalVat = 0;
    const vatBreakdown: { rate: number; base: number; vat: number }[] = [];
    vatByRate.forEach((base, rate) => {
      const adjustedBase = base * quoteLevelFraction;
      const vat = adjustedBase * (rate / 100);
      totalVat += vat;
      vatBreakdown.push({ rate, base: adjustedBase, vat });
    });
    const totalInclVat = subtotalExclVat + totalVat;

    return {
      subtotalProducts,
      subtotalMontage,
      totalSectionDiscounts,
      discountAmount,
      subtotalExclVat,
      totalVat,
      totalInclVat,
      vatBreakdown,
    };
  }, [sections, discountAmount]);

  return (
    <Card className="mt-4 md:mt-6">
      <CardContent className="p-4 md:p-6">
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

          {totals.totalSectionDiscounts > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Sectiekortingen</span>
              <span>(verwerkt in subtotalen)</span>
            </div>
          )}

          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Korting (offerte)</span>
              <span>- {formatCurrency(totals.discountAmount)}</span>
            </div>
          )}

          <Separator />

          {/* Totals */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotaal excl. BTW</span>
            <span className="font-medium">{formatCurrency(totals.subtotalExclVat)}</span>
          </div>

          {totals.vatBreakdown.map(({ rate, vat }) => (
            <div key={rate} className="flex justify-between text-sm">
              <span className="text-muted-foreground">BTW {rate}%</span>
              <span>{formatCurrency(vat)}</span>
            </div>
          ))}

          <Separator />

          {/* Main total - styled like PDF */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2">
            <span className="text-sm sm:text-base font-semibold">
              Totaal te betalen (incl. montage)
            </span>
            <span className="text-lg sm:text-xl font-bold">{formatCurrency(totals.totalInclVat)}</span>
          </div>

          {/* Payment terms */}
          {paymentTerms && (
            <>
              <Separator />
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Betalingsvoorwaarden: </span>
                  {paymentTerms}
                </p>
              </div>
            </>
          )}

          {/* Default payment terms if not specified */}
          {!paymentTerms && (
            <>
              <Separator />
              <div className="pt-2 space-y-1">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Betalingsvoorwaarden:</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  25% aanbetaling bij akkoord, 75% voor levering
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
