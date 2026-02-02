import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, FileText, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { nl } from "date-fns/locale";

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "€ 0";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function useReportStats() {
  return useQuery({
    queryKey: ["report-stats"],
    queryFn: async () => {
      // Get total customers
      const { count: customerCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });

      // Get total quotes
      const { count: quoteCount } = await supabase
        .from("quotes")
        .select("*", { count: "exact", head: true });

      // Get total orders
      const { count: orderCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });

      // Get orders by status
      const { data: ordersByStatus } = await supabase
        .from("orders")
        .select("status");

      const statusCounts: Record<string, number> = {};
      ordersByStatus?.forEach((order) => {
        const status = order.status || "unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      // Get monthly revenue for last 6 months
      const monthlyRevenue: { month: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);

        const { data: orders } = await supabase
          .from("orders")
          .select("total_incl_vat")
          .gte("order_date", format(start, "yyyy-MM-dd"))
          .lte("order_date", format(end, "yyyy-MM-dd"));

        const revenue = orders?.reduce((sum, o) => sum + (o.total_incl_vat || 0), 0) || 0;
        monthlyRevenue.push({
          month: format(monthDate, "MMM", { locale: nl }),
          revenue,
        });
      }

      return {
        customerCount: customerCount || 0,
        quoteCount: quoteCount || 0,
        orderCount: orderCount || 0,
        statusCounts,
        monthlyRevenue,
      };
    },
  });
}

const Reports = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: reportStats, isLoading: reportLoading } = useReportStats();

  const isLoading = statsLoading || reportLoading;

  const statusLabels: Record<string, string> = {
    nieuw: "Nieuw",
    bestel_klaar: "Bestel klaar",
    controle: "Controle",
    besteld: "Besteld",
    in_productie: "In productie",
    levering_gepland: "Levering gepland",
    geleverd: "Geleverd",
    montage_gepland: "Montage gepland",
    gemonteerd: "Gemonteerd",
    nazorg: "Nazorg",
    afgerond: "Afgerond",
  };

  return (
    <AppLayout title="Rapportages" breadcrumb="Rapportages">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-foreground">
          Rapportages
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overzicht van belangrijke statistieken en prestaties
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Laden...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Totaal Klanten
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportStats?.customerCount || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Totaal Offertes
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportStats?.quoteCount || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Totaal Orders
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportStats?.orderCount || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Conversieratio
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.conversionRate || 0}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Revenue */}
          <Card>
            <CardHeader>
              <CardTitle>Omzet per Maand</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-[200px]">
                {reportStats?.monthlyRevenue.map((item, index) => {
                  const maxRevenue = Math.max(...(reportStats?.monthlyRevenue.map(r => r.revenue) || [1]));
                  const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col items-center justify-end h-[160px]">
                        <div 
                          className="w-full max-w-[40px] bg-primary rounded-t"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{item.month}</span>
                      <span className="text-xs font-medium">{formatCurrency(item.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Orders by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Orders per Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(reportStats?.statusCounts || {}).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <span className="text-sm text-muted-foreground">
                      {statusLabels[status] || status}
                    </span>
                    <span className="text-sm font-semibold">{count as number}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
};

export default Reports;
