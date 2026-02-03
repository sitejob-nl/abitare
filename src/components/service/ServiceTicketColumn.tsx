import { useDroppable } from "@dnd-kit/core";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServiceTicketCard } from "./ServiceTicketCard";
import { cn } from "@/lib/utils";
import type { ServiceTicket } from "@/hooks/useServiceTickets";

interface ServiceTicketColumnProps {
  status: string;
  title: string;
  tickets: ServiceTicket[];
  color: string;
}

export function ServiceTicketColumn({ status, title, tickets, color }: ServiceTicketColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-[280px] flex-shrink-0 flex-col rounded-lg border bg-muted/30",
        isOver && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium">
          {tickets.length}
        </span>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <ServiceTicketCard key={ticket.id} ticket={ticket} />
          ))}
          {tickets.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20">
              <p className="text-xs text-muted-foreground">Geen tickets</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
