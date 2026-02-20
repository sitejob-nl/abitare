import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, Wrench, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string }> = {
  montage_gepland: { label: "Gepland", color: "bg-blue-100 text-blue-800" },
  gemonteerd: { label: "Gemonteerd", color: "bg-green-100 text-green-800" },
};

function useInstallationOrders(statusFilter: string | null) {
  return useQuery({
    queryKey: ["installation-orders", statusFilter],
    queryFn: async () => {
      // Stap 1: Haal orders op zonder installer join
      let query = supabase
        .from("orders")
        .select(`
          id, order_number, expected_installation_date, actual_installation_date,
          status, requires_elevator, installer_id, forecast_week,
          customer:customers(id, first_name, last_name, company_name, city, delivery_floor)
        `)
        .in("status", ["montage_gepland", "gemonteerd", "geleverd"])
        .order("expected_installation_date", { ascending: true });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter as "montage_gepland" | "gemonteerd" | "geleverd");
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      // Stap 2: Haal unieke installer IDs op
      const installerIds = [...new Set(
        orders
          ?.filter(o => o.installer_id)
          .map(o => o.installer_id) || []
      )] as string[];

      // Stap 3: Haal profiles op voor alle installers
      let profilesMap: Record<string, { full_name: string }> = {};
      if (installerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", installerIds);
        
        profiles?.forEach(p => {
          profilesMap[p.id] = { full_name: p.full_name || "" };
        });
      }

      // Stap 4: Combineer data
      return orders?.map(order => ({
        ...order,
        installer: order.installer_id ? profilesMap[order.installer_id] : null
      })) || [];
    },
  });
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

const Installation = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [weekFilter, setWeekFilter] = useState<string>("all");

  const { data: orders, isLoading } = useInstallationOrders(statusFilter);

  // Get unique forecast weeks for filter
  const forecastWeeks = [...new Set(
    orders?.map(o => (o as any).forecast_week).filter(Boolean) || []
  )].sort();

  // Filter by search and week client-side
  const filteredOrders = orders?.filter((order) => {
    // Week filter
    if (weekFilter !== "all") {
      if ((order as any).forecast_week !== weekFilter) return false;
    }
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const customer = order.customer as { first_name?: string | null; last_name?: string | null; company_name?: string | null; city?: string | null } | null;
    const customerName = getCustomerName(customer).toLowerCase();
    const city = (customer?.city || "").toLowerCase();
    const orderNum = order.order_number.toString();
    return customerName.includes(searchLower) || city.includes(searchLower) || orderNum.includes(searchQuery);
  });

  return (
    <AppLayout title="Montage" breadcrumb="Montage">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-foreground">
          Montage Planning
        </h1>
      </div>

      {/* Filters Bar */}
      <div className="mb-5 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground hidden sm:inline">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[160px] text-[13px]">
              <SelectValue placeholder="Alle statussen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="montage_gepland">Gepland</SelectItem>
              <SelectItem value="gemonteerd">Gemonteerd</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {forecastWeeks.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground hidden sm:inline">Week:</span>
            <Select value={weekFilter} onValueChange={setWeekFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[140px] text-[13px]">
                <SelectValue placeholder="Alle weken" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle weken</SelectItem>
                {forecastWeeks.map((w) => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="relative sm:ml-auto w-full sm:max-w-[300px] sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op klant, stad of ordernummer..."
            className="h-9 pl-9 text-[13px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Installation Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Laden...</span>
          </div>
        ) : filteredOrders && filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const customer = order.customer as { first_name?: string | null; last_name?: string | null; company_name?: string | null; city?: string | null; delivery_floor?: string | null } | null;
            const installer = order.installer as { full_name?: string } | null;
            const status = order.status as keyof typeof statusConfig;
            const statusCfg = statusConfig[status] || { label: status, color: "bg-gray-100 text-gray-800" };

            return (
              <div
                key={order.id}
                onClick={() => navigate(`/installation/${order.id}`)}
                className="animate-fade-in cursor-pointer rounded-xl border border-border bg-card p-4 sm:p-5 transition-colors hover:bg-muted/30"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={cn(
                      "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg shrink-0",
                      order.status === "gemonteerd" ? "bg-green-100" : "bg-blue-100"
                    )}>
                      {order.status === "gemonteerd" ? (
                        <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                      ) : (
                        <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">
                          Order #{order.order_number}
                        </span>
                        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", statusCfg.color)}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-foreground truncate">
                        {getCustomerName(customer)}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {customer?.city || "-"}
                        {customer?.delivery_floor && ` • Verdieping ${customer.delivery_floor}`}
                        {order.requires_elevator && " • 🏗️ Lift nodig"}
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right pl-13 sm:pl-0">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {order.status === "gemonteerd" ? "Uitgevoerd" : "Gepland"}
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {formatDate(order.status === "gemonteerd" ? order.actual_installation_date : order.expected_installation_date)}
                    </div>
                    {installer?.full_name && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Monteur: {installer.full_name}
                      </div>
                    )}
                    {(order as any).forecast_week && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Prognose: {(order as any).forecast_week}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-border bg-card py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Geen montages gevonden voor deze zoekopdracht" : "Geen montages gepland"}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Installation;
