import { useOutletContext, Link } from "react-router-dom";
import { Package, FileText, Calendar, Files, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PortalData } from "@/hooks/usePortalToken";

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

export default function PortalDashboard() {
  const { portalData, token } = useOutletContext<PortalContext>();
  const { customer, orders, quotes } = portalData;

  const customerName = customer.company_name || 
    [customer.first_name, customer.last_name].filter(Boolean).join(" ");

  // Recent orders (first 3)
  const recentOrders = orders.slice(0, 3);
  
  // Active quotes (not expired)
  const activeQuotes = quotes.filter(
    (q) => q.status !== "geannuleerd" && (!q.valid_until || new Date(q.valid_until) >= new Date())
  ).slice(0, 3);

  // Orders needing planning
  const ordersNeedingPlanning = orders.filter(
    (o) => !o.expected_installation_date && o.status !== "afgehandeld" && o.status !== "geannuleerd"
  );

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welkom, {customerName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Bekijk uw orders, offertes en documenten, of geef uw voorkeursdata voor montage door.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Orders</CardDescription>
            <CardTitle className="text-3xl">{orders.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={`/portal/${token}/orders`}>
              <Button variant="ghost" size="sm" className="p-0 h-auto text-primary">
                Bekijk alle orders <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Offertes</CardDescription>
            <CardTitle className="text-3xl">{quotes.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={`/portal/${token}/quotes`}>
              <Button variant="ghost" size="sm" className="p-0 h-auto text-primary">
                Bekijk alle offertes <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Planning nodig</CardDescription>
            <CardTitle className="text-3xl">{ordersNeedingPlanning.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={`/portal/${token}/planning`}>
              <Button variant="ghost" size="sm" className="p-0 h-auto text-primary">
                Plan montage <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Documenten</CardDescription>
            <CardTitle className="text-3xl">-</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={`/portal/${token}/documents`}>
              <Button variant="ghost" size="sm" className="p-0 h-auto text-primary">
                Bekijk documenten <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Recente orders</CardTitle>
              </div>
              <Link to={`/portal/${token}/orders`}>
                <Button variant="ghost" size="sm">
                  Alles bekijken
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/portal/${token}/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">Order #{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.order_date && new Date(order.order_date).toLocaleDateString("nl-NL")}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {statusLabels[order.status || ""] || order.status}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active quotes */}
      {activeQuotes.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Openstaande offertes</CardTitle>
              </div>
              <Link to={`/portal/${token}/quotes`}>
                <Button variant="ghost" size="sm">
                  Alles bekijken
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeQuotes.map((quote) => (
                <Link
                  key={quote.id}
                  to={`/portal/${token}/quotes/${quote.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">Offerte #{quote.quote_number}</p>
                    <p className="text-sm text-muted-foreground">
                      Geldig tot: {quote.valid_until && new Date(quote.valid_until).toLocaleDateString("nl-NL")}
                    </p>
                  </div>
                  <p className="font-medium">
                    {quote.total_incl_vat?.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Planning reminder */}
      {ordersNeedingPlanning.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Montageplanning</CardTitle>
            </div>
            <CardDescription>
              U heeft {ordersNeedingPlanning.length} order(s) waarvoor nog geen montagedatum is gepland.
              Geef uw voorkeursdatums door zodat wij de montage kunnen inplannen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={`/portal/${token}/planning`}>
              <Button>
                <Calendar className="h-4 w-4 mr-2" />
                Voorkeursdatums doorgeven
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
