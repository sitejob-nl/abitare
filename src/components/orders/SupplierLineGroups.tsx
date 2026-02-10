import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Package,
  ShoppingCart,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCreateSupplierOrder } from "@/hooks/useSupplierOrders";
import { useTradeplaceConfig, usePlaceSupplierOrder } from "@/hooks/useTradeplace";
import { useToast } from "@/hooks/use-toast";

interface OrderLine {
  id: string;
  description: string;
  article_code: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number;
  cost_price: number | null;
  line_total: number | null;
  is_ordered: boolean | null;
  is_group_header: boolean | null;
  product_id: string | null;
  supplier_id: string | null;
  supplier?: { id: string; name: string; code: string } | null;
}

interface SupplierLineGroupsProps {
  orderId: string;
  lines: OrderLine[];
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

interface SupplierGroup {
  supplierId: string | null;
  supplierName: string;
  supplierCode: string;
  lines: OrderLine[];
  total: number;
  allOrdered: boolean;
  orderedCount: number;
}

export function SupplierLineGroups({ orderId, lines }: SupplierLineGroupsProps) {
  const { toast } = useToast();
  const { data: config } = useTradeplaceConfig();
  const { mutate: createOrder, isPending: creating } = useCreateSupplierOrder();
  const { mutate: placeOrder, isPending: placing } = usePlaceSupplierOrder();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedLines, setSelectedLines] = useState<Record<string, Set<string>>>({});

  // Group lines by supplier
  const groups = useMemo<SupplierGroup[]>(() => {
    const map = new Map<string, SupplierGroup>();
    const orderableLines = lines.filter(
      (l) => !l.is_group_header && l.supplier_id
    );

    orderableLines.forEach((line) => {
      const key = line.supplier_id || "__none__";
      const supplier = line.supplier;
      if (!map.has(key)) {
        map.set(key, {
          supplierId: line.supplier_id,
          supplierName: supplier?.name || "Onbekende leverancier",
          supplierCode: supplier?.code || "",
          lines: [],
          total: 0,
          allOrdered: true,
          orderedCount: 0,
        });
      }
      const group = map.get(key)!;
      group.lines.push(line);
      group.total += line.line_total || 0;
      if (!line.is_ordered) group.allOrdered = false;
      if (line.is_ordered) group.orderedCount++;
    });

    return Array.from(map.values()).sort((a, b) =>
      a.supplierName.localeCompare(b.supplierName)
    );
  }, [lines]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleLine = (groupKey: string, lineId: string) => {
    setSelectedLines((prev) => {
      const groupSet = new Set(prev[groupKey] || []);
      groupSet.has(lineId) ? groupSet.delete(lineId) : groupSet.add(lineId);
      return { ...prev, [groupKey]: groupSet };
    });
  };

  const toggleAllInGroup = (groupKey: string, groupLines: OrderLine[]) => {
    setSelectedLines((prev) => {
      const unordered = groupLines.filter((l) => !l.is_ordered);
      const current = prev[groupKey] || new Set();
      const allSelected = unordered.every((l) => current.has(l.id));
      return {
        ...prev,
        [groupKey]: allSelected
          ? new Set<string>()
          : new Set(unordered.map((l) => l.id)),
      };
    });
  };

  const handlePlaceOrder = (group: SupplierGroup) => {
    const groupKey = group.supplierId || "__none__";
    const selected = selectedLines[groupKey];
    const linesToOrder = selected && selected.size > 0
      ? group.lines.filter((l) => selected.has(l.id))
      : group.lines.filter((l) => !l.is_ordered);

    if (linesToOrder.length === 0) {
      toast({
        title: "Geen regels",
        description: "Er zijn geen onbestelde regels om te bestellen.",
        variant: "destructive",
      });
      return;
    }

    if (!group.supplierId) return;

    createOrder(
      {
        order_id: orderId,
        supplier_id: group.supplierId,
        lines: linesToOrder.map((l) => ({
          order_line_id: l.id,
          product_id: l.product_id || undefined,
          quantity: l.quantity || 1,
          unit_price: l.cost_price ?? l.unit_price,
        })),
      },
      {
        onSuccess: (supplierOrder) => {
          if (config?.configured) {
            placeOrder(supplierOrder.id, {
              onSuccess: (data) => {
                toast({
                  title: "Bestelling geplaatst",
                  description: data.message || `Order ${data.external_order_id} is verzonden naar ${group.supplierName}`,
                });
                setSelectedLines((prev) => ({ ...prev, [groupKey]: new Set() }));
              },
              onError: () => {
                toast({
                  title: "Bestelling aangemaakt",
                  description: "Aangemaakt maar kon niet automatisch worden verzonden.",
                });
                setSelectedLines((prev) => ({ ...prev, [groupKey]: new Set() }));
              },
            });
          } else {
            toast({
              title: "Bestelling aangemaakt",
              description: `Bestelling voor ${group.supplierName} is klaargezet.`,
            });
            setSelectedLines((prev) => ({ ...prev, [groupKey]: new Set() }));
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

  if (groups.length === 0) {
    return null;
  }

  const isPending = creating || placing;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Bestellen per leverancier
            </h3>
            <p className="text-xs text-muted-foreground">
              {groups.length} leverancier(s) •{" "}
              {lines.filter((l) => !l.is_group_header && l.supplier_id && l.is_ordered).length}/
              {lines.filter((l) => !l.is_group_header && l.supplier_id).length} besteld
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {groups.map((group) => {
          const groupKey = group.supplierId || "__none__";
          const isExpanded = expandedGroups.has(groupKey);
          const selected = selectedLines[groupKey] || new Set();
          const unorderedLines = group.lines.filter((l) => !l.is_ordered);

          return (
            <Collapsible
              key={groupKey}
              open={isExpanded}
              onOpenChange={() => toggleGroup(groupKey)}
            >
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{group.supplierName}</p>
                        {group.supplierCode && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {group.supplierCode}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {group.lines.length} regel(s) • {group.orderedCount}/{group.lines.length} besteld
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {group.allOrdered ? (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Besteld
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                        <Package className="mr-1 h-3 w-3" />
                        Open
                      </Badge>
                    )}
                    <span className="text-sm font-medium">
                      {formatCurrency(group.total)}
                    </span>
                  </div>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t">
                  {/* Select all + Order button */}
                  {unorderedLines.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={
                            unorderedLines.length > 0 &&
                            unorderedLines.every((l) => selected.has(l.id))
                          }
                          onCheckedChange={() => toggleAllInGroup(groupKey, group.lines)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {selected.size > 0
                            ? `${selected.size} geselecteerd`
                            : "Alles selecteren"}
                        </span>
                      </label>
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1.5 h-8"
                        disabled={isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaceOrder(group);
                        }}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {selected.size > 0
                          ? `${selected.size} bestellen`
                          : `${unorderedLines.length} bestellen`}
                      </Button>
                    </div>
                  )}

                  {/* Lines */}
                  <div className="divide-y divide-border/50">
                    {group.lines.map((line) => (
                      <div
                        key={line.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30"
                      >
                        {!line.is_ordered && (
                          <Checkbox
                            checked={selected.has(line.id)}
                            onCheckedChange={() => toggleLine(groupKey, line.id)}
                          />
                        )}
                        {line.is_ordered && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{line.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {line.article_code && (
                              <span className="font-mono">{line.article_code}</span>
                            )}
                            <span>
                              {line.quantity} {line.unit || "st"}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-medium shrink-0">
                          {formatCurrency(line.line_total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
