import { useState, useEffect } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";

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
  const { activeDivisionId, setActiveDivisionId, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);

  // Local division filter synced with global state
  const divisionFilter = activeDivisionId || "all";
  const setDivisionFilter = (value: string) => {
    setActiveDivisionId(value === "all" ? null : value);
  };

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
      <div className="mb-4 md:mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-xl md:text-[28px] font-semibold text-foreground">
          Klanten
        </h1>
        <Button className="gap-2" onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nieuwe klant</span>
          <span className="sm:hidden">Nieuw</span>
        </Button>
      </div>

      <CustomerFormDialog open={showNewDialog} onOpenChange={setShowNewDialog} />

      {/* Filters Bar */}
      <div className="mb-4 md:mb-5 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground hidden sm:inline">Vestiging:</span>
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[160px] text-[13px]">
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
        <div className="relative sm:ml-auto w-full sm:max-w-[300px] sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, email, telefoon..."
            className="h-9 pl-9 text-[13px]"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="animate-fade-in">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 rounded-xl border border-border bg-card">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Laden...</span>
          </div>
        ) : customers && customers.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card">
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
                    const salesperson = "-";
                    
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
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {customers.map((customer) => {
                const initials = getInitials(customer.first_name, customer.last_name, customer.company_name);
                const displayName = getDisplayName(customer.first_name, customer.last_name, customer.company_name, customer.salutation);

                return (
                  <div
                    key={customer.id}
                    className="p-4 rounded-xl border border-border bg-card cursor-pointer transition-colors hover:bg-muted/30 active:bg-muted/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-sm font-semibold text-primary">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {displayName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {customer.email || "-"}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{customer.phone || customer.mobile || "-"}</span>
                          <span>•</span>
                          <span>{customer.city || "-"}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        #{customer.customer_number}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="py-12 text-center rounded-xl border border-border bg-card">
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
