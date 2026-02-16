import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Loader2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProducts, useProductCategories, useSuppliers } from "@/hooks/useProducts";
import { BulkActionsBar } from "@/components/products/BulkActionsBar";

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "€ -";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

type SortField = "name" | "base_price" | "cost_price" | "created_at" | "article_code";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 50;

const Products = () => {
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  // Proper debounce with cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // reset to page 1 on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [supplierFilter, categoryFilter, priceMin, priceMax, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const { data: suppliers, isLoading: suppliersLoading } = useSuppliers();
  const { data: categories, isLoading: categoriesLoading } = useProductCategories();
  const { data: result, isLoading: productsLoading } = useProducts({
    supplierId: supplierFilter === "all" ? null : supplierFilter,
    categoryId: categoryFilter === "all" ? null : categoryFilter,
    search: debouncedSearch || undefined,
    sortField,
    sortDirection,
    priceMin: priceMin ? parseFloat(priceMin) : null,
    priceMax: priceMax ? parseFloat(priceMax) : null,
    page,
    pageSize: PAGE_SIZE,
  });

  const products = result?.data;
  const totalCount = result?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const isLoading = productsLoading || suppliersLoading || categoriesLoading;

  const allIds = useMemo(() => products?.map((p) => p.id) || [], [products]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AppLayout title="Producten" breadcrumb="Producten">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-[28px] font-semibold text-foreground">
          Producten
          <span className="ml-2 text-lg font-normal text-muted-foreground">
            ({totalCount})
          </span>
        </h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nieuw product</span>
          <span className="sm:hidden">Nieuw</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="mb-5 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground hidden sm:inline">Leverancier:</span>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[160px] text-[13px]">
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
          <span className="text-[13px] text-muted-foreground hidden sm:inline">Categorie:</span>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[160px] text-[13px]">
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

        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground hidden sm:inline">Prijs:</span>
          <Input
            type="number"
            placeholder="Min"
            className="h-9 w-20 text-[13px]"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
          />
          <span className="text-muted-foreground text-xs">–</span>
          <Input
            type="number"
            placeholder="Max"
            className="h-9 w-20 text-[13px]"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
          />
        </div>

        <div className="relative sm:ml-auto w-full sm:max-w-[300px] sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op artikelcode of naam..."
            className="h-9 pl-9 text-[13px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedIds={Array.from(selectedIds)}
        onClearSelection={() => setSelectedIds(new Set())}
        suppliers={(suppliers || []).map((s) => ({ id: s.id, name: s.name }))}
        categories={(categories || []).map((c) => ({ id: c.id, name: c.name }))}
      />

      {/* Products Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Laden...</span>
        </div>
      ) : products && products.length > 0 ? (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-3.5 w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Selecteer alles"
                    />
                  </th>
                  <th
                    className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer select-none"
                    onClick={() => toggleSort("article_code")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Artikelcode <SortIcon field="article_code" />
                    </span>
                  </th>
                  <th
                    className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer select-none"
                    onClick={() => toggleSort("name")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Naam <SortIcon field="name" />
                    </span>
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Leverancier
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Categorie
                  </th>
                  <th
                    className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer select-none"
                    onClick={() => toggleSort("base_price")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Verkoopprijs <SortIcon field="base_price" />
                    </span>
                  </th>
                  <th
                    className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer select-none"
                    onClick={() => toggleSort("cost_price")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Inkoopprijs <SortIcon field="cost_price" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const supplier = product.supplier as { name?: string } | null;
                  const category = product.category as { name?: string } | null;
                  const isSelected = selectedIds.has(product.id);

                  return (
                    <tr
                      key={product.id}
                      className={`cursor-pointer border-b border-border-light last:border-b-0 transition-colors hover:bg-muted/30 ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOne(product.id)}
                        />
                      </td>
                      <td className="px-5 py-4" onClick={() => navigate(`/products/${product.id}`)}>
                        <span className="font-mono text-sm text-foreground">
                          {product.article_code}
                        </span>
                      </td>
                      <td className="px-5 py-4" onClick={() => navigate(`/products/${product.id}`)}>
                        <span className="text-sm font-medium text-foreground">
                          {product.name}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground" onClick={() => navigate(`/products/${product.id}`)}>
                        {supplier?.name || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground" onClick={() => navigate(`/products/${product.id}`)}>
                        {category?.name || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-foreground" onClick={() => navigate(`/products/${product.id}`)}>
                        {formatCurrency(product.base_price)}
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground" onClick={() => navigate(`/products/${product.id}`)}>
                        {formatCurrency(product.cost_price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {products.map((product) => {
              const supplier = product.supplier as { name?: string } | null;
              const category = product.category as { name?: string } | null;
              const isSelected = selectedIds.has(product.id);

              return (
                <div
                  key={product.id}
                  className={`p-4 rounded-xl border bg-card cursor-pointer transition-colors hover:bg-muted/30 active:bg-muted/50 ${
                    isSelected ? "border-primary/40 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(product.id)}
                      className="mt-1"
                    />
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-mono text-xs text-muted-foreground">
                            {product.article_code}
                          </span>
                          <div className="text-sm font-medium text-foreground mt-0.5">
                            {product.name}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(product.base_price)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light">
                        <div className="text-xs text-muted-foreground">
                          {[supplier?.name, category?.name].filter(Boolean).join(" • ") || "-"}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Inkoop: {formatCurrency(product.cost_price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)} van {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Vorige
                </Button>
                <span className="px-3 text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="gap-1"
                >
                  Volgende
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-border bg-card py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {debouncedSearch ? "Geen producten gevonden voor deze zoekopdracht" : "Nog geen producten aanwezig"}
          </p>
        </div>
      )}
    </AppLayout>
  );
};

export default Products;
