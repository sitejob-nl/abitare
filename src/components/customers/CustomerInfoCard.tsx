import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Building2, User, Truck } from "lucide-react";
import type { Customer } from "@/hooks/useCustomers";

interface CustomerInfoCardProps {
  customer: Customer & { division?: { id: string; name: string } | null };
}

export function CustomerInfoCard({ customer }: CustomerInfoCardProps) {
  const fullName = [customer.salutation, customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ");

  const billingAddress = [
    customer.street_address,
    [customer.postal_code, customer.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  const deliveryAddress = [
    customer.delivery_street_address,
    [customer.delivery_postal_code, customer.delivery_city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  const hasDeliveryAddress = !!(customer.delivery_street_address || customer.delivery_postal_code || customer.delivery_city);
  const addressesDiffer = hasDeliveryAddress && deliveryAddress !== billingAddress;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          Contactgegevens
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {customer.company_name && (
          <div className="flex items-start gap-3">
            <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">{customer.company_name}</p>
              {fullName && <p className="text-xs text-muted-foreground">{fullName}</p>}
            </div>
          </div>
        )}

        {!customer.company_name && fullName && (
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-sm">{fullName}</p>
          </div>
        )}

        {customer.email && (
          <div className="flex items-start gap-3">
            <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
            <a
              href={`mailto:${customer.email}`}
              className="text-sm text-primary hover:underline"
            >
              {customer.email}
            </a>
          </div>
        )}

        {(customer.phone || customer.mobile) && (
          <div className="flex items-start gap-3">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="text-sm text-primary hover:underline block"
                >
                  {customer.phone}
                </a>
              )}
              {customer.mobile && customer.mobile !== customer.phone && (
                <a
                  href={`tel:${customer.mobile}`}
                  className="text-sm text-primary hover:underline block"
                >
                  {customer.mobile} (mobiel)
                </a>
              )}
            </div>
          </div>
        )}

        {/* Billing Address */}
        {billingAddress && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              {addressesDiffer && (
                <p className="text-xs text-muted-foreground mb-0.5">Factuuradres</p>
              )}
              <p className="text-sm">{billingAddress}</p>
            </div>
          </div>
        )}

        {/* Delivery Address (only if different) */}
        {addressesDiffer && (
          <div className="flex items-start gap-3">
            <Truck className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Bezorgadres</p>
              <p className="text-sm">{deliveryAddress}</p>
              {(customer.delivery_floor || customer.delivery_has_elevator !== null) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[
                    customer.delivery_floor ? `Verdieping ${customer.delivery_floor}` : null,
                    customer.delivery_has_elevator ? "Lift aanwezig" : customer.delivery_has_elevator === false ? "Geen lift" : null,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              )}
            </div>
          </div>
        )}

        {customer.division?.name && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Vestiging: {customer.division.name}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
