import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type ProductCategory = Tables<"product_categories">;

interface UseProductsOptions {
  supplierId?: string | null;
  categoryId?: string | null;
  search?: string;
  limit?: number;
  enabled?: boolean;
}

export function useProducts(options: UseProductsOptions = {}) {
  const { supplierId, categoryId, search, limit, enabled = true } = options;

  return useQuery({
    queryKey: ["products", { supplierId, categoryId, search, limit }],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`
          *,
          supplier:suppliers(id, name, code),
          category:product_categories(id, name, code)
        `)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (supplierId && supplierId !== "all") {
        query = query.eq("supplier_id", supplierId);
      }

      if (categoryId && categoryId !== "all") {
        query = query.eq("category_id", categoryId);
      }

      if (search) {
        query = query.or(
          `article_code.ilike.%${search}%,name.ilike.%${search}%,sku.ilike.%${search}%`
        );
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled,
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
