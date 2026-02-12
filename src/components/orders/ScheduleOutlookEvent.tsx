import { useState } from "react";
import { Calendar, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface ScheduleOutlookEventProps {
  orderId: string;
  orderNumber: number;
  customerName: string;
  installationAddress?: string;
  outlookEventId?: string | null;
}

export function ScheduleOutlookEvent({
  orderId,
  orderNumber,
  customerName,
  installationAddress,
  outlookEventId,
}: ScheduleOutlookEventProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    if (!date) return;

    setIsCreating(true);
    try {
      const startDateTime = `${date}T${startTime}:00`;
      const endDateTime = `${date}T${endTime}:00`;

      const eventData = {
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

      // Save event ID on order
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
        description: `Montage ingepland op ${new Date(date).toLocaleDateString("nl-NL")}`,
      });
      setOpen(false);
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

  if (outlookEventId) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4 text-primary" />
        <span>Ingepland in Outlook</span>
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
      <DialogContent>
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
