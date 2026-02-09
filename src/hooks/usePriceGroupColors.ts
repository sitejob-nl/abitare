import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type PriceGroupColor = Tables<"price_group_colors">;
export type PriceGroupColorInsert = TablesInsert<"price_group_colors">;
export type PriceGroupColorUpdate = TablesUpdate<"price_group_colors">;

export function usePriceGroupColors(priceGroupId?: string) {
  return useQuery({
    queryKey: ["price-group-colors", priceGroupId],
    queryFn: async () => {
      let query = supabase
        .from("price_group_colors")
        .select("*")
        .eq("is_available", true)
        .order("color_name", { ascending: true });

      if (priceGroupId) query = query.eq("price_group_id", priceGroupId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!priceGroupId,
  });
}

export function useCreatePriceGroupColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (color: PriceGroupColorInsert) => {
      const { data, error } = await supabase.from("price_group_colors").insert(color).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-group-colors"] }),
  });
}

export function useUpdatePriceGroupColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: PriceGroupColorUpdate & { id: string }) => {
      const { data, error } = await supabase.from("price_group_colors").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-group-colors"] }),
  });
}

export function useDeletePriceGroupColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_group_colors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-group-colors"] }),
  });
}
