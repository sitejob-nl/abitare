import { cn } from "@/lib/utils";
import { useRecentOrders } from "@/hooks/useOrders";
import { Loader2 } from "lucide-react";

type OrderStatus = "nieuw" | "bestel_klaar" | "controle" | "besteld" | "in_productie" | "levering_gepland" | "geleverd" | "montage_gepland" | "gemonteerd" | "nazorg" | "afgerond";

const statusLabels: Record<OrderStatus, string> = {
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

const statusStyles: Record<OrderStatus, "active" | "pending" | "inactive"> = {
  nieuw: "pending",
  bestel_klaar: "pending",
  controle: "pending",
  besteld: "active",
  in_productie: "active",
  levering_gepland: "active",
  geleverd: "active",
  montage_gepland: "pending",
  gemonteerd: "active",
  nazorg: "pending",
  afgerond: "inactive",
};

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "€ 0";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getCustomerName(customer: { first_name?: string | null; last_name?: string | null; company_name?: string | null } | null): string {
  if (!customer) return "Onbekend";
  if (customer.company_name) return customer.company_name;
  const parts = [customer.first_name, customer.last_name].filter(Boolean);
  return parts.join(" ") || "Onbekend";
}

export function RecentOrders() {
  const { data: orders, isLoading } = useRecentOrders(5);

  return (
    <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <h2 className="text-base font-semibold text-foreground">Recente Orders</h2>
        <button className="text-[13px] font-medium text-primary hover:underline">
          Alle orders →
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : orders && orders.length > 0 ? (
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
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const status = order.status as OrderStatus;
              const statusLabel = statusLabels[status] || status;
              const statusStyle = statusStyles[status] || "inactive";
              const customerName = getCustomerName(order.customer as { first_name?: string | null; last_name?: string | null; company_name?: string | null } | null);

              return (
                <tr
                  key={order.id}
                  className="border-b border-border-light last:border-b-0 hover:bg-muted/30"
                >
                  <td className="px-5 py-4 text-sm font-semibold text-foreground">
                    #{order.order_number}
                  </td>
                  <td className="px-5 py-4 text-sm text-foreground">{customerName}</td>
                  <td className="px-5 py-4 text-sm text-foreground">
                    {formatCurrency(order.total_incl_vat)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                        statusStyle === "active" && "status-active",
                        statusStyle === "pending" && "status-pending",
                        statusStyle === "inactive" && "status-inactive"
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Nog geen orders aanwezig</p>
        </div>
      )}
    </div>
  );
}
