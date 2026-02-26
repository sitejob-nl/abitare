import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarEventCard, type CalendarEventData } from "./CalendarEventCard";
import { CalendarEventPopover } from "./CalendarEventPopover";
import { MicrosoftEventCard } from "./MicrosoftEventCard";
import { ConflictBadge } from "./ConflictBadge";
import type { ConflictInfo } from "@/hooks/useCalendarConflicts";
import type { MicrosoftCalendarEvent } from "@/hooks/useMicrosoftCalendar";
import { useDraggable, useDroppable } from "@dnd-kit/core";

interface CalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEventData[];
  conflicts: ConflictInfo[];
  microsoftEvents?: MicrosoftCalendarEvent[];
  onDayClick?: (date: Date) => void;
}

function DraggableEvent({ event }: { event: CalendarEventData }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <CalendarEventPopover event={event}>
        <div>
          <CalendarEventCard event={event} />
        </div>
      </CalendarEventPopover>
    </div>
  );
}

function DroppableDay({ 
  date, 
  events, 
  conflicts,
  microsoftEvents = [],
  onDayClick,
}: { 
  date: Date; 
  events: CalendarEventData[];
  conflicts: ConflictInfo[];
  microsoftEvents?: MicrosoftCalendarEvent[];
  onDayClick?: (date: Date) => void;
}) {
  const dateStr = format(date, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
    data: { date },
  });

  const dayEvents = events.filter((e) => e.date === dateStr);
  const dayConflict = conflicts.find((c) => c.date === dateStr);
  const dayMsEvents = microsoftEvents.filter((e) => {
    const eventDate = format(parseISO(e.start.dateTime), "yyyy-MM-dd");
    return eventDate === dateStr;
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDayClick?.(date)}
      className={cn(
        "min-h-[140px] border-r border-b border-border p-2 cursor-pointer transition-colors",
        isToday(date) && "bg-primary/5",
        isOver && "bg-primary/10"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className={cn(
            "text-sm font-medium",
            isToday(date)
              ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
              : "text-foreground"
          )}
        >
          {format(date, "d")}
        </div>
        {dayConflict && <ConflictBadge conflict={dayConflict} />}
      </div>
      
      <div className="space-y-1">
        {dayEvents.map((event) => (
          <DraggableEvent key={event.id} event={event} />
        ))}
        {dayMsEvents.map((event) => (
          <MicrosoftEventCard key={event.id} event={event} compact />
        ))}
      </div>
    </div>
  );
}

export function CalendarWeekView({ 
  currentDate, 
  events, 
  conflicts,
  microsoftEvents = [],
  onDayClick,
}: CalendarWeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header with day names and dates */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/50">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "px-2 py-3 text-center",
              isToday(day) && "bg-primary/10"
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {format(day, "EEE", { locale: nl })}
            </p>
            <p
              className={cn(
                "text-lg font-semibold mt-0.5",
                isToday(day) ? "text-primary" : "text-foreground"
              )}
            >
              {format(day, "d")}
            </p>
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <DroppableDay
            key={day.toISOString()}
            date={day}
            events={events}
            conflicts={conflicts}
            microsoftEvents={microsoftEvents}
            onDayClick={onDayClick}
          />
        ))}
      </div>
    </div>
  );
}
