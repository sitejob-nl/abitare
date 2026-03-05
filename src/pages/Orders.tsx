import { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Loader2, LayoutList, Kanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrders, OrderStatus } from "@/hooks/useOrders";
import { useDivisions } from "@/hooks/useDivisions";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { OrderKanbanBoard } from "@/components/orders/OrderKanbanBoard";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  nieuw: { label: "Nieuw", color: "bg-blue-100 text-blue-800" },
  bestel_klaar: { label: "Bestel klaar", color: "bg-yellow-100 text-yellow-800" },
  controle: { label: "Controle", color: "bg-orange-100 text-orange-800" },
  besteld: { label: "Besteld", color: "bg-purple-100 text-purple-800" },
  in_productie: { label: "In productie", color: "bg-indigo-100 text-indigo-800" },
  levering_gepland: { label: "Levering gepland", color: "bg-cyan-100 text-cyan-800" },
  geleverd: { label: "Geleverd", color: "bg-teal-100 text-teal-800" },
  montage_gepland: { label: "Montage gepland", color: "bg-emerald-100 text-emerald-800" },
  gemonteerd: { label: "Gemonteerd", color: "bg-green-100 text-green-800" },
  nazorg: { label: "Nazorg", color: "bg-amber-100 text-amber-800" },
  afgerond: { label: "Afgerond", color: "bg-gray-100 text-gray-800" },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-red-100 text-red-800" },
  deels_betaald: { label: "Deels betaald", color: "bg-yellow-100 text-yellow-800" },
  betaald: { label: "Betaald", color: "bg-green-100 text-green-800" },
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

type ViewMode = "list" | "kanban";

const OrdersPage = () => {
  const navigate = useNavigate();
  const { activeDivisionId, setActiveDivisionId } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Local division filter synced with global state
  const divisionFilter = activeDivisionId || "all";
  const setDivisionFilter = (value: string) => {
    setActiveDivisionId(value === "all" ? null : value);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const { data: divisions, isLoading: divisionsLoading } = useDivisions();
  const { data: orders, isLoading: ordersLoading } = useOrders({
    divisionId: divisionFilter === "all" ? null : divisionFilter,
    status: statusFilter === "all" ? null : (statusFilter as OrderStatus),
  });

  // Filter by search client-side (for order number and customer name)
  const filteredOrders = orders?.filter((order) => {
    if (!debouncedSearch) return true;
    const searchLower = debouncedSearch.toLowerCase();
    const customer = order.customer as { first_name?: string | null; last_name?: string | null; company_name?: string | null } | null;
    const customerName = getCustomerName(customer).toLowerCase();
    const orderNum = order.order_number.toString();
    return customerName.includes(searchLower) || orderNum.includes(debouncedSearch);
  });

  const isLoading = ordersLoading || divisionsLoading;

  return (
    <AppLayout title="Orders" breadcrumb="Orders">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-[28px] font-semibold text-foreground">
          Orders
        </h1>
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="bg-muted p-1 rounded-lg"
          >
            <ToggleGroupItem value="list" aria-label="Lijstweergave" className="h-8 w-8 p-0">
              <LayoutList className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Kanbanweergave" className="h-8 w-8 p-0">
              <Kanban className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nieuwe order</span>
            <span className="sm:hidden">Nieuw</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-5 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground hidden sm:inline">Vestiging:</span>
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[160px] text-[13px]">
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

        {viewMode === "list" && (
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground hidden sm:inline">Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[160px] text-[13px]">
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
        )}

        <div className="relative sm:ml-auto w-full sm:max-w-[300px] sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op ordernummer of klant..."
            className="h-9 pl-9 text-[13px]"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <OrderKanbanBoard orders={filteredOrders} isLoading={isLoading} />
      )}

      {/* List View */}
      {viewMode === "list" && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Laden...</span>
            </div>
          ) : filteredOrders && filteredOrders.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Order
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
                        Betaling
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Leverdatum
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const customer = order.customer as { first_name?: string | null; last_name?: string | null; company_name?: string | null } | null;
                      const status = order.status as OrderStatus;
                      const paymentStatus = order.payment_status || "open";
                      const statusCfg = statusConfig[status] || statusConfig.nieuw;
                      const paymentCfg = paymentStatusConfig[paymentStatus] || paymentStatusConfig.open;

                      return (
                        <tr
                          key={order.id}
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="cursor-pointer border-b border-border-light last:border-b-0 transition-colors hover:bg-muted/30"
                        >
                          <td className="px-5 py-4">
                            <span className="text-sm font-medium text-foreground">
                              #{order.order_number}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm text-foreground">
                              {getCustomerName(customer)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-medium text-foreground">
                              {formatCurrency(order.total_incl_vat)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", statusCfg.color)}>
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", paymentCfg.color)}>
                              {paymentCfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-muted-foreground">
                            {formatDate(order.expected_delivery_date)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredOrders.map((order) => {
                  const customer = order.customer as { first_name?: string | null; last_name?: string | null; company_name?: string | null } | null;
                  const status = order.status as OrderStatus;
                  const paymentStatus = order.payment_status || "open";
                  const statusCfg = statusConfig[status] || statusConfig.nieuw;
                  const paymentCfg = paymentStatusConfig[paymentStatus] || paymentStatusConfig.open;

                  return (
                    <div
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="p-4 rounded-xl border border-border bg-card cursor-pointer transition-colors hover:bg-muted/30 active:bg-muted/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-sm font-semibold text-foreground">
                            Order #{order.order_number}
                          </span>
                          <div className="text-sm text-foreground mt-0.5">
                            {getCustomerName(customer)}
                          </div>
                        </div>
                        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", statusCfg.color)}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light">
                        <div>
                          <span className="text-sm font-medium text-foreground">
                            {formatCurrency(order.total_incl_vat)}
                          </span>
                          <span className={cn("ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium", paymentCfg.color)}>
                            {paymentCfg.label}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(order.expected_delivery_date)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-border bg-card py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {debouncedSearch ? "Geen orders gevonden voor deze zoekopdracht" : "Nog geen orders aanwezig"}
              </p>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
};

export default OrdersPage;
