import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Package, ArrowRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCustomerOrders } from "@/hooks/useCustomerOrders";
import { formatCurrencyCompact as formatCurrency } from "@/lib/utils";

interface CustomerOrdersTabProps {
  customerId: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  nieuw: { label: "Nieuw", variant: "secondary" },
  bestel_klaar: { label: "Bestel klaar", variant: "secondary" },
  controle: { label: "Controle", variant: "secondary" },
  besteld: { label: "Besteld", variant: "default" },
  in_productie: { label: "In productie", variant: "default" },
  levering_gepland: { label: "Levering gepland", variant: "default" },
  geleverd: { label: "Geleverd", variant: "default" },
  montage_gepland: { label: "Montage gepland", variant: "default" },
  gemonteerd: { label: "Gemonteerd", variant: "default" },
  nazorg: { label: "Nazorg", variant: "outline" },
  afgerond: { label: "Afgerond", variant: "outline" },
};


export function CustomerOrdersTab({ customerId }: CustomerOrdersTabProps) {
  const navigate = useNavigate();
  const { data: orders, isLoading } = useCustomerOrders(customerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Nog geen orders voor deze klant</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => {
        const status = statusConfig[order.status || "nieuw"] || statusConfig.nieuw;

        return (
          <div
            key={order.id}
            onClick={() => navigate(`/orders/${order.id}`)}
            className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">#{order.order_number}</span>
                  <Badge variant={status.variant} className="text-xs">
                    {status.label}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {order.order_date
                    ? format(new Date(order.order_date), "d MMM yyyy", { locale: nl })
                    : "-"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {formatCurrency(order.total_incl_vat)}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
