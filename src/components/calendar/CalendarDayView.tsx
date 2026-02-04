import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Truck, Wrench, User, MapPin, Phone, ExternalLink, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInstallers } from "@/hooks/useInstallers";
import { useAssignInstaller } from "@/hooks/useAssignInstaller";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ConflictInfo } from "@/hooks/useCalendarConflicts";

interface DayEvent {
  id: string;
  orderId: string;
  orderNumber: number;
  type: "delivery" | "installation";
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  installerId?: string | null;
  installerName?: string | null;
  hasConflict?: boolean;
}

interface CalendarDayViewProps {
  currentDate: Date;
  events: DayEvent[];
  conflicts: ConflictInfo[];
}

function DayEventCard({ event }: { event: DayEvent }) {
  const { data: installers } = useInstallers();
  const assignInstaller = useAssignInstaller();

  const handleAssignInstaller = async (installerId: string) => {
    try {
      await assignInstaller.mutateAsync({
        orderId: event.orderId,
        installerId: installerId === "none" ? null : installerId,
      });
      toast({
        title: "Monteur toegewezen",
        description: installerId === "none" 
          ? "Monteur is verwijderd van de order."
          : "Monteur is succesvol toegewezen.",
      });
    } catch (error) {
      toast({
        title: "Fout bij toewijzen",
        description: "De monteur kon niet worden toegewezen.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={cn(
      "relative",
      event.hasConflict && "ring-2 ring-orange-400"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {event.type === "delivery" ? (
              <div className="rounded-full bg-cyan-100 p-2">
                <Truck className="h-5 w-5 text-cyan-600" />
              </div>
            ) : (
              <div className="rounded-full bg-emerald-100 p-2">
                <Wrench className="h-5 w-5 text-emerald-600" />
              </div>
            )}
            <div>
              <CardTitle className="text-base">
                {event.type === "delivery" ? "Levering" : "Montage"} #{event.orderNumber}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{event.customerName}</p>
            </div>
          </div>
          <Link to={`/orders/${event.orderId}`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" />
              Bekijk
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Conflict warning */}
        {event.hasConflict && (
          <div className="flex items-center gap-2 rounded-md bg-orange-50 border border-orange-200 p-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
            <p className="text-xs text-orange-800">
              Deze monteur heeft meerdere afspraken vandaag
            </p>
          </div>
        )}

        {/* Customer details */}
        <div className="grid gap-2 text-sm">
          {event.customerPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${event.customerPhone}`} className="hover:underline">
                {event.customerPhone}
              </a>
            </div>
          )}
          {event.customerAddress && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{event.customerAddress}</span>
            </div>
          )}
        </div>

        {/* Installer assignment (only for installations) */}
        {event.type === "installation" && (
          <div className="pt-2 border-t">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Monteur
            </label>
            <Select
              value={event.installerId || "none"}
              onValueChange={handleAssignInstaller}
              disabled={assignInstaller.isPending}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecteer monteur..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen monteur</SelectItem>
                {installers?.map((installer) => (
                  <SelectItem key={installer.id} value={installer.id}>
                    {installer.full_name || installer.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CalendarDayView({ currentDate, events, conflicts }: CalendarDayViewProps) {
  const dateStr = format(currentDate, "yyyy-MM-dd");
  const dayConflicts = conflicts.filter((c) => c.date === dateStr);

  const deliveries = events.filter((e) => e.type === "delivery");
  const installations = events.filter((e) => e.type === "installation");

  // Mark events that have conflicts
  const eventsWithConflicts = events.map((event) => ({
    ...event,
    hasConflict: event.type === "installation" && 
      dayConflicts.some((c) => c.installerId === event.installerId),
  }));

  const deliveriesWithConflicts = eventsWithConflicts.filter((e) => e.type === "delivery");
  const installationsWithConflicts = eventsWithConflicts.filter((e) => e.type === "installation");

  return (
    <div className="space-y-6">
      {/* Date header */}
      <div className="text-center py-4 rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">
          {format(currentDate, "EEEE", { locale: nl })}
        </p>
        <p className="text-3xl font-bold text-foreground">
          {format(currentDate, "d MMMM yyyy", { locale: nl })}
        </p>
        <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>{deliveries.length} leveringen</span>
          <span>•</span>
          <span>{installations.length} montages</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed border-border">
          <p className="text-muted-foreground">Geen afspraken op deze dag</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Deliveries */}
          {deliveriesWithConflicts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Leveringen ({deliveriesWithConflicts.length})
              </h3>
              <div className="space-y-3">
                {deliveriesWithConflicts.map((event) => (
                  <DayEventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {/* Installations */}
          {installationsWithConflicts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Montages ({installationsWithConflicts.length})
              </h3>
              <div className="space-y-3">
                {installationsWithConflicts.map((event) => (
                  <DayEventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
