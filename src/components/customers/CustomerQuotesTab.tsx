import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { FileText, Copy, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCustomerQuotes, type CustomerQuote } from "@/hooks/useCustomerQuotes";
import { useDuplicateQuote } from "@/hooks/useQuoteDuplicate";
import { toast } from "@/hooks/use-toast";
import { formatCurrencyCompact as formatCurrency } from "@/lib/utils";

interface CustomerQuotesTabProps {
  customerId: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  concept: { label: "Concept", variant: "secondary" },
  verstuurd: { label: "Verstuurd", variant: "default" },
  bekeken: { label: "Bekeken", variant: "default" },
  geaccepteerd: { label: "Geaccepteerd", variant: "default" },
  afgewezen: { label: "Afgewezen", variant: "destructive" },
  vervallen: { label: "Vervallen", variant: "outline" },
};


export function CustomerQuotesTab({ customerId }: CustomerQuotesTabProps) {
  const navigate = useNavigate();
  const { data: quotes, isLoading } = useCustomerQuotes(customerId);
  const duplicateQuote = useDuplicateQuote();

  const handleDuplicate = async (quote: CustomerQuote, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newQuote = await duplicateQuote.mutateAsync({ quoteId: quote.id, mode: "revision" });
      toast({
        title: "Offerte gekopieerd",
        description: `Offerte #${newQuote.quote_number} is aangemaakt als kopie.`,
      });
      navigate(`/quotes/${newQuote.id}`);
    } catch (error) {
      toast({
        title: "Fout bij kopiëren",
        description: "Er is iets misgegaan bij het kopiëren van de offerte.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quotes || quotes.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Nog geen offertes voor deze klant</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {quotes.map((quote) => {
        const status = statusConfig[quote.status || "concept"] || statusConfig.concept;
        const hasOrder = quote.orders && quote.orders.length > 0;

        return (
          <div
            key={quote.id}
            onClick={() => navigate(`/quotes/${quote.id}`)}
            className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">#{quote.quote_number}</span>
                  <Badge variant={status.variant} className="text-xs">
                    {status.label}
                  </Badge>
                  {hasOrder && (
                    <Badge variant="outline" className="text-xs">
                      Order
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {quote.quote_date
                    ? format(new Date(quote.quote_date), "d MMM yyyy", { locale: nl })
                    : "-"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {formatCurrency(quote.total_incl_vat)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => handleDuplicate(quote, e)}
                title="Kopieer als nieuwe offerte"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
