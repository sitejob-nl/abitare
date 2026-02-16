import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type ProductCategory = Tables<"product_categories">;

type SortField = "name" | "base_price" | "cost_price" | "created_at" | "article_code";
type SortDirection = "asc" | "desc";

interface UseProductsOptions {
  supplierId?: string | null;
  categoryId?: string | null;
  search?: string;
  limit?: number;
  enabled?: boolean;
  sortField?: SortField;
  sortDirection?: SortDirection;
  priceMin?: number | null;
  priceMax?: number | null;
  showInactive?: boolean;
  page?: number;
  pageSize?: number;
}

function applyFilters(
  query: any,
  opts: Pick<UseProductsOptions, "supplierId" | "categoryId" | "search" | "priceMin" | "priceMax" | "showInactive">
) {
  if (!opts.showInactive) {
    query = query.eq("is_active", true);
  }
  if (opts.supplierId && opts.supplierId !== "all") {
    query = query.eq("supplier_id", opts.supplierId);
  }
  if (opts.categoryId && opts.categoryId !== "all") {
    query = query.eq("category_id", opts.categoryId);
  }
  if (opts.search) {
    query = query.or(
      `article_code.ilike.%${opts.search}%,name.ilike.%${opts.search}%,sku.ilike.%${opts.search}%`
    );
  }
  if (opts.priceMin !== null && opts.priceMin !== undefined) {
    query = query.gte("base_price", opts.priceMin);
  }
  if (opts.priceMax !== null && opts.priceMax !== undefined) {
    query = query.lte("base_price", opts.priceMax);
  }
  return query;
}

export function useProducts(options: UseProductsOptions = {}) {
  const {
    supplierId, categoryId, search, limit, enabled = true,
    sortField = "name", sortDirection = "asc",
    priceMin, priceMax, showInactive = false,
    page = 1, pageSize = 50,
  } = options;

  const filterOpts = { supplierId, categoryId, search, priceMin, priceMax, showInactive };

  return useQuery({
    queryKey: ["products", { ...filterOpts, limit, sortField, sortDirection, page, pageSize }],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`
          *,
          supplier:suppliers(id, name, code),
          category:product_categories(id, name, code)
        `, { count: "exact" })
        .order(sortField, { ascending: sortDirection === "asc" });

      query = applyFilters(query, filterOpts);

      if (limit) {
        query = query.limit(limit);
      } else {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { data: data ?? [], count: count ?? 0, page, pageSize };
    },
    enabled,
  });
}

// ── Bulk mutations ──
export function useBulkUpdateProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("products")
        .update(updates)
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useBulkDeactivateProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("products")
        .update({ is_active: false })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          supplier:suppliers(*),
          category:product_categories(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
