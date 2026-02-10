import { useState } from "react";
import { MapPin, Pencil, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface OrderAddresses {
  installation_street_address: string | null;
  installation_postal_code: string | null;
  installation_city: string | null;
  delivery_street_address: string | null;
  delivery_postal_code: string | null;
  delivery_city: string | null;
  invoice_street_address: string | null;
  invoice_postal_code: string | null;
  invoice_city: string | null;
}

interface CustomerAddress {
  street_address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  delivery_street_address?: string | null;
  delivery_postal_code?: string | null;
  delivery_city?: string | null;
}

interface OrderAddressesCardProps {
  addresses: OrderAddresses;
  customer: CustomerAddress | null;
  onSave: (addresses: Partial<OrderAddresses>) => void;
  isSaving?: boolean;
}

type AddressType = "installation" | "delivery" | "invoice";

const addressLabels: Record<AddressType, string> = {
  installation: "Montageadres",
  delivery: "Afleveradres",
  invoice: "Factuuradres",
};

function formatAddress(street: string | null, postal: string | null, city: string | null): string {
  if (!street && !postal && !city) return "Niet ingesteld";
  return [street, [postal, city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

function getCustomerAddress(customer: CustomerAddress | null, type: "home" | "delivery"): { street: string; postal: string; city: string } {
  if (!customer) return { street: "", postal: "", city: "" };
  if (type === "delivery") {
    return {
      street: customer.delivery_street_address || "",
      postal: customer.delivery_postal_code || "",
      city: customer.delivery_city || "",
    };
  }
  return {
    street: customer.street_address || "",
    postal: customer.postal_code || "",
    city: customer.city || "",
  };
}

export function OrderAddressesCard({ addresses, customer, onSave, isSaving }: OrderAddressesCardProps) {
  const [editType, setEditType] = useState<AddressType | null>(null);
  const [street, setStreet] = useState("");
  const [postal, setPostal] = useState("");
  const [city, setCity] = useState("");

  const addressGroups: { type: AddressType; street: string | null; postal: string | null; city: string | null }[] = [
    { type: "installation", street: addresses.installation_street_address, postal: addresses.installation_postal_code, city: addresses.installation_city },
    { type: "delivery", street: addresses.delivery_street_address, postal: addresses.delivery_postal_code, city: addresses.delivery_city },
    { type: "invoice", street: addresses.invoice_street_address, postal: addresses.invoice_postal_code, city: addresses.invoice_city },
  ];

  const openEdit = (type: AddressType) => {
    const group = addressGroups.find(g => g.type === type)!;
    setStreet(group.street || "");
    setPostal(group.postal || "");
    setCity(group.city || "");
    setEditType(type);
  };

  const handleSave = () => {
    if (!editType) return;
    const prefix = editType;
    onSave({
      [`${prefix}_street_address`]: street || null,
      [`${prefix}_postal_code`]: postal || null,
      [`${prefix}_city`]: city || null,
    } as Partial<OrderAddresses>);
    setEditType(null);
  };

  const handleCopyFrom = (source: "home" | "delivery" | "installation") => {
    if (source === "installation") {
      const inst = addressGroups.find(g => g.type === "installation")!;
      setStreet(inst.street || "");
      setPostal(inst.postal || "");
      setCity(inst.city || "");
    } else {
      const addr = getCustomerAddress(customer, source);
      setStreet(addr.street);
      setPostal(addr.postal);
      setCity(addr.city);
    }
  };

  const hasCustomerHome = !!customer?.street_address;
  const hasCustomerDelivery = !!customer?.delivery_street_address;
  const hasInstallation = !!addresses.installation_street_address;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Adressen</h3>
      </div>

      <div className="space-y-3">
        {addressGroups.map(({ type, street: s, postal: p, city: c }) => {
          const filled = !!s || !!p || !!c;
          return (
            <div key={type} className="group flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-muted-foreground/70">
                  {addressLabels[type]}
                </p>
                <p className={`text-sm ${filled ? "text-foreground" : "text-muted-foreground italic"}`}>
                  {formatAddress(s, p, c)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onClick={() => openEdit(type)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editType} onOpenChange={(open) => !open && setEditType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editType && addressLabels[editType]} bewerken</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Copy from buttons */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  Overnemen van...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {hasCustomerHome && (
                  <DropdownMenuItem onClick={() => handleCopyFrom("home")}>
                    Klant woonadres
                  </DropdownMenuItem>
                )}
                {hasCustomerDelivery && (
                  <DropdownMenuItem onClick={() => handleCopyFrom("delivery")}>
                    Klant afleveradres
                  </DropdownMenuItem>
                )}
                {hasInstallation && editType !== "installation" && (
                  <DropdownMenuItem onClick={() => handleCopyFrom("installation")}>
                    Montageadres (order)
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="space-y-2">
              <Label>Straat + huisnummer</Label>
              <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Straatnaam 123" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Postcode</Label>
                <Input value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="1234 AB" />
              </div>
              <div className="space-y-2">
                <Label>Stad</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Amsterdam" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditType(null)}>Annuleren</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Opslaan..." : "Opslaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}