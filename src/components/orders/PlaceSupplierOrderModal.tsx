import { useState, useMemo } from "react";
import { Loader2, Package, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCreateSupplierOrder } from "@/hooks/useSupplierOrders";
import { useTradeplaceConfig, usePlaceSupplierOrder } from "@/hooks/useTradeplace";
import { useToast } from "@/hooks/use-toast";

interface OrderLine {
  id: string;
  product_id: string | null;
  description: string;
  quantity: number | null;
  unit_price: number;
  supplier_id: string | null;
}

interface PlaceSupplierOrderModalProps {
  orderId: string;
  orderLines: OrderLine[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function PlaceSupplierOrderModal({
  orderId,
  orderLines,
  open,
  onOpenChange,
}: PlaceSupplierOrderModalProps) {
  const { toast } = useToast();
  const { data: config } = useTradeplaceConfig();
  const { data: suppliers } = useSuppliers();
  const { mutate: createOrder, isPending: creating } = useCreateSupplierOrder();
  const { mutate: placeOrder, isPending: placing } = usePlaceSupplierOrder();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const [autoPlace, setAutoPlace] = useState(true);

  // Filter suppliers with Tradeplace enabled
  const tradeplaceSuppliers = useMemo(() => {
    return suppliers?.filter((s) => s.tradeplace_enabled && s.tradeplace_gln) || [];
  }, [suppliers]);

  // Filter order lines that can be ordered
  const orderableLines = useMemo(() => {
    return orderLines.filter(
      (line) => line.quantity && line.quantity > 0 && !line.description.toLowerCase().includes("montage")
    );
  }, [orderLines]);

  // Calculate total for selected lines
  const selectedTotal = useMemo(() => {
    return orderableLines
      .filter((line) => selectedLines.has(line.id))
      .reduce((sum, line) => sum + (line.quantity || 1) * line.unit_price, 0);
  }, [orderableLines, selectedLines]);

  const toggleLine = (lineId: string) => {
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedLines.size === orderableLines.length) {
      setSelectedLines(new Set());
    } else {
      setSelectedLines(new Set(orderableLines.map((l) => l.id)));
    }
  };

  const handleSubmit = () => {
    if (!selectedSupplierId || selectedLines.size === 0) return;

    const linesToOrder = orderableLines
      .filter((line) => selectedLines.has(line.id))
      .map((line) => ({
        order_line_id: line.id,
        product_id: line.product_id || undefined,
        quantity: line.quantity || 1,
        unit_price: line.unit_price,
      }));

    createOrder(
      {
        order_id: orderId,
        supplier_id: selectedSupplierId,
        lines: linesToOrder,
      },
      {
        onSuccess: (supplierOrder) => {
          if (autoPlace && config?.configured) {
            placeOrder(supplierOrder.id, {
              onSuccess: (data) => {
                toast({
                  title: "Bestelling geplaatst",
                  description: data.message || `Order ${data.external_order_id} is verzonden`,
                });
                onOpenChange(false);
              },
              onError: (error) => {
                toast({
                  title: "Bestelling aangemaakt",
                  description: "De bestelling is aangemaakt maar kon niet automatisch worden verzonden",
                  variant: "destructive",
                });
                onOpenChange(false);
              },
            });
          } else {
            toast({
              title: "Bestelling aangemaakt",
              description: "De bestelling is klaargemaakt en kan worden verzonden",
            });
            onOpenChange(false);
          }
        },
        onError: (error) => {
          toast({
            title: "Fout",
            description: error instanceof Error ? error.message : "Kon bestelling niet aanmaken",
            variant: "destructive",
          });
        },
      }
    );
  };

  const isLoading = creating || placing;
  const selectedSupplier = suppliers?.find((s) => s.id === selectedSupplierId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nieuwe leveranciersbestelling</DialogTitle>
          <DialogDescription>
            Selecteer producten om te bestellen bij een leverancier
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!config?.configured && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Tradeplace is niet geconfigureerd. Je kunt bestellingen aanmaken maar niet automatisch verzenden.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Leverancier</Label>
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer leverancier..." />
              </SelectTrigger>
              <SelectContent>
                {tradeplaceSuppliers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Geen leveranciers met Tradeplace gekoppeld
                  </div>
                ) : (
                  tradeplaceSuppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Producten</Label>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedLines.size === orderableLines.length
                  ? "Deselecteer alles"
                  : "Selecteer alles"}
              </Button>
            </div>
            <div className="border rounded-lg divide-y max-h-[240px] overflow-y-auto">
              {orderableLines.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  Geen bestelbare producten gevonden
                </div>
              ) : (
                orderableLines.map((line) => (
                  <label
                    key={line.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedLines.has(line.id)}
                      onCheckedChange={() => toggleLine(line.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {line.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {line.quantity}x @ {formatCurrency(line.unit_price)}
                      </p>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency((line.quantity || 1) * line.unit_price)}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {selectedLines.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedLines.size} product(en) geselecteerd
              </span>
              <span className="text-sm font-semibold">
                Totaal: {formatCurrency(selectedTotal)}
              </span>
            </div>
          )}

          {config?.configured && selectedSupplierId && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-place"
                checked={autoPlace}
                onCheckedChange={(checked) => setAutoPlace(!!checked)}
              />
              <Label htmlFor="auto-place" className="text-sm cursor-pointer">
                Direct verzenden naar {selectedSupplier?.name || "leverancier"}
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !selectedSupplierId || selectedLines.size === 0}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {autoPlace && config?.configured ? "Bestelling plaatsen" : "Bestelling aanmaken"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
