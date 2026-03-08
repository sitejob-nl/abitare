import { useOutletContext } from "react-router-dom";
import { Euro, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { PortalData } from "@/hooks/usePortalData";
import { formatCurrency } from "@/lib/utils";

interface PortalContext {
  portalData: PortalData;
  token: string;
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency", currency: "EUR", minimumFractionDigits: 2,
  }).format(amount);
}

const paymentStatusConfig = {
  open: { label: "Open", variant: "destructive" as const, icon: AlertCircle },
  deels_betaald: { label: "Deels betaald", variant: "warning" as const, icon: Clock },
  betaald: { label: "Betaald", variant: "success" as const, icon: CheckCircle2 },
};

export default function PortalInvoices() {
  const { portalData } = useOutletContext<PortalContext>();
  const { orders } = portalData;

  // Use orders directly as invoice data (already fetched via edge function)
  const invoices = orders.filter((o) => o.total_incl_vat != null);

  const stats = invoices.reduce(
    (acc, inv) => {
      const outstanding = (inv.total_incl_vat || 0) - (inv.amount_paid || 0);
      acc.totalAmount += inv.total_incl_vat || 0;
      acc.totalPaid += inv.amount_paid || 0;
      acc.totalOutstanding += outstanding;
      if (inv.payment_status === "open") acc.countOpen++;
      if (inv.payment_status === "deels_betaald") acc.countPartial++;
      if (inv.payment_status === "betaald") acc.countPaid++;
      return acc;
    },
    { totalAmount: 0, totalPaid: 0, totalOutstanding: 0, countOpen: 0, countPartial: 0, countPaid: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Facturen</h1>
        <p className="text-muted-foreground mt-1">Overzicht van uw facturen en betalingen.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Totaal gefactureerd</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">{invoices.length} facturen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Openstaand</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-destructive">{formatCurrency(stats.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">{stats.countOpen + stats.countPartial} facturen</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Betaald</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-success">{formatCurrency(stats.totalPaid)}</div>
            <p className="text-xs text-muted-foreground">{stats.countPaid} facturen volledig betaald</p>
          </CardContent>
        </Card>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-12">
          <Euro className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-medium text-foreground">Geen facturen</h2>
          <p className="text-muted-foreground">Er zijn nog geen facturen voor u beschikbaar.</p>
        </div>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-lg">Factuuroverzicht</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {invoices.map((invoice) => {
                const status = (invoice.payment_status || "open") as keyof typeof paymentStatusConfig;
                const config = paymentStatusConfig[status] || paymentStatusConfig.open;
                const StatusIcon = config.icon;
                const outstanding = (invoice.total_incl_vat || 0) - (invoice.amount_paid || 0);

                return (
                  <div key={invoice.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start justify-between sm:justify-start sm:gap-4">
                      <div>
                        <p className="font-medium">Order #{invoice.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.order_date ? format(new Date(invoice.order_date), "d MMMM yyyy", { locale: nl }) : "-"}
                        </p>
                      </div>
                      <Badge variant={config.variant} className="gap-1 sm:hidden">
                        <StatusIcon className="h-3 w-3" /> {config.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between sm:gap-6">
                      <div className="grid grid-cols-3 gap-4 text-sm sm:flex sm:gap-6">
                        <div>
                          <span className="text-muted-foreground text-xs">Bedrag</span>
                          <p className="font-medium">{formatCurrency(invoice.total_incl_vat)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Betaald</span>
                          <p className="font-medium text-success">{formatCurrency(invoice.amount_paid)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Open</span>
                          <p className={outstanding > 0 ? "font-medium text-destructive" : "font-medium"}>
                            {formatCurrency(outstanding)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={config.variant} className="gap-1 hidden sm:flex">
                        <StatusIcon className="h-3 w-3" /> {config.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
