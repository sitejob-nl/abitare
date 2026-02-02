import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuotes, QuoteStatus } from "@/hooks/useQuotes";
import { useDivisions } from "@/hooks/useDivisions";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { QuoteFormDialog } from "@/components/quotes/QuoteFormDialog";

const statusConfig: Record<QuoteStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  concept: { label: "Concept", variant: "secondary" },
  verstuurd: { label: "Verstuurd", variant: "default" },
  bekeken: { label: "Bekeken", variant: "default" },
  vervallen: { label: "Vervallen", variant: "destructive" },
  geaccepteerd: { label: "Geaccepteerd", variant: "outline" },
  afgewezen: { label: "Afgewezen", variant: "destructive" },
};

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "d MMM yyyy", { locale: nl });
  } catch {
    return "-";
  }
}

function getCustomerName(customer: { first_name?: string | null; last_name?: string | null; company_name?: string | null } | null): string {
  if (!customer) return "Onbekend";
  if (customer.company_name) return customer.company_name;
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Onbekend";
}

const Quotes = () => {
  const navigate = useNavigate();
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const { data: divisions, isLoading: divisionsLoading } = useDivisions();
  const { data: quotes, isLoading: quotesLoading } = useQuotes({
    divisionId: divisionFilter === "all" ? null : divisionFilter,
    status: statusFilter === "all" ? null : (statusFilter as QuoteStatus),
    search: debouncedSearch || undefined,
  });

  const isLoading = quotesLoading || divisionsLoading;

  return (
    <AppLayout title="Offertes" breadcrumb="Offertes">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-[28px] font-semibold text-foreground">
          Offertes
        </h1>
        <Button className="gap-2" onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4" />
          Nieuwe offerte
        </Button>
      </div>

      <QuoteFormDialog open={showNewDialog} onOpenChange={setShowNewDialog} />

      {/* Filters Bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Vestiging:</span>
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger className="h-9 w-[160px] text-[13px]">
              <SelectValue placeholder="Alle vestigingen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle vestigingen</SelectItem>
              {divisions?.map((division) => (
                <SelectItem key={division.id} value={division.id}>
                  {division.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[140px] text-[13px]">
              <SelectValue placeholder="Alle statussen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative ml-auto max-w-[300px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op offertenummer of klant..."
            className="h-9 pl-9 text-[13px]"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Quotes Table */}
      <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Laden...</span>
          </div>
        ) : quotes && quotes.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Offerte
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Klant
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Bedrag
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Datum
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Geldig tot
                </th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => {
                const customer = quote.customer as { first_name?: string | null; last_name?: string | null; company_name?: string | null } | null;
                const status = quote.status as QuoteStatus;
                const config = statusConfig[status] || statusConfig.concept;

                return (
                  <tr
                    key={quote.id}
                    className="cursor-pointer border-b border-border-light last:border-b-0 transition-colors hover:bg-muted/30"
                    onClick={() => navigate(`/quotes/${quote.id}`)}
                  >
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-foreground">
                        #{quote.quote_number}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-foreground">
                        {getCustomerName(customer)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrency(quote.total_incl_vat)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={config.variant} className="text-xs">
                        {config.label}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {formatDate(quote.quote_date)}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {formatDate(quote.valid_until)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {debouncedSearch ? "Geen offertes gevonden voor deze zoekopdracht" : "Nog geen offertes aanwezig"}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Quotes;
