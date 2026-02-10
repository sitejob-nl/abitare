import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Calendar, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { usePortalSubmitPlanning, usePortalHasSubmitted } from "@/hooks/usePortalData";
import { toast } from "@/hooks/use-toast";
import type { PortalData } from "@/hooks/usePortalData";

interface PortalContext {
  portalData: PortalData;
  token: string;
}

export default function PortalPlanning() {
  const { portalData, token } = useOutletContext<PortalContext>();
  const { orders } = portalData;

  const ordersNeedingPlanning = orders.filter(
    (o) => !o.expected_installation_date && o.status !== "afgehandeld" && o.status !== "geannuleerd"
  );

  const [selectedOrderId, setSelectedOrderId] = useState<string>(ordersNeedingPlanning[0]?.id || "");
  const [date1, setDate1] = useState<Date | undefined>();
  const [date2, setDate2] = useState<Date | undefined>();
  const [date3, setDate3] = useState<Date | undefined>();
  const [timePreference, setTimePreference] = useState<"ochtend" | "middag" | "geen_voorkeur">("geen_voorkeur");
  const [remarks, setRemarks] = useState("");

  const submitPlanning = usePortalSubmitPlanning();
  const { data: hasSubmitted } = usePortalHasSubmitted(token, selectedOrderId);

  const handleSubmit = async () => {
    if (!selectedOrderId || !date1) {
      toast({ title: "Selecteer een datum", description: "Kies minimaal één voorkeursdatum.", variant: "destructive" });
      return;
    }

    try {
      await submitPlanning.mutateAsync({
        token,
        orderId: selectedOrderId,
        preferredDate1: date1 ? format(date1, "yyyy-MM-dd") : undefined,
        preferredDate2: date2 ? format(date2, "yyyy-MM-dd") : undefined,
        preferredDate3: date3 ? format(date3, "yyyy-MM-dd") : undefined,
        timePreference,
        remarks: remarks || undefined,
      });

      toast({ title: "Voorkeur opgeslagen", description: "Uw voorkeursdatums zijn doorgegeven. Wij nemen contact met u op." });
      setDate1(undefined);
      setDate2(undefined);
      setDate3(undefined);
      setTimePreference("geen_voorkeur");
      setRemarks("");
    } catch {
      toast({ title: "Fout bij opslaan", description: "Er is iets misgegaan. Probeer het opnieuw.", variant: "destructive" });
    }
  };

  const minDate = addDays(new Date(), 7);

  if (ordersNeedingPlanning.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Montageplanning</h1>
          <p className="text-muted-foreground mt-1">Geef uw voorkeursdatums door voor de montage.</p>
        </div>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="rounded-full bg-green-100 p-4 w-fit mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-lg font-medium text-foreground">Alles ingepland</h2>
            <p className="text-muted-foreground mt-1">Al uw orders hebben een geplande montagedatum.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Montageplanning</h1>
        <p className="text-muted-foreground mt-1">
          Geef uw voorkeursdatums door voor de montage. Wij nemen contact met u op om een definitieve afspraak te maken.
        </p>
      </div>

      {ordersNeedingPlanning.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selecteer order</CardTitle>
            <CardDescription>Kies de order waarvoor u een montagedatum wilt doorgeven.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ordersNeedingPlanning.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors",
                    selectedOrderId === order.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  )}
                >
                  <p className="font-medium">Order #{order.order_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.order_date && new Date(order.order_date).toLocaleDateString("nl-NL")}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasSubmitted && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Voorkeur reeds doorgegeven</p>
                <p className="text-sm text-green-700">U heeft al voorkeursdatums doorgegeven voor deze order. U kunt ook nieuwe voorkeuren indienen.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Voorkeursdatums voor Order #{selectedOrder?.order_number}
          </CardTitle>
          <CardDescription>Kies maximaal 3 datums waarop de montage zou kunnen plaatsvinden.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "1e voorkeur", date: date1, setDate: setDate1 },
              { label: "2e voorkeur", date: date2, setDate: setDate2 },
              { label: "3e voorkeur", date: date3, setDate: setDate3 },
            ].map((item, index) => (
              <div key={index}>
                <Label className="mb-2 block">{item.label}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !item.date && "text-muted-foreground")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {item.date ? format(item.date, "d MMMM yyyy", { locale: nl }) : "Kies datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={item.date}
                      onSelect={item.setDate}
                      disabled={(date) => date < minDate}
                      initialFocus
                      locale={nl}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ))}
          </div>

          <div>
            <Label className="mb-3 block">Tijdsvoorkeur</Label>
            <RadioGroup
              value={timePreference}
              onValueChange={(value) => setTimePreference(value as typeof timePreference)}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ochtend" id="ochtend" />
                <Label htmlFor="ochtend" className="font-normal">Ochtend (08:00 - 12:00)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="middag" id="middag" />
                <Label htmlFor="middag" className="font-normal">Middag (12:00 - 17:00)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="geen_voorkeur" id="geen_voorkeur" />
                <Label htmlFor="geen_voorkeur" className="font-normal">Geen voorkeur</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="remarks" className="mb-2 block">Opmerkingen (optioneel)</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Bijzonderheden, toegang, parkeren, etc."
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} disabled={!date1 || submitPlanning.isPending} className="w-full sm:w-auto">
            {submitPlanning.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Voorkeur doorgeven
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
