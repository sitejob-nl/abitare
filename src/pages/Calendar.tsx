import { useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { nl } from "date-fns/locale";

interface CalendarEvent {
  id: string;
  date: string;
  type: "delivery" | "installation";
  customerName: string;
  orderNumber: number;
}

function useCalendarEvents(month: Date) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);

  return useQuery({
    queryKey: ["calendar-events", format(start, "yyyy-MM")],
    queryFn: async () => {
      const events: CalendarEvent[] = [];

      // Get deliveries
      const { data: deliveries } = await supabase
        .from("orders")
        .select(`
          id, order_number, expected_delivery_date,
          customer:customers(first_name, last_name, company_name)
        `)
        .gte("expected_delivery_date", format(start, "yyyy-MM-dd"))
        .lte("expected_delivery_date", format(end, "yyyy-MM-dd"))
        .not("expected_delivery_date", "is", null);

      if (deliveries) {
        deliveries.forEach((order) => {
          const customer = order.customer as { first_name?: string; last_name?: string; company_name?: string } | null;
          const customerName = customer?.company_name || 
            [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Onbekend";
          
          events.push({
            id: `delivery-${order.id}`,
            date: order.expected_delivery_date!,
            type: "delivery",
            customerName,
            orderNumber: order.order_number,
          });
        });
      }

      // Get installations
      const { data: installations } = await supabase
        .from("orders")
        .select(`
          id, order_number, expected_installation_date,
          customer:customers(first_name, last_name, company_name)
        `)
        .gte("expected_installation_date", format(start, "yyyy-MM-dd"))
        .lte("expected_installation_date", format(end, "yyyy-MM-dd"))
        .not("expected_installation_date", "is", null);

      if (installations) {
        installations.forEach((order) => {
          const customer = order.customer as { first_name?: string; last_name?: string; company_name?: string } | null;
          const customerName = customer?.company_name || 
            [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Onbekend";
          
          events.push({
            id: `installation-${order.id}`,
            date: order.expected_installation_date!,
            type: "installation",
            customerName,
            orderNumber: order.order_number,
          });
        });
      }

      return events;
    },
  });
}

const CalendarPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: events, isLoading } = useCalendarEvents(currentMonth);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const filteredEvents = events?.filter((event) => {
    if (typeFilter === "all") return true;
    return event.type === typeFilter;
  });

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return filteredEvents?.filter((event) => event.date === dateStr) || [];
  };

  // Mobile day names (1 letter)
  const mobileDayNames = ["M", "D", "W", "D", "V", "Z", "Z"];
  // Desktop day names
  const desktopDayNames = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  return (
    <AppLayout title="Agenda" breadcrumb="Agenda">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-[28px] font-semibold text-foreground">
          Agenda
        </h1>
        <div className="flex items-center gap-3">
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

      {/* Month Navigation */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-2 text-base sm:text-lg font-semibold text-foreground">
            {format(currentMonth, "MMMM yyyy", { locale: nl })}
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(new Date())}
        >
          Vandaag
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Laden...</span>
          </div>
        ) : (
          <>
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
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={index}
                    className={cn(
                      "min-h-[60px] sm:min-h-[100px] border-b border-r border-border-light p-1 sm:p-2",
                      !isCurrentMonth && "bg-muted/30",
                      index % 7 === 6 && "border-r-0"
                    )}
                  >
                    <div
                      className={cn(
                        "mb-0.5 sm:mb-1 text-xs sm:text-sm font-medium",
                        isTodayDate
                          ? "inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          : isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "flex items-center gap-0.5 sm:gap-1 rounded px-1 py-0.5 text-[8px] sm:text-[10px] font-medium",
                            event.type === "delivery"
                              ? "bg-cyan-100 text-cyan-800"
                              : "bg-emerald-100 text-emerald-800"
                          )}
                        >
                          {event.type === "delivery" ? (
                            <Truck className="h-2 w-2 sm:h-3 sm:w-3 shrink-0" />
                          ) : (
                            <Wrench className="h-2 w-2 sm:h-3 sm:w-3 shrink-0" />
                          )}
                          <span className="truncate hidden sm:inline">{event.customerName}</span>
                          <span className="truncate sm:hidden">#{event.orderNumber}</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="px-1 text-[8px] sm:text-[10px] text-muted-foreground">
                          +{dayEvents.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default CalendarPage;
