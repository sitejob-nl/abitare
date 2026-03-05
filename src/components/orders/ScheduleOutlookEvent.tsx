import { useState } from "react";
import { Calendar, Loader2, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useMsConnectedUsers } from "@/hooks/useMicrosoftCalendar";

interface ScheduleOutlookEventProps {
  orderId: string;
  orderNumber: number;
  customerName: string;
  installationAddress?: string;
  outlookEventId?: string | null;
  expectedInstallationDate?: string | null;
}

export function ScheduleOutlookEvent({
  orderId,
  orderNumber,
  customerName,
  installationAddress,
  outlookEventId,
  expectedInstallationDate,
}: ScheduleOutlookEventProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [notes, setNotes] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: msUsers } = useMsConnectedUsers();

  const toggleAttendee = (email: string) => {
    setSelectedAttendees((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleCreate = async () => {
    if (!date) return;

    setIsCreating(true);
    try {
      const startDateTime = `${date}T${startTime}:00`;
      const endDateTime = `${date}T${endTime}:00`;

      const attendees = selectedAttendees.map((email) => ({
        emailAddress: { address: email },
        type: "required",
      }));

      const eventData: any = {
        subject: `Montage Order #${orderNumber} - ${customerName}`,
        body: {
          contentType: "Text",
          content: [
            `Montage voor Order #${orderNumber}`,
            `Klant: ${customerName}`,
            installationAddress ? `Adres: ${installationAddress}` : null,
            notes ? `\nNotities: ${notes}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
        start: {
          dateTime: startDateTime,
          timeZone: "Europe/Amsterdam",
        },
        end: {
          dateTime: endDateTime,
          timeZone: "Europe/Amsterdam",
        },
        location: installationAddress
          ? { displayName: installationAddress }
          : undefined,
      };

      if (attendees.length > 0) {
        eventData.attendees = attendees;
      }

      const { data: result, error } = await supabase.functions.invoke(
        "microsoft-api",
        {
          body: {
            endpoint: "/me/events",
            method: "POST",
            data: eventData,
          },
        }
      );

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      const eventId = result?.id;
      if (eventId) {
        await supabase
          .from("orders")
          .update({ outlook_event_id: eventId } as any)
          .eq("id", orderId);
      }

      queryClient.invalidateQueries({ queryKey: ["order", orderId] });

      toast({
        title: "Outlook event aangemaakt",
        description: `Montage ingepland op ${new Date(date).toLocaleDateString("nl-NL")}${attendees.length > 0 ? ` met ${attendees.length} deelnemer(s)` : ""}`,
      });
      setOpen(false);
      setSelectedAttendees([]);
    } catch (err: any) {
      console.error("Create event error:", err);
      toast({
        title: "Fout bij aanmaken event",
        description: err.message || "Kon geen Outlook event aanmaken. Is Microsoft gekoppeld?",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);

  const checkOutlookSync = async () => {
    if (!outlookEventId) return;
    setIsSyncing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data: eventData, error } = await supabase.functions.invoke("microsoft-api", {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        body: {
          endpoint: `/me/events/${outlookEventId}?$select=start,end`,
          method: "GET",
        },
      });

      if (error || !eventData?.start?.dateTime) {
        setSyncWarning("Outlook event niet gevonden. Mogelijk verwijderd.");
        return;
      }

      const outlookDate = eventData.start.dateTime.split("T")[0];
      if (expectedInstallationDate && outlookDate !== expectedInstallationDate) {
        setSyncWarning(`Outlook datum (${new Date(outlookDate).toLocaleDateString("nl-NL")}) wijkt af van de montagedatum.`);
      } else {
        setSyncWarning(null);
        toast({ title: "Kalender in sync", description: "Outlook event komt overeen met de montagedatum." });
      }
    } catch (err) {
      console.error("Sync check error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncFromOutlook = async () => {
    if (!outlookEventId || !orderId) return;
    setIsSyncing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data: eventData } = await supabase.functions.invoke("microsoft-api", {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        body: {
          endpoint: `/me/events/${outlookEventId}?$select=start`,
          method: "GET",
        },
      });

      if (eventData?.start?.dateTime) {
        const outlookDate = eventData.start.dateTime.split("T")[0];
        await supabase.from("orders").update({ expected_installation_date: outlookDate }).eq("id", orderId);
        queryClient.invalidateQueries({ queryKey: ["order", orderId] });
        setSyncWarning(null);
        toast({ title: "Datum gesynchroniseerd", description: `Montagedatum bijgewerkt naar ${new Date(outlookDate).toLocaleDateString("nl-NL")}.` });
      }
    } catch (err) {
      toast({ title: "Sync mislukt", description: "Kon datum niet ophalen uit Outlook.", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  if (outlookEventId) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          <span>Ingepland in Outlook</span>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={checkOutlookSync} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Controleer sync"}
          </Button>
        </div>
        {syncWarning && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-1 rounded">
            <span>{syncWarning}</span>
            <Button variant="ghost" size="sm" className="h-5 text-xs px-1" onClick={syncFromOutlook} disabled={isSyncing}>
              Overnemen
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          Plan in Outlook
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Montage inplannen in Outlook</DialogTitle>
          <DialogDescription>
            Maak een agenda-afspraak aan voor Order #{orderNumber} ({customerName})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Datum</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Starttijd</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Eindtijd</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Attendees */}
          {msUsers && msUsers.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Deelnemers (optioneel)
              </Label>
              <div className="border rounded-md p-3 space-y-2 max-h-[160px] overflow-y-auto">
                {msUsers.map((u) => (
                  <label key={u.userId} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                    <Checkbox
                      checked={selectedAttendees.includes(u.microsoftEmail || u.email)}
                      onCheckedChange={() => toggleAttendee(u.microsoftEmail || u.email)}
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      {u.calendarColor && (
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: u.calendarColor }} />
                      )}
                      <span className="text-sm truncate">{u.fullName}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notities (optioneel)</Label>
            <Textarea
              placeholder="Extra informatie voor de monteur..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuleren
          </Button>
          <Button onClick={handleCreate} disabled={!date || isCreating}>
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Calendar className="mr-2 h-4 w-4" />
            )}
            Inplannen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
