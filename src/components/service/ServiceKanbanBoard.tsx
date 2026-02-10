import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useState } from "react";
import { ServiceTicketColumn } from "./ServiceTicketColumn";
import { ServiceTicketCard } from "./ServiceTicketCard";
import { useUpdateTicketStatus } from "@/hooks/useServiceTicketMutations";
import { Skeleton } from "@/components/ui/skeleton";
import type { ServiceTicket } from "@/hooks/useServiceTickets";

interface ServiceKanbanBoardProps {
  tickets: ServiceTicket[];
  isLoading: boolean;
}

type TicketStatus = "nieuw" | "in_behandeling" | "wacht_op_klant" | "wacht_op_onderdelen" | "klaar_voor_planning" | "ingepland" | "afgerond" | "geannuleerd";

const statusColumns: { status: TicketStatus; title: string; color: string }[] = [
  { status: "nieuw", title: "Nieuw", color: "bg-blue-500" },
  { status: "in_behandeling", title: "In behandeling", color: "bg-yellow-500" },
  { status: "wacht_op_klant", title: "Wacht op klant", color: "bg-orange-500" },
  { status: "wacht_op_onderdelen", title: "Wacht op onderdelen", color: "bg-purple-500" },
  { status: "klaar_voor_planning", title: "Klaar voor planning", color: "bg-teal-500" },
  { status: "ingepland", title: "Ingepland", color: "bg-cyan-500" },
  { status: "afgerond", title: "Afgerond", color: "bg-green-500" },
  { status: "geannuleerd", title: "Geannuleerd", color: "bg-gray-500" },
];

export function ServiceKanbanBoard({ tickets, isLoading }: ServiceKanbanBoardProps) {
  const [activeTicket, setActiveTicket] = useState<ServiceTicket | null>(null);
  const updateStatus = useUpdateTicketStatus();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = event.active.data.current?.ticket as ServiceTicket | undefined;
    if (ticket) {
      setActiveTicket(ticket);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const ticketId = active.id as string;
    const newStatus = over.id as TicketStatus;
    const ticket = tickets.find((t) => t.id === ticketId);

    if (ticket && ticket.status !== newStatus) {
      updateStatus.mutate({
        ticketId,
        fromStatus: ticket.status,
        toStatus: newStatus,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusColumns.slice(0, 5).map((col) => (
          <div key={col.status} className="w-[280px] flex-shrink-0">
            <Skeleton className="h-8 w-full mb-2" />
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const ticketsByStatus = statusColumns.reduce(
    (acc, col) => {
      acc[col.status] = tickets.filter((t) => t.status === col.status);
      return acc;
    },
    {} as Record<TicketStatus, ServiceTicket[]>
  );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ height: "calc(100vh - 220px)" }}>
        {statusColumns.map((col) => (
          <ServiceTicketColumn
            key={col.status}
            status={col.status}
            title={col.title}
            tickets={ticketsByStatus[col.status] || []}
            color={col.color}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTicket ? <ServiceTicketCard ticket={activeTicket} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
