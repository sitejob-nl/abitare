import { useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Loader2, Truck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns";
import { nl } from "date-fns/locale";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { CalendarViewToggle, type CalendarView } from "@/components/calendar/CalendarViewToggle";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CalendarEventCard, type CalendarEventData } from "@/components/calendar/CalendarEventCard";
import { CalendarEventPopover } from "@/components/calendar/CalendarEventPopover";
import { ConflictBadge } from "@/components/calendar/ConflictBadge";
import { useCalendarConflicts, type ConflictInfo } from "@/hooks/useCalendarConflicts";
import { useUpdateEventDate } from "@/hooks/useUpdateEventDate";
import { toast } from "@/hooks/use-toast";

function useCalendarEvents(month: Date) {
  const start = startOfMonth(subMonths(month, 1));
  const end = endOfMonth(addMonths(month, 1));

  return useQuery({
    queryKey: ["calendar-events", format(start, "yyyy-MM"), format(end, "yyyy-MM")],
    queryFn: async () => {
      const events: CalendarEventData[] = [];

      // Get deliveries with installer info
      const { data: deliveries } = await supabase
        .from("orders")
        .select(`
          id, order_number, expected_delivery_date, installer_id,
          customer:customers(first_name, last_name, company_name, phone, mobile, street_address, city),
          installer:profiles!orders_installer_id_fkey(full_name)
        `)
        .gte("expected_delivery_date", format(start, "yyyy-MM-dd"))
        .lte("expected_delivery_date", format(end, "yyyy-MM-dd"))
        .not("expected_delivery_date", "is", null);

      if (deliveries) {
        deliveries.forEach((order) => {
          const customer = order.customer as { first_name?: string; last_name?: string; company_name?: string; phone?: string; mobile?: string; street_address?: string; city?: string } | null;
          const installerData = order.installer as { full_name: string | null } | { full_name: string | null }[] | null;
          const installer = Array.isArray(installerData) ? installerData[0] : installerData;
          const customerName = customer?.company_name || 
            [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Onbekend";
          
          events.push({
            id: `delivery-${order.id}`,
            orderId: order.id,
            date: order.expected_delivery_date!,
            type: "delivery",
            customerName,
            orderNumber: order.order_number,
            installerId: order.installer_id,
            installerName: installer?.full_name,
          });
        });
      }

      // Get installations with installer info
      const { data: installations } = await supabase
        .from("orders")
        .select(`
          id, order_number, expected_installation_date, installer_id,
          customer:customers(first_name, last_name, company_name, phone, mobile, street_address, city),
          installer:profiles!orders_installer_id_fkey(full_name)
        `)
        .gte("expected_installation_date", format(start, "yyyy-MM-dd"))
        .lte("expected_installation_date", format(end, "yyyy-MM-dd"))
        .not("expected_installation_date", "is", null);

      if (installations) {
        installations.forEach((order) => {
          const customer = order.customer as { first_name?: string; last_name?: string; company_name?: string; phone?: string; mobile?: string; street_address?: string; city?: string } | null;
          const installerData = order.installer as { full_name: string | null } | { full_name: string | null }[] | null;
          const installer = Array.isArray(installerData) ? installerData[0] : installerData;
          const customerName = customer?.company_name || 
            [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Onbekend";
          
          events.push({
            id: `installation-${order.id}`,
            orderId: order.id,
            date: order.expected_installation_date!,
            type: "installation",
            customerName,
            orderNumber: order.order_number,
            installerId: order.installer_id,
            installerName: installer?.full_name,
          });
        });
      }

      return events;
    },
  });
}

// Draggable event component for month view
function DraggableMonthEvent({ event }: { event: CalendarEventData }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 1,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <CalendarEventPopover event={event}>
        <div>
          <CalendarEventCard event={event} compact />
        </div>
      </CalendarEventPopover>
    </div>
  );
}

// Droppable day cell for month view
function DroppableMonthDay({ 
  day, 
  dayEvents, 
  isCurrentMonth,
  isTodayDate,
  dayConflict,
  onDayClick,
}: { 
  day: Date; 
  dayEvents: CalendarEventData[];
  isCurrentMonth: boolean;
  isTodayDate: boolean;
  dayConflict?: ConflictInfo;
  onDayClick: (date: Date) => void;
}) {
  const dateStr = format(day, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
    data: { date: day },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDayClick(day)}
      className={cn(
        "min-h-[60px] sm:min-h-[100px] border-b border-r border-border-light p-1 sm:p-2 cursor-pointer transition-colors",
        !isCurrentMonth && "bg-muted/30",
        isOver && "bg-primary/10"
      )}
    >
      <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
        <div
          className={cn(
            "text-xs sm:text-sm font-medium",
            isTodayDate
              ? "inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
              : isCurrentMonth
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          {format(day, "d")}
        </div>
        {dayConflict && <ConflictBadge conflict={dayConflict} />}
      </div>
      <div className="space-y-0.5 sm:space-y-1">
        {dayEvents.slice(0, 2).map((event) => (
          <DraggableMonthEvent key={event.id} event={event} />
        ))}
        {dayEvents.length > 2 && (
          <div className="px-1 text-[8px] sm:text-[10px] text-muted-foreground">
            +{dayEvents.length - 2}
          </div>
        )}
      </div>
    </div>
  );
}

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [draggingEvent, setDraggingEvent] = useState<CalendarEventData | null>(null);

  const { data: events, isLoading } = useCalendarEvents(currentDate);
  const { data: conflicts } = useCalendarConflicts(currentDate);
  const updateEventDate = useUpdateEventDate();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const filteredEvents = events?.filter((event) => {
    if (typeFilter === "all") return true;
    return event.type === typeFilter;
  }) || [];

  // Add conflict info to events
  const eventsWithConflicts = filteredEvents.map((event) => ({
    ...event,
    hasConflict: event.type === "installation" && 
      conflicts?.some((c) => c.date === event.date && c.installerId === event.installerId),
  }));

  const getEventsForDay = useCallback((date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return eventsWithConflicts.filter((event) => event.date === dateStr);
  }, [eventsWithConflicts]);

  // Navigation handlers
  const goToPrevious = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const goToNext = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setView("day");
  };

  const handleDragStart = (event: any) => {
    const draggedEvent = event.active.data.current?.event as CalendarEventData;
    setDraggingEvent(draggedEvent);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingEvent(null);
    const { active, over } = event;
    
    if (!over) return;

    const draggedEvent = active.data.current?.event as CalendarEventData;
    const newDate = over.id as string;

    if (draggedEvent.date === newDate) return;

    try {
      await updateEventDate.mutateAsync({
        orderId: draggedEvent.orderId,
        field: draggedEvent.type === "delivery" ? "expected_delivery_date" : "expected_installation_date",
        date: newDate,
      });

      toast({
        title: "Datum bijgewerkt",
        description: `${draggedEvent.type === "delivery" ? "Levering" : "Montage"} verplaatst naar ${format(new Date(newDate), "d MMMM yyyy", { locale: nl })}.`,
      });
    } catch (error) {
      toast({
        title: "Fout bij verplaatsen",
        description: "De afspraak kon niet worden verplaatst.",
        variant: "destructive",
      });
    }
  };

  // Month view calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const mobileDayNames = ["M", "D", "W", "D", "V", "Z", "Z"];
  const desktopDayNames = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  // Get title based on view
  const getViewTitle = () => {
    if (view === "month") return format(currentDate, "MMMM yyyy", { locale: nl });
    if (view === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, "d MMM", { locale: nl })} - ${format(weekEnd, "d MMM yyyy", { locale: nl })}`;
    }
    return format(currentDate, "EEEE d MMMM yyyy", { locale: nl });
  };

  return (
    <AppLayout title="Agenda" breadcrumb="Agenda">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-[28px] font-semibold text-foreground">
          Agenda
        </h1>
        <div className="flex items-center gap-3">
          <CalendarViewToggle view={view} onViewChange={setView} />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[160px] text-[13px]">
              <SelectValue placeholder="Alles tonen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alles tonen</SelectItem>
              <SelectItem value="delivery">Leveringen</SelectItem>
              <SelectItem value="installation">Montages</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navigation */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={goToNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-2 text-base sm:text-lg font-semibold text-foreground capitalize">
            {getViewTitle()}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Vandaag
        </Button>
      </div>

      {/* Calendar Content */}
      <DndContext 
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12 rounded-xl border border-border bg-card">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Laden...</span>
          </div>
        ) : view === "month" ? (
          <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/50">
              {desktopDayNames.map((day, index) => (
                <div
                  key={day}
                  className="px-1 sm:px-2 py-2 sm:py-3 text-center text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{mobileDayNames[index]}</span>
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);
                const dateStr = format(day, "yyyy-MM-dd");
                const dayConflict = conflicts?.find((c) => c.date === dateStr);

                return (
                  <DroppableMonthDay
                    key={index}
                    day={day}
                    dayEvents={dayEvents}
                    isCurrentMonth={isCurrentMonth}
                    isTodayDate={isTodayDate}
                    dayConflict={dayConflict}
                    onDayClick={handleDayClick}
                  />
                );
              })}
            </div>
          </div>
        ) : view === "week" ? (
          <CalendarWeekView
            currentDate={currentDate}
            events={eventsWithConflicts}
            conflicts={conflicts || []}
            onDayClick={handleDayClick}
          />
        ) : (
          <CalendarDayView
            currentDate={currentDate}
            events={eventsWithConflicts.filter((e) => e.date === format(currentDate, "yyyy-MM-dd")).map((e) => ({
              ...e,
              customerPhone: undefined,
              customerAddress: undefined,
            }))}
            conflicts={conflicts || []}
          />
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {draggingEvent && (
            <div className="opacity-90">
              <CalendarEventCard event={draggingEvent} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </AppLayout>
  );
};

export default CalendarPage;
