import { Link } from "react-router-dom";
import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, User, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ServiceTicket } from "@/hooks/useServiceTickets";

interface ServiceTicketCardProps {
  ticket: ServiceTicket;
}

const priorityConfig = {
  laag: { label: "Laag", className: "bg-muted text-muted-foreground" },
  normaal: { label: "Normaal", className: "bg-blue-100 text-blue-700" },
  hoog: { label: "Hoog", className: "bg-warning/20 text-warning" },
  urgent: { label: "Urgent", className: "bg-destructive/20 text-destructive" },
};

const categoryLabels: Record<string, string> = {
  klacht: "Klacht",
  garantie: "Garantie",
  schade: "Schade",
  overig: "Overig",
};

export function ServiceTicketCard({ ticket }: ServiceTicketCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.id,
    data: { ticket },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const priority = priorityConfig[ticket.priority] || priorityConfig.normaal;
  const assignees = ticket.assignees || [];

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card
        className={cn(
          "cursor-grab transition-shadow hover:shadow-md",
          isDragging && "opacity-50 shadow-lg"
        )}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <Link
              to={`/service/${ticket.id}`}
              className="font-medium text-sm hover:text-primary line-clamp-2 flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              {ticket.subject}
            </Link>
            {ticket.priority === "urgent" || ticket.priority === "hoog" ? (
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              #{ticket.ticket_number}
            </Badge>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {categoryLabels[ticket.category] || ticket.category}
            </Badge>
            <Badge className={cn("text-[10px] px-1.5 py-0", priority.className)}>
              {priority.label}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{ticket.submitter_name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{format(new Date(ticket.created_at), "d MMM", { locale: nl })}</span>
            </div>
          </div>

          {assignees.length > 0 && (
            <div className="mt-2 pt-2 border-t flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground mr-1">Toegewezen:</span>
              <div className="flex -space-x-1">
                {assignees.slice(0, 3).map((a) => (
                  <Avatar key={a.id} className="h-5 w-5 border-2 border-background">
                    <AvatarFallback className="text-[8px]">
                      {a.profile?.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {assignees.length > 3 && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-muted text-[8px]">
                    +{assignees.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
