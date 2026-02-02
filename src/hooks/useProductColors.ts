import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ProductColor = Tables<"product_colors">;
export type ProductColorInsert = TablesInsert<"product_colors">;
export type ProductColorUpdate = TablesUpdate<"product_colors">;

export interface ProductColorWithRange extends ProductColor {
  range?: {
    id: string;
    code: string;
    name: string | null;
  } | null;
}

export function useProductColors(rangeId?: string | null) {
  return useQuery({
    queryKey: ["product-colors", rangeId],
    queryFn: async () => {
      let query = supabase
        .from("product_colors")
        .select(`
          *,
          range:product_ranges(id, code, name)
        `)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (rangeId) {
        query = query.eq("range_id", rangeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ProductColorWithRange[];
    },
  });
}

export function useProductColor(colorId: string | null | undefined) {
  return useQuery({
    queryKey: ["product-color", colorId],
    queryFn: async () => {
      if (!colorId) return null;

      const { data, error } = await supabase
        .from("product_colors")
        .select(`
          *,
          range:product_ranges(id, code, name)
        `)
        .eq("id", colorId)
        .single();

      if (error) throw error;
      return data as ProductColorWithRange;
    },
    enabled: !!colorId,
  });
}

export function useCreateProductColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (color: ProductColorInsert) => {
      const { data, error } = await supabase
        .from("product_colors")
        .insert(color)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-colors"] });
    },
  });
}

export function useUpdateProductColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProductColorUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("product_colors")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-colors"] });
    },
  });
}

export function useDeleteProductColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_colors")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-colors"] });
    },
  });
}
