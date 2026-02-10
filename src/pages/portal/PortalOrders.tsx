import { useOutletContext, Link } from "react-router-dom";
import { Package, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PortalData } from "@/hooks/usePortalData";

interface PortalContext {
  portalData: PortalData;
  token: string;
}

const statusLabels: Record<string, string> = {
  nieuw: "Nieuw",
  bevestigd: "Bevestigd",
  in_productie: "In productie",
  gereed: "Gereed voor levering",
  geleverd: "Geleverd",
  gemonteerd: "Gemonteerd",
  afgehandeld: "Afgehandeld",
  geannuleerd: "Geannuleerd",
};

const statusColors: Record<string, string> = {
  nieuw: "bg-blue-100 text-blue-800 border-blue-200",
  bevestigd: "bg-indigo-100 text-indigo-800 border-indigo-200",
  in_productie: "bg-yellow-100 text-yellow-800 border-yellow-200",
  gereed: "bg-cyan-100 text-cyan-800 border-cyan-200",
  geleverd: "bg-emerald-100 text-emerald-800 border-emerald-200",
  gemonteerd: "bg-green-100 text-green-800 border-green-200",
  afgehandeld: "bg-gray-100 text-gray-800 border-gray-200",
  geannuleerd: "bg-red-100 text-red-800 border-red-200",
};

export default function PortalOrders() {
  const { portalData, token } = useOutletContext<PortalContext>();
  const { orders } = portalData;

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-medium text-foreground">Geen orders</h2>
        <p className="text-muted-foreground">U heeft nog geen orders geplaatst.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Uw orders</h1>
        <p className="text-muted-foreground mt-1">Bekijk de status en details van al uw orders.</p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <Link key={order.id} to={`/portal/${token}/orders/${order.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {order.order_date && new Date(order.order_date).toLocaleDateString("nl-NL", {
                        weekday: "long", year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge className={statusColors[order.status || ""] || "bg-muted"}>
                    {statusLabels[order.status || ""] || order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Verwachte levering</p>
                    <p className="text-sm font-medium">
                      {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString("nl-NL") : "Nog niet gepland"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Verwachte montage</p>
                    <p className="text-sm font-medium">
                      {order.expected_installation_date ? new Date(order.expected_installation_date).toLocaleDateString("nl-NL") : "Nog niet gepland"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Geleverd op</p>
                    <p className="text-sm font-medium">
                      {order.actual_delivery_date ? new Date(order.actual_delivery_date).toLocaleDateString("nl-NL") : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gemonteerd op</p>
                    <p className="text-sm font-medium">
                      {order.actual_installation_date ? new Date(order.actual_installation_date).toLocaleDateString("nl-NL") : "-"}
                    </p>
                  </div>
                </div>
                {order.customer_notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Uw opmerkingen</p>
                    <p className="text-sm">{order.customer_notes}</p>
                  </div>
                )}
                <div className="mt-4 flex items-center text-sm text-primary">
                  Bekijk details <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
