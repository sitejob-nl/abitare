import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Package,
  Plus,
  Settings,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSupplierOrders } from "@/hooks/useSupplierOrders";
import { useTradeplaceConfig, usePlaceSupplierOrder } from "@/hooks/useTradeplace";
import { useToast } from "@/hooks/use-toast";
import { PlaceSupplierOrderModal } from "./PlaceSupplierOrderModal";

interface SupplierOrdersCardProps {
  orderId: string;
  orderLines?: Array<{
    id: string;
    product_id: string | null;
    description: string;
    quantity: number | null;
    unit_price: number;
    supplier_id: string | null;
  }>;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Gereed", color: "bg-yellow-500/10 text-yellow-600", icon: Clock },
  sent: { label: "Verzonden", color: "bg-blue-500/10 text-blue-600", icon: Truck },
  confirmed: { label: "Bevestigd", color: "bg-green-500/10 text-green-600", icon: CheckCircle2 },
  shipped: { label: "Onderweg", color: "bg-purple-500/10 text-purple-600", icon: Package },
  delivered: { label: "Geleverd", color: "bg-green-600/10 text-green-700", icon: CheckCircle2 },
  cancelled: { label: "Geannuleerd", color: "bg-red-500/10 text-red-600", icon: AlertCircle },
};

function formatCurrency(value: number | null): string {
  if (value === null) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function SupplierOrdersCard({ orderId, orderLines }: SupplierOrdersCardProps) {
  const { toast } = useToast();
  const { data: config, isLoading: configLoading } = useTradeplaceConfig();
  const { data: supplierOrders, isLoading: ordersLoading } = useSupplierOrders(orderId);
  const { mutate: placeOrder, isPending: placingOrder } = usePlaceSupplierOrder();
  
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);

  const toggleExpanded = (id: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handlePlaceOrder = (supplierOrderId: string) => {
    placeOrder(supplierOrderId, {
      onSuccess: (data) => {
        toast({
          title: "Bestelling geplaatst",
          description: data.message || `Order ${data.external_order_id} is verzonden`,
        });
      },
      onError: (error) => {
        toast({
          title: "Fout bij bestellen",
          description: error instanceof Error ? error.message : "Onbekende fout",
          variant: "destructive",
        });
      },
    });
  };

  const isLoading = configLoading || ordersLoading;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Leveranciersbestellingen
              </h3>
              <p className="text-xs text-muted-foreground">
                {supplierOrders?.length || 0} bestelling(en)
              </p>
            </div>
          </div>
          {config?.configured && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4" />
              Nieuwe bestelling
            </Button>
          )}
        </div>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !config?.configured ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">Tradeplace niet geconfigureerd</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Configureer Tradeplace in Instellingen om automatisch te bestellen bij leveranciers.
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link to="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Ga naar Instellingen
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : supplierOrders?.length === 0 ? (
          <div className="text-center py-8">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              Nog geen leveranciersbestellingen
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Eerste bestelling aanmaken
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {supplierOrders?.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const isExpanded = expandedOrders.has(order.id);

              return (
                <Collapsible
                  key={order.id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(order.id)}
                >
                  <div className="rounded-lg border">
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="text-left">
                            <p className="text-sm font-medium">
                              {order.supplier?.name || "Leverancier"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.external_order_id || "Nog niet verzonden"}
                              {order.lines && ` • ${order.lines.length} artikel(en)`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className={status.color}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {status.label}
                          </Badge>
                          <span className="text-sm font-medium">
                            {formatCurrency(order.total_amount)}
                          </span>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t px-3 py-3 space-y-3">
                        {order.lines && order.lines.length > 0 && (
                          <div className="space-y-1">
                            {order.lines.map((line) => (
                              <div
                                key={line.id}
                                className="flex justify-between text-sm py-1"
                              >
                                <span className="text-muted-foreground">
                                  {line.quantity}x{" "}
                                  {line.product?.name || line.ean_code || "Product"}
                                </span>
                                <span>{formatCurrency(line.unit_price)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            {order.expected_delivery_date && (
                              <span>
                                Verwacht:{" "}
                                {format(
                                  new Date(order.expected_delivery_date),
                                  "d MMM yyyy",
                                  { locale: nl }
                                )}
                              </span>
                            )}
                          </div>
                          {order.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => handlePlaceOrder(order.id)}
                              disabled={placingOrder}
                            >
                              {placingOrder ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Truck className="mr-2 h-4 w-4" />
                              )}
                              Bestelling plaatsen
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <PlaceSupplierOrderModal
          orderId={orderId}
          orderLines={orderLines || []}
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      )}
    </div>
  );
}
