import { useState, useCallback, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ServiceTicketSidebar } from "@/components/calendar/ServiceTicketSidebar";
import { CalendarSubscriptionPanel } from "@/components/calendar/CalendarSubscriptionPanel";
import { useScheduleServiceTicket } from "@/hooks/useServiceTicketMutations";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Loader2, Truck, Wrench, Headphones } from "lucide-react";
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
  parseISO,
  getISOWeek,
} from "date-fns";
import { nl } from "date-fns/locale";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { CalendarViewToggle, type CalendarView } from "@/components/calendar/CalendarViewToggle";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CalendarEventCard, type CalendarEventData } from "@/components/calendar/CalendarEventCard";
import { CalendarEventPopover } from "@/components/calendar/CalendarEventPopover";
import { ConflictBadge } from "@/components/calendar/ConflictBadge";
import { MicrosoftEventCard } from "@/components/calendar/MicrosoftEventCard";
import { useCalendarConflicts, type ConflictInfo } from "@/hooks/useCalendarConflicts";
import { useUpdateEventDate } from "@/hooks/useUpdateEventDate";
import { useMicrosoftCalendarEvents, useCalendarSubscriptions, type MicrosoftCalendarEvent } from "@/hooks/useMicrosoftCalendar";
import { useMicrosoftConnection } from "@/hooks/useMicrosoftConnection";
import { useInstallers } from "@/hooks/useInstallers";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

function useCalendarEvents(month: Date) {
  const start = startOfMonth(subMonths(month, 1));
  const end = endOfMonth(addMonths(month, 1));

  return useQuery({
    queryKey: ["calendar-events", format(start, "yyyy-MM"), format(end, "yyyy-MM")],
    queryFn: async () => {
      const events: CalendarEventData[] = [];

      const { data: deliveries } = await supabase
        .from("orders")
        .select(`
          id, order_number, expected_delivery_date, installer_id, salesperson_id,
          customer:customers(first_name, last_name, company_name, phone, mobile, street_address, city),
          installer:profiles!orders_installer_id_fkey(full_name, calendar_color)
        `)
        .gte("expected_delivery_date", format(start, "yyyy-MM-dd"))
        .lte("expected_delivery_date", format(end, "yyyy-MM-dd"))
        .not("expected_delivery_date", "is", null);

      if (deliveries) {
        deliveries.forEach((order) => {
          const customer = order.customer as any;
          const installerData = order.installer as any;
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
            installerColor: installer?.calendar_color,
            salespersonId: (order as any).salesperson_id,
            customerPhone: customer?.mobile || customer?.phone,
            customerAddress: customer?.street_address ? `${customer.street_address}, ${customer.city || ""}`.trim() : null,
          });
        });
      }

      const { data: installations } = await supabase
        .from("orders")
        .select(`
          id, order_number, expected_installation_date, installer_id, salesperson_id,
          customer:customers(first_name, last_name, company_name, phone, mobile, street_address, city),
          installer:profiles!orders_installer_id_fkey(full_name, calendar_color)
        `)
        .gte("expected_installation_date", format(start, "yyyy-MM-dd"))
        .lte("expected_installation_date", format(end, "yyyy-MM-dd"))
        .not("expected_installation_date", "is", null);

      if (installations) {
        installations.forEach((order) => {
          const customer = order.customer as any;
          const installerData = order.installer as any;
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
            installerColor: installer?.calendar_color,
            salespersonId: (order as any).salesperson_id,
            customerPhone: customer?.mobile || customer?.phone,
            customerAddress: customer?.street_address ? `${customer.street_address}, ${customer.city || ""}`.trim() : null,
          });
        });
      }

      const { data: tickets } = await supabase
        .from("service_tickets")
        .select(`
          id, ticket_number, subject, planned_date,
          customer:customers(first_name, last_name, company_name, phone, mobile, street_address, city)
        `)
        .eq("status", "ingepland")
        .gte("planned_date", format(start, "yyyy-MM-dd"))
        .lte("planned_date", format(end, "yyyy-MM-dd"))
        .not("planned_date", "is", null);

      if (tickets) {
        tickets.forEach((ticket) => {
          const customer = ticket.customer as any;
          const customerName = customer?.company_name || 
            [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Onbekend";
          
          events.push({
            id: `service-${ticket.id}`,
            orderId: ticket.id,
            date: ticket.planned_date!,
            type: "service",
            customerName,
            orderNumber: ticket.ticket_number,
            ticketId: ticket.id,
            ticketSubject: ticket.subject,
            customerPhone: customer?.mobile || customer?.phone,
            customerAddress: customer?.street_address ? `${customer.street_address}, ${customer.city || ""}`.trim() : null,
          });
        });
      }

      return events;
    },
  });
}

