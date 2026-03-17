import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus, Search, Loader2, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, SlidersHorizontal, X,
  Package, Building2, Euro, EyeOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProducts, useProductCategories, useSuppliers } from "@/hooks/useProducts";
import { useProductStats } from "@/hooks/useProductStats";
import { BulkActionsBar } from "@/components/products/BulkActionsBar";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatCurrency } from "@/lib/utils";

type SortField = "name" | "base_price" | "cost_price" | "created_at" | "article_code";
type SortDirection = "asc" | "desc";

// SortIcon defined outside the component to avoid ref warnings
function SortIcon({ field, sortField, sortDirection }: { field: SortField; sortField: SortField; sortDirection: SortDirection }) {
  if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}

// Memoized table row to prevent unnecessary re-renders
interface ProductRowProps {
  product: any;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onNavigate: (id: string) => void;
}

const ProductRow = memo(function ProductRow({ product, isSelected, onToggle, onNavigate }: ProductRowProps) {
  const supplier = product.supplier as { name?: string } | null;
  const category = product.category as { name?: string } | null;

  const handleRowClick = useCallback((e: React.MouseEvent<HTMLTableRowElement>) => {
    if ((e.target as HTMLElement).closest('[role="checkbox"]') || (e.target as HTMLElement).closest('td:first-child')) return;
    onNavigate(product.id);
  }, [product.id, onNavigate]);

  return (
    <tr
      className={`cursor-pointer border-b border-border-light last:border-b-0 transition-colors hover:bg-muted/30 ${
        isSelected ? "bg-primary/5" : ""
      }`}
      onClick={handleRowClick}
    >
      <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(product.id)}
        />
      </td>
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
        {product.base_price != null ? formatCurrency(product.base_price) : (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">per PG</span>
          </span>
        )}
      </td>
      <td className="px-5 py-4 text-sm text-muted-foreground">
        {product.cost_price != null ? formatCurrency(product.cost_price) : (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">per PG</span>
        )}
      </td>
      <td className="px-5 py-4">
        {product.is_active ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Actief
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            Inactief
          </span>
        )}
      </td>
    </tr>
  );
}, (prev, next) => prev.product.id === next.product.id && prev.isSelected === next.isSelected);

