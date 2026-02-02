import { useState } from "react";
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
import { Plus, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomers } from "@/hooks/useCustomers";
import { useDivisions } from "@/hooks/useDivisions";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

function getInitials(firstName?: string | null, lastName?: string | null, companyName?: string | null): string {
  if (companyName) {
    return companyName.slice(0, 2).toUpperCase();
  }
  const first = firstName?.[0] || "";
  const last = lastName?.[0] || "";
  return (first + last).toUpperCase() || "??";
}

function getDisplayName(firstName?: string | null, lastName?: string | null, companyName?: string | null, salutation?: string | null): string {
  if (companyName) {
    return companyName;
  }
  const parts = [salutation, firstName, lastName].filter(Boolean);
  return parts.join(" ") || "Onbekend";
}

function getRelativeTime(date: string | null): string {
  if (!date) return "-";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: false, locale: nl });
  } catch {
    return "-";
  }
}

const Customers = () => {
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Simple debounce
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const { data: divisions, isLoading: divisionsLoading } = useDivisions();
  const { data: customers, isLoading: customersLoading } = useCustomers({
    divisionId: divisionFilter === "all" ? null : divisionFilter,
    search: debouncedSearch || undefined,
  });

  const isLoading = customersLoading || divisionsLoading;

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
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger className="h-9 w-[160px] text-[13px]">
              <SelectValue placeholder="Selecteer vestiging" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle vestigingen</SelectItem>
              {divisions?.map((division) => (
                <SelectItem key={division.id} value={division.id}>
                  {division.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative ml-auto max-w-[300px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, email, telefoon..."
            className="h-9 pl-9 text-[13px]"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Customer Table */}
      <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Laden...</span>
          </div>
        ) : customers && customers.length > 0 ? (
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
                  Klantnr.
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Aangemaakt
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const initials = getInitials(customer.first_name, customer.last_name, customer.company_name);
                const displayName = getDisplayName(customer.first_name, customer.last_name, customer.company_name, customer.salutation);
                const salesperson = (customer.salesperson as { full_name?: string } | null)?.full_name || "-";
                
                return (
                  <tr
                    key={customer.id}
                    className="cursor-pointer border-b border-border-light last:border-b-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle text-sm font-semibold text-primary">
                          {initials}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {displayName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {customer.email || "-"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-foreground">
                      {customer.phone || customer.mobile || "-"}
                    </td>
                    <td className="px-5 py-4 text-sm text-foreground">
                      {customer.city || "-"}
                    </td>
                    <td className="px-5 py-4 text-sm text-foreground">
                      {salesperson}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      #{customer.customer_number}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {getRelativeTime(customer.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {debouncedSearch ? "Geen klanten gevonden voor deze zoekopdracht" : "Nog geen klanten aanwezig"}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Customers;
