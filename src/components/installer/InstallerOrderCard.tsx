import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { MapPin, Phone, Calendar, ChevronRight, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InstallerOrderCardProps {
  order: {
    id: string;
    order_number: number;
    status: string | null;
    expected_installation_date: string | null;
    requires_elevator: boolean | null;
    customer: {
      id: string;
      first_name: string | null;
      last_name: string;
      company_name: string | null;
      phone: string | null;
      mobile: string | null;
      delivery_street_address: string | null;
      delivery_postal_code: string | null;
      delivery_city: string | null;
      delivery_floor: string | null;
      street_address: string | null;
      postal_code: string | null;
      city: string | null;
    } | null;
  };
}

const statusLabels: Record<string, string> = {
  montage_gepland: "Gepland",
  geleverd: "Geleverd",
  in_montage: "In montage",
};

const statusColors: Record<string, string> = {
  montage_gepland: "bg-blue-100 text-blue-800",
  geleverd: "bg-amber-100 text-amber-800",
  in_montage: "bg-purple-100 text-purple-800",
};

export function InstallerOrderCard({ order }: InstallerOrderCardProps) {
  const customer = order.customer;
  const customerName = customer
    ? customer.company_name || `${customer.first_name || ""} ${customer.last_name}`.trim()
    : "Onbekende klant";

  // Use delivery address if available, otherwise use regular address
  const address = customer?.delivery_street_address
    ? `${customer.delivery_street_address}, ${customer.delivery_postal_code} ${customer.delivery_city}`
    : customer?.street_address
    ? `${customer.street_address}, ${customer.postal_code} ${customer.city}`
    : null;

  const phone = customer?.mobile || customer?.phone;

  return (
    <Link to={`/monteur/opdracht/${order.id}`}>
      <Card className="p-4 transition-all hover:bg-muted/50 hover:shadow-md active:scale-[0.98]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    #{order.order_number}
                  </span>
                  <Badge
                    variant="secondary"
                    className={statusColors[order.status || ""] || ""}
                  >
                    {statusLabels[order.status || ""] || order.status}
                  </Badge>
                </div>
                <p className="mt-1 text-base font-medium">{customerName}</p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm text-muted-foreground">
              {order.expected_installation_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(order.expected_installation_date), "EEEE d MMMM", {
                      locale: nl,
                    })}
                  </span>
                </div>
              )}

              {address && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{address}</span>
                </div>
              )}

              {customer?.delivery_floor && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>
                    {customer.delivery_floor}e verdieping
                    {order.requires_elevator === false && " (geen lift)"}
                  </span>
                </div>
              )}

              {phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a
                    href={`tel:${phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary hover:underline"
                  >
                    {phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          <ChevronRight className="mt-2 h-5 w-5 flex-shrink-0 text-muted-foreground" />
        </div>
      </Card>
    </Link>
  );
}
