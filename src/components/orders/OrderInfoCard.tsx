import { User, MapPin, Calendar, Phone, Mail, Building2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

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

export function OrderInfoCard({
  customer,
  division,
  orderDate,
  expectedDeliveryDate,
  expectedInstallationDate,
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
          {expectedDeliveryDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <div>
                <span className="text-xs text-muted-foreground/70">Levering: </span>
                <span>{formatDate(expectedDeliveryDate)}</span>
              </div>
            </div>
          )}
          {expectedInstallationDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <div>
                <span className="text-xs text-muted-foreground/70">Montage: </span>
                <span>{formatDate(expectedInstallationDate)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
