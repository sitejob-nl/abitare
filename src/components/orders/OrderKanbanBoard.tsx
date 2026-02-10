import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { Loader2 } from "lucide-react";
import { OrderKanbanColumn } from "./OrderKanbanColumn";
import { OrderKanbanCard } from "./OrderKanbanCard";
import { useUpdateOrderStatus } from "@/hooks/useOrderMutations";
import { validateStatusTransition } from "@/lib/orderGates";
import { toast } from "sonner";
import type { OrderStatus } from "@/hooks/useOrders";

interface Order {
  id: string;
  order_number: number;
  total_incl_vat: number | null;
  expected_delivery_date: string | null;
  payment_status: string | null;
  status: string | null;
  deposit_required?: boolean | null;
  deposit_invoice_sent?: boolean | null;
  customer: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
  } | null;
}

interface OrderKanbanBoardProps {
  orders: Order[] | undefined;
  isLoading: boolean;
}

const statusColumns: { id: OrderStatus; title: string; color: string }[] = [
  { id: "nieuw", title: "Nieuw", color: "bg-blue-500" },
  { id: "bestel_klaar", title: "Bestel klaar", color: "bg-yellow-500" },
  { id: "controle", title: "Controle", color: "bg-orange-500" },
  { id: "besteld", title: "Besteld", color: "bg-purple-500" },
  { id: "in_productie", title: "In productie", color: "bg-indigo-500" },
  { id: "levering_gepland", title: "Levering gepland", color: "bg-cyan-500" },
  { id: "geleverd", title: "Geleverd", color: "bg-teal-500" },
  { id: "montage_gepland", title: "Montage gepland", color: "bg-emerald-500" },
  { id: "gemonteerd", title: "Gemonteerd", color: "bg-green-500" },
  { id: "nazorg", title: "Nazorg", color: "bg-amber-500" },
  { id: "afgerond", title: "Afgerond", color: "bg-gray-500" },
];

export function OrderKanbanBoard({ orders, isLoading }: OrderKanbanBoardProps) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const updateOrderStatus = useUpdateOrderStatus();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const ordersByStatus = useMemo(() => {
    const grouped: Record<string, Order[]> = {};
    statusColumns.forEach((col) => {
      grouped[col.id] = [];
    });
    
    orders?.forEach((order) => {
      const status = order.status || "nieuw";
      if (grouped[status]) {
        grouped[status].push(order);
      } else {
        grouped["nieuw"].push(order);
      }
    });
    
    return grouped;
  }, [orders]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const order = orders?.find((o) => o.id === active.id);
    if (order) {
      setActiveOrder(order);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as OrderStatus;
    const order = orders?.find((o) => o.id === orderId);

    if (!order || order.status === newStatus) return;

    const isValidColumn = statusColumns.some((col) => col.id === newStatus);
    if (!isValidColumn) return;

    // Validate gates before allowing the transition
    const gateContext = {
      currentStatus: order.status as OrderStatus,
      paymentStatus: order.payment_status,
      depositRequired: order.deposit_required !== false,
      depositInvoiceSent: !!order.deposit_invoice_sent,
    };

    const gate = validateStatusTransition(newStatus, gateContext);
    if (!gate.allowed) {
      toast.error("Statuswijziging geblokkeerd", {
        description: gate.reason || undefined,
      });
      return;
    }

    updateOrderStatus.mutate(
      { orderId, status: newStatus, gateContext },
      {
        onSuccess: () => {
          const statusLabel = statusColumns.find((c) => c.id === newStatus)?.title;
          toast.success(`Order #${order.order_number} verplaatst naar ${statusLabel}`);
        },
        onError: (error) => {
          toast.error("Kon status niet bijwerken", {
            description: error instanceof Error ? error.message : undefined,
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Laden...</span>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 h-[calc(100vh-220px)]">
        {statusColumns.map((column) => (
          <OrderKanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            orders={ordersByStatus[column.id] || []}
          />
        ))}
      </div>

      <DragOverlay>
        {activeOrder && <OrderKanbanCard order={activeOrder} />}
      </DragOverlay>
    </DndContext>
  );
}