// Pagination helpers
function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

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
  const [pageSize, setPageSize] = useState<number>(50);
  const [showInactive, setShowInactive] = useState(false);
  const navigate = useNavigate();

  // Proper debounce with cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [supplierFilter, categoryFilter, priceMin, priceMax, sortField, sortDirection, pageSize, showInactive]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const { data: suppliers, isLoading: suppliersLoading } = useSuppliers();
  const { data: categories, isLoading: categoriesLoading } = useProductCategories();
  const { data: stats } = useProductStats();
  const { data: result, isLoading: productsLoading, isFetching } = useProducts({
    supplierId: supplierFilter === "all" ? null : supplierFilter,
    categoryId: categoryFilter === "all" ? null : categoryFilter,
    search: debouncedSearch || undefined,
    sortField,
    sortDirection,
    priceMin: priceMin ? parseFloat(priceMin) : null,
    priceMax: priceMax ? parseFloat(priceMax) : null,
    page,
    pageSize,
    showInactive,
  });

  const products = result?.data;
  const totalCount = result?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const isLoading = productsLoading || suppliersLoading || categoriesLoading;
  const isRefetching = isFetching && !productsLoading;

  // Active filters for chips
  const activeFilters = useMemo(() => {
    const filters: { id: string; label: string; onClear: () => void }[] = [];
    if (supplierFilter !== "all") {
      const name = suppliers?.find((s) => s.id === supplierFilter)?.name ?? supplierFilter;
      filters.push({ id: "supplier", label: `Leverancier: ${name}`, onClear: () => setSupplierFilter("all") });
    }
    if (categoryFilter !== "all") {
      const name = categories?.find((c) => c.id === categoryFilter)?.name ?? categoryFilter;
      filters.push({ id: "category", label: `Categorie: ${name}`, onClear: () => setCategoryFilter("all") });
    }
    if (priceMin) {
      filters.push({ id: "priceMin", label: `Min: €${priceMin}`, onClear: () => setPriceMin("") });
    }
    if (priceMax) {
      filters.push({ id: "priceMax", label: `Max: €${priceMax}`, onClear: () => setPriceMax("") });
    }
    if (showInactive) {
      filters.push({ id: "inactive", label: "Incl. inactief", onClear: () => setShowInactive(false) });
    }
    return filters;
  }, [supplierFilter, categoryFilter, priceMin, priceMax, showInactive, suppliers, categories]);

  const activeFilterCount = activeFilters.length;

  const allIds = useMemo(() => products?.map((p) => p.id) || [], [products]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleNavigate = useCallback((id: string) => {
    navigate(`/products/${id}`);
  }, [navigate]);

  const clearAllFilters = () => {
    setSupplierFilter("all");
    setCategoryFilter("all");
    setPriceMin("");
    setPriceMax("");
    setShowInactive(false);
  };

  return (
    <AppLayout title="Producten" breadcrumb="Producten">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-[28px] font-semibold text-foreground">
          Producten
        </h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nieuw product</span>
          <span className="sm:hidden">Nieuw</span>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Package className="h-5 w-5" />}
          iconVariant="primary"
          value={stats?.totalActive?.toLocaleString("nl-NL") ?? "–"}
          label="Actieve producten"
          animationDelay={0}
        />
        <StatCard
          icon={<Building2 className="h-5 w-5" />}
          iconVariant="accent"
          value={stats?.supplierCount?.toString() ?? "–"}
          label="Leveranciers"
          animationDelay={1}
        />
        <StatCard
          icon={<Euro className="h-5 w-5" />}
          iconVariant="success"
          value={stats?.avgPrice != null ? formatCurrency(stats.avgPrice) : "–"}
          label="Gem. verkoopprijs"
          animationDelay={2}
        />
        <StatCard
          icon={<EyeOff className="h-5 w-5" />}
          iconVariant="warning"
          value={stats?.totalInactive?.toString() ?? "–"}
          label="Inactieve producten"
          animationDelay={3}
          className={!showInactive ? "cursor-pointer" : ""}
          onClick={!showInactive ? () => setShowInactive(true) : undefined}
        />
      </div>

      {/* Search + Filter Bar */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-[360px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op artikelcode of naam..."
            className="h-9 pl-9 text-[13px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-9">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="default" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-4" align="start">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Filters</h4>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs text-muted-foreground" onClick={clearAllFilters}>
                  Alles wissen
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Leverancier</label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="h-9 text-[13px]">
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

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Categorie</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-[13px]">
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

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Prijsbereik</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  className="h-9 text-[13px]"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
                <span className="text-muted-foreground text-xs">–</span>
                <Input
                  type="number"
                  placeholder="Max"
                  className="h-9 text-[13px]"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={(v) => setShowInactive(v === true)}
              />
              <label htmlFor="show-inactive" className="text-xs text-muted-foreground cursor-pointer">
                Toon inactieve producten
              </label>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.id}
              variant="secondary"
              className="gap-1 pl-2.5 pr-1.5 py-1 text-xs font-normal"
            >
              {filter.label}
              <button
                onClick={filter.onClear}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Alles wissen
          </button>
        </div>
      )}

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
          <div className={`hidden md:block animate-fade-in rounded-xl border border-border bg-card transition-opacity duration-200 ${isRefetching ? "opacity-60" : ""}`}>
            {isRefetching && (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/50 border-b border-border text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Vernieuwen...
              </div>
            )}
            <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-card">
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
                        Artikelcode <SortIcon field="article_code" sortField={sortField} sortDirection={sortDirection} />
                      </span>
                    </th>
                    <th
                      className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer select-none"
                      onClick={() => toggleSort("name")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Naam <SortIcon field="name" sortField={sortField} sortDirection={sortDirection} />
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
                        Verkoopprijs <SortIcon field="base_price" sortField={sortField} sortDirection={sortDirection} />
                      </span>
                    </th>
                    <th
                      className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer select-none"
                      onClick={() => toggleSort("cost_price")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Inkoopprijs <SortIcon field="cost_price" sortField={sortField} sortDirection={sortDirection} />
                      </span>
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      isSelected={selectedIds.has(product.id)}
                      onToggle={toggleOne}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className={`md:hidden space-y-3 transition-opacity duration-200 ${isRefetching ? "opacity-60" : ""}`}>
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
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              {product.article_code}
                            </span>
                            {product.is_active ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-success" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                            )}
                          </div>
                          <div className="text-sm font-medium text-foreground mt-0.5">
                            {product.name}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {product.base_price != null ? formatCurrency(product.base_price) : <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">per PG</span>}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light">
                        <div className="text-xs text-muted-foreground">
                          {[supplier?.name, category?.name].filter(Boolean).join(" • ") || "-"}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Inkoop: {product.cost_price != null ? formatCurrency(product.cost_price) : "per PG"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalCount)} van {totalCount}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Toon</span>
                <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-7 w-[70px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === "ellipsis" ? (
                    <span key={`e-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8 text-xs"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
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
