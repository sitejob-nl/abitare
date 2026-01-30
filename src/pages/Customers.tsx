import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  initials: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  salesperson: string;
  status: "active" | "pending" | "inactive";
  statusLabel: string;
  lastContact: string;
}

const customers: Customer[] = [
  {
    id: "1",
    initials: "JK",
    name: "Fam. Janssen-Kohlen",
    email: "janssen@email.nl",
    phone: "06-12345678",
    city: "Landgraaf",
    salesperson: "Thom T.",
    status: "active",
    statusLabel: "Actief",
    lastContact: "Vandaag",
  },
  {
    id: "2",
    initials: "PH",
    name: "Dhr. P. Hendrikx",
    email: "p.hendrikx@gmail.com",
    phone: "06-98765432",
    city: "Roermond",
    salesperson: "Thom T.",
    status: "active",
    statusLabel: "Actief",
    lastContact: "Gisteren",
  },
  {
    id: "3",
    initials: "MS",
    name: "Mevr. M. Smeets",
    email: "m.smeets@outlook.com",
    phone: "06-55544433",
    city: "Weert",
    salesperson: "Mark V.",
    status: "pending",
    statusLabel: "Lead",
    lastContact: "3 dagen",
  },
  {
    id: "4",
    initials: "WB",
    name: "Fam. Willems-Bakker",
    email: "willems.bakker@home.nl",
    phone: "06-11122233",
    city: "Sittard",
    salesperson: "Thom T.",
    status: "active",
    statusLabel: "Actief",
    lastContact: "1 week",
  },
  {
    id: "5",
    initials: "RD",
    name: "Dhr. R. Driessen",
    email: "r.driessen@company.nl",
    phone: "06-77788899",
    city: "Heerlen",
    salesperson: "Lisa M.",
    status: "inactive",
    statusLabel: "Inactief",
    lastContact: "2 maanden",
  },
];

const Customers = () => {
  return (
    <AppLayout title="Klanten" breadcrumb="Klanten">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-[28px] font-semibold text-foreground">
          Klanten
        </h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nieuwe klant
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Vestiging:</span>
          <Select defaultValue="roermond">
            <SelectTrigger className="h-9 w-[160px] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle vestigingen</SelectItem>
              <SelectItem value="roermond">Roermond</SelectItem>
              <SelectItem value="maastricht">Maastricht</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Status:</span>
          <Select defaultValue="all">
            <SelectTrigger className="h-9 w-[120px] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="active">Actief</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="inactive">Inactief</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative ml-auto max-w-[300px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, email, telefoon..."
            className="h-9 pl-9 text-[13px]"
          />
        </div>
      </div>

      {/* Customer Table */}
      <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Klant
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Telefoon
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Plaats
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Verkoper
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Laatste contact
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="cursor-pointer border-b border-border-light last:border-b-0 transition-colors hover:bg-muted/30"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle text-sm font-semibold text-primary">
                      {customer.initials}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {customer.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {customer.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-foreground">
                  {customer.phone}
                </td>
                <td className="px-5 py-4 text-sm text-foreground">
                  {customer.city}
                </td>
                <td className="px-5 py-4 text-sm text-foreground">
                  {customer.salesperson}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                      customer.status === "active" && "status-active",
                      customer.status === "pending" && "status-pending",
                      customer.status === "inactive" && "status-inactive"
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {customer.statusLabel}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-muted-foreground">
                  {customer.lastContact}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
};

export default Customers;
