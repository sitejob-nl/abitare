import { cn } from "@/lib/utils";

interface Order {
  id: string;
  customer: string;
  amount: string;
  status: "active" | "pending" | "inactive";
  statusLabel: string;
}

const orders: Order[] = [
  {
    id: "#2025-042",
    customer: "Fam. Kohlen",
    amount: "€ 31.700",
    status: "active",
    statusLabel: "Besteld",
  },
  {
    id: "#2025-041",
    customer: "Dhr. Hendrikx",
    amount: "€ 18.450",
    status: "pending",
    statusLabel: "Montage gepland",
  },
  {
    id: "#2025-040",
    customer: "Mevr. Smeets",
    amount: "€ 24.890",
    status: "active",
    statusLabel: "In productie",
  },
];

export function RecentOrders() {
  return (
    <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <h2 className="text-base font-semibold text-foreground">Recente Orders</h2>
        <button className="text-[13px] font-medium text-primary hover:underline">
          Alle orders →
        </button>
      </div>
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
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-b border-border-light last:border-b-0 hover:bg-muted/30"
            >
              <td className="px-5 py-4 text-sm font-semibold text-foreground">
                {order.id}
              </td>
              <td className="px-5 py-4 text-sm text-foreground">{order.customer}</td>
              <td className="px-5 py-4 text-sm text-foreground">{order.amount}</td>
              <td className="px-5 py-4">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                    order.status === "active" && "status-active",
                    order.status === "pending" && "status-pending",
                    order.status === "inactive" && "status-inactive"
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {order.statusLabel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
