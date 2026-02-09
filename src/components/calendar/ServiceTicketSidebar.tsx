import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wrench, ChevronRight, ChevronLeft, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceTicket {
  id: string;
  ticket_number: number;
  subject: string;
  priority: string;
  submitter_name: string;
  customer: { first_name: string | null; last_name: string; company_name: string | null } | null;
}

function useWaitingServiceTickets() {
  return useQuery({
    queryKey: ["service-tickets", "wacht_op_onderdelen"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_tickets")
        .select(`
          id, ticket_number, subject, priority, submitter_name,
          customer:customers(first_name, last_name, company_name)
        `)
        .eq("status", "wacht_op_onderdelen")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as ServiceTicket[];
    },
  });
}

const priorityColors: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  hoog: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  normaal: "bg-muted text-muted-foreground",
  laag: "bg-muted text-muted-foreground",
};

function DraggableTicketCard({ ticket }: { ticket: ServiceTicket }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `service-ticket-${ticket.id}`,
    data: { ticket, type: "service-ticket" },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 1,
      }
    : undefined;

  const customer = ticket.customer;
  const customerName = customer?.company_name ||
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
    ticket.submitter_name;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing",
        "hover:border-primary/40 transition-colors",
        isDragging && "shadow-lg"
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px] font-mono text-muted-foreground">
              #{ticket.ticket_number}
            </span>
            <Badge
              variant="secondary"
              className={cn("text-[10px] px-1.5 py-0", priorityColors[ticket.priority] || "")}
            >
              {ticket.priority}
            </Badge>
          </div>
          <p className="text-sm font-medium leading-tight truncate">{ticket.subject}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{customerName}</p>
        </div>
      </div>
    </div>
  );
}

interface ServiceTicketSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ServiceTicketSidebar({ isOpen, onToggle }: ServiceTicketSidebarProps) {
  const { data: tickets, isLoading } = useWaitingServiceTickets();

  const ticketCount = tickets?.length || 0;

  return (
    <div className="relative flex">
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className={cn(
          "absolute -left-3 top-4 z-10 flex h-6 w-6 items-center justify-center",
          "rounded-full border border-border bg-card shadow-sm hover:bg-muted transition-colors"
        )}
      >
        {isOpen ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Sidebar content */}
      {isOpen && (
        <div className="w-[260px] shrink-0 rounded-xl border border-border bg-card overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-muted/50">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Wacht op onderdelen</h3>
            {ticketCount > 0 && (
              <Badge variant="secondary" className="ml-auto text-[11px] px-1.5">
                {ticketCount}
              </Badge>
            )}
          </div>

          {/* Ticket list */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="p-3 space-y-2">
              {isLoading ? (
                <p className="text-xs text-muted-foreground text-center py-4">Laden...</p>
              ) : ticketCount === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Geen tickets wachtend op onderdelen
                </p>
              ) : (
                tickets?.map((ticket) => (
                  <DraggableTicketCard key={ticket.id} ticket={ticket} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Collapsed indicator */}
      {!isOpen && ticketCount > 0 && (
        <button
          onClick={onToggle}
          className="flex flex-col items-center gap-1 py-3 px-1.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
        >
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <Badge variant="secondary" className="text-[10px] px-1.5">
            {ticketCount}
          </Badge>
        </button>
      )}
    </div>
  );
}