function useForecastWeekOrders(month: Date) {
  return useQuery({
    queryKey: ["forecast-week-orders", format(month, "yyyy-MM")],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, forecast_week, customer:customers(first_name, last_name, company_name)")
        .not("forecast_week", "is", null)
        .is("expected_installation_date", null)
        .is("expected_delivery_date", null);

      return (data || []).map((order) => {
        const customer = order.customer as any;
        const customerName = customer?.company_name || 
          [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Onbekend";
        return { ...order, customerName };
      });
    },
  });
}

// Fetch user roles for tab filtering
function useUserRolesMap() {
  return useQuery({
    queryKey: ["user-roles-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data || []).forEach((r) => {
        if (!map[r.user_id]) map[r.user_id] = [];
        map[r.user_id].push(r.role);
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function parseForecastWeekToMonday(forecastWeek: string): string | null {
  const match = forecastWeek.match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) return null;
  const year = parseInt(match[1]);
  const week = parseInt(match[2]);
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return format(monday, "yyyy-MM-dd");
}

type AgendaTab = "overview" | "sales" | "monteurs" | "mijn";

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

function DroppableMonthDay({ 
  day, 
  dayEvents,
  microsoftEvents,
  forecastOrders,
  isCurrentMonth,
  isTodayDate,
  dayConflict,
  weekNumber,
  showWeekNumber,
  onDayClick,
}: { 
  day: Date; 
  dayEvents: CalendarEventData[];
  microsoftEvents: MicrosoftCalendarEvent[];
  forecastOrders: { id: string; order_number: number; customerName: string }[];
  isCurrentMonth: boolean;
  isTodayDate: boolean;
  dayConflict?: ConflictInfo;
  weekNumber?: number;
  showWeekNumber?: boolean;
  onDayClick: (date: Date) => void;
}) {
  const dateStr = format(day, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
    data: { date: day },
  });

  const totalEvents = dayEvents.length + microsoftEvents.length;
  const maxVisible = 2;
  const visibleOrderEvents = dayEvents.slice(0, maxVisible);
  const remainingSlots = maxVisible - visibleOrderEvents.length;
  const visibleMsEvents = microsoftEvents.slice(0, Math.max(0, remainingSlots));
  const hiddenCount = totalEvents - visibleOrderEvents.length - visibleMsEvents.length;

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
        {showWeekNumber && weekNumber && (
          <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium mr-0.5">
            W{weekNumber}
          </span>
        )}
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
        {forecastOrders.length > 0 && (
          <div className="flex items-center gap-1 rounded px-1 py-0.5 text-[9px] sm:text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            📋 {forecastOrders.length} forecast
          </div>
        )}
        {visibleOrderEvents.map((event) => (
          <DraggableMonthEvent key={event.id} event={event} />
        ))}
        {visibleMsEvents.map((event) => (
          <MicrosoftEventCard key={event.id} event={event} compact />
        ))}
        {hiddenCount > 0 && (
          <div className="px-1 text-[8px] sm:text-[10px] text-muted-foreground">
            +{hiddenCount}
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
  const [installerFilter, setInstallerFilter] = useState<string>("all");
  const [agendaTab, setAgendaTab] = useState<AgendaTab>("overview");
  const [draggingEvent, setDraggingEvent] = useState<CalendarEventData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { user } = useAuth();
  const { data: events, isLoading } = useCalendarEvents(currentDate);
  const { data: conflicts } = useCalendarConflicts(currentDate);
  const { data: subscriptions } = useCalendarSubscriptions();
  const { data: msConnection } = useMicrosoftConnection();
  const { data: forecastOrders } = useForecastWeekOrders(currentDate);
  const { data: installers } = useInstallers();
  const { data: userRolesMap } = useUserRolesMap();
  const updateEventDate = useUpdateEventDate();
  const scheduleTicket = useScheduleServiceTicket();

  // Build subscribed emails for multi-user MS calendar
  const subscribedEmails = useMemo(() => {
    if (!subscriptions) return [];
    return subscriptions
      .filter((s: any) => s.is_visible && s.target)
      .map((s: any) => ({
        email: s.target?.email || "",
        name: s.target?.full_name || s.target?.email || "Onbekend",
        color: s.target?.calendar_color || "#6366F1",
      }))
      .filter((s) => s.email);
  }, [subscriptions]);

  const { data: microsoftEvents } = useMicrosoftCalendarEvents(currentDate, subscribedEmails);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const forecastMap = useMemo(() => {
    const map: Record<string, { id: string; order_number: number; customerName: string }[]> = {};
    forecastOrders?.forEach((order) => {
      if (!order.forecast_week) return;
      const monday = parseForecastWeekToMonday(order.forecast_week);
      if (!monday) return;
      if (!map[monday]) map[monday] = [];
      map[monday].push({ id: order.id, order_number: order.order_number, customerName: order.customerName });
    });
    return map;
  }, [forecastOrders]);

  // Tab-based filtering
  const tabFilteredEvents = useMemo(() => {
    if (!events) return [];
    if (agendaTab === "overview") return events;
    if (agendaTab === "mijn") {
      return events.filter((e) => e.installerId === user?.id || e.salespersonId === user?.id);
    }
    if (agendaTab === "monteurs") {
      return events.filter((e) => {
        if (!e.installerId) return false;
        const roles = userRolesMap?.[e.installerId] || [];
        return roles.includes("monteur");
      });
    }
    if (agendaTab === "sales") {
      return events.filter((e) => {
        const spId = e.salespersonId;
        if (!spId) return false;
        const roles = userRolesMap?.[spId] || [];
        return roles.includes("verkoper") || roles.includes("manager") || roles.includes("admin");
      });
    }
    return events;
  }, [events, agendaTab, user?.id, userRolesMap]);

  const filteredEvents = tabFilteredEvents.filter((event) => {
    if (typeFilter !== "all" && typeFilter !== "microsoft" && event.type !== typeFilter) return false;
    if (installerFilter !== "all" && event.installerId !== installerFilter) return false;
    return true;
  });

  const filteredMsEvents = (typeFilter === "all" || typeFilter === "microsoft") 
    ? (microsoftEvents || []) 
    : [];

  const eventsWithConflicts = filteredEvents.map((event) => ({
    ...event,
    hasConflict: event.type === "installation" && 
      conflicts?.some((c) => c.date === event.date && c.installerId === event.installerId),
  }));

  const getEventsForDay = useCallback((date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return eventsWithConflicts.filter((event) => event.date === dateStr);
  }, [eventsWithConflicts]);

  const getMsEventsForDay = useCallback((date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return filteredMsEvents.filter((event) => {
      const eventDate = format(parseISO(event.start.dateTime), "yyyy-MM-dd");
      return eventDate === dateStr;
    });
  }, [filteredMsEvents]);

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

    const activeId = active.id.toString();
    const newDate = over.id as string;

    if (activeId.startsWith("service-ticket-")) {
      const ticketId = activeId.replace("service-ticket-", "");
      const ticketData = active.data.current?.ticket as { status?: string } | undefined;
      try {
        await scheduleTicket.mutateAsync({ ticketId, plannedDate: newDate, fromStatus: ticketData?.status });
        toast({
          title: "Ticket ingepland",
          description: `Serviceticket ingepland op ${format(new Date(newDate), "d MMMM yyyy", { locale: nl })}.`,
        });
      } catch (error) {
        toast({
          title: "Fout bij inplannen",
          description: "Het ticket kon niet worden ingepland.",
          variant: "destructive",
        });
      }
      return;
    }

    const draggedEvent = active.data.current?.event as CalendarEventData;
    if (draggedEvent.date === newDate) return;
    if (draggedEvent.type === "service") return;

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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const mobileDayNames = ["M", "D", "W", "D", "V", "Z", "Z"];
  const desktopDayNames = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  const getViewTitle = () => {
    if (view === "month") return format(currentDate, "MMMM yyyy", { locale: nl });
    if (view === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `Week ${getISOWeek(weekStart)} · ${format(weekStart, "d MMM", { locale: nl })} - ${format(weekEnd, "d MMM yyyy", { locale: nl })}`;
    }
    return format(currentDate, "EEEE d MMMM yyyy", { locale: nl });
  };

  return (
    <AppLayout title="Agenda" breadcrumb="Agenda">
      {/* Page Header */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-xl sm:text-[28px] font-semibold text-foreground">
          Agenda
        </h1>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <CalendarViewToggle view={view} onViewChange={setView} />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[120px] sm:w-[160px] text-[13px]">
              <SelectValue placeholder="Alles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alles tonen</SelectItem>
              <SelectItem value="delivery">Leveringen</SelectItem>
              <SelectItem value="installation">Montages</SelectItem>
              <SelectItem value="service">Servicetickets</SelectItem>
              {msConnection?.is_active && (
                <SelectItem value="microsoft">Microsoft</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={installerFilter} onValueChange={setInstallerFilter}>
            <SelectTrigger className="h-9 w-[120px] sm:w-[170px] text-[13px]">
              <SelectValue placeholder="Alle monteurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle monteurs</SelectItem>
              {installers?.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.full_name || inst.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Agenda Tabs */}
      <div className="mb-4">
        <Tabs value={agendaTab} onValueChange={(v) => setAgendaTab(v as AgendaTab)}>
          <TabsList>
            <TabsTrigger value="overview">Overzicht</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="monteurs">Monteurs</TabsTrigger>
            <TabsTrigger value="mijn">Mijn agenda</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Navigation */}
      <div className="mb-4 sm:mb-5 flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-1 sm:ml-2 text-sm sm:text-lg font-semibold text-foreground capitalize truncate max-w-[200px] sm:max-w-none">
            {getViewTitle()}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday} className="text-xs sm:text-sm">
          <span className="hidden sm:inline">Vandaag</span>
          <span className="sm:hidden">Nu</span>
        </Button>
      </div>

      {/* Calendar Content + Sidebar */}
      <DndContext 
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
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
                    const dayMsEvents = getMsEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isTodayDate = isToday(day);
                    const dateStr = format(day, "yyyy-MM-dd");
                    const dayConflict = conflicts?.find((c) => c.date === dateStr);
                    const dayForecast = forecastMap[dateStr] || [];
                    const isMonday = day.getDay() === 1;
                    const weekNum = isMonday ? getISOWeek(day) : undefined;

                    return (
                      <DroppableMonthDay
                        key={index}
                        day={day}
                        dayEvents={dayEvents}
                        microsoftEvents={dayMsEvents}
                        forecastOrders={dayForecast}
                        isCurrentMonth={isCurrentMonth}
                        isTodayDate={isTodayDate}
                        dayConflict={dayConflict}
                        weekNumber={weekNum}
                        showWeekNumber={isMonday}
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
                microsoftEvents={filteredMsEvents}
                onDayClick={handleDayClick}
              />
            ) : (
              <CalendarDayView
                currentDate={currentDate}
                events={eventsWithConflicts.filter((e) => e.date === format(currentDate, "yyyy-MM-dd")).map((e) => ({
                  ...e,
                  customerPhone: e.customerPhone,
                  customerAddress: e.customerAddress,
                }))}
                conflicts={conflicts || []}
                microsoftEvents={filteredMsEvents}
              />
            )}
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:flex lg:flex-col lg:gap-4 lg:w-[260px] lg:shrink-0">
            <CalendarSubscriptionPanel />
            <ServiceTicketSidebar
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
            />
          </div>
        </div>

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
