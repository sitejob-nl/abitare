import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import type { MicrosoftCalendarEvent } from "@/hooks/useMicrosoftCalendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface MicrosoftEventCardProps {
  event: MicrosoftCalendarEvent;
  compact?: boolean;
}

export function MicrosoftEventCard({ event, compact = false }: MicrosoftEventCardProps) {
  const startTime = parseISO(event.start.dateTime);
  const endTime = parseISO(event.end.dateTime);

  const card = (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium cursor-pointer transition-colors",
        "bg-accent text-accent-foreground hover:bg-accent/80",
        compact && "py-0.5"
      )}
    >
      <Calendar className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">{event.subject || "Geen onderwerp"}</span>
    </div>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div>{card}</div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm">{event.subject || "Geen onderwerp"}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Microsoft Agenda
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(startTime, "EEEE d MMMM yyyy", { locale: nl })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="ml-6">
                {event.isAllDay
                  ? "Hele dag"
                  : `${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}`}
              </span>
            </div>
            {event.location?.displayName && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">📍</span>
                <span className="text-muted-foreground">
                  {event.location.displayName}
                </span>
              </div>
            )}
            {event.organizer?.emailAddress?.name && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">👤</span>
                <span className="text-muted-foreground">
                  {event.organizer.emailAddress.name}
                </span>
              </div>
            )}
          </div>

          {event.webLink && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open(event.webLink, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Openen in Outlook
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
