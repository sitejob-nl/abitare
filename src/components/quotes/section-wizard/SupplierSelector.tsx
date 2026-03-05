import { cn } from "@/lib/utils";
import { useSuppliers } from "@/hooks/useSuppliers";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, Building2, Check } from "lucide-react";
import { useState, useMemo } from "react";
import type { SectionType } from "@/types/quote-sections";

interface SupplierSelectorProps {
  sectionType: SectionType;
  value: string | null;
  onChange: (supplierId: string, supplierCode: string) => void;
}

// Welke leveranciers per sectie type tonen (aanbevolen)
const SUPPLIER_FILTERS: Record<SectionType, string[]> = {
  keukenmeubelen: ["stosa", "nobilia", "häcker", "rotpunkt"],
  apparatuur: ["siemens", "bosch", "miele", "neff", "aeg", "smeg"],
  werkbladen: ["dekker", "kemie", "cosentino", "neolith"],
  sanitair: ["franke", "blanco", "quooker", "grohe"],
  diversen: [],
  montage: [],
};

export function SupplierSelector({ sectionType, value, onChange }: SupplierSelectorProps) {
  const { data: suppliers, isLoading } = useSuppliers();
  const [search, setSearch] = useState("");

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];

    let filtered = suppliers;
    const allowedCodes = SUPPLIER_FILTERS[sectionType];
    if (allowedCodes.length > 0) {
      filtered = filtered.filter((s) =>
        allowedCodes.some(
          (code) =>
            s.code?.toLowerCase().includes(code.toLowerCase()) ||
            s.name?.toLowerCase().includes(code.toLowerCase())
        )
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name?.toLowerCase().includes(searchLower) ||
          s.code?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [suppliers, sectionType, search]);

  const featuredSuppliers = useMemo(
    () =>
      filteredSuppliers.filter((s) =>
        ["stosa", "nobilia", "siemens", "miele"].includes(s.code?.toLowerCase() || "")
      ),
    [filteredSuppliers]
  );

  const otherSuppliers = useMemo(
    () =>
      filteredSuppliers.filter(
        (s) => !["stosa", "nobilia", "siemens", "miele"].includes(s.code?.toLowerCase() || "")
      ),
    [filteredSuppliers]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Kies leverancier</h3>
        <p className="text-sm text-muted-foreground">
          Selecteer de leverancier voor deze sectie
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek leverancier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {featuredSuppliers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Aanbevolen</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {featuredSuppliers.map((supplier) => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                selected={value === supplier.id}
                onClick={() => onChange(supplier.id, supplier.code || "")}
                featured
              />
            ))}
          </div>
        </div>
      )}

      {otherSuppliers.length > 0 && (
        <div>
          {featuredSuppliers.length > 0 && (
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Overige</h4>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {otherSuppliers.map((supplier) => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                selected={value === supplier.id}
                onClick={() => onChange(supplier.id, supplier.code || "")}
              />
            ))}
          </div>
        </div>
      )}

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Geen leveranciers gevonden</p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-sm text-primary hover:underline mt-2"
            >
              Zoekfilter wissen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface SupplierCardProps {
  supplier: { id: string; name: string; code?: string | null; logo_url?: string | null };
  selected: boolean;
  onClick: () => void;
  featured?: boolean;
}

function SupplierCard({ supplier, selected, onClick, featured }: SupplierCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all",
        "hover:border-primary hover:bg-primary/5",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        selected ? "border-primary bg-primary/10" : "border-muted",
        featured && "min-h-[100px]"
      )}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <Check className="h-4 w-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          "flex items-center justify-center h-10 w-10 rounded-full text-sm font-bold",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {supplier.name.substring(0, 2).toUpperCase()}
      </div>

      <span className={cn("text-sm font-medium text-center", selected && "text-primary")}>
        {supplier.name}
      </span>
    </button>
  );
}
