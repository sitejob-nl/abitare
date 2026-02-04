import { useOutletContext, useParams, Link } from "react-router-dom";
import { ArrowLeft, FileText, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

export default function PortalQuoteDetail() {
  const { portalData, token } = useOutletContext<PortalContext>();
  const { quoteId } = useParams<{ quoteId: string }>();

  const quote = portalData.quotes.find((q) => q.id === quoteId);

  // Fetch quote lines
  const { data: quoteLines } = useQuery({
    queryKey: ["portal-quote-lines", quoteId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quote_lines")
        .select("id, description, quantity, unit, unit_price, line_total, article_code")
        .eq("quote_id", quoteId)
        .order("sort_order");
      return data || [];
    },
    enabled: !!quoteId,
  });

  // Fetch quote sections
  const { data: quoteSections } = useQuery({
    queryKey: ["portal-quote-sections", quoteId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quote_sections")
        .select("id, title, section_type, subtotal")
        .eq("quote_id", quoteId)
        .order("sort_order");
      return data || [];
    },
    enabled: !!quoteId,
  });

  if (!quote) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-medium text-foreground">Offerte niet gevonden</h2>
        <Link to={`/portal/${token}/quotes`}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar offertes
          </Button>
        </Link>
      </div>
    );
  }

  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/portal/${token}/quotes`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">
              Offerte #{quote.quote_number}
            </h1>
            <Badge className={statusColors[quote.status || ""] || "bg-muted"}>
              {statusLabels[quote.status || ""] || quote.status}
            </Badge>
            {isExpired && quote.status !== "geaccepteerd" && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                Verlopen
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Aangemaakt op {quote.quote_date && new Date(quote.quote_date).toLocaleDateString("nl-NL", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Totaal incl. BTW</p>
                <p className="text-lg font-bold">
                  {quote.total_incl_vat?.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Geldig tot</p>
                <p className="font-medium">
                  {quote.valid_until
                    ? new Date(quote.valid_until).toLocaleDateString("nl-NL")
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Offertedatum</p>
                <p className="font-medium">
                  {quote.quote_date
                    ? new Date(quote.quote_date).toLocaleDateString("nl-NL")
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sections */}
      {quoteSections && quoteSections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {quoteSections.map((section) => (
                <div key={section.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{section.title || section.section_type}</p>
                  </div>
                  <p className="font-medium">
                    {section.subtotal?.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quote lines */}
      <Card>
        <CardHeader>
          <CardTitle>Producten & diensten</CardTitle>
        </CardHeader>
        <CardContent>
          {quoteLines && quoteLines.length > 0 ? (
            <div className="divide-y">
              {quoteLines.map((line) => (
                <div key={line.id} className="py-3 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{line.description}</p>
                    {line.article_code && (
                      <p className="text-xs text-muted-foreground">
                        Art.nr: {line.article_code}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-muted-foreground">
                      {line.quantity} {line.unit} × {line.unit_price?.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}
                    </p>
                    <p className="font-medium">
                      {line.line_total?.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Geen regels gevonden.</p>
          )}
        </CardContent>
      </Card>

      {/* Total */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-lg font-medium">Totaal incl. BTW</p>
            <p className="text-2xl font-bold">
              {quote.total_incl_vat?.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
