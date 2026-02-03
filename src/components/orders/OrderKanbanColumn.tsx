import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { OrderKanbanCard } from "./OrderKanbanCard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Order {
  id: string;
  order_number: number;
  total_incl_vat: number | null;
  expected_delivery_date: string | null;
  payment_status: string | null;
  customer: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
  } | null;
}

interface OrderKanbanColumnProps {
  id: string;
  title: string;
  color: string;
  orders: Order[];
}

export function OrderKanbanColumn({ id, title, color, orders }: OrderKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col bg-muted/30 rounded-xl min-w-[280px] w-[280px] h-full border border-border/50",
        isOver && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", color)} />
          <h3 className="text-sm font-semibold text-foreground truncate">
            {title}
          </h3>
          <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {orders.length}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {orders.map((order) => (
              <OrderKanbanCard key={order.id} order={order} />
            ))}
            {orders.length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Geen orders
              </div>
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}
