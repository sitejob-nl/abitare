import { useState } from "react";
import { Link } from "react-router-dom";
import { Truck, Wrench, User, Calendar, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { CalendarEventData } from "./CalendarEventCard";

interface CalendarEventPopoverProps {
  event: CalendarEventData;
  children: React.ReactNode;
}

export function CalendarEventPopover({ event, children }: CalendarEventPopoverProps) {
  const [open, setOpen] = useState(false);
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {event.type === "delivery" ? (
                <div className="rounded-full bg-cyan-100 p-1.5">
                  <Truck className="h-4 w-4 text-cyan-600" />
                </div>
              ) : (
                <div className="rounded-full bg-emerald-100 p-1.5">
                  <Wrench className="h-4 w-4 text-emerald-600" />
                </div>
              )}
              <div>
                <p className="font-semibold text-sm">
                  {event.type === "delivery" ? "Levering" : "Montage"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Order #{event.orderNumber}
                </p>
              </div>
            </div>
            <Link to={`/orders/${event.orderId}`}>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Conflict warning */}
          {event.hasConflict && (
            <div className="flex items-center gap-2 rounded-md bg-orange-50 border border-orange-200 p-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
              <p className="text-xs text-orange-800">
                Deze monteur heeft meerdere afspraken op deze dag
              </p>
            </div>
          )}

          {/* Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{event.customerName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(event.date), "EEEE d MMMM yyyy", { locale: nl })}</span>
            </div>
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
