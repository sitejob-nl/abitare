import { Truck, Wrench, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarEventData {
  id: string;
  orderId: string;
  date: string;
  type: "delivery" | "installation";
  customerName: string;
  orderNumber: number;
  installerName?: string | null;
  installerId?: string | null;
  hasConflict?: boolean;
}

interface CalendarEventCardProps {
  event: CalendarEventData;
  compact?: boolean;
  onClick?: () => void;
}

export function CalendarEventCard({ event, compact = false, onClick }: CalendarEventCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium cursor-pointer transition-colors",
        event.type === "delivery"
          ? "bg-cyan-100 text-cyan-800 hover:bg-cyan-200"
          : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
        event.hasConflict && "ring-2 ring-orange-400 ring-offset-1"
      )}
    >
      {event.type === "delivery" ? (
        <Truck className={cn("shrink-0", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
      ) : (
        <Wrench className={cn("shrink-0", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
      )}
      
      {compact ? (
        <span className="truncate">#{event.orderNumber}</span>
      ) : (
        <span className="truncate">{event.customerName}</span>
      )}
      
      {event.hasConflict && (
        <AlertTriangle className="h-3 w-3 text-orange-600 shrink-0" />
      )}
    </div>
  );
}
