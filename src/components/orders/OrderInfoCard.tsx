import { useState } from "react";
import { User, MapPin, Calendar, Phone, Mail, Building2, Pencil, Wrench } from "lucide-react";
import { format, getISOWeek, getISOWeekYear } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  street_address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  delivery_street_address?: string | null;
  delivery_postal_code?: string | null;
  delivery_city?: string | null;
}

interface Division {
  id: string;
  name: string;
}

interface OrderInfoCardProps {
  customer: Customer | null;
  division: Division | null;
  orderDate: string | null;
  expectedDeliveryDate: string | null;
  expectedInstallationDate: string | null;
  forecastWeek?: string | null;
  installerId?: string | null;
  installers?: { id: string; full_name: string | null }[];
  onUpdateDeliveryDate?: (date: Date | null) => void;
  onUpdateInstallationDate?: (date: Date | null) => void;
  onUpdateForecastWeek?: (week: string | null) => void;
  onAssignInstaller?: (installerId: string | null) => void;
  isUpdating?: boolean;
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "d MMMM yyyy", { locale: nl });
  } catch {
    return "-";
  }
}

function getCustomerName(customer: Customer | null): string {
  if (!customer) return "Onbekend";
  if (customer.company_name) return customer.company_name;
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Onbekend";
}

function getAddress(customer: Customer | null, useDelivery = false): string {
  if (!customer) return "-";
  
  if (useDelivery && customer.delivery_street_address) {
    return [
      customer.delivery_street_address,
      [customer.delivery_postal_code, customer.delivery_city].filter(Boolean).join(" "),
    ].filter(Boolean).join(", ");
  }
  
  return [
    customer.street_address,
    [customer.postal_code, customer.city].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ") || "-";
}

interface EditableDateProps {
  label: string;
  value: string | null;
  onUpdate: (date: Date | null) => void;
  isUpdating?: boolean;
}

function EditableDate({ label, value, onUpdate, isUpdating }: EditableDateProps) {
  const [open, setOpen] = useState(false);
  const currentDate = value ? new Date(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    onUpdate(date || null);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2 text-muted-foreground group">
      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
      <div className="flex-1">
        <span className="text-xs text-muted-foreground/70">{label}: </span>
        <span>{formatDate(value)}</span>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            disabled={isUpdating}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarComponent
            mode="single"
            selected={currentDate}
            onSelect={handleSelect}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
            locale={nl}
          />
          {value && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-destructive hover:text-destructive"
                onClick={() => handleSelect(undefined)}
              >
                Datum verwijderen
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function EditableForecastWeek({ value, onUpdate, isUpdating }: { value?: string | null; onUpdate: (week: string | null) => void; isUpdating?: boolean }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value || "");

  const now = new Date();
  const currentWeek = `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, "0")}`;

  const handleSave = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      onUpdate(null);
    } else if (/^\d{4}-W\d{2}$/.test(trimmed)) {
      onUpdate(trimmed);
    }
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2 text-muted-foreground group">
      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
      <div className="flex-1">
        <span className="text-xs text-muted-foreground/70">Prognose: </span>
        <span>{value || "-"}</span>
      </div>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setInput(value || currentWeek); }}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            disabled={isUpdating}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="end">
          <p className="text-xs text-muted-foreground mb-2">Weeknummer (bijv. {currentWeek})</p>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentWeek}
            className="h-8 text-sm mb-2"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleSave}>Opslaan</Button>
            {value && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => { onUpdate(null); setOpen(false); }}>
                Wis
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function OrderInfoCard({
  customer,
  division,
  orderDate,
  expectedDeliveryDate,
  expectedInstallationDate,
  forecastWeek,
  installerId,
  installers,
  onUpdateDeliveryDate,
  onUpdateInstallationDate,
  onUpdateForecastWeek,
  onAssignInstaller,
  isUpdating,
}: OrderInfoCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Klantgegevens</h3>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">{getCustomerName(customer)}</p>
          {customer?.company_name && customer.first_name && (
            <p className="text-sm text-muted-foreground">
              {[customer.first_name, customer.last_name].filter(Boolean).join(" ")}
            </p>
          )}
        </div>

        <div className="space-y-2 text-sm">
          {(customer?.email || customer?.phone || customer?.mobile) && (
            <div className="space-y-1">
              {customer.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <a href={`mailto:${customer.email}`} className="hover:text-foreground">
                    {customer.email}
                  </a>
                </div>
              )}
              {(customer.phone || customer.mobile) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <a href={`tel:${customer.phone || customer.mobile}`} className="hover:text-foreground">
                    {customer.phone || customer.mobile}
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-border pt-2">
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground/70">Afleveradres</p>
                <p>{getAddress(customer, true)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3 text-sm">
          {division && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span>{division.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <div>
              <span className="text-xs text-muted-foreground/70">Order: </span>
              <span>{formatDate(orderDate)}</span>
            </div>
          </div>
          
          {onUpdateDeliveryDate ? (
            <EditableDate
              label="Levering"
              value={expectedDeliveryDate}
              onUpdate={onUpdateDeliveryDate}
              isUpdating={isUpdating}
            />
          ) : expectedDeliveryDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <div>
                <span className="text-xs text-muted-foreground/70">Levering: </span>
                <span>{formatDate(expectedDeliveryDate)}</span>
              </div>
            </div>
          )}
          
          {onUpdateInstallationDate ? (
            <EditableDate
              label="Montage"
              value={expectedInstallationDate}
              onUpdate={onUpdateInstallationDate}
              isUpdating={isUpdating}
            />
          ) : expectedInstallationDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <div>
                <span className="text-xs text-muted-foreground/70">Montage: </span>
                <span>{formatDate(expectedInstallationDate)}</span>
              </div>
            </div>
          )}

          {onUpdateForecastWeek && (
            <EditableForecastWeek
              value={forecastWeek}
              onUpdate={onUpdateForecastWeek}
              isUpdating={isUpdating}
            />
          )}

          {onAssignInstaller && installers && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wrench className="h-3.5 w-3.5 flex-shrink-0" />
              <div className="flex-1">
                <Select
                  value={installerId || "__none__"}
                  onValueChange={(val) => onAssignInstaller(val === "__none__" ? null : val)}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="h-7 text-sm border-none shadow-none px-0 hover:bg-accent/50 -ml-0.5 pl-0.5">
                    <SelectValue placeholder="Monteur toewijzen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Geen monteur</SelectItem>
                    {installers.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.full_name || inst.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
