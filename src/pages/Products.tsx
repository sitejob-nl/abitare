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
import { useProducts, useProductCategories, useSuppliers } from "@/hooks/useProducts";

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "€ -";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

const Products = () => {
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const { data: suppliers, isLoading: suppliersLoading } = useSuppliers();
  const { data: categories, isLoading: categoriesLoading } = useProductCategories();
  const { data: products, isLoading: productsLoading } = useProducts({
    supplierId: supplierFilter === "all" ? null : supplierFilter,
    categoryId: categoryFilter === "all" ? null : categoryFilter,
    search: debouncedSearch || undefined,
  });

  const isLoading = productsLoading || suppliersLoading || categoriesLoading;

  return (
    <AppLayout title="Producten" breadcrumb="Producten">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-[28px] font-semibold text-foreground">
          Producten
        </h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nieuw product
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Leverancier:</span>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="h-9 w-[160px] text-[13px]">
              <SelectValue placeholder="Alle leveranciers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle leveranciers</SelectItem>
              {suppliers?.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Categorie:</span>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-[160px] text-[13px]">
              <SelectValue placeholder="Alle categorieën" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle categorieën</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative ml-auto max-w-[300px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op artikelcode of naam..."
            className="h-9 pl-9 text-[13px]"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Laden...</span>
          </div>
        ) : products && products.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Artikelcode
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Naam
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Leverancier
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Categorie
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Verkoopprijs
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Inkoopprijs
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const supplier = product.supplier as { name?: string } | null;
                const category = product.category as { name?: string } | null;

                return (
                  <tr
                    key={product.id}
                    className="cursor-pointer border-b border-border-light last:border-b-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm text-foreground">
                        {product.article_code}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-foreground">
                        {product.name}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {supplier?.name || "-"}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {category?.name || "-"}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-foreground">
                      {formatCurrency(product.base_price)}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {formatCurrency(product.cost_price)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {debouncedSearch ? "Geen producten gevonden voor deze zoekopdracht" : "Nog geen producten aanwezig"}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Products;
