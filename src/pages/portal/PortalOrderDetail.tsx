import { useOutletContext, useParams, Link } from "react-router-dom";
import { ArrowLeft, Package, Truck, Wrench, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePortalOrderDetail } from "@/hooks/usePortalData";
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

export default function PortalOrderDetail() {
  const { portalData, token } = useOutletContext<PortalContext>();
  const { orderId } = useParams<{ orderId: string }>();
  const order = portalData.orders.find((o) => o.id === orderId);

  const { data: detail } = usePortalOrderDetail(token, orderId);
  const orderLines = detail?.lines || [];
  const statusHistory = detail?.statusHistory || [];

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-medium text-foreground">Order niet gevonden</h2>
        <Link to={`/portal/${token}/orders`}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Terug naar orders
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/portal/${token}/orders`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">Order #{order.order_number}</h1>
            <Badge className={statusColors[order.status || ""] || "bg-muted"}>
              {statusLabels[order.status || ""] || order.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Geplaatst op {order.order_date && new Date(order.order_date).toLocaleDateString("nl-NL", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Verwachte levering", value: order.expected_delivery_date, icon: Truck, bg: "bg-cyan-100", fg: "text-cyan-600" },
          { label: "Verwachte montage", value: order.expected_installation_date, icon: Wrench, bg: "bg-emerald-100", fg: "text-emerald-600" },
          { label: "Geleverd op", value: order.actual_delivery_date, icon: Calendar, bg: "bg-blue-100", fg: "text-blue-600" },
          { label: "Gemonteerd op", value: order.actual_installation_date, icon: Calendar, bg: "bg-green-100", fg: "text-green-600" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full ${item.bg} p-2`}>
                    <Icon className={`h-5 w-5 ${item.fg}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-medium">
                      {item.value ? new Date(item.value).toLocaleDateString("nl-NL") : item.label.startsWith("Verwachte") ? "Nog niet gepland" : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Producten</CardTitle></CardHeader>
        <CardContent>
          {orderLines.length > 0 ? (
            <div className="divide-y">
              {orderLines.map((line: { id: string; description: string; quantity: number; unit: string; article_code: string | null }) => (
                <div key={line.id} className="py-3 flex items-start justify-between">
                  <div>
                    <p className="font-medium">{line.description}</p>
                    {line.article_code && <p className="text-xs text-muted-foreground">Art.nr: {line.article_code}</p>}
                  </div>
                  <p className="text-sm text-muted-foreground">{line.quantity} {line.unit}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Geen producten gevonden.</p>
          )}
        </CardContent>
      </Card>

      {(order.customer_notes || order.delivery_notes) && (
        <Card>
          <CardHeader><CardTitle>Opmerkingen</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {order.customer_notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Uw opmerkingen</p>
                <p className="text-sm">{order.customer_notes}</p>
              </div>
            )}
            {order.delivery_notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Leveropmerkingen</p>
                <p className="text-sm">{order.delivery_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {statusHistory.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Statusgeschiedenis</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statusHistory.map((entry: { id: string; to_status: string; created_at: string }, index: number) => (
                <div key={entry.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    {index < statusHistory.length - 1 && <div className="w-px h-8 bg-border" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="font-medium text-sm">{statusLabels[entry.to_status] || entry.to_status}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("nl-NL", {
                        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!order.expected_installation_date && order.status !== "afgehandeld" && order.status !== "geannuleerd" && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Montageplanning</p>
                <p className="text-sm text-muted-foreground">Geef uw voorkeursdatums door voor de montage.</p>
              </div>
              <Link to={`/portal/${token}/planning`}>
                <Button><Calendar className="h-4 w-4 mr-2" /> Planning doorgeven</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
