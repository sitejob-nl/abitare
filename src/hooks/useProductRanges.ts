import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ProductRange = Tables<"product_ranges">;
export type ProductRangeInsert = TablesInsert<"product_ranges">;
export type ProductRangeUpdate = TablesUpdate<"product_ranges">;

export interface ProductRangeWithSupplier extends ProductRange {
  supplier?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export function useProductRanges(supplierId?: string) {
  return useQuery({
    queryKey: ["product-ranges", supplierId],
    queryFn: async () => {
      let query = supabase
        .from("product_ranges")
        .select(`
          *,
          supplier:suppliers(id, name, code)
        `)
        .eq("is_active", true)
        .order("code", { ascending: true });

      if (supplierId) {
        query = query.eq("supplier_id", supplierId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ProductRangeWithSupplier[];
    },
  });
}

export function useProductRange(rangeId: string | null | undefined) {
  return useQuery({
    queryKey: ["product-range", rangeId],
    queryFn: async () => {
      if (!rangeId) return null;

      const { data, error } = await supabase
        .from("product_ranges")
        .select(`
          *,
          supplier:suppliers(id, name, code)
        `)
        .eq("id", rangeId)
        .single();

      if (error) throw error;
      return data as ProductRangeWithSupplier;
    },
    enabled: !!rangeId,
  });
}

export function useCreateProductRange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (range: ProductRangeInsert) => {
      const { data, error } = await supabase
        .from("product_ranges")
        .insert(range)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-ranges"] });
    },
  });
}

export function useUpdateProductRange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProductRangeUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("product_ranges")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-ranges"] });
    },
  });
}

export function useDeleteProductRange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_ranges")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-ranges"] });
    },
  });
}
