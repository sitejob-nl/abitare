import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Package,
  Plus,
  RefreshCw,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSupplierOrders } from "@/hooks/useSupplierOrders";
import {
  useTradeplaceConfig,
  usePlaceSupplierOrder,
  useRequestOrderStatus,
  useCancelSupplierOrder,
} from "@/hooks/useTradeplace";
import { useToast } from "@/hooks/use-toast";
import { PlaceSupplierOrderModal } from "./PlaceSupplierOrderModal";
import { formatCurrency } from "@/lib/utils";

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

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock; step: number }> = {
  pending: { label: "Gereed", color: "bg-yellow-500/10 text-yellow-600", icon: Clock, step: 0 },
  sent: { label: "Verzonden", color: "bg-blue-500/10 text-blue-600", icon: Truck, step: 1 },
  confirmed: { label: "Bevestigd", color: "bg-green-500/10 text-green-600", icon: CheckCircle2, step: 2 },
  shipped: { label: "Onderweg", color: "bg-purple-500/10 text-purple-600", icon: Package, step: 3 },
  delivered: { label: "Geleverd", color: "bg-green-600/10 text-green-700", icon: CheckCircle2, step: 4 },
  cancelled: { label: "Geannuleerd", color: "bg-red-500/10 text-red-600", icon: Ban, step: -1 },
};

const timelineSteps = [
  { key: 'pending', label: 'Aangemaakt' },
  { key: 'sent', label: 'Verzonden' },
  { key: 'confirmed', label: 'Bevestigd' },
  { key: 'shipped', label: 'Verzendnotificatie' },
  { key: 'delivered', label: 'Geleverd' },
];



