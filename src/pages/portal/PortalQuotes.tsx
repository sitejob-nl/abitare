import { useOutletContext, Link } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PortalData } from "@/hooks/usePortalToken";

interface PortalContext {
  portalData: PortalData;
  token: string;
}

const statusLabels: Record<string, string> = {
  concept: "Concept",
  verzonden: "Verzonden",
  bekeken: "Bekeken",
  geaccepteerd: "Geaccepteerd",
  geweigerd: "Geweigerd",
  verlopen: "Verlopen",
};

const statusColors: Record<string, string> = {
  concept: "bg-gray-100 text-gray-800 border-gray-200",
  verzonden: "bg-blue-100 text-blue-800 border-blue-200",
  bekeken: "bg-yellow-100 text-yellow-800 border-yellow-200",
  geaccepteerd: "bg-green-100 text-green-800 border-green-200",
  geweigerd: "bg-red-100 text-red-800 border-red-200",
  verlopen: "bg-orange-100 text-orange-800 border-orange-200",
};

export default function PortalQuotes() {
  const { portalData, token } = useOutletContext<PortalContext>();
  const { quotes } = portalData;

  if (quotes.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-medium text-foreground">Geen offertes</h2>
        <p className="text-muted-foreground">
          U heeft nog geen offertes ontvangen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Uw offertes</h1>
        <p className="text-muted-foreground mt-1">
          Bekijk al uw ontvangen offertes.
        </p>
      </div>

      <div className="space-y-4">
        {quotes.map((quote) => {
          const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date();
          
          return (
            <Link key={quote.id} to={`/portal/${token}/quotes/${quote.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">Offerte #{quote.quote_number}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {quote.quote_date && new Date(quote.quote_date).toLocaleDateString("nl-NL", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpired && quote.status !== "geaccepteerd" && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          Verlopen
                        </Badge>
                      )}
                      <Badge className={statusColors[quote.status || ""] || "bg-muted"}>
                        {statusLabels[quote.status || ""] || quote.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Geldig tot</p>
                      <p className="text-sm font-medium">
                        {quote.valid_until
                          ? new Date(quote.valid_until).toLocaleDateString("nl-NL")
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Totaal incl. BTW</p>
                      <p className="text-sm font-medium">
                        {quote.total_incl_vat?.toLocaleString("nl-NL", { style: "currency", currency: "EUR" }) || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-primary">
                    Bekijk details <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