export function SupplierOrdersCard({ orderId, orderLines }: SupplierOrdersCardProps) {
  const { toast } = useToast();
  const { data: config, isLoading: configLoading } = useTradeplaceConfig();
  const { data: supplierOrders, isLoading: ordersLoading } = useSupplierOrders(orderId);
  const { mutate: placeOrder, isPending: placingOrder } = usePlaceSupplierOrder();
  const { mutate: requestStatus, isPending: requestingStatus } = useRequestOrderStatus();
  const { mutate: cancelOrder, isPending: cancellingOrder } = useCancelSupplierOrder();

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cancelDialogOrder, setCancelDialogOrder] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handlePlaceOrder = (supplierOrderId: string) => {
    placeOrder(supplierOrderId, {
      onSuccess: (data) => {
        toast({ title: "Bestelling geplaatst", description: data.message || `Order ${data.external_order_id} is verzonden` });
      },
      onError: (error) => {
        toast({ title: "Fout bij bestellen", description: error instanceof Error ? error.message : "Onbekende fout", variant: "destructive" });
      },
    });
  };

  const handleRequestStatus = (supplierOrderId: string) => {
    requestStatus(supplierOrderId, {
      onSuccess: (data) => {
        toast({
          title: "Status opgehaald",
          description: data.delivery_date
            ? `Verwachte levering: ${format(new Date(data.delivery_date), "d MMM yyyy", { locale: nl })}`
            : data.message || "Status bijgewerkt",
        });
      },
      onError: (error) => {
        toast({ title: "Fout bij status opvragen", description: error instanceof Error ? error.message : "Onbekende fout", variant: "destructive" });
      },
    });
  };

  const handleCancelOrder = () => {
    if (!cancelDialogOrder) return;
    cancelOrder(
      { supplierOrderId: cancelDialogOrder },
      {
        onSuccess: (data) => {
          setCancelDialogOrder(null);
          if (data.success) {
            toast({ title: "Bestelling geannuleerd", description: data.message });
          } else {
            toast({
              title: "Annulering afgewezen",
              description: data.message || "De fabrikant heeft de annulering afgewezen.",
              variant: "destructive",
            });
          }
        },
        onError: (error) => {
          setCancelDialogOrder(null);
          toast({ title: "Fout bij annuleren", description: error instanceof Error ? error.message : "Onbekende fout", variant: "destructive" });
        },
      }
    );
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
              <h3 className="text-sm font-semibold text-foreground">Leveranciersbestellingen</h3>
              <p className="text-xs text-muted-foreground">{supplierOrders?.length || 0} bestelling(en)</p>
            </div>
          </div>
          {config?.configured && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowCreateModal(true)}>
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
                <Link to="/settings"><Settings className="mr-2 h-4 w-4" />Ga naar Instellingen</Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : supplierOrders?.length === 0 ? (
          <div className="text-center py-8">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">Nog geen leveranciersbestellingen</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />Eerste bestelling aanmaken
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {supplierOrders?.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const isExpanded = expandedOrders.has(order.id);
              const currentStep = status.step;

              return (
                <Collapsible key={order.id} open={isExpanded} onOpenChange={() => toggleExpanded(order.id)}>
                  <div className="rounded-lg border">
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <div className="text-left">
                            <p className="text-sm font-medium">{order.supplier?.name || "Leverancier"}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.external_order_id || "Nog niet verzonden"}
                              {order.lines && ` • ${order.lines.length} artikel(en)`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className={status.color}>
                            <StatusIcon className="mr-1 h-3 w-3" />{status.label}
                          </Badge>
                          <span className="text-sm font-medium">{formatCurrency(order.total_amount)}</span>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t px-3 py-3 space-y-3">
                        {/* Timeline */}
                        {order.status !== 'cancelled' && (
                          <div className="flex items-center gap-1 py-2">
                            {timelineSteps.map((step, idx) => {
                              const isActive = currentStep >= idx;
                              const isCurrent = currentStep === idx;
                              return (
                                <div key={step.key} className="flex items-center flex-1">
                                  <div className="flex flex-col items-center flex-1">
                                    <div className={`h-2.5 w-2.5 rounded-full border-2 ${isCurrent ? 'border-primary bg-primary' : isActive ? 'border-primary bg-primary/30' : 'border-muted-foreground/30 bg-transparent'}`} />
                                    <span className={`text-[10px] mt-1 ${isCurrent ? 'text-primary font-medium' : isActive ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                                      {step.label}
                                    </span>
                                  </div>
                                  {idx < timelineSteps.length - 1 && (
                                    <div className={`h-0.5 flex-1 -mt-4 ${isActive && currentStep > idx ? 'bg-primary/50' : 'bg-muted-foreground/20'}`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Invoice info */}
                        {(order.invoice_number || order.invoice_amount) && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
                            <FileText className="h-3.5 w-3.5" />
                            <span>
                              Factuur: {order.invoice_number || '—'}
                              {order.invoice_amount && ` • ${formatCurrency(order.invoice_amount)}`}
                              {order.invoice_date && ` • ${format(new Date(order.invoice_date), "d MMM yyyy", { locale: nl })}`}
                            </span>
                          </div>
                        )}

                        {/* Order lines */}
                        {order.lines && order.lines.length > 0 && (
                          <div className="space-y-1">
                            {order.lines.map((line: any) => (
                              <div key={line.id} className="flex justify-between items-center text-sm py-1">
                                <div className="flex-1 min-w-0">
                                  <span className="text-muted-foreground">
                                    {line.quantity}x {line.product?.name || line.ean_code || "Product"}
                                  </span>
                                  {line.metadata && (
                                    <div className="flex gap-2 mt-0.5">
                                      {line.metadata.backorder_qty > 0 && (
                                        <Badge variant="outline" className="text-[10px] h-4 bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                          Backorder: {line.metadata.backorder_qty}
                                        </Badge>
                                      )}
                                      {line.metadata.rejected_qty > 0 && (
                                        <Badge variant="outline" className="text-[10px] h-4 bg-red-500/10 text-red-600 border-red-500/20">
                                          Afgewezen: {line.metadata.rejected_qty}
                                        </Badge>
                                      )}
                                      {line.metadata.delivered_qty > 0 && (
                                        <Badge variant="outline" className="text-[10px] h-4 bg-green-500/10 text-green-600 border-green-500/20">
                                          Geleverd: {line.metadata.delivered_qty}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <span>{formatCurrency(line.unit_price)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions footer */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            {order.expected_delivery_date && (
                              <span>Verwacht: {format(new Date(order.expected_delivery_date), "d MMM yyyy", { locale: nl })}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Status opvragen */}
                            {['sent', 'confirmed', 'shipped'].includes(order.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRequestStatus(order.id)}
                                disabled={requestingStatus}
                              >
                                {requestingStatus ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                                Status
                              </Button>
                            )}

                            {/* Annuleren */}
                            {['sent', 'confirmed'].includes(order.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setCancelDialogOrder(order.id)}
                              >
                                <Ban className="mr-1.5 h-3.5 w-3.5" />
                                Annuleren
                              </Button>
                            )}

                            {/* Bestelling plaatsen */}
                            {order.status === "pending" && (
                              <Button size="sm" onClick={() => handlePlaceOrder(order.id)} disabled={placingOrder}>
                                {placingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
                                Bestelling plaatsen
                              </Button>
                            )}
                          </div>
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

      {/* Cancel confirmation dialog */}
      <Dialog open={!!cancelDialogOrder} onOpenChange={() => setCancelDialogOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bestelling annuleren?</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je deze bestelling wilt annuleren? De fabrikant kan de annulering weigeren als de order al in productie is.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOrder(null)}>Terug</Button>
            <Button variant="destructive" onClick={handleCancelOrder} disabled={cancellingOrder}>
              {cancellingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Annuleren bevestigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
